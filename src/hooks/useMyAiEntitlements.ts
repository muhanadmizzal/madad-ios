import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type AiFeatureKey =
  | "ai_hr_assistant"
  | "ai_workforce_analytics"
  | "ai_recruitment_intelligence"
  | "ai_gap_analysis"
  | "ai_planning_advisor"
  | "ai_employee_career_coach";

export interface AiFeatureEntitlement {
  enabled: boolean;
  source: "user_override" | "tenant" | "package_default" | "disabled";
  in_package?: boolean;
}

export interface AiQuotaInfo {
  requests_used: number;
  requests_limit: number;
  tokens_used: number;
  tokens_limit: number;
  percent_used: number;
}

export interface AiRoleAccess {
  roles: string[];
  is_admin: boolean;
  is_hr: boolean;
  is_manager: boolean;
  is_employee_only: boolean;
}

export interface AiEntitlements {
  ai_enabled: boolean;
  package: string;
  quota: AiQuotaInfo;
  features: Record<AiFeatureKey, AiFeatureEntitlement> & { role_access: AiRoleAccess };
  show_employee_ai_menu: boolean;
  show_employee_ai_page: boolean;
}

const FEATURE_TO_MODULE: Record<string, AiFeatureKey> = {
  workforce_analytics: "ai_workforce_analytics",
  gap_analysis: "ai_gap_analysis",
  hiring_strategy: "ai_recruitment_intelligence",
  hr_operational: "ai_hr_assistant",
  career_coach: "ai_employee_career_coach",
  planning: "ai_planning_advisor",
  ats_cv_analysis: "ai_recruitment_intelligence",
  ats_interview: "ai_recruitment_intelligence",
  ats_communication: "ai_recruitment_intelligence",
  shortlist_candidates: "ai_recruitment_intelligence",
  generate_training_plan: "ai_planning_advisor",
  generate_workforce_plan: "ai_planning_advisor",
};

export function useMyAiEntitlements() {
  const { user } = useAuth();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["ai-entitlements", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_my_ai_entitlements");
      if (error) throw error;
      return data as unknown as AiEntitlements;
    },
    enabled: !!user,
    staleTime: 60_000,
    retry: 1,
  });

  const isFeatureEnabled = (featureOrModule: string): boolean => {
    if (!data) return false;
    if (!data.ai_enabled) return false;

    const featureKey = FEATURE_TO_MODULE[featureOrModule] || (featureOrModule as AiFeatureKey);
    const feature = data.features[featureKey];
    if (!feature || typeof feature.enabled !== "boolean") return true;
    return feature.enabled;
  };

  const getFeatureSource = (featureOrModule: string): string => {
    if (!data) return "loading";
    const featureKey = FEATURE_TO_MODULE[featureOrModule] || (featureOrModule as AiFeatureKey);
    const feature = data.features[featureKey];
    return feature?.source || "package_default";
  };

  const isFeatureInPackage = (featureOrModule: string): boolean => {
    if (!data) return false;
    const featureKey = FEATURE_TO_MODULE[featureOrModule] || (featureOrModule as AiFeatureKey);
    const feature = data.features[featureKey];
    return feature?.in_package ?? false;
  };

  const isQuotaExceeded = data ? data.quota.percent_used >= 100 : false;
  const isNearQuotaLimit = data ? data.quota.percent_used >= 80 : false;

  const getDisabledReason = (featureOrModule: string): string | null => {
    if (!data) return null;
    if (!data.ai_enabled) return "تم تعطيل AI لحسابك";
    if (isQuotaExceeded) return "تم استنفاد حصة AI الشهرية";
    if (!isFeatureEnabled(featureOrModule)) {
      const source = getFeatureSource(featureOrModule);
      if (source === "user_override") return "تم تعطيل هذه الميزة لحسابك";
      if (source === "tenant") return "هذه الميزة غير مفعّلة في إعدادات الشركة";
      if (!isFeatureInPackage(featureOrModule)) return "هذه الميزة غير متوفرة في باقتك الحالية";
      return "هذه الميزة غير متوفرة في باقتك الحالية";
    }
    return null;
  };

  return {
    entitlements: data || null,
    isLoading,
    error,
    refetch,
    isFeatureEnabled,
    getFeatureSource,
    isFeatureInPackage,
    getDisabledReason,
    isQuotaExceeded,
    isNearQuotaLimit,
    aiEnabled: data?.ai_enabled ?? false,
    package: data?.package ?? "essentials",
    quota: data?.quota ?? { requests_used: 0, requests_limit: 50, tokens_used: 0, tokens_limit: 100000, percent_used: 0 },
    roleAccess: data?.features?.role_access ?? { roles: [], is_admin: false, is_hr: false, is_manager: false, is_employee_only: false },
    showEmployeeAiMenu: data?.show_employee_ai_menu ?? false,
    showEmployeeAiPage: data?.show_employee_ai_page ?? false,
  };
}
