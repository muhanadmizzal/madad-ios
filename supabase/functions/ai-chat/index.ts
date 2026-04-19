import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPTS: Record<string, string> = {
  general: `أنت مساعد ذكاء اصطناعي متخصص في إدارة الموارد البشرية لنظام "تمكين HR". 
أجب باللغة العربية بشكل افتراضي ما لم يتحدث المستخدم بلغة أخرى.
يمكنك المساعدة في:
- استفسارات الموظفين والسياسات
- حسابات الرواتب والاستحقاقات
- قوانين العمل العراقية
- إدارة الإجازات والحضور
- التوظيف وفرز المرشحين
- تقييم الأداء
- إعداد التقارير والتحليلات
- تحليل بيانات الشركة وتقديم رؤى استراتيجية
- بناء خطط توازن العمل والحياة
- تحديد الفجوات في الأداء والتوظيف
- وضع أهداف واستراتيجيات HR
كن مختصراً ومهنياً ودقيقاً. استخدم تنسيق Markdown عند الحاجة.
عند تحليل البيانات، قدم أرقام ونسب مئوية وتوصيات عملية.`,

  ats: `أنت مساعد ذكاء اصطناعي متخصص في نظام تتبع المتقدمين (ATS) لنظام "تمكين HR".
مهامك تشمل:
- فرز السير الذاتية وتقييم المرشحين
- اقتراح أسئلة المقابلات بناءً على المنصب
- تحليل مدى ملاءمة المرشح للوظيفة
- كتابة أوصاف وظيفية احترافية
- تقديم نصائح التوظيف وأفضل الممارسات
- تحليل فجوات التوظيف بناءً على بيانات الشركة
أجب باللغة العربية بشكل افتراضي. استخدم تنسيق Markdown.`,

  policy: `أنت مساعد متخصص في سياسات الموارد البشرية وقوانين العمل.
مهامك:
- شرح قوانين العمل العراقية
- صياغة سياسات HR احترافية
- الإجابة عن استفسارات الامتثال القانوني
- تقديم نصائح حول أفضل الممارسات
أجب باللغة العربية. استخدم تنسيق Markdown.`,

  document: `أنت مساعد متخصص في إنشاء وصياغة مستندات الموارد البشرية.
مهامك:
- كتابة خطابات رسمية (تعيين، إنهاء خدمة، شهادات خبرة)
- صياغة عقود العمل
- إعداد نماذج HR
- كتابة إعلانات داخلية
- صياغة سياسات الشركة
أجب باللغة العربية. قدم المستندات بتنسيق جاهز للاستخدام.`,

  analytics: `أنت محلل بيانات موارد بشرية ذكي لنظام "تمكين HR".
مهامك:
- تحليل بيانات الموظفين واتجاهات القوى العاملة
- تقديم رؤى حول معدلات الدوران والاحتفاظ
- اقتراح مؤشرات أداء رئيسية (KPIs)
- تحليل تكاليف الرواتب والمزايا
- التنبؤ باحتياجات التوظيف
- بناء خطط توازن العمل والحياة
- تحديد الفجوات وتقديم خطط عمل
أجب باللغة العربية. استخدم أرقام وإحصائيات عند الإمكان.`,
};

async function fetchCompanyData(supabaseClient: any, companyId: string) {
  const results: Record<string, any> = {};

  // Fetch all data in parallel
  const [
    employeesRes,
    departmentsRes,
    branchesRes,
    leaveRequestsRes,
    attendanceRes,
    appraisalsRes,
    goalsRes,
    loansRes,
    recruitmentRes,
    candidatesRes,
    leaveBalancesRes,
    shiftsRes,
    payrollRes,
  ] = await Promise.all([
    supabaseClient.from("employees").select("id, name_ar, name_en, position, status, department_id, branch_id, hire_date, basic_salary, contract_type, gender, nationality").eq("company_id", companyId),
    supabaseClient.from("departments").select("id, name, manager_name").eq("company_id", companyId),
    supabaseClient.from("branches").select("id, name, city, is_headquarters").eq("company_id", companyId),
    supabaseClient.from("leave_requests").select("id, employee_id, start_date, end_date, status, leave_type_id, reason").eq("company_id", companyId).order("created_at", { ascending: false }).limit(200),
    supabaseClient.from("attendance_records").select("id, employee_id, date, check_in, check_out, hours_worked, overtime_hours").eq("company_id", companyId).order("date", { ascending: false }).limit(500),
    supabaseClient.from("appraisals").select("id, employee_id, cycle, overall_rating, status, strengths, improvements").eq("company_id", companyId).limit(200),
    supabaseClient.from("goals").select("id, employee_id, title, status, progress, target_date").eq("company_id", companyId).limit(200),
    supabaseClient.from("loans").select("id, employee_id, amount, remaining_amount, status, loan_type").eq("company_id", companyId),
    supabaseClient.from("recruitment_jobs").select("id, title, status, positions_count, employment_type, department_id").eq("company_id", companyId),
    supabaseClient.from("candidates").select("id, name, job_id, stage, rating, source").eq("company_id", companyId).limit(200),
    supabaseClient.from("leave_balances").select("id, employee_id, leave_type_id, entitled_days, used_days, remaining_days, year").eq("company_id", companyId),
    supabaseClient.from("shifts").select("id, name, start_time, end_time, break_minutes, grace_minutes").eq("company_id", companyId),
    supabaseClient.from("payroll_runs").select("id, month, year, status, total_gross, total_net, total_deductions").eq("company_id", companyId).order("year", { ascending: false }).limit(12),
  ]);

  const employees = employeesRes.data || [];
  const departments = departmentsRes.data || [];
  const branches = branchesRes.data || [];

  // Build summary statistics
  const activeEmployees = employees.filter((e: any) => e.status === "active");
  const genderBreakdown = activeEmployees.reduce((acc: any, e: any) => {
    const g = e.gender || "غير محدد";
    acc[g] = (acc[g] || 0) + 1;
    return acc;
  }, {});

  const deptBreakdown = activeEmployees.reduce((acc: any, e: any) => {
    const dept = departments.find((d: any) => d.id === e.department_id);
    const name = dept?.name || "بدون قسم";
    acc[name] = (acc[name] || 0) + 1;
    return acc;
  }, {});

  const contractBreakdown = activeEmployees.reduce((acc: any, e: any) => {
    const t = e.contract_type || "غير محدد";
    acc[t] = (acc[t] || 0) + 1;
    return acc;
  }, {});

  const totalSalary = activeEmployees.reduce((sum: number, e: any) => sum + (e.basic_salary || 0), 0);
  const avgSalary = activeEmployees.length > 0 ? Math.round(totalSalary / activeEmployees.length) : 0;

  const pendingLeaves = (leaveRequestsRes.data || []).filter((l: any) => l.status === "pending").length;
  const approvedLeaves = (leaveRequestsRes.data || []).filter((l: any) => l.status === "approved").length;

  const openJobs = (recruitmentRes.data || []).filter((j: any) => j.status === "open");
  const totalCandidates = (candidatesRes.data || []).length;

  const appraisals = appraisalsRes.data || [];
  const completedAppraisals = appraisals.filter((a: any) => a.status === "completed" || a.status === "submitted");
  const avgRating = completedAppraisals.length > 0
    ? (completedAppraisals.reduce((s: number, a: any) => s + (a.overall_rating || 0), 0) / completedAppraisals.length).toFixed(1)
    : "لا يوجد";

  const goals = goalsRes.data || [];
  const completedGoals = goals.filter((g: any) => g.status === "completed").length;
  const inProgressGoals = goals.filter((g: any) => g.status === "in_progress").length;

  const activeLoans = (loansRes.data || []).filter((l: any) => l.status === "active");
  const totalLoanAmount = activeLoans.reduce((s: number, l: any) => s + (l.amount || 0), 0);

  const attendance = attendanceRes.data || [];
  const avgHoursWorked = attendance.length > 0
    ? (attendance.reduce((s: number, a: any) => s + (a.hours_worked || 0), 0) / attendance.length).toFixed(1)
    : "لا يوجد";
  const totalOvertime = attendance.reduce((s: number, a: any) => s + (a.overtime_hours || 0), 0);

  const payrollRuns = payrollRes.data || [];

  return `
=== بيانات الشركة الحالية ===

📊 ملخص القوى العاملة:
- إجمالي الموظفين: ${employees.length}
- الموظفون النشطون: ${activeEmployees.length}
- الأقسام: ${departments.length} (${departments.map((d: any) => d.name).join("، ")})
- الفروع: ${branches.length} (${branches.map((b: any) => b.name).join("، ")})

👥 توزيع الموظفين حسب الجنس:
${Object.entries(genderBreakdown).map(([k, v]) => `- ${k}: ${v}`).join("\n")}

🏢 توزيع الموظفين حسب الأقسام:
${Object.entries(deptBreakdown).map(([k, v]) => `- ${k}: ${v}`).join("\n")}

📋 أنواع العقود:
${Object.entries(contractBreakdown).map(([k, v]) => `- ${k}: ${v}`).join("\n")}

💰 الرواتب:
- إجمالي الرواتب الأساسية الشهرية: ${totalSalary.toLocaleString()}
- متوسط الراتب: ${avgSalary.toLocaleString()}

📅 الإجازات:
- طلبات معلقة: ${pendingLeaves}
- طلبات مقبولة: ${approvedLeaves}

⏰ الحضور (آخر ${attendance.length} سجل):
- متوسط ساعات العمل: ${avgHoursWorked} ساعة
- إجمالي ساعات العمل الإضافي: ${totalOvertime.toFixed(1)} ساعة

⭐ تقييم الأداء:
- إجمالي التقييمات: ${appraisals.length}
- المكتملة: ${completedAppraisals.length}
- متوسط التقييم: ${avgRating}/5

🎯 الأهداف:
- إجمالي الأهداف: ${goals.length}
- مكتملة: ${completedGoals}
- قيد التنفيذ: ${inProgressGoals}

💼 التوظيف:
- الوظائف المفتوحة: ${openJobs.length}
- إجمالي المرشحين: ${totalCandidates}
${openJobs.length > 0 ? "- الوظائف: " + openJobs.map((j: any) => `${j.title} (${j.positions_count || 1} منصب)`).join("، ") : ""}

💳 القروض والسلف:
- القروض النشطة: ${activeLoans.length}
- إجمالي مبالغ القروض: ${totalLoanAmount.toLocaleString()}

📊 الرواتب المنفذة:
${payrollRuns.length > 0 ? payrollRuns.slice(0, 6).map((p: any) => `- ${p.month}/${p.year}: إجمالي ${(p.total_gross || 0).toLocaleString()} | صافي ${(p.total_net || 0).toLocaleString()} | حالة: ${p.status}`).join("\n") : "- لا توجد بيانات رواتب"}

🔄 الورديات:
${(shiftsRes.data || []).map((s: any) => `- ${s.name}: ${s.start_time} - ${s.end_time} (استراحة: ${s.break_minutes || 0} دقيقة)`).join("\n") || "- لا توجد ورديات"}

=== استخدم هذه البيانات لتقديم تحليلات دقيقة وتوصيات مبنية على الأرقام الفعلية ===
`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, mode = "general" } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Try to get company data if user is authenticated
    let companyDataContext = "";
    const authHeader = req.headers.get("authorization");
    if (authHeader) {
      try {
        const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
          global: { headers: { Authorization: authHeader } },
        });

        // Get user's company
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (user) {
          const { data: profile } = await supabaseClient
            .from("profiles")
            .select("company_id")
            .eq("user_id", user.id)
            .single();

          if (profile?.company_id) {
            companyDataContext = await fetchCompanyData(supabaseClient, profile.company_id);
          }
        }
      } catch (e) {
        console.error("Failed to fetch company data:", e);
        // Continue without company data
      }
    }

    const systemPrompt = (SYSTEM_PROMPTS[mode] || SYSTEM_PROMPTS.general) +
      (companyDataContext ? `\n\n${companyDataContext}` : "");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "تم تجاوز حد الطلبات، يرجى المحاولة لاحقاً." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "يرجى إضافة رصيد لاستخدام خدمات AI." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "حدث خطأ في خدمة AI" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("AI chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
