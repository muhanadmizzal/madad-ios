import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Fixed UUIDs for Al-Nahr
const CO = "a2000000-0001-4000-8000-000000000002";
const BR_MAIN = "b2000001-0001-4000-8000-000000000002";
const DEPT_HR = "d2000001-0001-4000-8000-000000000002";
const DEPT_FIN = "d2000001-0002-4000-8000-000000000002";
const DEPT_ENG = "d2000001-0003-4000-8000-000000000002";
const DEPT_SALES = "d2000001-0004-4000-8000-000000000002";
const DEPT_OPS = "d2000001-0005-4000-8000-000000000002";
const DEPT_ADMIN = "d2000001-0006-4000-8000-000000000002";

const PLAN_PRO = "ca3bf206-bd78-4892-9007-40b781315b78";
const AI_PKG_GROWTH = "df1a81df-1363-46f5-a650-ede813431ed4";
const PASSWORD = "DemoHR@2026!";

interface UserDef {
  email: string;
  name_ar: string;
  name_en: string;
  role: string;
  dept: string;
  position: string;
  salary: number;
}

const USERS: UserDef[] = [
  { email: "yasir.admin@alnahr-demo.local", name_ar: "ياسر عبدالله", name_en: "Yasir Abdullah", role: "tenant_admin", dept: DEPT_ADMIN, position: "المدير العام", salary: 3500000 },
  { email: "sara.hr@alnahr-demo.local", name_ar: "سارة الحسيني", name_en: "Sara Al-Husseini", role: "hr_manager", dept: DEPT_HR, position: "مدير الموارد البشرية", salary: 2200000 },
  { email: "mona.hro@alnahr-demo.local", name_ar: "منى الخالدي", name_en: "Mona Al-Khalidi", role: "hr_officer", dept: DEPT_HR, position: "مسؤول شؤون الموظفين", salary: 1200000 },
  { email: "omar.finance@alnahr-demo.local", name_ar: "عمر الراشدي", name_en: "Omar Al-Rashidi", role: "finance_manager", dept: DEPT_FIN, position: "مدير المالية", salary: 2500000 },
  { email: "hassan.ops@alnahr-demo.local", name_ar: "حسن المنصوري", name_en: "Hassan Al-Mansouri", role: "manager", dept: DEPT_OPS, position: "مدير العمليات", salary: 2300000 },
  { email: "ahmed.eng@alnahr-demo.local", name_ar: "أحمد الجبوري", name_en: "Ahmed Al-Jubouri", role: "employee", dept: DEPT_ENG, position: "مهندس مشاريع", salary: 1800000 },
  { email: "zainab.sales@alnahr-demo.local", name_ar: "زينب الموسوي", name_en: "Zainab Al-Mousawi", role: "employee", dept: DEPT_SALES, position: "مسؤول مبيعات", salary: 1400000 },
  { email: "kareem.acc@alnahr-demo.local", name_ar: "كريم العبيدي", name_en: "Kareem Al-Obaidi", role: "employee", dept: DEPT_FIN, position: "محاسب", salary: 1300000 },
  { email: "layla.admin@alnahr-demo.local", name_ar: "ليلى كريم", name_en: "Layla Kareem", role: "employee", dept: DEPT_ADMIN, position: "مسؤول إداري", salary: 1100000 },
  { email: "mustafa.tech@alnahr-demo.local", name_ar: "مصطفى العاني", name_en: "Mustafa Al-Ani", role: "employee", dept: DEPT_ENG, position: "فني كهرباء", salary: 1000000 },
];

function randomDate(start: string, end: string): string {
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  return new Date(s + Math.random() * (e - s)).toISOString().split("T")[0];
}

function businessDays(startDate: Date, endDate: Date): Date[] {
  const days: Date[] = [];
  const d = new Date(startDate);
  while (d <= endDate) {
    if (d.getDay() !== 5 && d.getDay() !== 6) days.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return days;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const results: Record<string, any> = {};
    const createdUsers: { email: string; name: string; role: string; userId: string }[] = [];
    const empMap: Record<string, string> = {}; // email -> employee_id
    const userIdMap: Record<string, string> = {}; // email -> user_id

    // ===== PHASE 1: COMPANY =====
    await sb.from("companies").upsert({
      id: CO,
      name: "Al-Nahr Engineering Services",
      name_ar: "النهر للخدمات الهندسية",
      email: "info@alnahr-demo.local",
      address: "بغداد - المنصور",
      sector: "engineering",
      default_currency: "IQD",
      status: "active",
      signatory_name: "ياسر عبدالله",
      signatory_title: "المدير العام",
    }, { onConflict: "id" });
    results.company = CO;

    // ===== PHASE 2: STRUCTURE =====
    await sb.from("branches").upsert({
      id: BR_MAIN, company_id: CO, name: "المقر الرئيسي - بغداد", city: "بغداد", is_headquarters: true,
    }, { onConflict: "id" });

    const depts = [
      { id: DEPT_HR, name: "الموارد البشرية" },
      { id: DEPT_FIN, name: "المالية" },
      { id: DEPT_ENG, name: "الهندسة" },
      { id: DEPT_SALES, name: "المبيعات" },
      { id: DEPT_OPS, name: "العمليات" },
      { id: DEPT_ADMIN, name: "الإدارة" },
    ];
    for (const d of depts) {
      await sb.from("departments").upsert({ id: d.id, company_id: CO, name: d.name, branch_id: BR_MAIN }, { onConflict: "id" });
    }
    results.departments = depts.length;

    // ===== PHASE 3: USERS + PROFILES + ROLES + EMPLOYEES =====
    for (const u of USERS) {
      let userId: string;

      // Create auth user
      const { data: authData, error: authErr } = await sb.auth.admin.createUser({
        email: u.email,
        password: PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: u.name_en },
      });

      if (authErr) {
        if (authErr.message?.includes("already been registered")) {
          // Get existing user
          const { data: users } = await sb.auth.admin.listUsers({ page: 1, perPage: 1000 });
          const found = users?.users?.find(x => x.email === u.email);
          if (!found) { results[u.email] = "skip-not-found"; continue; }
          userId = found.id;
        } else {
          results[u.email] = `auth error: ${authErr.message}`;
          continue;
        }
      } else {
        userId = authData.user.id;
      }

      userIdMap[u.email] = userId;

      // Fix auto-created company/profile from trigger
      const { data: autoProfile } = await sb.from("profiles").select("company_id").eq("user_id", userId).single();
      if (autoProfile && autoProfile.company_id !== CO) {
        const autoCoId = autoProfile.company_id;
        // Clean up auto-created stuff
        await sb.from("user_roles").delete().eq("user_id", userId);
        await sb.from("profiles").update({ company_id: CO, full_name: u.name_en }).eq("user_id", userId);
        // Try to delete auto company (ignore errors - might have other refs)
        await sb.from("companies").delete().eq("id", autoCoId);
      } else if (autoProfile) {
        await sb.from("profiles").update({ full_name: u.name_en }).eq("user_id", userId);
      } else {
        await sb.from("profiles").insert({ user_id: userId, company_id: CO, full_name: u.name_en });
      }

      // Role
      await sb.from("user_roles").delete().eq("user_id", userId);
      const scope = u.role === "finance_manager" ? "tenant" : ["super_admin", "business_admin"].includes(u.role) ? "platform" : "tenant";
      await sb.from("user_roles").insert({
        user_id: userId, role: u.role, scope_type: scope, tenant_id: scope === "platform" ? null : CO,
      });

      // Employee record
      const femaleNames = ["سارة", "منى", "زينب", "ليلى"];
      const isFemale = femaleNames.some(fn => u.name_ar.includes(fn));
      const hireDate = randomDate("2020-01-01", "2024-06-01");

      // Delete existing employee for this user to avoid duplicates
      await sb.from("employees").delete().eq("user_id", userId);

      const { data: empData } = await sb.from("employees").insert({
        company_id: CO, name_ar: u.name_ar, name_en: u.name_en, email: u.email,
        department_id: u.dept, branch_id: BR_MAIN, position: u.position,
        basic_salary: u.salary, currency: "IQD", user_id: userId,
        status: "active", gender: isFemale ? "female" : "male",
        nationality: "عراقي", hire_date: hireDate, contract_type: "full_time",
        phone: `+964-77${Math.floor(Math.random() * 10000000).toString().padStart(7, "0")}`,
      }).select("id").single();

      if (empData) {
        empMap[u.email] = empData.id;
        createdUsers.push({ email: u.email, name: u.name_en, role: u.role, userId });
      }
    }
    results.users_created = createdUsers.length;

    // Set manager relationships: employees 6-10 report to hassan.ops (manager)
    const managerUserId = userIdMap["hassan.ops@alnahr-demo.local"];
    if (managerUserId) {
      for (const email of ["ahmed.eng@alnahr-demo.local", "zainab.sales@alnahr-demo.local", "kareem.acc@alnahr-demo.local", "layla.admin@alnahr-demo.local", "mustafa.tech@alnahr-demo.local"]) {
        const eid = empMap[email];
        if (eid) await sb.from("employees").update({ manager_user_id: managerUserId }).eq("id", eid);
      }
    }

    // ===== PHASE 4: LEAVE TYPES (trigger should create, but ensure) =====
    const { data: ltCheck } = await sb.from("leave_types").select("id").eq("company_id", CO).limit(1);
    if (!ltCheck || ltCheck.length === 0) {
      await sb.rpc("create_default_leave_types", { p_company_id: CO });
    }
    const { data: leaveTypes } = await sb.from("leave_types").select("id, name").eq("company_id", CO);
    const ltMap: Record<string, string> = {};
    for (const lt of leaveTypes || []) ltMap[lt.name] = lt.id;

    // ===== PHASE 5: DEFAULT WORKFLOWS =====
    const { data: wfCheck } = await sb.from("workflow_templates").select("id").eq("company_id", CO).limit(1);
    if (!wfCheck || wfCheck.length === 0) {
      await sb.rpc("create_default_workflows", { p_company_id: CO });
    }

    // ===== PHASE 6: 6-MONTH ATTENDANCE =====
    const allEmpIds = Object.values(empMap);
    const today = new Date("2026-03-15");
    const sixMonthsAgo = new Date("2025-09-15");
    const bDays = businessDays(sixMonthsAgo, today);
    const attBatch: any[] = [];
    const violBatch: any[] = [];

    for (const empId of allEmpIds) {
      for (const day of bDays) {
        const dateStr = day.toISOString().split("T")[0];
        const isLate = Math.random() < 0.08;
        const isAbsent = Math.random() < 0.03;
        if (isAbsent) continue;

        const ciH = isLate ? 8 + Math.floor(Math.random() * 2) : 8;
        const ciM = isLate ? 15 + Math.floor(Math.random() * 30) : Math.floor(Math.random() * 10);
        const hasOT = Math.random() < 0.1;
        const coH = hasOT ? 17 + Math.floor(Math.random() * 2) : 16;
        const coM = Math.floor(Math.random() * 30);
        const hw = coH - ciH + (coM - ciM) / 60;

        attBatch.push({
          company_id: CO, employee_id: empId, date: dateStr,
          check_in: `${dateStr}T${String(ciH).padStart(2, "0")}:${String(ciM).padStart(2, "0")}:00`,
          check_out: `${dateStr}T${String(coH).padStart(2, "0")}:${String(coM).padStart(2, "0")}:00`,
          hours_worked: Math.round(hw * 100) / 100,
          overtime_hours: hasOT ? Math.round((hw - 8) * 100) / 100 : 0,
        });

        if (isLate) {
          violBatch.push({
            company_id: CO, employee_id: empId, date: dateStr,
            violation_type: "late", minutes_diff: ciM + (ciH - 8) * 60, status: "active",
          });
        }
      }
    }
    for (let i = 0; i < attBatch.length; i += 500) await sb.from("attendance_records").insert(attBatch.slice(i, i + 500));
    for (let i = 0; i < violBatch.length; i += 500) await sb.from("attendance_violations").insert(violBatch.slice(i, i + 500));
    results.attendance = attBatch.length;

    // ===== PHASE 7: LEAVE REQUESTS =====
    const annualId = ltMap["إجازة سنوية"] || Object.values(ltMap)[0];
    const sickId = ltMap["إجازة مرضية"] || Object.values(ltMap)[1];
    const leaveBatch: any[] = [];
    for (const empId of allEmpIds) {
      for (let i = 0; i < 3; i++) {
        const start = randomDate("2025-10-01", "2026-03-10");
        const days = 1 + Math.floor(Math.random() * 5);
        const end = new Date(start);
        end.setDate(end.getDate() + days);
        leaveBatch.push({
          company_id: CO, employee_id: empId,
          leave_type_id: Math.random() > 0.3 ? annualId : sickId,
          start_date: start, end_date: end.toISOString().split("T")[0],
          status: ["approved", "approved", "pending", "rejected"][Math.floor(Math.random() * 4)],
          reason: Math.random() > 0.3 ? "إجازة شخصية" : "مراجعة طبية",
        });
      }
    }
    await sb.from("leave_requests").insert(leaveBatch);
    results.leave_requests = leaveBatch.length;

    // Leave balances
    for (const empId of allEmpIds) {
      if (annualId) await sb.from("leave_balances").insert({ company_id: CO, employee_id: empId, leave_type_id: annualId, year: 2026, entitled_days: 20, used_days: Math.floor(Math.random() * 8), carried_days: Math.floor(Math.random() * 3) });
      if (sickId) await sb.from("leave_balances").insert({ company_id: CO, employee_id: empId, leave_type_id: sickId, year: 2026, entitled_days: 15, used_days: Math.floor(Math.random() * 4), carried_days: 0 });
    }

    // ===== PHASE 8: PAYROLL RUNS (7 states) =====
    const payrollStates = [
      { month: 9, year: 2025, status: "paid", label: "Sep 2025 - Paid" },
      { month: 10, year: 2025, status: "paid", label: "Oct 2025 - Paid" },
      { month: 11, year: 2025, status: "paid", label: "Nov 2025 - Paid" },
      { month: 12, year: 2025, status: "approved", label: "Dec 2025 - Approved" },
      { month: 1, year: 2026, status: "processing", label: "Jan 2026 - Pending HR" },
      { month: 2, year: 2026, status: "processing", label: "Feb 2026 - Pending Finance" },
      { month: 3, year: 2026, status: "draft", label: "Mar 2026 - Draft" },
    ];

    const payrollRunIds: string[] = [];
    const hrUserId = userIdMap["sara.hr@alnahr-demo.local"];
    const finUserId = userIdMap["omar.finance@alnahr-demo.local"];
    const adminUserId = userIdMap["yasir.admin@alnahr-demo.local"];

    for (const ps of payrollStates) {
      const totalGross = allEmpIds.length * 1500000;
      const totalDed = totalGross * 0.07;
      const { data: prData } = await sb.from("payroll_runs").insert({
        company_id: CO, month: ps.month, year: ps.year, status: ps.status,
        total_gross: totalGross, total_deductions: totalDed, total_net: totalGross - totalDed, currency: "IQD",
        approved_by: ps.status === "approved" || ps.status === "paid" ? adminUserId : null,
      }).select("id").single();

      if (prData) {
        payrollRunIds.push(prData.id);

        // Payroll items for each run
        const items: any[] = [];
        for (const eid of allEmpIds) {
          const u = USERS.find(x => empMap[x.email] === eid);
          const sal = u?.salary || 1200000;
          const allow = sal * 0.15;
          const gross = sal + allow;
          const ss = sal * 0.05;
          items.push({
            payroll_run_id: prData.id, employee_id: eid,
            basic_salary: sal, allowances: allow, gross_salary: gross,
            income_tax: 0, social_security_employee: ss, net_salary: gross - ss,
          });
        }
        await sb.from("payroll_items").insert(items);

        // Workflow instances for processing/approved/paid runs
        if (ps.status !== "draft") {
          const { data: wfTemplates } = await sb.from("workflow_templates").select("id").eq("company_id", CO).eq("request_type", "payroll").limit(1);
          const templateId = wfTemplates?.[0]?.id || null;

          let wfStatus = "approved";
          let stepOrder = 2;
          if (ps.status === "processing" && ps.month === 1) { wfStatus = "pending_approval"; stepOrder = 1; }
          if (ps.status === "processing" && ps.month === 2) { wfStatus = "pending_approval"; stepOrder = 2; }

          const { data: wiData } = await sb.from("workflow_instances").insert({
            company_id: CO, template_id: templateId, request_type: "payroll",
            reference_id: prData.id, status: wfStatus, current_step_order: stepOrder,
            requester_user_id: hrUserId,
            approved_at: wfStatus === "approved" ? new Date().toISOString() : null,
          }).select("id").single();

          if (wiData) {
            // Approval actions for completed runs
            const actions: any[] = [];
            if (ps.status === "paid" || ps.status === "approved") {
              actions.push({
                instance_id: wiData.id, company_id: CO, actor_user_id: hrUserId,
                action: "submit", from_status: "draft", to_status: "submitted", step_order: 0,
              });
              actions.push({
                instance_id: wiData.id, company_id: CO, actor_user_id: hrUserId,
                action: "approve", from_status: "submitted", to_status: "pending_approval", step_order: 1,
                comments: "تمت مراجعة كشف الرواتب",
              });
              actions.push({
                instance_id: wiData.id, company_id: CO, actor_user_id: adminUserId,
                action: "approve", from_status: "pending_approval", to_status: "approved", step_order: 2,
                comments: "موافقة نهائية",
              });
            }
            if (ps.status === "processing" && ps.month === 1) {
              actions.push({
                instance_id: wiData.id, company_id: CO, actor_user_id: hrUserId,
                action: "submit", from_status: "draft", to_status: "submitted", step_order: 0,
              });
            }
            if (ps.status === "processing" && ps.month === 2) {
              actions.push({
                instance_id: wiData.id, company_id: CO, actor_user_id: hrUserId,
                action: "submit", from_status: "draft", to_status: "submitted", step_order: 0,
              });
              actions.push({
                instance_id: wiData.id, company_id: CO, actor_user_id: hrUserId,
                action: "approve", from_status: "submitted", to_status: "pending_approval", step_order: 1,
                comments: "تمت مراجعة HR",
              });
            }
            if (actions.length > 0) await sb.from("approval_actions").insert(actions);
          }
        }
      }
    }
    results.payroll_runs = payrollRunIds.length;

    // ===== PHASE 9: CONTRACTS =====
    for (const eid of allEmpIds) {
      const emp = await sb.from("employees").select("hire_date, basic_salary").eq("id", eid).single();
      const hd = emp.data?.hire_date || "2022-01-01";
      const ed = new Date(hd);
      ed.setFullYear(ed.getFullYear() + 2);
      await sb.from("contracts").insert({
        company_id: CO, employee_id: eid, contract_type: "full_time",
        start_date: hd, end_date: ed.toISOString().split("T")[0],
        salary: emp.data?.basic_salary, status: ed < today ? "expired" : "active",
      });
    }

    // ===== PHASE 10: SUBSCRIPTION + AI =====
    // Delete existing subscription for this company
    await sb.from("tenant_subscriptions").delete().eq("company_id", CO);
    const { data: subData } = await sb.from("tenant_subscriptions").insert({
      company_id: CO, plan_id: PLAN_PRO, ai_package_id: AI_PKG_GROWTH,
      billing_cycle: "yearly", status: "active",
      start_date: "2025-06-01", end_date: "2026-05-31", auto_renew: true,
    }).select("id").single();
    results.subscription = subData?.id;

    // AI features
    await sb.from("tenant_ai_features").upsert({
      company_id: CO, ai_hr_assistant: true, ai_workforce_analytics: true,
      ai_recruitment_intelligence: true, ai_gap_analysis: true,
      ai_planning_advisor: true, ai_employee_career_coach: true,
    }, { onConflict: "company_id" });

    // AI quotas
    await sb.from("tenant_ai_quotas").upsert({
      company_id: CO, package: "growth",
      monthly_request_limit: 500, monthly_token_limit: 1500000,
      requests_used: 42, tokens_used: 98000, billing_cycle_start: "2026-03-01",
    }, { onConflict: "company_id" });

    // Add-ons
    await sb.from("tenant_addons").delete().eq("company_id", CO);
    await sb.from("tenant_addons").insert([
      { company_id: CO, addon_key: "extra_storage_50gb", status: "active", custom_price: 25, started_at: "2025-08-01", billing_cycle: "monthly" },
      { company_id: CO, addon_key: "advanced_reports", status: "active", custom_price: 35, started_at: "2025-09-01", billing_cycle: "monthly" },
    ]);

    // ===== PHASE 11: BILLING INVOICES =====
    await sb.from("billing_invoices").delete().eq("company_id", CO);
    const invoices: any[] = [];
    for (let m = 10; m <= 15; m++) {
      const month = ((m - 1) % 12) + 1;
      const year = m <= 12 ? 2025 : 2026;
      const period = `${year}-${String(month).padStart(2, "0")}`;
      invoices.push({
        company_id: CO, subscription_id: subData?.id,
        invoice_number: `INV-ANH-${period}`,
        amount: 79 + 149 + 25 + 35,
        currency: "USD", billing_period: period,
        status: m < 15 ? "paid" : "pending",
        due_date: `${year}-${String(month).padStart(2, "0")}-28`,
        paid_at: m < 15 ? `${year}-${String(month).padStart(2, "0")}-25` : null,
      });
    }
    await sb.from("billing_invoices").insert(invoices);
    results.invoices = invoices.length;

    // ===== PHASE 12: AI SERVICE LOGS =====
    const aiLogs: any[] = [];
    for (let i = 0; i < 20; i++) {
      const user = createdUsers[Math.floor(Math.random() * Math.min(3, createdUsers.length))];
      if (!user) continue;
      aiLogs.push({
        company_id: CO, user_id: user.userId,
        feature: ["hr_assistant", "workforce_analytics", "career_coach"][Math.floor(Math.random() * 3)],
        model: "gemini-2.5-flash", tokens_used: 500 + Math.floor(Math.random() * 3000), cost: 0,
      });
    }
    if (aiLogs.length > 0) await sb.from("ai_service_logs").insert(aiLogs);
    results.ai_logs = aiLogs.length;

    // ===== PHASE 13: SIGNATORIES =====
    await sb.from("company_signatories").delete().eq("company_id", CO);
    await sb.from("company_signatories").insert([
      { company_id: CO, name: "Yasir Abdullah", name_ar: "ياسر عبدالله", role: "CEO", role_ar: "المدير العام", is_active: true, sort_order: 1 },
      { company_id: CO, name: "Sara Al-Husseini", name_ar: "سارة الحسيني", role: "HR Manager", role_ar: "مدير الموارد البشرية", is_active: true, sort_order: 2 },
    ]);

    // ===== PHASE 14: HOLIDAYS =====
    await sb.from("holidays").delete().eq("company_id", CO);
    await sb.from("holidays").insert([
      { company_id: CO, name: "عيد الفطر", date: "2025-03-30", is_recurring: true },
      { company_id: CO, name: "عيد الفطر", date: "2025-03-31", is_recurring: true },
      { company_id: CO, name: "عيد الأضحى", date: "2025-06-06", is_recurring: true },
      { company_id: CO, name: "عيد الأضحى", date: "2025-06-07", is_recurring: true },
      { company_id: CO, name: "رأس السنة الميلادية", date: "2026-01-01", is_recurring: true },
      { company_id: CO, name: "عيد الفطر", date: "2026-03-20", is_recurring: true },
      { company_id: CO, name: "عيد الفطر", date: "2026-03-21", is_recurring: true },
    ]);

    // ===== PHASE 15: SALARY COMPONENTS =====
    await sb.from("salary_components").delete().eq("company_id", CO);
    const components = [
      { name: "الراتب الأساسي", type: "earning", is_taxable: true, is_default: true },
      { name: "بدل سكن", type: "earning", is_taxable: false, is_default: true, percentage: 25 },
      { name: "بدل نقل", type: "earning", is_taxable: false, is_default: true, percentage: 10 },
      { name: "بدل طعام", type: "earning", is_taxable: false, is_default: false, fixed_amount: 150000 },
      { name: "خصم التأمينات", type: "deduction", is_taxable: false, is_default: true, percentage: 5 },
    ];
    for (const c of components) {
      await sb.from("salary_components").insert({ company_id: CO, ...c });
    }

    // ===== SUMMARY =====
    results.test_accounts = createdUsers.map(u => ({
      email: u.email, role: u.role, password: PASSWORD, name: u.name,
      portal: ["tenant_admin", "hr_manager", "hr_officer", "manager"].includes(u.role) ? "tenant" :
              u.role === "finance_manager" ? "tenant" : "employee",
      test_actions: u.role === "tenant_admin" ? "Full admin: settings, payroll approval, billing" :
                    u.role === "hr_manager" ? "Create payroll, approve leave, manage employees" :
                    u.role === "hr_officer" ? "Employee records, attendance" :
                    u.role === "finance_manager" ? "Payroll approval, billing view" :
                    u.role === "manager" ? "Direct reports, leave approval" :
                    "Self-service: leave, docs, AI coach",
    }));

    return new Response(JSON.stringify(results, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message, stack: err.stack }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
