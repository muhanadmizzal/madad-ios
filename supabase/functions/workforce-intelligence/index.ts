import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Package quota limits
const PACKAGE_LIMITS: Record<string, { requests: number; tokens: number }> = {
  essentials: { requests: 50, tokens: 100000 },
  talent: { requests: 200, tokens: 500000 },
  growth: { requests: 500, tokens: 1500000 },
  enterprise: { requests: 2000, tokens: 5000000 },
};

// Feature prompts with structured output instructions
const FEATURE_PROMPTS: Record<string, string> = {
  workforce_analytics: `أنت محلل ذكاء القوى العاملة في نظام "تمكين HR".
حلل بيانات الموظفين والأقسام وقدم تحليلاً شاملاً.
**مهم**: لكل نتيجة اشرح العوامل والبيانات التي أدت إليها.
لا تخترع بيانات - استخدم فقط البيانات المقدمة.
استخدم Markdown مع جداول عند الإمكان.`,

  gap_analysis: `أنت خبير تحليل فجوات القوى العاملة في نظام "تمكين HR".
حلل البيانات واكتشف فجوات المهارات والأدوار ومخاطر الخلافة.
**مهم**: لكل فجوة اشرح العوامل المحددة التي أدت لاكتشافها.
قدم توصيات عملية بأولويات واضحة.`,

  hiring_strategy: `أنت مستشار استراتيجية التوظيف في نظام "تمكين HR".
حلل احتياجات التوظيف وخط أنابيب المرشحين.
**مهم**: اشرح سبب كل توصية بالأرقام المحددة.`,

  hr_operational: `أنت مساعد عمليات الموارد البشرية في نظام "تمكين HR".
أجب عن أسئلة HR التشغيلية بدقة مع شرح المعايير المستخدمة.`,

  career_coach: `أنت مدرب مهني ذكي في نظام "تمكين HR".
ساعد الموظف في تحليل فجوات المهارات واقتراح مسارات مهنية.
استخدم بيانات الموظف فقط. لا تكشف بيانات موظفين آخرين.`,

  planning: `أنت مستشار تخطيط القوى العاملة في نظام "تمكين HR".
قدم نصائح تخطيطية مبنية على البيانات المتاحة.`,

  ats_cv_analysis: `أنت خبير تحليل السير الذاتية في نظام "تمكين HR".
حلل المرشحين وقيّم مطابقتهم للوظيفة.
**يجب** أن تبدأ إجابتك بكتلة JSON مُهيكلة ثم شرح تفصيلي:
\`\`\`json
{"candidates": [{"name": "...", "score": 85, "match_percent": 80, "reasons": ["..."], "risks": ["..."], "recommendations": ["..."], "next_actions": ["..."]}]}
\`\`\`
ثم اشرح بالتفصيل باللغة العربية.`,

  ats_interview: `أنت خبير مقابلات التوظيف في نظام "تمكين HR".
أنشئ أسئلة مقابلة مخصصة للوظيفة.
**يجب** أن تبدأ إجابتك بكتلة JSON:
\`\`\`json
{"interview_kit": {"questions": [{"question": "...", "category": "behavioral|technical|problem_solving", "evaluates": "...", "ideal_answer_hints": "..."}], "evaluation_criteria": [{"criterion": "...", "weight": 20}]}}
\`\`\`
ثم اشرح بالتفصيل.`,

  ats_communication: `أنت كاتب محترف لمراسلات التوظيف في نظام "تمكين HR".
اكتب مراسلات مهنية باللغة العربية.
**يجب** أن تبدأ إجابتك بكتلة JSON:
\`\`\`json
{"drafts": [{"type": "invitation|rejection|offer|followup", "subject": "...", "body": "..."}]}
\`\`\`
ثم اعرض المسودات بالتفصيل.`,

  business_analytics: `أنت محلل بيانات منصة SaaS في نظام "تمكين HR".
حلل البيانات المجمعة والمجهولة الهوية عبر المنصة.
**تحذير أمني**: لا تكشف أبداً بيانات شركة محددة.`,

  // Action-assisted features
  shortlist_candidates: `أنت خبير توظيف في نظام "تمكين HR".
رتّب المرشحين وحدد القائمة القصيرة.
**يجب** أن تبدأ إجابتك بكتلة JSON:
\`\`\`json
{"shortlist": [{"candidate_id": "...", "name": "...", "score": 90, "reasons": ["..."], "risks": ["..."], "recommendation": "shortlist|hold|reject"}], "summary": "..."}
\`\`\`
ثم اشرح بالتفصيل.`,

  generate_training_plan: `أنت خبير تطوير وتدريب في نظام "تمكين HR".
أنشئ خطة تدريبية مخصصة بناءً على البيانات.
**يجب** أن تبدأ إجابتك بكتلة JSON:
\`\`\`json
{"training_plan": {"title": "...", "duration_weeks": 12, "modules": [{"name": "...", "objectives": ["..."], "duration_hours": 10, "priority": "high|medium|low"}], "recommendations": ["..."], "estimated_cost": "..."}}
\`\`\`
ثم اشرح بالتفصيل.`,

  generate_workforce_plan: `أنت مستشار تخطيط قوى عاملة في نظام "تمكين HR".
أنشئ خطة عمل للقوى العاملة.
**يجب** أن تبدأ إجابتك بكتلة JSON:
\`\`\`json
{"action_plan": {"title": "...", "timeframe": "...", "actions": [{"action": "...", "priority": "critical|high|medium|low", "owner": "...", "deadline": "...", "expected_impact": "..."}], "risks": [{"risk": "...", "mitigation": "..."}], "kpis": [{"metric": "...", "target": "...", "current": "..."}]}}
\`\`\`
ثم اشرح بالتفصيل.`,
};

const ROLE_FEATURE_ACCESS: Record<string, string[]> = {
  admin: ["workforce_analytics", "gap_analysis", "hiring_strategy", "hr_operational", "planning", "ats_cv_analysis", "ats_interview", "ats_communication", "shortlist_candidates", "generate_training_plan", "generate_workforce_plan"],
  tenant_admin: ["workforce_analytics", "gap_analysis", "hiring_strategy", "hr_operational", "planning", "ats_cv_analysis", "ats_interview", "ats_communication", "shortlist_candidates", "generate_training_plan", "generate_workforce_plan"],
  hr_manager: ["workforce_analytics", "gap_analysis", "hiring_strategy", "hr_operational", "planning", "ats_cv_analysis", "ats_interview", "ats_communication", "shortlist_candidates", "generate_training_plan", "generate_workforce_plan"],
  hr_officer: ["workforce_analytics", "hiring_strategy", "hr_operational", "ats_cv_analysis", "ats_interview", "ats_communication", "shortlist_candidates"],
  manager: ["hr_operational", "planning"],
  employee: ["career_coach"],
  super_admin: ["business_analytics", "workforce_analytics", "gap_analysis", "hiring_strategy", "hr_operational", "planning"],
};

async function getUserRoles(supabase: any, userId: string): Promise<string[]> {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  return (data || []).map((r: any) => r.role);
}

function checkFeatureAccess(roles: string[], feature: string): boolean {
  for (const role of roles) {
    const allowed = ROLE_FEATURE_ACCESS[role];
    if (allowed && allowed.includes(feature)) return true;
  }
  return false;
}

// Strict quota enforcement
async function checkAndIncrementQuota(supabase: any, companyId: string): Promise<{ allowed: boolean; error?: string; remaining?: number }> {
  // Use service role to read/update quotas
  const serviceClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: quota } = await serviceClient
    .from("tenant_ai_quotas")
    .select("*")
    .eq("company_id", companyId)
    .maybeSingle();

  if (!quota) {
    // Create default quota
    await serviceClient.from("tenant_ai_quotas").insert({
      company_id: companyId,
      package: "essentials",
      monthly_request_limit: 50,
      monthly_token_limit: 100000,
      requests_used: 1,
      tokens_used: 0,
      billing_cycle_start: new Date().toISOString().split("T")[0],
    });
    return { allowed: true, remaining: 49 };
  }

  // Check if billing cycle needs reset
  const cycleStart = new Date(quota.billing_cycle_start);
  const now = new Date();
  const daysSinceCycle = Math.floor((now.getTime() - cycleStart.getTime()) / 86400000);
  
  if (daysSinceCycle >= 30) {
    await serviceClient.from("tenant_ai_quotas").update({
      requests_used: 1,
      tokens_used: 0,
      billing_cycle_start: now.toISOString().split("T")[0],
      updated_at: now.toISOString(),
    }).eq("id", quota.id);
    return { allowed: true, remaining: quota.monthly_request_limit - 1 };
  }

  if (quota.requests_used >= quota.monthly_request_limit) {
    return { allowed: false, error: `تم استنفاد حصة AI الشهرية (${quota.monthly_request_limit} طلب). يرجى ترقية الباقة.` };
  }

  await serviceClient.from("tenant_ai_quotas").update({
    requests_used: quota.requests_used + 1,
    updated_at: now.toISOString(),
  }).eq("id", quota.id);

  return { allowed: true, remaining: quota.monthly_request_limit - quota.requests_used - 1 };
}

// Role-scoped data fetching - actual DB query scoping
async function fetchScopedTenantData(supabase: any, companyId: string, userId: string, roles: string[]) {
  const isManagerOnly = roles.includes("manager") && !roles.includes("admin") && !roles.includes("hr_manager") && !roles.includes("tenant_admin") && !roles.includes("hr_officer");
  const isEmployeeOnly = roles.includes("employee") && roles.length === 1;

  // Employee: only own data
  if (isEmployeeOnly) {
    const { data: empRecord } = await supabase.from("employees").select("*").eq("company_id", companyId).eq("user_id", userId).single();
    if (!empRecord) return "لم يتم العثور على بيانات الموظف.";

    const [leaveRes, attRes, goalRes, appraisalRes, trainingRes] = await Promise.all([
      supabase.from("leave_requests").select("*").eq("employee_id", empRecord.id).order("created_at", { ascending: false }).limit(50),
      supabase.from("attendance_records").select("*").eq("employee_id", empRecord.id).order("date", { ascending: false }).limit(60),
      supabase.from("goals").select("*").eq("employee_id", empRecord.id),
      supabase.from("appraisals").select("*").eq("employee_id", empRecord.id),
      supabase.from("training_enrollments").select("*, training_programs(*)").eq("employee_id", empRecord.id),
    ]);

    return `=== بيانات الموظف (شخصية فقط) ===
الاسم: ${empRecord.name_ar} | المنصب: ${empRecord.position || "غير محدد"}
تاريخ التعيين: ${empRecord.hire_date || "غير محدد"}
الإجازات: ${(leaveRes.data || []).length} طلب
الحضور (60 يوم): ${(attRes.data || []).length} سجل
الأهداف: ${(goalRes.data || []).length}
التقييمات: ${(appraisalRes.data || []).length}
=== بيانات شخصية فقط ===`;
  }

  // Manager: team data only (actual query filter)
  if (isManagerOnly) {
    const { data: teamEmps } = await supabase.from("employees").select("id, name_ar, position, status, department_id, hire_date, contract_type, gender").eq("company_id", companyId).eq("manager_user_id", userId);
    const teamIds = (teamEmps || []).map((e: any) => e.id);
    
    if (teamIds.length === 0) return "⚠️ لم يتم العثور على أعضاء فريق تحت إدارتك.";

    const [leaveRes, attRes, goalRes, violRes] = await Promise.all([
      supabase.from("leave_requests").select("*").eq("company_id", companyId).in("employee_id", teamIds).order("created_at", { ascending: false }).limit(200),
      supabase.from("attendance_records").select("*").eq("company_id", companyId).in("employee_id", teamIds).order("date", { ascending: false }).limit(500),
      supabase.from("goals").select("*").eq("company_id", companyId).in("employee_id", teamIds),
      supabase.from("attendance_violations").select("*").eq("company_id", companyId).in("employee_id", teamIds).limit(100),
    ]);

    const active = (teamEmps || []).filter((e: any) => e.status === "active");
    return `=== بيانات الفريق (مدير - ${active.length} موظف) ===
⚠️ بيانات فريقك فقط - الرواتب محجوبة
${(teamEmps || []).map((e: any) => `- ${e.name_ar} | ${e.position || "—"} | ${e.status}`).join("\n")}
الإجازات: ${(leaveRes.data || []).length} طلب
الحضور: ${(attRes.data || []).length} سجل
الأهداف: ${(goalRes.data || []).length}
المخالفات: ${(violRes.data || []).length}
=== بيانات الفريق فقط ===`;
  }

  // HR/Admin: full tenant data
  const [empRes, deptRes, branchRes, leaveRes, attRes, appraisalRes, goalRes, jobRes, candRes, payRes, contractRes, exitRes, violRes, trainingRes] = await Promise.all([
    supabase.from("employees").select("id, name_ar, position, status, department_id, branch_id, hire_date, basic_salary, contract_type, gender, nationality, shift_id, manager_user_id").eq("company_id", companyId),
    supabase.from("departments").select("id, name, manager_name").eq("company_id", companyId),
    supabase.from("branches").select("id, name, city").eq("company_id", companyId),
    supabase.from("leave_requests").select("id, employee_id, start_date, end_date, status, leave_type_id, reason").eq("company_id", companyId).order("created_at", { ascending: false }).limit(500),
    supabase.from("attendance_records").select("id, employee_id, date, check_in, check_out, hours_worked, overtime_hours").eq("company_id", companyId).order("date", { ascending: false }).limit(1000),
    supabase.from("appraisals").select("id, employee_id, cycle, overall_rating, status").eq("company_id", companyId).limit(300),
    supabase.from("goals").select("id, employee_id, title, status, progress").eq("company_id", companyId).limit(300),
    supabase.from("recruitment_jobs").select("id, title, status, positions_count, employment_type, department_id").eq("company_id", companyId),
    supabase.from("candidates").select("id, name, job_id, stage, rating, source, notes").eq("company_id", companyId).limit(500),
    supabase.from("payroll_runs").select("id, month, year, status, total_gross, total_net, total_deductions").eq("company_id", companyId).order("year", { ascending: false }).limit(12),
    supabase.from("contracts").select("id, employee_id, contract_type, start_date, end_date, status").eq("company_id", companyId),
    supabase.from("exit_clearance").select("id, employee_id, exit_type, status, resignation_date").eq("company_id", companyId),
    supabase.from("attendance_violations").select("id, employee_id, violation_type, date, minutes_diff, status").eq("company_id", companyId).order("date", { ascending: false }).limit(500),
    supabase.from("training_programs").select("id, name, status, category").eq("company_id", companyId).limit(100),
  ]);

  const employees = empRes.data || [];
  const departments = deptRes.data || [];
  const active = employees.filter((e: any) => e.status === "active");
  const candidates = candRes.data || [];
  const jobs = jobRes.data || [];
  const contracts = contractRes.data || [];
  const attendance = attRes.data || [];
  const leaves = leaveRes.data || [];
  const violations = violRes.data || [];

  const deptDist = active.reduce((acc: any, e: any) => {
    const d = departments.find((d: any) => d.id === e.department_id);
    const n = d?.name || "بدون قسم";
    acc[n] = (acc[n] || 0) + 1;
    return acc;
  }, {});

  const totalSalary = active.reduce((s: number, e: any) => s + (e.basic_salary || 0), 0);
  const avgSalary = active.length > 0 ? Math.round(totalSalary / active.length) : 0;

  const last30 = attendance.filter((a: any) => new Date(a.date) >= new Date(Date.now() - 30 * 86400000));
  const avgHours = last30.length > 0 ? (last30.reduce((s: number, a: any) => s + (a.hours_worked || 0), 0) / last30.length).toFixed(1) : "N/A";
  const totalOT = last30.reduce((s: number, a: any) => s + (a.overtime_hours || 0), 0);

  const pendingLeaves = leaves.filter((l: any) => l.status === "pending").length;
  const openJobs = jobs.filter((j: any) => j.status === "open");
  const stageDist = candidates.reduce((acc: any, c: any) => { acc[c.stage] = (acc[c.stage] || 0) + 1; return acc; }, {});

  const in90Days = new Date(Date.now() + 90 * 86400000).toISOString().split("T")[0];
  const today = new Date().toISOString().split("T")[0];
  const expiringContracts = contracts.filter((c: any) => c.status === "active" && c.end_date && c.end_date >= today && c.end_date <= in90Days);

  const violByType = violations.reduce((acc: any, v: any) => { acc[v.violation_type] = (acc[v.violation_type] || 0) + 1; return acc; }, {});

  const appraisals = appraisalRes.data || [];
  const completed = appraisals.filter((a: any) => a.status === "completed" || a.status === "submitted");
  const avgRating = completed.length > 0 ? (completed.reduce((s: number, a: any) => s + (a.overall_rating || 0), 0) / completed.length).toFixed(1) : "N/A";

  return `=== بيانات القوى العاملة (كاملة - HR/Admin) ===
📊 ملخص: ${employees.length} موظف (نشط: ${active.length}) | ${departments.length} قسم | ${(branchRes.data || []).length} فرع
👥 أقسام: ${Object.entries(deptDist).map(([k, v]) => `${k}(${v})`).join("، ")}
💰 رواتب: إجمالي ${totalSalary.toLocaleString()} | متوسط ${avgSalary.toLocaleString()}
⏰ حضور (30 يوم): متوسط ${avgHours} ساعة | إضافي ${totalOT.toFixed(1)} ساعة
📅 إجازات معلقة: ${pendingLeaves}
📝 عقود تنتهي (90 يوم): ${expiringContracts.length}
⚠️ مخالفات: ${Object.entries(violByType).map(([k, v]) => `${k}(${v})`).join("، ") || "لا يوجد"}
💼 توظيف: ${openJobs.length} وظيفة مفتوحة | ${candidates.length} مرشح | مراحل: ${Object.entries(stageDist).map(([k, v]) => `${k}(${v})`).join("، ")}
⭐ أداء: ${appraisals.length} تقييم | متوسط ${avgRating}/5
🎓 تدريب: ${(trainingRes.data || []).length} برنامج
🚪 إنهاء خدمة: ${(exitRes.data || []).length}
📊 رواتب منفذة: ${(payRes.data || []).slice(0, 6).map((p: any) => `${p.month}/${p.year}: إجمالي ${(p.total_gross || 0).toLocaleString()}`).join(" | ") || "لا يوجد"}
=== استخدم هذه البيانات فقط ===`;
}

async function fetchBusinessData(supabase: any) {
  const [companiesRes, empCountRes] = await Promise.all([
    supabase.from("companies").select("id, sector, status, created_at, employee_count_range"),
    supabase.from("employees").select("company_id, status"),
  ]);
  const companies = companiesRes.data || [];
  const allEmps = empCountRes.data || [];
  const activeTotal = allEmps.filter((e: any) => e.status === "active").length;
  const sectorDist = companies.reduce((acc: any, c: any) => { acc[c.sector || "غير محدد"] = (acc[c.sector || "غير محدد"] || 0) + 1; return acc; }, {});
  const sizeDist = companies.reduce((acc: any, c: any) => { acc[c.employee_count_range || "غير محدد"] = (acc[c.employee_count_range || "غير محدد"] || 0) + 1; return acc; }, {});

  return `=== بيانات المنصة (مجمعة ومجهولة) ===
شركات: ${companies.length} | موظفون: ${allEmps.length} (نشط: ${activeTotal})
قطاعات: ${Object.entries(sectorDist).map(([k, v]) => `${k}(${v})`).join("، ")}
أحجام: ${Object.entries(sizeDist).map(([k, v]) => `${k}(${v})`).join("، ")}
=== بيانات مجمعة فقط - لا تكشف بيانات شركة محددة ===`;
}

// Write audit trail
async function writeAuditTrail(companyId: string, userId: string, feature: string, module: string, promptSummary: string, recordId?: string) {
  try {
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    await serviceClient.from("ai_audit_trail").insert({
      user_id: userId,
      company_id: companyId,
      module,
      record_id: recordId || null,
      feature,
      prompt_summary: promptSummary?.substring(0, 500),
      model: "google/gemini-2.5-flash",
    });
  } catch { /* non-critical */ }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { feature, messages, question, module: reqModule, record_id } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("authorization");
    if (!authHeader) throw new Error("Not authenticated");

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data: profile } = await supabase.from("profiles").select("company_id").eq("user_id", user.id).single();
    if (!profile?.company_id) throw new Error("No company context");

    // Check entitlements via RPC
    const { data: entitlements } = await supabase.rpc("get_my_ai_entitlements");
    if (entitlements && !entitlements.ai_enabled) {
      return new Response(JSON.stringify({ error: "تم تعطيل AI لحسابك" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const roles = await getUserRoles(supabase, user.id);

    if (!checkFeatureAccess(roles, feature)) {
      return new Response(JSON.stringify({ error: "ليس لديك صلاحية لاستخدام هذه الميزة" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Feature access is already validated by get_my_ai_entitlements RPC above

    // Strict quota enforcement
    if (feature !== "business_analytics") {
      const quotaCheck = await checkAndIncrementQuota(supabase, profile.company_id);
      if (!quotaCheck.allowed) {
        return new Response(JSON.stringify({ error: quotaCheck.error, quota_exceeded: true }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Fetch role-scoped data
    let dataContext = "";
    if (feature === "business_analytics") {
      dataContext = await fetchBusinessData(supabase);
    } else {
      dataContext = await fetchScopedTenantData(supabase, profile.company_id, user.id, roles);
    }

    const systemPrompt = (FEATURE_PROMPTS[feature] || FEATURE_PROMPTS.hr_operational) + "\n\n" + dataContext;
    const finalMessages = messages || [{ role: "user", content: question || "قدم تحليلاً شاملاً" }];
    const promptSummary = finalMessages.map((m: any) => m.content).join(" ").substring(0, 200);

    // Write audit trail
    await writeAuditTrail(profile.company_id, user.id, feature, reqModule || feature, promptSummary, record_id);

    // Log usage
    try {
      await supabase.from("ai_service_logs").insert({
        company_id: profile.company_id,
        user_id: user.id,
        feature: `wi_${feature}`,
        model: "google/gemini-2.5-flash",
        tokens_used: 0,
        cost: 0,
      });
    } catch { /* non-critical */ }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: systemPrompt }, ...finalMessages],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "تم تجاوز حد الطلبات. يرجى المحاولة لاحقاً." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI error:", response.status, t);
      return new Response(JSON.stringify({ error: "خطأ في خدمة AI" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("workforce-intelligence error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
