import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const url = new URL(req.url);

    // GET: Fetch job details for the public apply page
    if (req.method === "GET") {
      const jobId = url.searchParams.get("job_id");
      if (!jobId) {
        return new Response(JSON.stringify({ error: "job_id required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: job, error } = await supabaseAdmin
        .from("recruitment_jobs")
        .select("id, title, description, requirements, employment_type, positions_count, closing_date, company_id, companies(name)")
        .eq("id", jobId)
        .eq("status", "open")
        .single();

      if (error || !job) {
        return new Response(JSON.stringify({ error: "الوظيفة غير موجودة أو مغلقة" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ job }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST: Submit application with CV
    if (req.method === "POST") {
      const formData = await req.formData();
      const jobId = formData.get("job_id") as string;
      const name = formData.get("name") as string;
      const email = formData.get("email") as string;
      const phone = formData.get("phone") as string;
      const notes = formData.get("notes") as string;
      const cvFile = formData.get("cv") as File | null;

      if (!jobId || !name) {
        return new Response(JSON.stringify({ error: "الاسم ومعرف الوظيفة مطلوبان" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Verify job exists and is open
      const { data: job } = await supabaseAdmin
        .from("recruitment_jobs")
        .select("id, title, company_id, description, requirements")
        .eq("id", jobId)
        .eq("status", "open")
        .single();

      if (!job) {
        return new Response(JSON.stringify({ error: "الوظيفة غير متاحة" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let resumePath: string | null = null;

      // Upload CV to storage
      if (cvFile) {
        const ext = cvFile.name.split(".").pop() || "pdf";
        const fileName = `${job.company_id}/${jobId}/${crypto.randomUUID()}.${ext}`;
        
        const { error: uploadError } = await supabaseAdmin.storage
          .from("resumes")
          .upload(fileName, cvFile, { contentType: cvFile.type });

        if (uploadError) {
          console.error("Upload error:", uploadError);
          return new Response(JSON.stringify({ error: "فشل رفع الملف" }), {
            status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        resumePath = fileName;
      }

      // AI Analysis of CV (if uploaded)
      let aiNotes = notes || "";
      if (cvFile) {
        try {
          const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
          if (LOVABLE_API_KEY) {
            // Extract text from CV name and any notes for AI context
            const aiContext = `
وظيفة: ${job.title}
الوصف: ${job.description || "غير محدد"}
المتطلبات: ${job.requirements || "غير محدد"}

معلومات المتقدم:
الاسم: ${name}
البريد: ${email || "غير متوفر"}
الهاتف: ${phone || "غير متوفر"}
اسم ملف السيرة الذاتية: ${cvFile.name}
حجم الملف: ${(cvFile.size / 1024).toFixed(1)} KB
ملاحظات المتقدم: ${notes || "لا يوجد"}
`;

            const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${LOVABLE_API_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: "google/gemini-2.5-flash",
                messages: [
                  {
                    role: "system",
                    content: `أنت خبير توظيف. قم بتقييم أولي سريع للمتقدم بناءً على المعلومات المتاحة. قدم:
1. تقييم أولي (مناسب محتمل / يحتاج مراجعة / غير واضح)
2. ملاحظات سريعة
3. أسئلة مقترحة للمقابلة (2-3)
اكتب بإيجاز باللغة العربية. لا تستخدم Markdown.`,
                  },
                  { role: "user", content: aiContext },
                ],
                stream: false,
              }),
            });

            if (aiResp.ok) {
              const aiData = await aiResp.json();
              const aiContent = aiData.choices?.[0]?.message?.content;
              if (aiContent) {
                aiNotes = `${notes || ""}\n\n--- تحليل AI التلقائي ---\n${aiContent}`;
              }
            }
          }
        } catch (e) {
          console.error("AI analysis error:", e);
          // Continue without AI analysis
        }
      }

      // Insert candidate
      const { error: insertError } = await supabaseAdmin.from("candidates").insert({
        company_id: job.company_id,
        job_id: jobId,
        name,
        email: email || null,
        phone: phone || null,
        source: "application_link",
        notes: aiNotes || null,
        resume_path: resumePath,
        stage: "applied",
      });

      if (insertError) {
        console.error("Insert error:", insertError);
        return new Response(JSON.stringify({ error: "فشل حفظ الطلب" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true, message: "تم استلام طلبك بنجاح" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  } catch (e) {
    console.error("Error:", e);
    return new Response(JSON.stringify({ error: "حدث خطأ غير متوقع" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
