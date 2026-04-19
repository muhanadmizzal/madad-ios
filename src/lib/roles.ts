/**
 * Canonical Role Model — single source of truth for role labels, permissions, and display.
 */
import type { AppRole } from "@/hooks/useRole";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// A. ROLE LABELS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface RoleMeta {
  key: AppRole;
  labelEn: string;
  labelAr: string;
  scope: "platform" | "tenant" | "employee";
  color: string; // tailwind badge color class using semantic tokens
  description: string;
}

export const ROLE_META: Record<AppRole, RoleMeta> = {
  super_admin: {
    key: "super_admin",
    labelEn: "Super Admin",
    labelAr: "مدير النظام",
    scope: "platform",
    color: "bg-destructive/15 text-destructive border-destructive/20",
    description: "Full platform control including all tenants and billing",
  },
  business_admin: {
    key: "business_admin",
    labelEn: "Business Admin",
    labelAr: "مدير الأعمال",
    scope: "platform",
    color: "bg-primary/15 text-primary border-primary/20",
    description: "Manage tenants, support, and platform operations",
  },
  finance_manager: {
    key: "finance_manager",
    labelEn: "Finance Manager",
    labelAr: "مدير المالية",
    scope: "platform",
    color: "bg-accent/15 text-accent-foreground border-accent/20",
    description: "Billing, invoices, subscription pricing oversight",
  },
  support_agent: {
    key: "support_agent",
    labelEn: "Support Agent",
    labelAr: "وكيل الدعم",
    scope: "platform",
    color: "bg-muted text-muted-foreground border-border",
    description: "Handle tenant support tickets and feedback",
  },
  sales_manager: {
    key: "sales_manager",
    labelEn: "Sales Manager",
    labelAr: "مدير المبيعات",
    scope: "platform",
    color: "bg-muted text-muted-foreground border-border",
    description: "Manage sales pipeline and tenant onboarding",
  },
  technical_admin: {
    key: "technical_admin",
    labelEn: "Technical Admin",
    labelAr: "مدير تقني",
    scope: "platform",
    color: "bg-muted text-muted-foreground border-border",
    description: "Feature flags, system configuration, technical ops",
  },
  tenant_admin: {
    key: "tenant_admin",
    labelEn: "Company Admin",
    labelAr: "مدير الشركة",
    scope: "tenant",
    color: "bg-primary/15 text-primary border-primary/20",
    description: "Full company control including settings and subscriptions",
  },
  admin: {
    key: "admin",
    labelEn: "Admin",
    labelAr: "مسؤول",
    scope: "tenant",
    color: "bg-primary/10 text-primary border-primary/15",
    description: "Company-wide HR administration",
  },
  hr_manager: {
    key: "hr_manager",
    labelEn: "HR Manager",
    labelAr: "مدير الموارد البشرية",
    scope: "tenant",
    color: "bg-accent/15 text-accent-foreground border-accent/20",
    description: "Full operational HR management",
  },
  hr_officer: {
    key: "hr_officer",
    labelEn: "HR Officer",
    labelAr: "موظف موارد بشرية",
    scope: "tenant",
    color: "bg-accent/10 text-accent-foreground border-accent/15",
    description: "Employee records, recruitment, documents",
  },
  manager: {
    key: "manager",
    labelEn: "Manager",
    labelAr: "مدير قسم",
    scope: "tenant",
    color: "bg-muted text-foreground border-border",
    description: "Manage direct reports, approve team requests",
  },
  employee: {
    key: "employee",
    labelEn: "Employee",
    labelAr: "موظف",
    scope: "employee",
    color: "bg-muted text-muted-foreground border-border",
    description: "Self-service access to personal data",
  },
};

export function getRoleLabel(role: AppRole, lang: "ar" | "en" = "ar"): string {
  const meta = ROLE_META[role];
  return lang === "ar" ? meta?.labelAr || role : meta?.labelEn || role;
}

export function getRoleMeta(role: AppRole): RoleMeta {
  return ROLE_META[role] || ROLE_META.employee;
}

/**
 * Get the primary (highest priority) role from a list
 */
export function getPrimaryRole(roles: AppRole[]): AppRole {
  const priority: AppRole[] = [
    "super_admin", "business_admin", "finance_manager", "support_agent",
    "sales_manager", "technical_admin", "tenant_admin", "admin",
    "hr_manager", "hr_officer", "manager", "employee",
  ];
  return priority.find((r) => roles.includes(r)) || "employee";
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// B. PERMISSION MATRIX
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export type Permission =
  | "can_view_dashboard"
  | "can_manage_employees"
  | "can_manage_departments"
  | "can_manage_branches"
  | "can_manage_positions"
  | "can_view_payroll"
  | "can_run_payroll"
  | "can_approve_payroll"
  | "can_view_salary_records"
  | "can_request_leave"
  | "can_approve_leave"
  | "can_request_certificate"
  | "can_approve_certificate"
  | "can_view_documents"
  | "can_generate_official_documents"
  | "can_manage_workflows"
  | "can_manage_signatories"
  | "can_manage_templates"
  | "can_manage_subscription"
  | "can_view_billing"
  | "can_manage_billing"
  | "can_access_ai_features"
  | "can_manage_settings"
  | "can_view_audit_log"
  | "can_manage_announcements"
  | "can_view_reports"
  | "can_manage_recruitment"
  | "can_manage_onboarding"
  | "can_manage_training"
  | "can_manage_performance"
  | "can_manage_exit"
  | "can_manage_contracts"
  | "can_manage_loans"
  | "can_manage_shifts"
  | "can_view_org_chart"
  | "can_view_approvals"
  | "can_approve_direct_reports";

export const PERMISSION_LABELS: Record<Permission, { en: string; ar: string }> = {
  can_view_dashboard: { en: "View Dashboard", ar: "عرض لوحة التحكم" },
  can_manage_employees: { en: "Manage Employees", ar: "إدارة الموظفين" },
  can_manage_departments: { en: "Manage Departments", ar: "إدارة الأقسام" },
  can_manage_branches: { en: "Manage Branches", ar: "إدارة الفروع" },
  can_manage_positions: { en: "Manage Positions", ar: "إدارة المناصب" },
  can_view_payroll: { en: "View Payroll", ar: "عرض الرواتب" },
  can_run_payroll: { en: "Run Payroll", ar: "تشغيل الرواتب" },
  can_approve_payroll: { en: "Approve Payroll", ar: "اعتماد الرواتب" },
  can_view_salary_records: { en: "View Salary Records", ar: "عرض سجلات الرواتب" },
  can_request_leave: { en: "Request Leave", ar: "طلب إجازة" },
  can_approve_leave: { en: "Approve Leave", ar: "اعتماد الإجازات" },
  can_request_certificate: { en: "Request Certificate", ar: "طلب شهادة" },
  can_approve_certificate: { en: "Approve Certificate", ar: "اعتماد الشهادات" },
  can_view_documents: { en: "View Documents", ar: "عرض المستندات" },
  can_generate_official_documents: { en: "Generate Documents", ar: "إصدار مستندات رسمية" },
  can_manage_workflows: { en: "Manage Workflows", ar: "إدارة سير العمل" },
  can_manage_signatories: { en: "Manage Signatories", ar: "إدارة الموقّعين" },
  can_manage_templates: { en: "Manage Templates", ar: "إدارة القوالب" },
  can_manage_subscription: { en: "Manage Subscription", ar: "إدارة الاشتراك" },
  can_view_billing: { en: "View Billing", ar: "عرض الفوترة" },
  can_manage_billing: { en: "Manage Billing", ar: "إدارة الفوترة" },
  can_access_ai_features: { en: "Access AI Features", ar: "الوصول لميزات الذكاء الاصطناعي" },
  can_manage_settings: { en: "Manage Settings", ar: "إدارة الإعدادات" },
  can_view_audit_log: { en: "View Audit Log", ar: "عرض سجل المراجعة" },
  can_manage_announcements: { en: "Manage Announcements", ar: "إدارة الإعلانات" },
  can_view_reports: { en: "View Reports", ar: "عرض التقارير" },
  can_manage_recruitment: { en: "Manage Recruitment", ar: "إدارة التوظيف" },
  can_manage_onboarding: { en: "Manage Onboarding", ar: "إدارة التهيئة" },
  can_manage_training: { en: "Manage Training", ar: "إدارة التدريب" },
  can_manage_performance: { en: "Manage Performance", ar: "إدارة الأداء" },
  can_manage_exit: { en: "Manage Exit", ar: "إدارة إنهاء الخدمة" },
  can_manage_contracts: { en: "Manage Contracts", ar: "إدارة العقود" },
  can_manage_loans: { en: "Manage Loans", ar: "إدارة السلف" },
  can_manage_shifts: { en: "Manage Shifts", ar: "إدارة المناوبات" },
  can_view_org_chart: { en: "View Org Chart", ar: "عرض الهيكل التنظيمي" },
  can_view_approvals: { en: "View Approvals", ar: "عرض الموافقات" },
  can_approve_direct_reports: { en: "Approve Direct Reports", ar: "اعتماد طلبات المرؤوسين" },
};

/**
 * Permission matrix: true = allowed, false = denied
 * Only tenant-scope roles are listed (platform roles use their own portal).
 */
export const PERMISSION_MATRIX: Record<string, Record<Permission, boolean>> = {
  tenant_admin: {
    can_view_dashboard: true,
    can_manage_employees: true,
    can_manage_departments: true,
    can_manage_branches: true,
    can_manage_positions: true,
    can_view_payroll: true,
    can_run_payroll: true,
    can_approve_payroll: true,
    can_view_salary_records: true,
    can_request_leave: true,
    can_approve_leave: true,
    can_request_certificate: true,
    can_approve_certificate: true,
    can_view_documents: true,
    can_generate_official_documents: true,
    can_manage_workflows: true,
    can_manage_signatories: true,
    can_manage_templates: true,
    can_manage_subscription: true,
    can_view_billing: true,
    can_manage_billing: true,
    can_access_ai_features: true,
    can_manage_settings: true,
    can_view_audit_log: true,
    can_manage_announcements: true,
    can_view_reports: true,
    can_manage_recruitment: true,
    can_manage_onboarding: true,
    can_manage_training: true,
    can_manage_performance: true,
    can_manage_exit: true,
    can_manage_contracts: true,
    can_manage_loans: true,
    can_manage_shifts: true,
    can_view_org_chart: true,
    can_view_approvals: true,
    can_approve_direct_reports: true,
  },
  admin: {
    can_view_dashboard: true,
    can_manage_employees: true,
    can_manage_departments: true,
    can_manage_branches: true,
    can_manage_positions: true,
    can_view_payroll: true,
    can_run_payroll: true,
    can_approve_payroll: true,
    can_view_salary_records: true,
    can_request_leave: true,
    can_approve_leave: true,
    can_request_certificate: true,
    can_approve_certificate: true,
    can_view_documents: true,
    can_generate_official_documents: true,
    can_manage_workflows: true,
    can_manage_signatories: true,
    can_manage_templates: true,
    can_manage_subscription: true,
    can_view_billing: false,
    can_manage_billing: false,
    can_access_ai_features: true,
    can_manage_settings: true,
    can_view_audit_log: true,
    can_manage_announcements: true,
    can_view_reports: true,
    can_manage_recruitment: true,
    can_manage_onboarding: true,
    can_manage_training: true,
    can_manage_performance: true,
    can_manage_exit: true,
    can_manage_contracts: true,
    can_manage_loans: true,
    can_manage_shifts: true,
    can_view_org_chart: true,
    can_view_approvals: true,
    can_approve_direct_reports: true,
  },
  hr_manager: {
    can_view_dashboard: true,
    can_manage_employees: true,
    can_manage_departments: true,
    can_manage_branches: true,
    can_manage_positions: true,
    can_view_payroll: true,
    can_run_payroll: true,
    can_approve_payroll: true,
    can_view_salary_records: true,
    can_request_leave: true,
    can_approve_leave: true,
    can_request_certificate: true,
    can_approve_certificate: true,
    can_view_documents: true,
    can_generate_official_documents: true,
    can_manage_workflows: true,
    can_manage_signatories: false,
    can_manage_templates: true,
    can_manage_subscription: false,
    can_view_billing: false,
    can_manage_billing: false,
    can_access_ai_features: true,
    can_manage_settings: true,
    can_view_audit_log: false,
    can_manage_announcements: true,
    can_view_reports: true,
    can_manage_recruitment: true,
    can_manage_onboarding: true,
    can_manage_training: true,
    can_manage_performance: true,
    can_manage_exit: true,
    can_manage_contracts: true,
    can_manage_loans: true,
    can_manage_shifts: true,
    can_view_org_chart: true,
    can_view_approvals: true,
    can_approve_direct_reports: true,
  },
  hr_officer: {
    can_view_dashboard: true,
    can_manage_employees: true,
    can_manage_departments: false,
    can_manage_branches: false,
    can_manage_positions: false,
    can_view_payroll: false,
    can_run_payroll: false,
    can_approve_payroll: false,
    can_view_salary_records: false,
    can_request_leave: true,
    can_approve_leave: false,
    can_request_certificate: true,
    can_approve_certificate: false,
    can_view_documents: true,
    can_generate_official_documents: true,
    can_manage_workflows: false,
    can_manage_signatories: false,
    can_manage_templates: false,
    can_manage_subscription: false,
    can_view_billing: false,
    can_manage_billing: false,
    can_access_ai_features: true,
    can_manage_settings: false,
    can_view_audit_log: false,
    can_manage_announcements: false,
    can_view_reports: false,
    can_manage_recruitment: true,
    can_manage_onboarding: false,
    can_manage_training: false,
    can_manage_performance: false,
    can_manage_exit: false,
    can_manage_contracts: false,
    can_manage_loans: false,
    can_manage_shifts: false,
    can_view_org_chart: false,
    can_view_approvals: true,
    can_approve_direct_reports: false,
  },
  manager: {
    can_view_dashboard: true,
    can_manage_employees: false,
    can_manage_departments: false,
    can_manage_branches: false,
    can_manage_positions: false,
    can_view_payroll: false,
    can_run_payroll: false,
    can_approve_payroll: false,
    can_view_salary_records: false,
    can_request_leave: true,
    can_approve_leave: true, // direct reports only
    can_request_certificate: true,
    can_approve_certificate: false,
    can_view_documents: true,
    can_generate_official_documents: false,
    can_manage_workflows: false,
    can_manage_signatories: false,
    can_manage_templates: false,
    can_manage_subscription: false,
    can_view_billing: false,
    can_manage_billing: false,
    can_access_ai_features: true,
    can_manage_settings: true,
    can_view_audit_log: false,
    can_manage_announcements: false,
    can_view_reports: false,
    can_manage_recruitment: false,
    can_manage_onboarding: false,
    can_manage_training: true,
    can_manage_performance: false,
    can_manage_exit: false,
    can_manage_contracts: false,
    can_manage_loans: false,
    can_manage_shifts: false,
    can_view_org_chart: false,
    can_view_approvals: true,
    can_approve_direct_reports: true,
  },
  employee: {
    can_view_dashboard: false,
    can_manage_employees: false,
    can_manage_departments: false,
    can_manage_branches: false,
    can_manage_positions: false,
    can_view_payroll: false,
    can_run_payroll: false,
    can_approve_payroll: false,
    can_view_salary_records: false,
    can_request_leave: true,
    can_approve_leave: false,
    can_request_certificate: true,
    can_approve_certificate: false,
    can_view_documents: true,
    can_generate_official_documents: false,
    can_manage_workflows: false,
    can_manage_signatories: false,
    can_manage_templates: false,
    can_manage_subscription: false,
    can_view_billing: false,
    can_manage_billing: false,
    can_access_ai_features: false,
    can_manage_settings: false,
    can_view_audit_log: false,
    can_manage_announcements: false,
    can_view_reports: false,
    can_manage_recruitment: false,
    can_manage_onboarding: false,
    can_manage_training: false,
    can_manage_performance: false,
    can_manage_exit: false,
    can_manage_contracts: false,
    can_manage_loans: false,
    can_manage_shifts: false,
    can_view_org_chart: false,
    can_view_approvals: false,
    can_approve_direct_reports: false,
  },
};

/**
 * Check if a user with the given roles has a specific permission.
 * Optionally checks position service_permissions as override.
 * Returns true if ANY of their roles grants the permission OR position allows it.
 */
export function hasPermission(
  roles: AppRole[],
  permission: Permission,
  positionServicePermissions?: Record<string, boolean> | null
): boolean {
  // super_admin has all permissions
  if (roles.includes("super_admin")) return true;

  // If position service_permissions exist, use them as primary check for feature-mapped permissions
  if (positionServicePermissions) {
    const featureKey = PERMISSION_TO_FEATURE_MAP[permission];
    if (featureKey && positionServicePermissions[featureKey] === false) {
      return false; // Position explicitly disabled this feature
    }
  }

  return roles.some((role) => PERMISSION_MATRIX[role]?.[permission] === true);
}

/**
 * Map permissions to feature keys used in position service_permissions.
 * This bridges the old role-based system with the new position-based toggles.
 */
const PERMISSION_TO_FEATURE_MAP: Partial<Record<Permission, string>> = {
  can_view_dashboard: "employee_profiles",
  can_manage_employees: "employee_profiles",
  can_manage_departments: "org_chart",
  can_manage_branches: "org_chart",
  can_manage_positions: "org_chart",
  can_view_payroll: "payroll",
  can_run_payroll: "payroll",
  can_approve_payroll: "payroll",
  can_view_salary_records: "payroll",
  can_request_leave: "leave_management",
  can_approve_leave: "leave_management",
  can_view_documents: "documents",
  can_generate_official_documents: "documents",
  can_manage_workflows: "workflows",
  can_manage_recruitment: "recruitment",
  can_manage_onboarding: "onboarding",
  can_manage_training: "learning",
  can_manage_performance: "performance",
  can_view_reports: "reports",
  can_access_ai_features: "ai_hr_assistant",
  can_view_org_chart: "org_chart",
  can_view_approvals: "approvals",
  can_manage_shifts: "attendance",
};

/**
 * Get denial reason for a permission check
 */
export function getPermissionDenialReason(
  roles: AppRole[],
  permission: Permission,
  positionServicePermissions?: Record<string, boolean> | null
): string | null {
  if (hasPermission(roles, permission, positionServicePermissions)) return null;
  if (roles.length === 0) return "no_role";
  if (positionServicePermissions) {
    const featureKey = PERMISSION_TO_FEATURE_MAP[permission];
    if (featureKey && positionServicePermissions[featureKey] === false) {
      return "position_restricted";
    }
  }
  return "role_restricted";
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// C. PAYROLL STATUS MAP
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface PayrollStatusMeta {
  key: string;
  labelAr: string;
  labelEn: string;
  color: string;
  icon: string; // lucide icon name
  nextAction: string | null;
  nextActionLabelAr: string | null;
  allowedRoles: AppRole[];
}

export const PAYROLL_STATUS_MAP: Record<string, PayrollStatusMeta> = {
  draft: {
    key: "draft",
    labelAr: "مسودة",
    labelEn: "Draft",
    color: "bg-muted text-muted-foreground",
    icon: "FileEdit",
    nextAction: "submit",
    nextActionLabelAr: "إرسال للموافقة",
    allowedRoles: ["tenant_admin", "admin", "hr_manager"],
  },
  processing: {
    key: "processing",
    labelAr: "بانتظار الموافقة",
    labelEn: "Pending Approval",
    color: "bg-accent/15 text-accent-foreground",
    icon: "Clock",
    nextAction: "approve",
    nextActionLabelAr: "اعتماد",
    allowedRoles: ["tenant_admin", "admin", "hr_manager"],
  },
  approved: {
    key: "approved",
    labelAr: "معتمد",
    labelEn: "Approved",
    color: "bg-primary/15 text-primary",
    icon: "CheckCircle",
    nextAction: "pay",
    nextActionLabelAr: "تسجيل الدفع",
    allowedRoles: ["tenant_admin", "admin"],
  },
  rejected: {
    key: "rejected",
    labelAr: "مرفوض",
    labelEn: "Rejected",
    color: "bg-destructive/15 text-destructive",
    icon: "XCircle",
    nextAction: null,
    nextActionLabelAr: null,
    allowedRoles: [],
  },
  returned: {
    key: "returned",
    labelAr: "مُعاد للتعديل",
    labelEn: "Returned",
    color: "bg-accent/10 text-accent-foreground",
    icon: "RotateCcw",
    nextAction: "resubmit",
    nextActionLabelAr: "إعادة الإرسال",
    allowedRoles: ["tenant_admin", "admin", "hr_manager"],
  },
  paid: {
    key: "paid",
    labelAr: "مدفوع (مقفل)",
    labelEn: "Paid & Locked",
    color: "bg-primary/20 text-primary",
    icon: "Lock",
    nextAction: null,
    nextActionLabelAr: null,
    allowedRoles: [],
  },
};
