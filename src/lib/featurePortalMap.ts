/**
 * Canonical Feature → Portal Mapping
 * Single source of truth for which features control which portal elements.
 */

export type PortalScope = "tenant" | "employee" | "business";

export interface FeaturePortalEntry {
  key: string;
  name: string;
  nameAr: string;
  category: "core" | "ai" | "addon" | "analytics" | "employee";
  portals: PortalScope[];
  /** Nav paths that should be gated by this feature */
  navPaths: string[];
  /** Description of what this feature controls */
  description: string;
  descriptionAr: string;
  /** Lock message shown when feature is disabled */
  lockMessage: string;
}

/**
 * Master feature-to-portal mapping.
 * Used by navigation filtering, FeatureGate, and Business Portal control center.
 */
export const FEATURE_PORTAL_MAP: FeaturePortalEntry[] = [
  // ── Core HR Features ──
  {
    key: "hr_core",
    name: "HR Core",
    nameAr: "الموارد البشرية الأساسية",
    category: "core",
    portals: ["tenant"],
    navPaths: ["/employees", "/departments", "/org-chart"],
    description: "Employee management, departments, org chart",
    descriptionAr: "إدارة الموظفين والأقسام والهيكل التنظيمي",
    lockMessage: "ميزة إدارة الموارد البشرية الأساسية غير متوفرة في باقتك",
  },
  {
    key: "attendance",
    name: "Attendance",
    nameAr: "الحضور والانصراف",
    category: "core",
    portals: ["tenant", "employee"],
    navPaths: ["/attendance", "/shifts", "/employee-portal/attendance"],
    description: "Attendance tracking, shifts, violations",
    descriptionAr: "تتبع الحضور والمناوبات والمخالفات",
    lockMessage: "ميزة الحضور والانصراف غير متوفرة في باقتك",
  },
  {
    key: "payroll",
    name: "Payroll",
    nameAr: "الرواتب",
    category: "core",
    portals: ["tenant", "employee"],
    navPaths: ["/payroll", "/loans", "/contracts", "/employee-portal/payslips"],
    description: "Salary processing, loans, contracts, payslips",
    descriptionAr: "معالجة الرواتب والسلف والعقود وكشوف الرواتب",
    lockMessage: "ميزة الرواتب غير متوفرة في باقتك",
  },
  {
    key: "recruitment",
    name: "Recruitment",
    nameAr: "التوظيف",
    category: "core",
    portals: ["tenant"],
    navPaths: ["/recruitment"],
    description: "ATS, job postings, candidate management",
    descriptionAr: "نظام تتبع المتقدمين وإدارة المرشحين",
    lockMessage: "ميزة التوظيف غير متوفرة في باقتك",
  },
  {
    key: "recruitment_agency",
    name: "Recruitment Agency",
    nameAr: "وكالة التوظيف",
    category: "addon",
    portals: ["tenant"],
    navPaths: [],
    description: "External hiring agency mode for third-party client recruitment",
    descriptionAr: "وضع وكالة التوظيف الخارجية لإدارة عملاء التوظيف",
    lockMessage: "ميزة وكالة التوظيف غير مفعّلة — يتم تفعيلها من إدارة المنصة",
  },
  {
    key: "performance",
    name: "Performance",
    nameAr: "الأداء",
    category: "core",
    portals: ["tenant"],
    navPaths: ["/performance"],
    description: "Performance reviews and appraisals",
    descriptionAr: "تقييم الأداء والمراجعات",
    lockMessage: "ميزة إدارة الأداء غير متوفرة في باقتك",
  },
  {
    key: "training",
    name: "Training",
    nameAr: "التدريب",
    category: "core",
    portals: ["tenant"],
    navPaths: ["/training"],
    description: "Training programs and LMS",
    descriptionAr: "برامج التدريب ونظام إدارة التعلم",
    lockMessage: "ميزة التدريب غير متوفرة في باقتك",
  },
  {
    key: "documents",
    name: "Documents",
    nameAr: "المستندات",
    category: "core",
    portals: ["tenant", "employee"],
    navPaths: ["/documents", "/employee-portal/documents"],
    description: "Document management and signatures",
    descriptionAr: "إدارة المستندات والتوقيعات",
    lockMessage: "ميزة المستندات غير متوفرة في باقتك",
  },
  {
    key: "multi_branch",
    name: "Multi-Branch",
    nameAr: "تعدد الفروع",
    category: "addon",
    portals: ["tenant"],
    navPaths: ["/branches"],
    description: "Multi-branch management",
    descriptionAr: "إدارة الفروع المتعددة",
    lockMessage: "ميزة تعدد الفروع غير متوفرة في باقتك",
  },
  {
    key: "advanced_analytics",
    name: "Advanced Analytics",
    nameAr: "تحليلات متقدمة",
    category: "analytics",
    portals: ["tenant"],
    navPaths: ["/reports", "/workforce-intelligence"],
    description: "Advanced reporting and workforce intelligence",
    descriptionAr: "التقارير المتقدمة وذكاء القوى العاملة",
    lockMessage: "ميزة التحليلات المتقدمة غير متوفرة في باقتك",
  },

  // ── AI Features ──
  {
    key: "ai_employee_career_coach",
    name: "AI Career Coach",
    nameAr: "المدرب المهني الذكي",
    category: "employee",
    portals: ["employee"],
    navPaths: ["/employee-portal/ai-coach"],
    description: "AI-powered career coaching for employees",
    descriptionAr: "تدريب مهني ذكي للموظفين",
    lockMessage: "ميزة المدرب الذكي غير متوفرة في باقتك",
  },
  {
    key: "ai_hr_assistant",
    name: "AI HR Assistant",
    nameAr: "مساعد الموارد البشرية الذكي",
    category: "ai",
    portals: ["tenant"],
    navPaths: ["/ai-assistant"],
    description: "AI assistant for HR operations",
    descriptionAr: "مساعد ذكي لعمليات الموارد البشرية",
    lockMessage: "ميزة المساعد الذكي غير متوفرة في باقتك",
  },
  {
    key: "ai_workforce_analytics",
    name: "AI Workforce Analytics",
    nameAr: "تحليلات القوى العاملة الذكية",
    category: "ai",
    portals: ["tenant"],
    navPaths: ["/workforce-intelligence"],
    description: "AI-powered workforce analytics and insights",
    descriptionAr: "تحليلات ذكية للقوى العاملة",
    lockMessage: "ميزة تحليلات القوى العاملة الذكية غير متوفرة",
  },
  {
    key: "ai_recruitment_intelligence",
    name: "AI Recruitment Intelligence",
    nameAr: "ذكاء التوظيف الاصطناعي",
    category: "ai",
    portals: ["tenant"],
    navPaths: ["/recruitment"],
    description: "AI tools for CV analysis, interviews, candidate ranking",
    descriptionAr: "أدوات ذكية لتحليل السير الذاتية والمقابلات",
    lockMessage: "ميزة ذكاء التوظيف غير متوفرة في باقتك",
  },
  {
    key: "ai_gap_analysis",
    name: "AI Gap Analysis",
    nameAr: "تحليل الفجوات الذكي",
    category: "ai",
    portals: ["tenant"],
    navPaths: ["/workforce-intelligence"],
    description: "AI-powered gap analysis",
    descriptionAr: "تحليل فجوات ذكي",
    lockMessage: "ميزة تحليل الفجوات غير متوفرة في باقتك",
  },
  {
    key: "ai_planning_advisor",
    name: "AI Planning Advisor",
    nameAr: "مستشار التخطيط الذكي",
    category: "ai",
    portals: ["tenant"],
    navPaths: ["/workforce-intelligence"],
    description: "AI planning and workforce generation tools",
    descriptionAr: "أدوات تخطيط ذكية",
    lockMessage: "ميزة مستشار التخطيط غير متوفرة في باقتك",
  },
];

/** Lookup a feature entry by key */
export function getFeatureEntry(key: string): FeaturePortalEntry | undefined {
  return FEATURE_PORTAL_MAP.find((f) => f.key === key);
}

/** Get all feature keys that affect a specific nav path */
export function getFeatureKeyForPath(path: string): string | undefined {
  const entry = FEATURE_PORTAL_MAP.find((f) =>
    f.navPaths.some((np) => path.startsWith(np))
  );
  return entry?.key;
}

/** Get all features for a specific portal */
export function getFeaturesForPortal(portal: PortalScope): FeaturePortalEntry[] {
  return FEATURE_PORTAL_MAP.filter((f) => f.portals.includes(portal));
}

/** Get category label */
export function getCategoryLabel(cat: FeaturePortalEntry["category"]): { en: string; ar: string } {
  const map: Record<string, { en: string; ar: string }> = {
    core: { en: "Core HR", ar: "أساسي" },
    ai: { en: "AI", ar: "ذكاء اصطناعي" },
    addon: { en: "Add-on", ar: "إضافي" },
    analytics: { en: "Analytics", ar: "تحليلات" },
    employee: { en: "Employee", ar: "موظف" },
  };
  return map[cat] || { en: cat, ar: cat };
}
