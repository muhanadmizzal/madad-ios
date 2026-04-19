import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CO = "a2b2c3d4-0002-4000-8000-000000000002";
const BR1 = "b2000001-0001-4000-8000-000000000002";
const DEPT_EXEC = "d2000001-0001-4000-8000-000000000002";
const DEPT_HR   = "d2000001-0002-4000-8000-000000000002";
const DEPT_IT   = "d2000001-0006-4000-8000-000000000002";
const PASSWORD  = "Test@2026!";

const allPerms = {
  employee_profiles:true, org_chart:true, attendance:true, leave_management:true,
  payroll:true, documents:true, recruitment:true, onboarding:true, performance:true,
  learning:true, approvals:true, workflows:true, reports:true,
  ai_hr_assistant:true, ai_workforce_analytics:true, ai_employee_career_coach:true,
  custom_documents:true, advanced_analytics:true, projects:true,
};

interface PosDef {
  key: string; title_ar: string; title_en: string; dept: string;
  grade: number; parent: string | null; mgr: boolean; sysRole: string;
}
interface UserDef {
  email: string; name_ar: string; posKey: string; salary: number;
  gender: "male"|"female"; hire_date: string;
}

// ── Clear hierarchy: CEO → HR Mgr → HR Staff, CEO → IT Mgr → Dev + Support ──
const POSITIONS: PosDef[] = [
  { key: "ceo",     title_ar: "المدير العام",            title_en: "CEO",           dept: DEPT_EXEC, grade: 10, parent: null,     mgr: true,  sysRole: "tenant_admin" },
  { key: "hr_mgr",  title_ar: "مدير الموارد البشرية",    title_en: "HR Manager",    dept: DEPT_HR,   grade: 8,  parent: "ceo",    mgr: true,  sysRole: "hr_manager" },
  { key: "hr_staff", title_ar: "موظف موارد بشرية",       title_en: "HR Staff",      dept: DEPT_HR,   grade: 4,  parent: "hr_mgr", mgr: false, sysRole: "hr_officer" },
  { key: "it_mgr",  title_ar: "مدير تقنية المعلومات",    title_en: "IT Manager",    dept: DEPT_IT,   grade: 8,  parent: "ceo",    mgr: true,  sysRole: "manager" },
  { key: "dev",     title_ar: "مطور برمجيات",            title_en: "Developer",     dept: DEPT_IT,   grade: 5,  parent: "it_mgr", mgr: false, sysRole: "employee" },
  { key: "support", title_ar: "فني دعم تقني",           title_en: "IT Support",    dept: DEPT_IT,   grade: 4,  parent: "it_mgr", mgr: false, sysRole: "employee" },
];

const USERS: UserDef[] = [
  { email: "ceo@muataz.test",     name_ar: "أحمد المعتز",   posKey: "ceo",      salary: 4000000, gender: "male",   hire_date: "2020-01-01" },
  { email: "hr@muataz.test",      name_ar: "سارة العلي",    posKey: "hr_mgr",   salary: 2500000, gender: "female", hire_date: "2020-06-01" },
  { email: "hr2@muataz.test",     name_ar: "زينب حسين",    posKey: "hr_staff", salary: 1200000, gender: "female", hire_date: "2022-03-01" },
  { email: "it@muataz.test",      name_ar: "محمد الكاظمي",  posKey: "it_mgr",   salary: 2500000, gender: "male",   hire_date: "2020-08-01" },
  { email: "dev@muataz.test",     name_ar: "علي جاسم",     posKey: "dev",      salary: 1500000, gender: "male",   hire_date: "2021-09-01" },
  { email: "support@muataz.test", name_ar: "نور الهدى",    posKey: "support",  salary: 1100000, gender: "female", hire_date: "2023-01-15" },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const log: Record<string, any> = {};

    // ══════════ PHASE 0 — CLEAN ══════════
    const cleanTables = [
      "approval_actions","workflow_instances","approval_requests",
      "employee_uploaded_documents","generated_documents","document_access_logs","digital_signatures",
      "attendance_violations","attendance_records","attendance_corrections",
      "leave_requests","leave_balances",
      "payroll_items","career_history","employee_penalties","employee_praise",
      "candidate_stage_history","interview_schedules","candidates",
      "appraisals","training_enrollments","training_sessions",
      "onboarding_tasks","employee_notes","employee_assets",
      "employee_emergency_contacts","employee_dependents",
      "contracts","announcements","holidays","shifts","notification_records",
      "billing_invoices","tenant_subscriptions","tenant_features",
      "addon_requests","feature_change_requests",
      "ai_audit_trail","ai_service_logs",
      "business_support_notes","business_audit_logs",
      "audit_logs","custom_field_values","custom_fields",
      "company_signatories","salary_grades",
    ];
    for (const t of cleanTables) {
      try { await sb.from(t).delete().eq("company_id", CO); } catch {}
    }
    try { await sb.from("payroll_runs").delete().eq("company_id", CO); } catch {}
    try { await sb.from("recruitment_jobs").delete().eq("company_id", CO); } catch {}

    await sb.from("employees").update({ position_id: null, manager_user_id: null } as any).eq("company_id", CO);
    await sb.from("employees").delete().eq("company_id", CO);
    await sb.from("positions").update({ parent_position_id: null } as any).eq("company_id", CO);
    await sb.from("positions").delete().eq("company_id", CO);
    await sb.from("departments").update({ parent_department_id: null, manager_position_id: null } as any).eq("company_id", CO);
    await sb.from("departments").delete().eq("company_id", CO);
    await sb.from("branches").delete().eq("company_id", CO);

    const { data: oldTemplates } = await sb.from("workflow_templates").select("id").eq("company_id", CO);
    if (oldTemplates) { for (const t of oldTemplates) await sb.from("workflow_steps").delete().eq("template_id", t.id); }
    await sb.from("workflow_templates").delete().eq("company_id", CO);
    await sb.from("leave_types").delete().eq("company_id", CO);

    const { data: oldProfiles } = await sb.from("profiles").select("user_id").eq("company_id", CO);
    if (oldProfiles) {
      for (const p of oldProfiles) {
        await sb.from("user_roles").delete().eq("user_id", p.user_id);
        try { await sb.auth.admin.deleteUser(p.user_id); } catch {}
      }
    }
    await sb.from("profiles").delete().eq("company_id", CO);
    log.cleanup = "done";

    // ══════════ PHASE 1 — STRUCTURE ══════════
    await sb.from("companies").upsert({
      id: CO, name: "Al-Muataz Group", name_ar: "مجموعة المعتز",
      email: "info@almuataz.local", phone: "+964-750-1234567",
      address: "بغداد - المنصور", sector: "technology",
      default_currency: "IQD", status: "active",
      signatory_name: "أحمد المعتز", signatory_title: "المدير العام",
      working_hours_start: "08:30", working_hours_end: "16:30",
      grace_minutes: 10, overtime_multiplier: 1.5,
    }, { onConflict: "id" });

    await sb.from("branches").upsert([
      { id: BR1, company_id: CO, name: "المقر الرئيسي - بغداد", city: "بغداد", is_headquarters: true },
    ], { onConflict: "id" });

    await sb.from("departments").upsert([
      { id: DEPT_EXEC, company_id: CO, name: "الإدارة العليا",       branch_id: BR1, level: "department" },
      { id: DEPT_HR,   company_id: CO, name: "الموارد البشرية",      branch_id: BR1, level: "department" },
      { id: DEPT_IT,   company_id: CO, name: "تقنية المعلومات",      branch_id: BR1, level: "department" },
    ], { onConflict: "id" });
    log.structure = { branch: 1, departments: 3 };

    // ══════════ PHASE 2 — POSITIONS ══════════
    const posIdMap: Record<string, string> = {};
    for (const p of POSITIONS) {
      const { data } = await sb.from("positions").insert({
        company_id: CO, title_ar: p.title_ar, title_en: p.title_en,
        department_id: p.dept, grade_level: p.grade,
        is_manager: p.mgr, service_permissions: allPerms, status: "filled",
        system_role: p.sysRole,
      }).select("id").single();
      if (data) posIdMap[p.key] = data.id;
    }
    // Set parent_position_id
    for (const p of POSITIONS) {
      if (p.parent && posIdMap[p.key] && posIdMap[p.parent]) {
        await sb.from("positions").update({ parent_position_id: posIdMap[p.parent] }).eq("id", posIdMap[p.key]);
      }
    }
    // Set department manager_position_id
    await sb.from("departments").update({ manager_position_id: posIdMap["ceo"] }).eq("id", DEPT_EXEC);
    await sb.from("departments").update({ manager_position_id: posIdMap["hr_mgr"] }).eq("id", DEPT_HR);
    await sb.from("departments").update({ manager_position_id: posIdMap["it_mgr"] }).eq("id", DEPT_IT);
    log.positions = Object.keys(posIdMap).length;

    // ══════════ PHASE 3 — USERS + EMPLOYEES ══════════
    const empIds: string[] = [];
    for (const u of USERS) {
      const posId = posIdMap[u.posKey];
      const posDef = POSITIONS.find(p => p.key === u.posKey)!;

      // Delete existing auth user by email if exists, then create fresh
      const { data: existingUsers } = await sb.auth.admin.listUsers();
      const existingUser = existingUsers?.users?.find((eu: any) => eu.email === u.email);
      if (existingUser) {
        await sb.from("user_roles").delete().eq("user_id", existingUser.id);
        await sb.from("profiles").delete().eq("user_id", existingUser.id);
        try { await sb.auth.admin.deleteUser(existingUser.id); } catch {}
      }

      const { data: authUser, error: authErr } = await sb.auth.admin.createUser({
        email: u.email, password: PASSWORD, email_confirm: true,
        user_metadata: { full_name: u.name_ar },
      });
      if (authErr || !authUser?.user) { log[`err_${u.email}`] = authErr?.message; continue; }
      const uid = authUser.user.id;

      // Profile
      await sb.from("profiles").upsert({
        user_id: uid, company_id: CO, full_name: u.name_ar, role: posDef.sysRole,
      }, { onConflict: "user_id" });

      // Role
      await sb.from("user_roles").upsert({
        user_id: uid, role: posDef.sysRole as any,
      }, { onConflict: "user_id,role" });

      // Employee
      const { data: emp } = await sb.from("employees").insert({
        company_id: CO, user_id: uid, name_ar: u.name_ar,
        email: u.email, position: posDef.title_ar, position_id: posId,
        department_id: posDef.dept, branch_id: BR1,
        basic_salary: u.salary, gender: u.gender, hire_date: u.hire_date,
        status: "active", nationality: "عراقي",
      }).select("id").single();
      if (emp) empIds.push(emp.id);
    }
    log.employees = empIds.length;

    // ══════════ PHASE 4 — FEATURES ══════════
    const featureKeys = [
      "employee_profiles","org_chart","attendance","leave_management","payroll",
      "documents","recruitment","onboarding","performance","learning","approvals",
      "workflows","reports","ai_hr_assistant","ai_workforce_analytics",
      "ai_employee_career_coach","custom_documents","advanced_analytics","projects",
      "employee_portal","contracts","holidays","shifts","penalties_praise",
      "salary_grades","exit_management","training","announcements","branches",
      "departments","support","billing","audit_logs","permissions","employee_archive",
    ];
    const featureRows = featureKeys.map(k => ({
      company_id: CO, feature_key: k, is_enabled: true,
    }));
    await sb.from("tenant_features").upsert(featureRows, { onConflict: "company_id,feature_key" });
    log.features = featureKeys.length;

    // ══════════ PHASE 5 — LEAVE TYPES ══════════
    await sb.from("leave_types").insert([
      { company_id: CO, name: "إجازة سنوية",    name_en: "Annual Leave",   default_days: 20, is_paid: true },
      { company_id: CO, name: "إجازة مرضية",    name_en: "Sick Leave",     default_days: 14, is_paid: true },
      { company_id: CO, name: "إجازة بدون راتب", name_en: "Unpaid Leave",   default_days: 30, is_paid: false },
    ]);
    log.leave_types = 3;

    return new Response(JSON.stringify({
      success: true,
      message: "Al-Muataz demo data created successfully",
      log,
      accounts: USERS.map(u => ({
        email: u.email,
        password: PASSWORD,
        role: POSITIONS.find(p => p.key === u.posKey)!.title_en,
        name: u.name_ar,
      })),
      hierarchy: `
        المدير العام (أحمد المعتز) — ceo@muataz.test
        ├── مدير الموارد البشرية (سارة العلي) — hr@muataz.test
        │   └── موظف موارد بشرية (زينب حسين) — hr2@muataz.test
        ├── مدير تقنية المعلومات (محمد الكاظمي) — it@muataz.test
        │   ├── مطور برمجيات (علي جاسم) — dev@muataz.test
        │   └── فني دعم تقني (نور الهدى) — support@muataz.test
      `,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500,
    });
  }
});
