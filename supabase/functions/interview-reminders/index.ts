import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Find interviews scheduled within the next 55-65 minutes that haven't been reminded
    const now = new Date();
    const from = new Date(now.getTime() + 55 * 60 * 1000);
    const to = new Date(now.getTime() + 65 * 60 * 1000);

    const { data: interviews, error } = await supabase
      .from("interview_schedules")
      .select("*")
      .eq("status", "scheduled")
      .gte("scheduled_at", from.toISOString())
      .lte("scheduled_at", to.toISOString())
      .is("reminder_sent", null);

    if (error) {
      console.error("Query error:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let reminders = 0;

    for (const iv of interviews || []) {
      const scheduledDate = new Date(iv.scheduled_at);
      const dateStr = scheduledDate.toLocaleDateString("ar-IQ");
      const timeStr = scheduledDate.toLocaleTimeString("ar-IQ", { hour: "2-digit", minute: "2-digit" });

      // Get candidate name
      const { data: candidate } = await supabase
        .from("candidates")
        .select("name")
        .eq("id", iv.candidate_id)
        .single();

      const evalLink = `/interview-evaluation?interview_id=${iv.id}`;

      // Get employees matching interviewer names
      const interviewerNames: string[] = iv.interviewer_names || [];
      if (interviewerNames.length > 0) {
        const { data: employees } = await supabase
          .from("employees")
          .select("name_ar, user_id")
          .eq("company_id", iv.company_id)
          .eq("status", "active");

        for (const name of interviewerNames) {
          const matched = (employees || []).find(
            (e: any) => e.name_ar?.includes(name) || name.includes(e.name_ar || "")
          );
          if (matched?.user_id) {
            await supabase.from("notifications").insert({
              company_id: iv.company_id,
              user_id: matched.user_id,
              title: "⏰ تذكير: مقابلة بعد ساعة",
              message: `لديك مقابلة مع "${candidate?.name || "مرشح"}" بتاريخ ${dateStr} الساعة ${timeStr}. المكان: ${iv.location || "غير محدد"}.`,
              type: "warning",
              link: evalLink,
            });
            reminders++;
          }
        }
      }

      // Mark as reminded
      await supabase
        .from("interview_schedules")
        .update({ reminder_sent: true })
        .eq("id", iv.id);
    }

    return new Response(
      JSON.stringify({ success: true, interviews_found: interviews?.length || 0, reminders_sent: reminders }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
