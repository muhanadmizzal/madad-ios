import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── Fixed IDs ──
const CO = "a1b2c3d4-0001-4000-8000-000000000001";
const BR1 = "b1000001-0001-4000-8000-000000000001"; // Baghdad HQ
const BR2 = "b1000001-0002-4000-8000-000000000001"; // Basra Branch

const DEPT_MGMT = "d1000001-0001-4000-8000-000000000001";
const DEPT_HR   = "d1000001-0002-4000-8000-000000000001";
const DEPT_FIN  = "d1000001-0003-4000-8000-000000000001";
const DEPT_OPS  = "d1000001-0004-4000-8000-000000000001";
const DEPT_SALES= "d1000001-0005-4000-8000-000000000001";

const PASSWORD = "Demo@2026!";

// ── 10 Employees across 2 branches ──
interface UserDef {
  email: string; name_ar: string; name_en: string; role: string;
  dept: string; branch: string; posTitle: string; salary: number;
  gender: "male"|"female"; hire_date: string;
}

const USERS: UserDef[] = [
  // Branch 1 — Baghdad HQ (5 employees)
  { email: "ali.admin@rafidain-demo.local", name_ar: "علي حسن الخزرجي", name_en: "Ali Hassan", role: "tenant_admin",
    dept: DEPT_MGMT, branch: BR1, posTitle: "المدير العام", salary: 3500000, gender: "male", hire_date: "2019-03-01" },
  { email: "sara.hr@rafidain-demo.local", name_ar: "سارة الجبوري", name_en: "Sara Al-Jabouri", role: "hr_manager",
    dept: DEPT_HR, branch: BR1, posTitle: "مدير الموارد البشرية", salary: 2200000, gender: "female", hire_date: "2020-01-15" },
  { email: "omar.finance@rafidain-demo.local", name_ar: "عمر الراوي", name_en: "Omar Al-Rawi", role: "manager",
    dept: DEPT_FIN, branch: BR1, posTitle: "مدير المالية", salary: 2500000, gender: "male", hire_date: "2020-06-01" },
  { email: "hassan.ops@rafidain-demo.local", name_ar: "حسن المالكي", name_en: "Hassan Al-Maliki", role: "manager",
    dept: DEPT_OPS, branch: BR1, posTitle: "مشرف العمليات", salary: 1800000, gender: "male", hire_date: "2021-02-01" },
  { email: "mustafa.emp@rafidain-demo.local", name_ar: "مصطفى العاني", name_en: "Mustafa Al-Ani", role: "employee",
    dept: DEPT_OPS, branch: BR1, posTitle: "فني عمليات", salary: 1200000, gender: "male", hire_date: "2022-05-15" },

  // Branch 2 — Basra (5 employees)
  { email: "kareem.br2@rafidain-demo.local", name_ar: "كريم العبيدي", name_en: "Kareem Al-Obaidi", role: "manager",
    dept: DEPT_OPS, branch: BR2, posTitle: "مدير فرع البصرة", salary: 2300000, gender: "male", hire_date: "2020-09-01" },
  { email: "mona.hr2@rafidain-demo.local", name_ar: "منى رشيد", name_en: "Mona Rashid", role: "hr_officer",
    dept: DEPT_HR, branch: BR2, posTitle: "منسق موارد بشرية", salary: 1300000, gender: "female", hire_date: "2021-07-01" },
  { email: "zainab.sales@rafidain-demo.local", name_ar: "زينب الموسوي", name_en: "Zainab Al-Mousawi", role: "employee",
    dept: DEPT_SALES, branch: BR2, posTitle: "مسؤول مبيعات", salary: 1400000, gender: "female", hire_date: "2021-11-15" },
  { email: "ahmed.field@rafidain-demo.local", name_ar: "أحمد السعدي", name_en: "Ahmed Al-Saadi", role: "employee",
    dept: DEPT_OPS, branch: BR2, posTitle: "فني ميداني", salary: 1100000, gender: "male", hire_date: "2022-08-01" },
  { email: "fatima.emp@rafidain-demo.local", name_ar: "فاطمة الكاظمي", name_en: "Fatima Al-Kazimi", role: "employee",
    dept: DEPT_FIN, branch: BR2, posTitle: "محاسب", salary: 1300000, gender: "female", hire_date: "2023-01-15" },
];

function randomDate(s: string, e: string): string {
  return new Date(new Date(s).getTime() + Math.random() * (new Date(e).getTime() - new Date(s).getTime())).toISOString().split("T")[0];
}

function businessDays(start: Date, end: Date): Date[] {
  const days: Date[] = [];
  const d = new Date(start);
  while (d <= end) {
    if (d.getDay() !== 5 && d.getDay() !== 6) days.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return days;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const log: Record<string, any> = {};

    // ╔══════════════════════════════════════════════════════════════╗
    // ║  PHASE 0 — CLEAN OLD TAMKEEN DATA                          ║
    // ╚══════════════════════════════════════════════════════════════╝

    // Delete dependent data first (order matters for FK constraints)
    // Comprehensive cleanup: delete ALL data referencing this company
    // Order matters: child tables first to avoid FK violations
    const cleanTables = [
      // Workflow/approval chain
      "approval_actions", "workflow_instances", "approval_requests",
      // Documents
      "employee_uploaded_documents", "generated_documents", "document_access_logs", "digital_signatures",
      // Attendance
      "attendance_violations", "attendance_records", "attendance_corrections",
      // Leave
      "leave_requests", "leave_balances",
      // Payroll (items before runs)
      "payroll_items",
      // Career & penalties
      "career_history", "employee_penalties", "employee_praise",
      // Recruitment (candidates before jobs)
      "candidate_stage_history", "interview_schedules", "candidates",
      // Performance & training
      "appraisals", "training_enrollments", "training_sessions",
      // Employee sub-tables
      "onboarding_tasks", "employee_notes", "employee_assets",
      "employee_emergency_contacts", "employee_dependents",
      // Contracts
      "contracts",
      // Misc
      "announcements", "holidays", "shifts", "notification_records",
      // Billing & subscription
      "billing_invoices", "tenant_subscriptions", "tenant_features",
      "addon_requests", "feature_change_requests",
      // AI & audit
      "ai_audit_trail", "ai_service_logs",
      "business_support_notes", "business_audit_logs",
      "audit_logs", "custom_field_values", "custom_fields",
      "company_signatories",
      // Salary grades
      "salary_grades",
    ];

    for (const t of cleanTables) {
      try { await sb.from(t).delete().eq("company_id", CO); } catch (e: any) {
        // Some tables may not exist or have different FK patterns
      }
    }

    // Payroll runs (after items deleted)
    try { await sb.from("payroll_runs").delete().eq("company_id", CO); } catch {}
    // Recruitment jobs (after candidates deleted)
    try { await sb.from("recruitment_jobs").delete().eq("company_id", CO); } catch {}

    // Clear employee position refs before deleting positions
    await sb.from("employees").update({ position_id: null, manager_user_id: null }).eq("company_id", CO);
    // Now delete employees
    await sb.from("employees").delete().eq("company_id", CO);

    // Delete positions
    // First clear parent refs to avoid FK issues
    await sb.from("positions").update({ parent_position_id: null }).eq("company_id", CO);
    await sb.from("positions").delete().eq("company_id", CO);

    // Delete departments (clear parent refs first)
    await sb.from("departments").update({ parent_department_id: null, manager_position_id: null }).eq("company_id", CO);
    await sb.from("departments").delete().eq("company_id", CO);

    // Delete branches
    await sb.from("branches").delete().eq("company_id", CO);

    // Delete workflow templates & steps
    const { data: oldTemplates } = await sb.from("workflow_templates").select("id").eq("company_id", CO);
    if (oldTemplates) {
      for (const t of oldTemplates) await sb.from("workflow_steps").delete().eq("template_id", t.id);
    }
    await sb.from("workflow_templates").delete().eq("company_id", CO);

    // Delete leave types
    await sb.from("leave_types").delete().eq("company_id", CO);

    // Delete old user_roles for users that belonged to this company
    const { data: oldProfiles } = await sb.from("profiles").select("user_id").eq("company_id", CO);
    if (oldProfiles) {
      for (const p of oldProfiles) {
        await sb.from("user_roles").delete().eq("user_id", p.user_id);
        // Delete auth user
        try { await sb.auth.admin.deleteUser(p.user_id); } catch {}
      }
    }
    await sb.from("profiles").delete().eq("company_id", CO);

    log.cleanup = "done";

    // ╔══════════════════════════════════════════════════════════════╗
    // ║  PHASE 1 — COMPANY + STRUCTURE                             ║
    // ╚══════════════════════════════════════════════════════════════╝

    await sb.from("companies").upsert({
      id: CO,
      name: "Rafidain Industrial Group",
      name_ar: "مجموعة الرافدين الصناعية",
      email: "info@rafidain-demo.local",
      phone: "+964-770-1234567",
      address: "بغداد - الكرادة - شارع 52",
      sector: "industrial",
      default_currency: "IQD",
      status: "active",
      signatory_name: "علي حسن الخزرجي",
      signatory_title: "المدير العام",
      working_hours_start: "08:00",
      working_hours_end: "16:00",
      grace_minutes: 15,
      overtime_multiplier: 1.5,
    }, { onConflict: "id" });

    // Branches
    await sb.from("branches").upsert([
      { id: BR1, company_id: CO, name: "المقر الرئيسي - بغداد", city: "بغداد", is_headquarters: true, address: "الكرادة - شارع 52" },
      { id: BR2, company_id: CO, name: "فرع البصرة", city: "البصرة", is_headquarters: false, address: "المعقل - شارع الكورنيش" },
    ], { onConflict: "id" });

    // Departments
    await sb.from("departments").upsert([
      { id: DEPT_MGMT, company_id: CO, name: "الإدارة العامة", branch_id: BR1, level: "department" },
      { id: DEPT_HR,   company_id: CO, name: "الموارد البشرية", branch_id: BR1, level: "department" },
      { id: DEPT_FIN,  company_id: CO, name: "المالية والمحاسبة", branch_id: BR1, level: "department" },
      { id: DEPT_OPS,  company_id: CO, name: "العمليات والإنتاج", branch_id: BR1, level: "department" },
      { id: DEPT_SALES,company_id: CO, name: "المبيعات وخدمة العملاء", branch_id: BR2, level: "department" },
    ], { onConflict: "id" });

    log.structure = { branches: 2, departments: 5 };

    // ╔══════════════════════════════════════════════════════════════╗
    // ║  PHASE 2 — POSITIONS (hierarchy)                           ║
    // ╚══════════════════════════════════════════════════════════════╝

    const POS_DEFS = [
      { key: "ceo", title_ar: "المدير العام", title_en: "General Manager", dept: DEPT_MGMT, grade: 10, min: 3000000, max: 5000000, parent: null as string|null, mgr: true,
        sp: null },
      { key: "hr_mgr", title_ar: "مدير الموارد البشرية", title_en: "HR Manager", dept: DEPT_HR, grade: 8, min: 1800000, max: 2800000, parent: "ceo", mgr: true,
        sp: { employee_profiles:true, org_chart:true, attendance:true, leave_management:true, payroll:true, documents:true, recruitment:true, onboarding:true, performance:true, learning:true, approvals:true, workflows:true, reports:true, ai_hr_assistant:true, ai_workforce_analytics:true, custom_documents:true } },
      { key: "fin_mgr", title_ar: "مدير المالية", title_en: "Finance Manager", dept: DEPT_FIN, grade: 8, min: 2000000, max: 3000000, parent: "ceo", mgr: true,
        sp: { payroll:true, salary_workflow:true, payroll_workflow:true, reports:true, approvals:true, documents:true } },
      { key: "ops_sup", title_ar: "مشرف العمليات", title_en: "Operations Supervisor", dept: DEPT_OPS, grade: 6, min: 1500000, max: 2200000, parent: "ceo", mgr: true,
        sp: { employee_profiles:true, attendance:true, leave_management:true, approvals:true, performance:true } },
      { key: "ops_tech", title_ar: "فني عمليات", title_en: "Operations Technician", dept: DEPT_OPS, grade: 4, min: 900000, max: 1500000, parent: "ops_sup", mgr: false,
        sp: { attendance:true, leave_management:true, documents:true } },
      { key: "br2_mgr", title_ar: "مدير فرع البصرة", title_en: "Basra Branch Manager", dept: DEPT_OPS, grade: 8, min: 2000000, max: 2800000, parent: "ceo", mgr: true,
        sp: { employee_profiles:true, attendance:true, leave_management:true, payroll:true, approvals:true, reports:true, recruitment:true, documents:true, performance:true } },
      { key: "hr_coord", title_ar: "منسق موارد بشرية", title_en: "HR Coordinator", dept: DEPT_HR, grade: 5, min: 1000000, max: 1600000, parent: "hr_mgr", mgr: false,
        sp: { employee_profiles:true, attendance:true, leave_management:true, documents:true, recruitment:true, onboarding:true, approvals:true } },
      { key: "sales_off", title_ar: "مسؤول مبيعات", title_en: "Sales Officer", dept: DEPT_SALES, grade: 5, min: 1100000, max: 1700000, parent: "br2_mgr", mgr: false,
        sp: { attendance:true, leave_management:true, documents:true } },
      { key: "field_tech", title_ar: "فني ميداني", title_en: "Field Technician", dept: DEPT_OPS, grade: 4, min: 900000, max: 1400000, parent: "br2_mgr", mgr: false,
        sp: { attendance:true, leave_management:true, documents:true } },
      { key: "accountant", title_ar: "محاسب", title_en: "Accountant", dept: DEPT_FIN, grade: 5, min: 1000000, max: 1600000, parent: "fin_mgr", mgr: false,
        sp: { payroll:true, documents:true, attendance:true, leave_management:true } },
    ];

    // Map user email -> position key for linking
    const USER_POS_MAP: Record<string, string> = {
      "ali.admin@rafidain-demo.local": "ceo",
      "sara.hr@rafidain-demo.local": "hr_mgr",
      "omar.finance@rafidain-demo.local": "fin_mgr",
      "hassan.ops@rafidain-demo.local": "ops_sup",
      "mustafa.emp@rafidain-demo.local": "ops_tech",
      "kareem.br2@rafidain-demo.local": "br2_mgr",
      "mona.hr2@rafidain-demo.local": "hr_coord",
      "zainab.sales@rafidain-demo.local": "sales_off",
      "ahmed.field@rafidain-demo.local": "field_tech",
      "fatima.emp@rafidain-demo.local": "accountant",
    };

    const posIdMap: Record<string, string> = {};
    // Insert positions without parents first, then update
    for (const p of POS_DEFS) {
      const { data } = await sb.from("positions").insert({
        company_id: CO, title_ar: p.title_ar, title_en: p.title_en,
        department_id: p.dept, grade_level: p.grade, min_salary: p.min, max_salary: p.max,
        is_manager: p.mgr, service_permissions: p.sp, status: "filled",
      }).select("id").single();
      if (data) posIdMap[p.key] = data.id;
    }

    // Set parent_position_id
    for (const p of POS_DEFS) {
      if (p.parent && posIdMap[p.key] && posIdMap[p.parent]) {
        await sb.from("positions").update({ parent_position_id: posIdMap[p.parent] }).eq("id", posIdMap[p.key]);
      }
    }

    // Set department managers
    await sb.from("departments").update({ manager_position_id: posIdMap["ceo"] }).eq("id", DEPT_MGMT);
    await sb.from("departments").update({ manager_position_id: posIdMap["hr_mgr"] }).eq("id", DEPT_HR);
    await sb.from("departments").update({ manager_position_id: posIdMap["fin_mgr"] }).eq("id", DEPT_FIN);
    await sb.from("departments").update({ manager_position_id: posIdMap["ops_sup"] }).eq("id", DEPT_OPS);
    await sb.from("departments").update({ manager_position_id: posIdMap["br2_mgr"] }).eq("id", DEPT_SALES);

    // Set branch managers
    await sb.from("branches").update({ manager_position_id: posIdMap["ceo"] }).eq("id", BR1);
    await sb.from("branches").update({ manager_position_id: posIdMap["br2_mgr"] }).eq("id", BR2);

    log.positions = Object.keys(posIdMap).length;

    // ╔══════════════════════════════════════════════════════════════╗
    // ║  PHASE 3 — AUTH USERS + PROFILES + ROLES + EMPLOYEES       ║
    // ╚══════════════════════════════════════════════════════════════╝

    const createdUsers: { email:string; name:string; role:string; branch:string; portal:string }[] = [];
    const empIdMap: Record<string, string> = {}; // email -> employee_id
    const userIdMap: Record<string, string> = {}; // email -> user_id

    for (const u of USERS) {
      // Create auth user
      const { data: authData, error: authErr } = await sb.auth.admin.createUser({
        email: u.email, password: PASSWORD, email_confirm: true,
        user_metadata: { full_name: u.name_en },
      });

      let userId: string;
      if (authErr) {
        if (authErr.message?.includes("already been registered")) {
          const { data: list } = await sb.auth.admin.listUsers({ page: 1, perPage: 1000 });
          const found = list?.users?.find(x => x.email === u.email);
          if (!found) continue;
          userId = found.id;
          // Clean up old profile associations
          await sb.from("user_roles").delete().eq("user_id", userId);
          const { data: oldP } = await sb.from("profiles").select("company_id").eq("user_id", userId).maybeSingle();
          if (oldP && oldP.company_id !== CO) {
            try { await sb.from("companies").delete().eq("id", oldP.company_id); } catch {}
          }
        } else continue;
      } else {
        userId = authData.user.id;
        // Clean auto-created company from trigger
        const { data: autoP } = await sb.from("profiles").select("company_id").eq("user_id", userId).maybeSingle();
        if (autoP && autoP.company_id !== CO) {
          try { await sb.from("companies").delete().eq("id", autoP.company_id); } catch {}
        }
      }

      userIdMap[u.email] = userId;

      // Profile
      await sb.from("profiles").upsert({ user_id: userId, company_id: CO, full_name: u.name_en }, { onConflict: "user_id" });

      // Role
      const scope = ["super_admin","business_admin"].includes(u.role) ? "platform" : "tenant";
      await sb.from("user_roles").upsert({
        user_id: userId, role: u.role, scope_type: scope, tenant_id: scope === "platform" ? null : CO,
      }, { onConflict: "user_id,role" });

      // Employee
      const posKey = USER_POS_MAP[u.email];
      const posId = posKey ? posIdMap[posKey] : null;

      const { data: empData } = await sb.from("employees").insert({
        company_id: CO, name_ar: u.name_ar, name_en: u.name_en, email: u.email,
        department_id: u.dept, branch_id: u.branch, position: u.posTitle,
        position_id: posId, basic_salary: u.salary, currency: "IQD",
        user_id: userId, status: "active", gender: u.gender,
        nationality: "عراقي", hire_date: u.hire_date, contract_type: "full_time",
        phone: `+964-77${Math.floor(Math.random()*10000000).toString().padStart(7,"0")}`,
      }).select("id").single();

      if (empData) empIdMap[u.email] = empData.id;

      const portal = ["tenant_admin","hr_manager","hr_officer","manager"].includes(u.role) ? "tenant" : "employee";
      const brLabel = u.branch === BR1 ? "بغداد" : "البصرة";
      createdUsers.push({ email: u.email, name: u.name_ar, role: u.role, branch: brLabel, portal });
    }

    // Set manager_user_id relationships
    const mgrMap: Record<string, string> = {
      // CEO's direct reports: HR Mgr, Finance Mgr, Ops Sup, BR2 Mgr
      "sara.hr@rafidain-demo.local": "ali.admin@rafidain-demo.local",
      "omar.finance@rafidain-demo.local": "ali.admin@rafidain-demo.local",
      "hassan.ops@rafidain-demo.local": "ali.admin@rafidain-demo.local",
      "kareem.br2@rafidain-demo.local": "ali.admin@rafidain-demo.local",
      // Ops Sup's reports
      "mustafa.emp@rafidain-demo.local": "hassan.ops@rafidain-demo.local",
      // HR Mgr's reports
      "mona.hr2@rafidain-demo.local": "sara.hr@rafidain-demo.local",
      // BR2 Mgr's reports
      "zainab.sales@rafidain-demo.local": "kareem.br2@rafidain-demo.local",
      "ahmed.field@rafidain-demo.local": "kareem.br2@rafidain-demo.local",
      // Finance Mgr's reports
      "fatima.emp@rafidain-demo.local": "omar.finance@rafidain-demo.local",
    };
    for (const [empEmail, mgrEmail] of Object.entries(mgrMap)) {
      const eid = empIdMap[empEmail]; const muid = userIdMap[mgrEmail];
      if (eid && muid) await sb.from("employees").update({ manager_user_id: muid }).eq("id", eid);
    }

    log.users = createdUsers.length;

    // ╔══════════════════════════════════════════════════════════════╗
    // ║  PHASE 4 — LEAVE TYPES + WORKFLOW TEMPLATES                ║
    // ╚══════════════════════════════════════════════════════════════╝

    // Leave types
    const leaveTypeDefs = [
      { name: "إجازة سنوية", days_per_year: 20, is_paid: true, requires_approval: true },
      { name: "إجازة مرضية", days_per_year: 15, is_paid: true, requires_approval: true },
      { name: "إجازة طارئة", days_per_year: 5, is_paid: true, requires_approval: true },
      { name: "إجازة بدون راتب", days_per_year: 30, is_paid: false, requires_approval: true },
      { name: "إجازة أمومة", days_per_year: 72, is_paid: true, requires_approval: true },
    ];
    const ltMap: Record<string, string> = {};
    for (const lt of leaveTypeDefs) {
      const { data } = await sb.from("leave_types").insert({ company_id: CO, ...lt }).select("id").single();
      if (data) ltMap[lt.name] = data.id;
    }

    // Workflow templates
    const wfDefs = [
      { name: "سير عمل الإجازات", request_type: "leave", desc: "موافقة المدير المباشر ثم HR",
        steps: [
          { name: "موافقة المدير المباشر", step_order: 1, routing_mode: "manager_chain", approver_role: "manager" },
          { name: "موافقة الموارد البشرية", step_order: 2, approver_role: "hr_manager", routing_mode: "role" },
        ] },
      { name: "سير عمل الشهادات", request_type: "certificate", desc: "موافقة HR مباشرة",
        auto_generate_doc_type: "experience_certificate",
        steps: [
          { name: "موافقة الموارد البشرية", step_order: 1, approver_role: "hr_manager", routing_mode: "role" },
        ] },
      { name: "سير عمل الرواتب", request_type: "payroll", desc: "موافقة HR ثم المدير العام",
        steps: [
          { name: "مراجعة HR", step_order: 1, approver_role: "hr_manager", routing_mode: "role" },
          { name: "موافقة المدير العام", step_order: 2, approver_role: "tenant_admin", routing_mode: "role" },
        ] },
      { name: "سير عمل عام", request_type: "general", desc: "المدير المباشر ثم HR",
        steps: [
          { name: "موافقة المدير المباشر", step_order: 1, routing_mode: "manager_chain", approver_role: "manager" },
          { name: "موافقة الموارد البشرية", step_order: 2, approver_role: "hr_manager", routing_mode: "role" },
        ] },
    ];

    const wfIdMap: Record<string, string> = {};
    for (const wf of wfDefs) {
      const { data: tData } = await sb.from("workflow_templates").insert({
        company_id: CO, name: wf.name, request_type: wf.request_type,
        description: wf.desc, is_active: true,
        auto_generate_doc_type: (wf as any).auto_generate_doc_type || null,
      }).select("id").single();

      if (tData) {
        wfIdMap[wf.request_type] = tData.id;
        for (const s of wf.steps) {
          await sb.from("workflow_steps").insert({
            template_id: tData.id, step_order: s.step_order, name: s.name,
            approver_role: s.approver_role, routing_mode: s.routing_mode,
          });
        }
      }
    }
    log.workflows = Object.keys(wfIdMap).length;

    // ╔══════════════════════════════════════════════════════════════╗
    // ║  PHASE 5 — TENANT FEATURES (subscription basket)           ║
    // ╚══════════════════════════════════════════════════════════════╝

    const enabledFeatures = [
      "hr_core","employee_profiles","employee_management","attendance","leave_management",
      "payroll","recruitment","onboarding","performance","learning","training",
      "documents","org_chart","multi_branch","reports","approvals","workflows",
      "advanced_analytics","custom_documents","payroll_workflow","salary_workflow","projects",
      // AI features (some enabled, some not)
      "ai_hr_assistant","ai_workforce_analytics","ai_employee_career_coach",
    ];
    const disabledFeatures = ["ai_recruitment_intelligence","ai_gap_analysis","ai_planning_advisor","api_access"];

    const adminUserId = userIdMap["ali.admin@rafidain-demo.local"];
    for (const fk of enabledFeatures) {
      await sb.from("tenant_features").insert({
        company_id: CO, feature_key: fk, status: "active", activated_by: adminUserId,
      });
    }
    log.features_enabled = enabledFeatures.length;
    log.features_disabled = disabledFeatures;

    // ╔══════════════════════════════════════════════════════════════╗
    // ║  PHASE 6 — 6 MONTHS ATTENDANCE DATA                        ║
    // ╚══════════════════════════════════════════════════════════════╝

    const allEmpIds = Object.values(empIdMap);
    const today = new Date("2026-03-28");
    const sixAgo = new Date("2025-09-28");
    const bDays = businessDays(sixAgo, today);
    const attBatch: any[] = [];
    const violBatch: any[] = [];

    for (const empId of allEmpIds) {
      for (const day of bDays) {
        const dateStr = day.toISOString().split("T")[0];
        const isLate = Math.random() < 0.07;
        if (Math.random() < 0.03) continue; // absent

        const ciH = isLate ? 8 + Math.floor(Math.random()*2) : 8;
        const ciM = isLate ? 16 + Math.floor(Math.random()*30) : Math.floor(Math.random()*10);
        const hasOT = Math.random() < 0.08;
        const coH = hasOT ? 17 + Math.floor(Math.random()*2) : 16;
        const coM = Math.floor(Math.random()*30);
        const hw = coH - ciH + (coM - ciM)/60;

        attBatch.push({
          company_id: CO, employee_id: empId, date: dateStr,
          check_in: `${dateStr}T${String(ciH).padStart(2,"0")}:${String(ciM).padStart(2,"0")}:00`,
          check_out: `${dateStr}T${String(coH).padStart(2,"0")}:${String(coM).padStart(2,"0")}:00`,
          hours_worked: Math.round(hw*100)/100, overtime_hours: hasOT ? Math.round((hw-8)*100)/100 : 0,
        });

        if (isLate) {
          violBatch.push({
            company_id: CO, employee_id: empId, date: dateStr,
            violation_type: "late", minutes_diff: ciM + (ciH-8)*60, status: "active",
          });
        }
      }
    }
    for (let i=0; i<attBatch.length; i+=500) await sb.from("attendance_records").insert(attBatch.slice(i,i+500));
    for (let i=0; i<violBatch.length; i+=500) await sb.from("attendance_violations").insert(violBatch.slice(i,i+500));
    log.attendance = attBatch.length;

    // ╔══════════════════════════════════════════════════════════════╗
    // ║  PHASE 7 — LEAVE REQUESTS + BALANCES                      ║
    // ╚══════════════════════════════════════════════════════════════╝

    const annualId = ltMap["إجازة سنوية"];
    const sickId = ltMap["إجازة مرضية"];
    const leaveBatch: any[] = [];
    const leaveStatuses = ["approved","approved","approved","pending","rejected"];

    for (const empId of allEmpIds) {
      for (let i=0; i<3; i++) {
        const start = randomDate("2025-10-01","2026-03-20");
        const days = 1 + Math.floor(Math.random()*5);
        const end = new Date(start); end.setDate(end.getDate()+days);
        leaveBatch.push({
          company_id: CO, employee_id: empId,
          leave_type_id: Math.random()>0.3 ? annualId : sickId,
          start_date: start, end_date: end.toISOString().split("T")[0],
          status: leaveStatuses[Math.floor(Math.random()*leaveStatuses.length)],
          reason: Math.random()>0.3 ? "إجازة شخصية" : "مراجعة طبية",
        });
      }
    }
    await sb.from("leave_requests").insert(leaveBatch);

    // Balances
    for (const empId of allEmpIds) {
      if (annualId) await sb.from("leave_balances").insert({ company_id:CO, employee_id:empId, leave_type_id:annualId, year:2026, entitled_days:20, used_days:Math.floor(Math.random()*10), carried_days:Math.floor(Math.random()*3) });
      if (sickId) await sb.from("leave_balances").insert({ company_id:CO, employee_id:empId, leave_type_id:sickId, year:2026, entitled_days:15, used_days:Math.floor(Math.random()*4), carried_days:0 });
    }
    log.leave_requests = leaveBatch.length;

    // ╔══════════════════════════════════════════════════════════════╗
    // ║  PHASE 8 — PAYROLL (6 months)                              ║
    // ╚══════════════════════════════════════════════════════════════╝

    const payrollStates = [
      { month:10, year:2025, status:"paid" },
      { month:11, year:2025, status:"paid" },
      { month:12, year:2025, status:"paid" },
      { month:1, year:2026, status:"approved" },
      { month:2, year:2026, status:"processing" },
      { month:3, year:2026, status:"draft" },
    ];

    for (const ps of payrollStates) {
      const totalGross = allEmpIds.length * 1800000;
      const totalDed = totalGross * 0.05;
      const { data: prData } = await sb.from("payroll_runs").insert({
        company_id:CO, month:ps.month, year:ps.year, status:ps.status,
        total_gross:totalGross, total_deductions:totalDed, total_net:totalGross-totalDed, currency:"IQD",
        approved_by: ["paid","approved"].includes(ps.status) ? adminUserId : null,
      }).select("id").single();

      if (prData) {
        const items: any[] = [];
        for (const u of USERS) {
          const eid = empIdMap[u.email]; if (!eid) continue;
          const allow = u.salary * 0.15;
          const gross = u.salary + allow;
          const ss = u.salary * 0.05;
          items.push({
            payroll_run_id: prData.id, employee_id: eid,
            basic_salary: u.salary, allowances: allow, gross_salary: gross,
            income_tax: 0, social_security_employee: ss, net_salary: gross - ss,
          });
        }
        await sb.from("payroll_items").insert(items);
      }
    }
    log.payroll_runs = payrollStates.length;

    // ╔══════════════════════════════════════════════════════════════╗
    // ║  PHASE 9 — CONTRACTS                                       ║
    // ╚══════════════════════════════════════════════════════════════╝

    for (const u of USERS) {
      const eid = empIdMap[u.email]; if (!eid) continue;
      const endDate = new Date(u.hire_date);
      endDate.setFullYear(endDate.getFullYear()+2);
      await sb.from("contracts").insert({
        company_id:CO, employee_id:eid, contract_type:"full_time",
        start_date:u.hire_date, end_date:endDate.toISOString().split("T")[0],
        salary:u.salary, status: endDate<today?"expired":"active",
      });
    }

    // ╔══════════════════════════════════════════════════════════════╗
    // ║  PHASE 10 — RECRUITMENT (1 open position)                  ║
    // ╚══════════════════════════════════════════════════════════════╝

    const { data: jobData } = await sb.from("recruitment_jobs").insert({
      company_id:CO, title:"مهندس عمليات", department_id:DEPT_OPS,
      location:"بغداد", status:"open",
      description:"مطلوب مهندس عمليات للعمل في المقر الرئيسي",
      salary_min:1200000, salary_max:1800000, employment_type:"full_time", openings:2,
    }).select("id").single();

    if (jobData) {
      const candNames = ["محمد علي","أحمد خالد","فاطمة حسين","نور كامل","حسام وليد"];
      const stages = ["applied","screening","interview","offer","rejected"];
      for (let i=0; i<candNames.length; i++) {
        await sb.from("candidates").insert({
          company_id:CO, job_id:jobData.id, name:candNames[i],
          email:`cand${i+1}@example.com`, stage:stages[i],
          source: ["موقع الشركة","LinkedIn","إحالة موظف","معرض وظائف","LinkedIn"][i],
          rating: 3+Math.floor(Math.random()*3),
        });
      }
    }
    log.recruitment = { jobs:1, candidates:5 };

    // ╔══════════════════════════════════════════════════════════════╗
    // ║  PHASE 11 — PENALTIES & PRAISE EXAMPLES                    ║
    // ╚══════════════════════════════════════════════════════════════╝

    const mustafaId = empIdMap["mustafa.emp@rafidain-demo.local"];
    const ahmedId = empIdMap["ahmed.field@rafidain-demo.local"];
    if (mustafaId) {
      await sb.from("employee_penalties").insert({
        company_id:CO, employee_id:mustafaId, penalty_type:"إنذار",
        reason:"تأخر متكرر عن الدوام", severity:"low",
        effective_date:"2026-02-01", affects_payroll:false,
      });
    }
    if (ahmedId) {
      await sb.from("employee_praise").insert({
        company_id:CO, employee_id:ahmedId, praise_type:"مكافأة",
        reason:"أداء متميز في مشروع البصرة", amount:200000,
        effective_date:"2026-01-15", affects_payroll:true,
      });
    }

    // ╔══════════════════════════════════════════════════════════════╗
    // ║  PHASE 12 — HOLIDAYS                                       ║
    // ╚══════════════════════════════════════════════════════════════╝

    await sb.from("holidays").insert([
      { company_id:CO, name:"عيد الفطر", start_date:"2026-03-30", end_date:"2026-04-02", is_recurring:true },
      { company_id:CO, name:"عيد الأضحى", start_date:"2026-06-06", end_date:"2026-06-09", is_recurring:true },
      { company_id:CO, name:"رأس السنة الهجرية", start_date:"2026-06-27", end_date:"2026-06-27", is_recurring:true },
      { company_id:CO, name:"عيد العمال", start_date:"2026-05-01", end_date:"2026-05-01", is_recurring:true },
      { company_id:CO, name:"اليوم الوطني", start_date:"2026-10-03", end_date:"2026-10-03", is_recurring:true },
    ]);

    // ╔══════════════════════════════════════════════════════════════╗
    // ║  PHASE 13 — ANNOUNCEMENTS                                  ║
    // ╚══════════════════════════════════════════════════════════════╝

    await sb.from("announcements").insert([
      { company_id:CO, title:"ترقية نظام الحضور", content:"تم تحديث نظام الحضور الإلكتروني. يرجى التأكد من تسجيل البصمة يومياً.", priority:"normal", published_by:adminUserId },
      { company_id:CO, title:"إجازة عيد الفطر", content:"نود إعلامكم بأن إجازة عيد الفطر ستكون من 30 مارس إلى 2 أبريل.", priority:"high", published_by:adminUserId },
    ]);

    // ╔══════════════════════════════════════════════════════════════╗
    // ║  FINAL SUMMARY                                             ║
    // ╚══════════════════════════════════════════════════════════════╝

    return new Response(JSON.stringify({
      success: true,
      company: { name: "مجموعة الرافدين الصناعية", id: CO },
      password: PASSWORD,
      credentials: createdUsers.map(u => ({
        ...u, password: PASSWORD,
      })),
      summary: log,
      disabled_ai_features: disabledFeatures,
    }, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message, stack: err.stack }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
