import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ACTION_PROMPTS: Record<string, string> = {
  generate_job_description: `أنت خبير توظيف محترف. أنشئ وصفاً وظيفياً شاملاً باللغة العربية.
**يجب** أن تبدأ بكتلة JSON:
\`\`\`json
{"job_description": {"title": "...", "summary": "...", "responsibilities": ["..."], "requirements": ["..."], "preferred": ["..."], "skills": ["..."]}}
\`\`\`
ثم اعرض الوصف بالتفصيل بتنسيق Markdown.`,

  screen_candidate: `أنت خبير فرز مرشحين. قيّم المرشح بناءً على مطابقته للوظيفة.
**يجب** أن تبدأ بكتلة JSON:
\`\`\`json
{"screening": {"score": 85, "match_percent": 80, "verdict": "suitable|hold|reject", "reasons": ["..."], "risks": ["..."], "gap_areas": ["..."], "interview_questions": ["..."], "recommendations": ["..."]}}
\`\`\`
ثم اشرح بالتفصيل.`,

  generate_interview_questions: `أنت خبير مقابلات. أنشئ أسئلة مخصصة للوظيفة.
**يجب** أن تبدأ بكتلة JSON:
\`\`\`json
{"interview_kit": {"questions": [{"question": "...", "category": "behavioral|technical|problem_solving|culture", "evaluates": "...", "scoring_guide": "..."}], "evaluation_form": [{"criterion": "...", "weight": 20, "scale": "1-5"}]}}
\`\`\`
ثم اعرض الأسئلة بالتفصيل.`,

  rank_candidates: `أنت خبير توظيف. رتّب المرشحين بناءً على مطابقتهم.
**يجب** أن تبدأ بكتلة JSON:
\`\`\`json
{"ranking": [{"name": "...", "score": 90, "match_percent": 85, "strengths": ["..."], "gaps": ["..."], "recommendation": "shortlist|hold|reject", "next_action": "..."}]}
\`\`\`
ثم اشرح بالتفصيل.`,

  draft_communication: `أنت كاتب مراسلات توظيف محترف.
**يجب** أن تبدأ بكتلة JSON:
\`\`\`json
{"drafts": [{"type": "invitation|rejection|offer|followup", "subject": "...", "body": "...", "tone": "formal|friendly"}]}
\`\`\`
ثم اعرض المسودات.`,

  generate_training_plan: `أنت خبير تطوير وتدريب.
**يجب** أن تبدأ بكتلة JSON:
\`\`\`json
{"training_plan": {"title": "...", "objectives": ["..."], "duration_weeks": 12, "modules": [{"name": "...", "objectives": ["..."], "duration_hours": 10, "priority": "high|medium|low", "delivery": "online|classroom|blended"}], "kpis": ["..."], "estimated_budget": "..."}}
\`\`\`
ثم اشرح بالتفصيل.`,

  generate_workforce_plan: `أنت مستشار تخطيط قوى عاملة.
**يجب** أن تبدأ بكتلة JSON:
\`\`\`json
{"action_plan": {"title": "...", "timeframe": "...", "actions": [{"action": "...", "priority": "critical|high|medium|low", "owner": "...", "deadline": "...", "expected_impact": "...", "resources_needed": "..."}], "risks": [{"risk": "...", "likelihood": "high|medium|low", "mitigation": "..."}], "kpis": [{"metric": "...", "target": "...", "current": "..."}], "budget_estimate": "..."}}
\`\`\`
ثم اشرح بالتفصيل.`,

  analyze_pipeline: `أنت محلل بيانات توظيف. حلل خط أنابيب التوظيف.
**يجب** أن تبدأ بكتلة JSON:
\`\`\`json
{"pipeline_analysis": {"total_candidates": 0, "conversion_rates": [{"stage": "...", "count": 0, "rate": "..."}], "bottlenecks": [{"stage": "...", "issue": "...", "recommendation": "..."}], "time_to_fill_estimate": "...", "recommendations": ["..."]}}
\`\`\`
ثم اشرح بالتفصيل.`,

  generate_goals: `أنت خبير أداء. أنشئ أهداف SMART مخصصة.
**يجب** أن تبدأ بكتلة JSON:
\`\`\`json
{"goals": [{"title": "...", "description": "...", "metric": "...", "target": "...", "weight": 20, "deadline": "...", "category": "performance|development|strategic"}]}
\`\`\`
ثم اشرح بالتفصيل.`,

  write_appraisal: `أنت خبير تقييم أداء. اكتب تقييماً شاملاً.
**يجب** أن تبدأ بكتلة JSON:
\`\`\`json
{"appraisal": {"overall_score": 4.2, "strengths": ["..."], "improvements": ["..."], "recommendations": ["..."], "next_period_goals": ["..."], "training_needs": ["..."]}}
\`\`\`
ثم اكتب التقييم بالتفصيل.`,

  generate_document: `أنت خبير مستندات رسمية. أنشئ المستند المطلوب بتنسيق رسمي.`,

  analyze_leave: `أنت محلل بيانات HR. حلل بيانات الإجازات.
**يجب** أن تبدأ بكتلة JSON:
\`\`\`json
{"leave_analysis": {"total_requests": 0, "patterns": ["..."], "high_usage_employees": ["..."], "risks": ["..."], "recommendations": ["..."]}}
\`\`\`
ثم اشرح بالتفصيل.`,

  suggest_salary: `أنت خبير تعويضات. حلل هيكل الرواتب.
**يجب** أن تبدأ بكتلة JSON:
\`\`\`json
{"salary_analysis": {"current_avg": 0, "market_comparison": "...", "adjustments": [{"employee": "...", "current": 0, "suggested": 0, "reason": "..."}], "risks": ["..."]}}
\`\`\`
ثم اشرح.`,

  generate_onboarding: `أنت خبير تهيئة موظفين جدد.
**يجب** أن تبدأ بكتلة JSON:
\`\`\`json
{"onboarding_plan": {"phases": [{"phase": "preboarding|first_day|first_week|probation", "tasks": [{"task": "...", "owner": "...", "deadline_relative": "...", "priority": "high|medium|low"}]}]}}
\`\`\`
ثم اشرح.`,
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { action, context, module: reqModule, record_id } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = ACTION_PROMPTS[action];
    if (!systemPrompt) throw new Error(`Unknown action: ${action}`);

    const authHeader = req.headers.get("authorization");
    let companyContext = "";
    let userId: string | null = null;
    let companyId: string | null = null;

    if (authHeader) {
      try {
        const supabaseClient = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_ANON_KEY")!,
          { global: { headers: { Authorization: authHeader } } }
        );
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (user) {
          userId = user.id;
          const { data: profile } = await supabaseClient
            .from("profiles").select("company_id").eq("user_id", user.id).single();

          if (profile?.company_id) {
            companyId = profile.company_id;

            // Check entitlements via RPC
            const { data: entitlements } = await supabaseClient.rpc("get_my_ai_entitlements");
            if (entitlements && !entitlements.ai_enabled) {
              return new Response(JSON.stringify({ error: "تم تعطيل AI لحسابك" }), {
                status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
              });
            }

            // Quota check
            const serviceClient = createClient(
              Deno.env.get("SUPABASE_URL")!,
              Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
            );
            const { data: quota } = await serviceClient
              .from("tenant_ai_quotas").select("*").eq("company_id", companyId).maybeSingle();

            if (quota) {
              const cycleStart = new Date(quota.billing_cycle_start);
              const daysSince = Math.floor((Date.now() - cycleStart.getTime()) / 86400000);
              const currentUsed = daysSince >= 30 ? 0 : quota.requests_used;

              if (currentUsed >= quota.monthly_request_limit) {
                return new Response(JSON.stringify({ error: `تم استنفاد حصة AI الشهرية (${quota.monthly_request_limit} طلب).`, quota_exceeded: true }), {
                  status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
                });
              }

              if (daysSince >= 30) {
                await serviceClient.from("tenant_ai_quotas").update({
                  requests_used: 1, tokens_used: 0,
                  billing_cycle_start: new Date().toISOString().split("T")[0],
                }).eq("id", quota.id);
              } else {
                await serviceClient.from("tenant_ai_quotas").update({
                  requests_used: quota.requests_used + 1,
                }).eq("id", quota.id);
              }
            }

            const { data: company } = await supabaseClient
              .from("companies").select("name, sector, default_currency").eq("id", companyId).single();
            if (company) {
              companyContext = `\nالشركة: ${company.name} | القطاع: ${company.sector || "—"} | العملة: ${company.default_currency}`;
            }

            // Audit trail
            try {
              await serviceClient.from("ai_audit_trail").insert({
                user_id: userId,
                company_id: companyId,
                module: reqModule || action,
                record_id: record_id || null,
                feature: action,
                prompt_summary: context?.substring(0, 500),
                model: "google/gemini-2.5-flash",
              });
            } catch { /* non-critical */ }
          }
        }
      } catch { /* continue */ }
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt + companyContext },
          { role: "user", content: context },
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "تم تجاوز حد الطلبات." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI action error:", response.status, t);
      return new Response(JSON.stringify({ error: "خطأ في خدمة AI" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("AI action error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
