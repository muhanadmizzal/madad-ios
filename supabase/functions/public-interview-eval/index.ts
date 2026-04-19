import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    if (req.method === "GET") {
      const url = new URL(req.url);
      const token = url.searchParams.get("token");
      if (!token) {
        return new Response(JSON.stringify({ error: "رمز مفقود" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Find interview by eval_token
      const { data: interview, error: intErr } = await supabase
        .from("interview_schedules")
        .select("id, candidate_id, job_id, interview_type, scheduled_at, duration_minutes, location, notes, status, interviewer_names, external_interviewer_name, external_interviewer_email, eval_token_expires_at, company_id")
        .eq("eval_token", token)
        .single();

      if (intErr || !interview) {
        return new Response(JSON.stringify({ error: "رابط غير صالح أو منتهي الصلاحية" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (interview.eval_token_expires_at && new Date(interview.eval_token_expires_at) < new Date()) {
        return new Response(JSON.stringify({ error: "انتهت صلاحية الرابط" }), {
          status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check if already submitted
      const { count } = await supabase
        .from("interview_scorecards")
        .select("id", { count: "exact", head: true })
        .eq("interview_id", interview.id);

      if (count && count > 0) {
        return new Response(JSON.stringify({ already_submitted: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get candidate info
      const { data: candidate } = await supabase
        .from("candidates")
        .select("id, name, email, notes, resume_path")
        .eq("id", interview.candidate_id)
        .single();

      // Generate signed URL for resume if exists
      let resume_url = null;
      if (candidate?.resume_path) {
        const { data: signedData } = await supabase.storage
          .from("resumes")
          .createSignedUrl(candidate.resume_path, 3600);
        resume_url = signedData?.signedUrl || null;
      }

      // Get job info
      const { data: job } = await supabase
        .from("recruitment_jobs")
        .select("id, title, requirements, employment_type, description")
        .eq("id", interview.job_id)
        .single();

      return new Response(JSON.stringify({
        interview: {
          id: interview.id,
          interview_type: interview.interview_type,
          scheduled_at: interview.scheduled_at,
          duration_minutes: interview.duration_minutes,
          location: interview.location,
          notes: interview.notes,
          external_interviewer_name: interview.external_interviewer_name,
        },
        candidate: {
          name: candidate?.name || "",
          resume_url,
        },
        job: {
          title: job?.title || "",
          requirements: job?.requirements || "",
          description: job?.description || "",
        },
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "POST") {
      const body = await req.json();
      const { token, interviewer_name, technical, communication, cultural_fit, experience, overall, strengths, weaknesses, recommendation, notes } = body;

      if (!token || !interviewer_name) {
        return new Response(JSON.stringify({ error: "بيانات ناقصة" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Validate token
      const { data: interview } = await supabase
        .from("interview_schedules")
        .select("id, candidate_id, company_id, job_id, eval_token_expires_at")
        .eq("eval_token", token)
        .single();

      if (!interview) {
        return new Response(JSON.stringify({ error: "رابط غير صالح" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (interview.eval_token_expires_at && new Date(interview.eval_token_expires_at) < new Date()) {
        return new Response(JSON.stringify({ error: "انتهت صلاحية الرابط" }), {
          status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check existing scorecard
      const { count } = await supabase
        .from("interview_scorecards")
        .select("id", { count: "exact", head: true })
        .eq("interview_id", interview.id);

      if (count && count > 0) {
        return new Response(JSON.stringify({ error: "تم إرسال التقييم مسبقاً" }), {
          status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Insert scorecard
      const { error: insertErr } = await supabase.from("interview_scorecards").insert({
        company_id: interview.company_id,
        candidate_id: interview.candidate_id,
        interview_id: interview.id,
        interviewer_name,
        technical_score: Number(technical) || null,
        communication_score: Number(communication) || null,
        cultural_fit_score: Number(cultural_fit) || null,
        experience_score: Number(experience) || null,
        overall_score: Number(overall) || null,
        strengths: strengths || null,
        weaknesses: weaknesses || null,
        recommendation: recommendation || "neutral",
        notes: notes || null,
      });

      if (insertErr) {
        console.error("Insert error:", insertErr);
        return new Response(JSON.stringify({ error: "فشل حفظ التقييم: " + insertErr.message }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Auto-advance candidate if recommendation is "hire"
      if (recommendation === "hire") {
        const { data: cand } = await supabase.from("candidates").select("stage").eq("id", interview.candidate_id).single();
        if (cand?.stage === "interview") {
          await supabase.from("candidates").update({ stage: "offer" }).eq("id", interview.candidate_id);
          await supabase.from("candidate_stage_history").insert({
            candidate_id: interview.candidate_id,
            from_stage: "interview",
            to_stage: "offer",
            notes: `ترقية تلقائية - توصية بالتوظيف من مقيّم خارجي (${interviewer_name})`,
          });
        }
      }

      // Mark interview completed
      await supabase.from("interview_schedules")
        .update({ status: "completed" })
        .eq("id", interview.id);

      // Notify HR
      const { data: hrUsers } = await supabase
        .from("user_roles")
        .select("user_id")
        .in("role", ["admin", "hr_manager", "hr_officer"])
        .eq("tenant_id", interview.company_id)
        .limit(5);

      const { data: candidate } = await supabase
        .from("candidates")
        .select("name")
        .eq("id", interview.candidate_id)
        .single();

      for (const hr of hrUsers || []) {
        await supabase.from("notifications").insert({
          company_id: interview.company_id,
          user_id: hr.user_id,
          title: "📋 تقييم خارجي جديد",
          message: `قام المقيّم الخارجي "${interviewer_name}" بتقديم تقييم للمرشح "${candidate?.name || ""}" - التوصية: ${recommendation === "hire" ? "توظيف ✅" : recommendation === "reject" ? "رفض ❌" : "محايد"}`,
          type: "info",
          link: "/recruitment",
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  } catch (err: unknown) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
