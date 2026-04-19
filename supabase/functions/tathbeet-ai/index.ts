import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `أنت مساعد ذكاء اصطناعي متخصص لنظام "تثبيت" (Tathbeet) لإدارة الحجوزات والمواعيد.
أنت تفهم اللهجة العراقية والعربية الفصحى. إذا تحدث المستخدم بالعراقي، رد بالعراقي.

مهامك:
- تحليل بيانات الحجوزات والمواعيد وتقديم تقارير
- تحليل أداء الموظفين (الكوادر)
- تقارير الإيرادات والخدمات الأكثر طلباً
- تحليل سلوك العملاء وأنماط الحجز
- اقتراحات لتحسين الأعمال بناءً على البيانات
- تقديم جداول ورسوم بيانية عند الطلب
- المساعدة في اتخاذ قرارات تجارية

عند تقديم بيانات:
- استخدم جداول Markdown
- قدم أرقام ونسب مئوية
- أضف توصيات عملية
- عند طلب رسم بياني استخدم تنسيق JSON مخصص: \`\`\`chart {"type":"bar|line|pie","data":[...],"labels":[...]} \`\`\`

كن ودوداً ومهنياً. أجب بإيجاز.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableKey) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { message, companyId } = await req.json();
    if (!message || !companyId) {
      return new Response(JSON.stringify({ error: "Missing message or companyId" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch business context
    const [bookingsRes, servicesRes, staffRes, branchesRes, customersRes] = await Promise.all([
      supabase.from("tathbeet_bookings").select("id, status, service_id, staff_profile_id, start_time, end_time, total_price, created_at").eq("company_id", companyId).order("created_at", { ascending: false }).limit(200),
      supabase.from("tathbeet_services").select("id, name_ar, name_en, price, duration_minutes, is_active").eq("company_id", companyId),
      supabase.from("tathbeet_staff_profiles").select("id, display_name, is_active").eq("company_id", companyId),
      supabase.from("branches").select("id, name").eq("company_id", companyId),
      supabase.from("tathbeet_customers").select("id, full_name, total_visits, total_spent, loyalty_points").eq("company_id", companyId).order("total_spent", { ascending: false }).limit(50),
    ]);

    const bookings = bookingsRes.data || [];
    const services = servicesRes.data || [];
    const staff = staffRes.data || [];
    const branches = branchesRes.data || [];
    const customers = customersRes.data || [];

    // Build stats
    const totalBookings = bookings.length;
    const confirmedBookings = bookings.filter(b => b.status === "confirmed").length;
    const completedBookings = bookings.filter(b => b.status === "completed").length;
    const cancelledBookings = bookings.filter(b => b.status === "cancelled").length;
    const totalRevenue = bookings.filter(b => b.status === "completed").reduce((s, b) => s + (b.total_price || 0), 0);

    const contextBlock = `
=== بيانات النظام الحالية ===
إجمالي الحجوزات: ${totalBookings} (مؤكدة: ${confirmedBookings}, مكتملة: ${completedBookings}, ملغاة: ${cancelledBookings})
إجمالي الإيرادات: ${totalRevenue.toLocaleString()} IQD
عدد الخدمات: ${services.length} (نشطة: ${services.filter(s => s.is_active).length})
عدد الموظفين: ${staff.length} (نشط: ${staff.filter(s => s.is_active).length})
عدد الفروع: ${branches.length}
عدد العملاء: ${customers.length}

أهم الخدمات:
${services.slice(0, 10).map(s => `- ${s.name_ar || s.name_en}: ${s.price} IQD (${s.duration_minutes} دقيقة)`).join("\n")}

أهم العملاء (حسب الإنفاق):
${customers.slice(0, 10).map(c => `- ${c.full_name}: ${(c.total_spent || 0).toLocaleString()} IQD, ${c.total_visits || 0} زيارة, ${c.loyalty_points || 0} نقطة`).join("\n")}

الموظفين:
${staff.map(s => `- ${s.display_name} (${s.is_active ? "نشط" : "غير نشط"})`).join("\n")}

الفروع:
${branches.map(b => `- ${b.name}`).join("\n")}
===`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${lovableKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT + "\n\n" + contextBlock },
          { role: "user", content: message },
        ],
        max_tokens: 2048,
        temperature: 0.7,
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("AI Gateway error:", errText);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiRes.json();
    const reply = aiData.choices?.[0]?.message?.content || "عذراً، لم أتمكن من الرد.";

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("tathbeet-ai error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
