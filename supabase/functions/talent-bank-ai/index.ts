import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    // Validate auth via supabase client
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(token || "");
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { candidate_id } = await req.json();
    if (!candidate_id) {
      return new Response(JSON.stringify({ error: "Missing candidate_id" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get candidate data
    const { data: candidate } = await supabase
      .from("candidates")
      .select("*, recruitment_jobs(title, requirements, description)")
      .eq("id", candidate_id)
      .single();

    if (!candidate) {
      return new Response(JSON.stringify({ error: "Candidate not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get scorecards
    const { data: scorecards } = await supabase
      .from("interview_scorecards")
      .select("*")
      .eq("candidate_id", candidate_id);

    // Get stage history
    const { data: history } = await supabase
      .from("candidate_stage_history")
      .select("*")
      .eq("candidate_id", candidate_id)
      .order("created_at", { ascending: true });

    // Get background checks
    const { data: bgChecks } = await supabase
      .from("background_checks")
      .select("check_type, status, result")
      .eq("candidate_id", candidate_id);

    // Build context for AI
    const prompt = `أنت خبير موارد بشرية. أنشئ ملخصاً احترافياً لمهارات وكفاءات هذا المرشح بناءً على جميع البيانات المتوفرة.

بيانات المرشح:
- الاسم: ${candidate.name}
- البريد: ${candidate.email || "غير متوفر"}
- المصدر: ${candidate.source || "غير محدد"}
- التصنيف المهاري: ${candidate.skill_category || "غير مصنف"}
- الوظيفة المتقدم لها: ${candidate.recruitment_jobs?.title || "غير محدد"}
- وصف الوظيفة: ${candidate.recruitment_jobs?.description || "غير متوفر"}
- المتطلبات: ${candidate.recruitment_jobs?.requirements || "غير متوفر"}
- ملاحظات HR: ${candidate.notes || "لا يوجد"}

تقييمات المقابلات (${(scorecards || []).length}):
${(scorecards || []).map((s: any) => `- المقيّم: ${s.interviewer_name} | التقني: ${s.technical_score}/5 | التواصل: ${s.communication_score}/5 | الثقافي: ${s.cultural_fit_score}/5 | الخبرة: ${s.experience_score}/5 | الإجمالي: ${s.overall_score}/5 | التوصية: ${s.recommendation} | نقاط القوة: ${s.strengths || "—"} | نقاط الضعف: ${s.weaknesses || "—"}`).join("\n") || "لا توجد تقييمات"}

سجل المراحل:
${(history || []).map((h: any) => `- ${h.from_stage || "جديد"} → ${h.to_stage} | ${h.notes || ""}`).join("\n") || "لا يوجد"}

التحققات:
${(bgChecks || []).map((b: any) => `- ${b.check_type}: ${b.status} - ${b.result || ""}`).join("\n") || "لا يوجد"}

أنشئ ملخصاً مختصراً (4-6 أسطر) يتضمن:
1. نقاط القوة الرئيسية
2. المهارات والكفاءات المحددة
3. مجالات التحسين
4. توصية عامة لأنواع الوظائف المناسبة
5. ملاحظة على التصنيف المهاري المقترح إن لم يكن مصنفاً

اكتب بالعربية بشكل مختصر واحترافي.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "أنت خبير موارد بشرية متخصص في تقييم المرشحين. اكتب ملخصات مختصرة واحترافية بالعربية." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "تم تجاوز حد الطلبات، يرجى المحاولة لاحقاً" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "يرجى إضافة رصيد للذكاء الاصطناعي" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI gateway error: " + status);
    }

    const aiData = await aiResponse.json();
    const summary = aiData.choices?.[0]?.message?.content || "";

    // Save summary to candidate
    await supabase.from("candidates").update({
      ai_skill_summary: summary,
      ai_summary_generated_at: new Date().toISOString(),
    }).eq("id", candidate_id);

    return new Response(JSON.stringify({ summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
