import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    /* ─── 1. AUTH: Verify JWT ─── */
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify the user's JWT
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = user.id;

    const sb = createClient(supabaseUrl, serviceKey);

    /* ─── 2. TENANT ISOLATION: Verify user belongs to company ─── */
    const { company_id } = await req.json();
    if (!company_id) {
      return new Response(JSON.stringify({ error: "company_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profile } = await sb
      .from("profiles")
      .select("company_id, role")
      .eq("user_id", userId)
      .maybeSingle();

    if (!profile || profile.company_id !== company_id) {
      return new Response(JSON.stringify({ error: "Access denied: tenant mismatch" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    /* ─── 3. FEATURE CHECK: Verify tathbeet_ai_analysis is enabled ─── */
    const { data: featureRow } = await sb
      .from("tenant_features")
      .select("status")
      .eq("company_id", company_id)
      .eq("feature_key", "tathbeet_ai_analysis")
      .maybeSingle();

    // Also check the parent tathbeet_ai key
    const { data: parentFeature } = await sb
      .from("tenant_features")
      .select("status")
      .eq("company_id", company_id)
      .eq("feature_key", "tathbeet_ai")
      .maybeSingle();

    const aiEnabled = (featureRow?.status === "active") || (parentFeature?.status === "active");
    if (!aiEnabled) {
      return new Response(JSON.stringify({ error: "AI analysis not enabled for this tenant", feature_disabled: true }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    /* ─── 4. ANALYSIS: Fetch ONLY tenant data ─── */
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];

    const [bookingsRes, staffRes, servicesRes] = await Promise.all([
      sb.from("tathbeet_bookings").select("*").eq("company_id", company_id).gte("booking_date", thirtyDaysAgo),
      sb.from("tathbeet_staff_profiles").select("id, display_name").eq("company_id", company_id).eq("booking_enabled", true),
      sb.from("tathbeet_services").select("id, name").eq("company_id", company_id).eq("status", "active"),
    ]);

    const bookings = bookingsRes.data || [];
    const staff = staffRes.data || [];
    const services = servicesRes.data || [];

    const total = bookings.length;
    const completed = bookings.filter((b: any) => b.status === "completed").length;
    const cancelled = bookings.filter((b: any) => b.status === "cancelled").length;
    const noShow = bookings.filter((b: any) => b.status === "no_show").length;
    const cancellationRate = total > 0 ? Math.round((cancelled / total) * 100) : 0;
    const noShowRate = total > 0 ? Math.round((noShow / total) * 100) : 0;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Peak hour
    const hourMap = new Map<number, number>();
    for (const b of bookings) {
      if (!(b as any).time_slot) continue;
      const h = parseInt((b as any).time_slot.split(":")[0]);
      hourMap.set(h, (hourMap.get(h) || 0) + 1);
    }
    let peakHour = 0, peakCount = 0;
    for (const [h, c] of hourMap.entries()) {
      if (c > peakCount) { peakHour = h; peakCount = c; }
    }

    // Staff load
    const staffLoadMap = new Map<string, number>();
    for (const b of bookings) {
      const sid = (b as any).staff_profile_id;
      if (sid) staffLoadMap.set(sid, (staffLoadMap.get(sid) || 0) + 1);
    }
    const loadValues = [...staffLoadMap.values()];
    const loadImbalance = loadValues.length > 1 && Math.max(...loadValues) > 0 && Math.min(...loadValues) === 0;

    /* ─── 5. AI CALL ─── */
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    let aiSummary = "";
    let aiInsights: Array<{ title: string; description: string; severity: string; recommendation: string; scope_type: string }> = [];

    if (LOVABLE_API_KEY && total > 0) {
      const prompt = `You are a booking operations analyst for a SINGLE tenant business. Analyze ONLY this tenant's data. Never reference other businesses.

DATA:
- Total bookings (30d): ${total}, Completed: ${completed} (${completionRate}%), Cancelled: ${cancelled} (${cancellationRate}%), No-shows: ${noShow} (${noShowRate}%)
- Peak hour: ${peakHour}:00 (${peakCount} bookings)
- Staff: ${staff.length}, Services: ${services.length}, Load imbalance: ${loadImbalance}

Respond ONLY with valid JSON: {"summary":"Arabic summary","insights":[{"title":"Arabic","description":"Arabic","severity":"critical|warning|info|success","recommendation":"Arabic","scope_type":"system|staff|service|branch"}]}
Provide 3-6 insights in Arabic.`;

      try {
        const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              { role: "system", content: "Respond only in valid JSON. Analyze only the provided tenant data." },
              { role: "user", content: prompt },
            ],
          }),
        });

        if (aiResp.ok) {
          const content = (await aiResp.json()).choices?.[0]?.message?.content || "";
          try {
            const parsed = JSON.parse(content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());
            aiSummary = parsed.summary || "";
            aiInsights = parsed.insights || [];
          } catch { /* skip */ }
        }
      } catch { /* skip */ }
    }

    /* ─── 6. STORE: All inserts scoped to company_id ─── */
    if (aiInsights.length > 0) {
      await sb.from("tathbeet_ai_insights").insert(
        aiInsights.map(ins => ({
          company_id, insight_type: "ai_analysis", scope_type: ins.scope_type || "system",
          title: ins.title, description: ins.description, severity: ins.severity, recommendation: ins.recommendation,
        }))
      );
      const recs = aiInsights.filter(i => i.recommendation).map(i => ({
        company_id, recommendation_type: i.scope_type || "system", target_type: i.scope_type || "system",
        payload: { title: i.title, description: i.recommendation }, status: "pending",
      }));
      if (recs.length) await sb.from("tathbeet_ai_recommendations").insert(recs);
    }

    // Snapshot
    await sb.from("tathbeet_ai_snapshots").upsert({
      company_id, snapshot_date: new Date().toISOString().split("T")[0],
      metrics_json: { total, completed, cancelled, noShow, completionRate, cancellationRate, noShowRate, peakHour, peakCount, staffCount: staff.length },
      summary_json: { summary: aiSummary, insightCount: aiInsights.length },
    }, { onConflict: "company_id,snapshot_date" });

    /* ─── 7. AUDIT LOG ─── */
    await sb.from("ai_audit_trail").insert({
      company_id,
      user_id: userId,
      feature: "tathbeet_ai_analysis",
      module: "tathbeet",
      prompt_summary: `Booking analysis: ${total} bookings, ${staff.length} staff`,
      output_summary: aiSummary ? aiSummary.substring(0, 200) : "Metrics-only analysis",
      tokens_used: aiInsights.length > 0 ? 500 : 0,
      model: "google/gemini-3-flash-preview",
    });

    return new Response(JSON.stringify({ success: true, summary: aiSummary, insightCount: aiInsights.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("tathbeet-ai-operations error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
