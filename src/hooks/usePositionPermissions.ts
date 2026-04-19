import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useFeatureAccessQuery } from "./useFeatureAccess";

/**
 * Feature catalog with all platform services grouped by category.
 * SERVICE_CATALOG is kept as a static fallback; the DB catalog is the source of truth.
 */
export interface ServiceFeature {
  key: string;
  name: string;
  nameAr: string;
  description?: string;
  category: ServiceCategory;
  featureType?: "page" | "feature" | "action";
  moduleKey?: string;
}

export type ServiceCategory = "core_hr" | "talent" | "operations" | "ai_tools" | "admin_advanced";

export const CATEGORY_META: Record<ServiceCategory, { label: string; labelAr: string; order: number }> = {
  core_hr: { label: "Core HR", labelAr: "الموارد البشرية الأساسية", order: 0 },
  talent: { label: "Talent", labelAr: "المواهب", order: 1 },
  operations: { label: "Operations", labelAr: "العمليات", order: 2 },
  ai_tools: { label: "AI Tools", labelAr: "أدوات الذكاء الاصطناعي", order: 3 },
  admin_advanced: { label: "Admin / Advanced", labelAr: "إدارة متقدمة", order: 4 },
};

/**
 * Static fallback catalog — used ONLY when DB catalog hasn't loaded yet.
 * The DB feature_catalog table is the single source of truth.
 */
export const SERVICE_CATALOG: ServiceFeature[] = [
  { key: "employee_profiles", name: "Employee Profiles", nameAr: "ملفات الموظفين", category: "core_hr" },
  { key: "org_chart", name: "Org Chart", nameAr: "الهيكل التنظيمي", category: "core_hr" },
  { key: "attendance", name: "Attendance", nameAr: "الحضور والانصراف", category: "core_hr" },
  { key: "leave_management", name: "Leave Management", nameAr: "إدارة الإجازات", category: "core_hr" },
  { key: "payroll", name: "Payroll", nameAr: "الرواتب", category: "core_hr" },
  { key: "documents", name: "Documents", nameAr: "المستندات", category: "core_hr" },
  { key: "recruitment", name: "Recruitment", nameAr: "التوظيف", category: "talent" },
  { key: "onboarding", name: "Onboarding", nameAr: "التهيئة", category: "talent" },
  { key: "performance", name: "Performance", nameAr: "الأداء", category: "talent" },
  { key: "learning", name: "Learning", nameAr: "التدريب", category: "talent" },
  { key: "approvals", name: "Approvals", nameAr: "الموافقات", category: "operations" },
  { key: "workflows", name: "Workflows", nameAr: "سير العمل", category: "operations" },
  { key: "reports", name: "Reports", nameAr: "التقارير", category: "operations" },
  { key: "analytics", name: "Analytics", nameAr: "التحليلات", category: "operations" },
  { key: "projects", name: "Projects", nameAr: "المشاريع", category: "operations" },
  { key: "ai_hr_assistant", name: "AI HR Assistant", nameAr: "مساعد الموارد البشرية الذكي", category: "ai_tools" },
  { key: "ai_employee_career_coach", name: "AI Employee Coach", nameAr: "مدرب الموظف الذكي", category: "ai_tools" },
  { key: "ai_workforce_analytics", name: "AI Workforce Analytics", nameAr: "تحليلات القوى العاملة", category: "ai_tools" },
  { key: "ai_recruitment_intelligence", name: "AI Recruitment", nameAr: "ذكاء التوظيف", category: "ai_tools" },
  { key: "ai_gap_analysis", name: "AI Gap Analysis", nameAr: "تحليل الفجوات", category: "ai_tools" },
  { key: "ai_planning_advisor", name: "AI Planning Advisor", nameAr: "مستشار التخطيط", category: "ai_tools" },
  { key: "multi_branch", name: "Multi Branch", nameAr: "تعدد الفروع", category: "admin_advanced" },
  { key: "api_access", name: "API Access", nameAr: "الوصول للـ API", category: "admin_advanced" },
  { key: "advanced_analytics", name: "Advanced Analytics", nameAr: "تحليلات متقدمة", category: "admin_advanced" },
  { key: "custom_documents", name: "Custom Documents", nameAr: "مستندات مخصصة", category: "admin_advanced" },
  { key: "salary_workflow", name: "Salary Workflow", nameAr: "سير عمل الرواتب", category: "admin_advanced" },
  { key: "payroll_workflow", name: "Payroll Workflow", nameAr: "سير عمل كشف الرواتب", category: "admin_advanced" },
];

/**
 * Hook to fetch the live feature catalog from the DB.
 * Returns DB catalog or falls back to static SERVICE_CATALOG.
 */
export function useServiceCatalog() {
  const { data: dbCatalog, isLoading } = useQuery({
    queryKey: ["service-catalog-live"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("feature_catalog")
        .select("key, name, name_ar, category, description, feature_type, module_key")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return (data || []).map((f: any): ServiceFeature => ({
        key: f.key,
        name: f.name,
        nameAr: f.name_ar || f.name,
        description: f.description,
        category: f.category as ServiceCategory,
        featureType: f.feature_type,
        moduleKey: f.module_key,
      }));
    },
    staleTime: 300_000,
  });

  return {
    catalog: dbCatalog && dbCatalog.length > 0 ? dbCatalog : SERVICE_CATALOG,
    isLoading,
    isFromDb: !!dbCatalog && dbCatalog.length > 0,
  };
}

export type ServicePermissions = Record<string, boolean>;

/** Default presets by position type */
export const POSITION_PRESETS: Record<string, ServicePermissions> = {
  tenant_admin: Object.fromEntries(SERVICE_CATALOG.map((f) => [f.key, true])),
  hr_manager: Object.fromEntries(SERVICE_CATALOG.map((f) => [f.key,
    ["core_hr", "talent", "operations"].includes(f.category) || f.key === "ai_hr_assistant",
  ])),
  hr_officer: Object.fromEntries(SERVICE_CATALOG.map((f) => [f.key,
    f.category === "core_hr" || ["approvals", "documents", "recruitment", "onboarding"].includes(f.key),
  ])),
  finance_manager: Object.fromEntries(SERVICE_CATALOG.map((f) => [f.key,
    ["payroll", "salary_workflow", "payroll_workflow", "reports", "analytics", "approvals"].includes(f.key),
  ])),
  manager: Object.fromEntries(SERVICE_CATALOG.map((f) => [f.key,
    ["approvals", "reports", "leave_management", "attendance", "performance", "employee_profiles", "org_chart"].includes(f.key),
  ])),
  employee: Object.fromEntries(SERVICE_CATALOG.map((f) => [f.key,
    ["employee_profiles", "attendance", "leave_management", "documents"].includes(f.key),
  ])),
};

export interface PositionPermissionsResult {
  availableFeatures: string[];
  lockedFeatures: string[];
  disabledByPackage: string[];
  disabledByPosition: string[];
  canAccess: (featureKey: string) => boolean;
  catalog: ServiceFeature[];
  groupedCatalog: { category: ServiceCategory; meta: typeof CATEGORY_META[ServiceCategory]; features: ServiceFeature[] }[];
}

/**
 * Resolves final visible services for a position using:
 * 1. tenant package/subscription entitlements (via useFeatureAccessQuery)
 * 2. position.service_permissions JSONB
 */
export function usePositionPermissions(
  servicePermissions: ServicePermissions | null | undefined,
): PositionPermissionsResult {
  const { checkFeature } = useFeatureAccessQuery();

  return useMemo(() => {
    const availableFeatures: string[] = [];
    const lockedFeatures: string[] = [];
    const disabledByPackage: string[] = [];
    const disabledByPosition: string[] = [];

    for (const feat of SERVICE_CATALOG) {
      const planCheck = checkFeature(feat.key);
      const inPlan = planCheck.enabled;
      // Position-level: default true if not specified (permissive)
      const positionEnabled = servicePermissions?.[feat.key] !== undefined
        ? servicePermissions[feat.key]
        : true;

      if (!inPlan) {
        disabledByPackage.push(feat.key);
        lockedFeatures.push(feat.key);
      } else if (!positionEnabled) {
        disabledByPosition.push(feat.key);
        lockedFeatures.push(feat.key);
      } else {
        availableFeatures.push(feat.key);
      }
    }

    const canAccess = (featureKey: string): boolean => availableFeatures.includes(featureKey);

    const groupedCatalog = (Object.keys(CATEGORY_META) as ServiceCategory[])
      .sort((a, b) => CATEGORY_META[a].order - CATEGORY_META[b].order)
      .map((cat) => ({
        category: cat,
        meta: CATEGORY_META[cat],
        features: SERVICE_CATALOG.filter((f) => f.category === cat),
      }))
      .filter((g) => g.features.length > 0);

    return {
      availableFeatures,
      lockedFeatures,
      disabledByPackage,
      disabledByPosition,
      canAccess,
      catalog: SERVICE_CATALOG,
      groupedCatalog,
    };
  }, [servicePermissions, checkFeature]);
}
