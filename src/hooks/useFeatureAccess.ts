import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "./useCompany";
import { useAuth } from "@/contexts/AuthContext";

export interface FeatureEntry {
  enabled: boolean;
  source: string;
  reason: string | null;
  quota_exceeded?: boolean;
  quota_detail?: string;
}

export interface FeatureAccessResult {
  status: string;
  plan: string | null;
  plan_id: string | null;
  ai_package: string | null;
  ai_package_id?: string | null;
  features: Record<string, FeatureEntry>;
  limits: Record<string, number>;
  usage: Record<string, number>;
  roles: string[];
  is_admin: boolean;
  message?: string;
}

const EMPTY: FeatureAccessResult = {
  status: "no_subscription",
  plan: null,
  plan_id: null,
  ai_package: null,
  ai_package_id: null,
  features: {},
  limits: {},
  usage: {},
  roles: [],
  is_admin: false,
};

/**
 * AI module-to-feature key mapping for backward compatibility
 * with AI module names used in AiFeatureGate/AiModuleInsights
 */
const AI_MODULE_MAP: Record<string, string> = {
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
  generate_document: "ai_hr_assistant",
  business_analytics: "ai_workforce_analytics",
};

/**
 * Status → lock reason mapping
 */
const STATUS_LOCK_REASONS: Record<string, string> = {
  suspended: "subscription_suspended",
  cancelled: "subscription_cancelled",
  overdue: "subscription_overdue",
  pending: "subscription_pending",
  no_subscription: "no_subscription",
};

export function useFeatureAccessQuery(positionId?: string) {
  const { companyId } = useCompany();
  const { user } = useAuth();

  // Also fetch tenant_features for basket-based access
  const basketQuery = useQuery({
    queryKey: ["tenant-basket-features", companyId],
    queryFn: async () => {
      if (!companyId) return [] as string[];
      const { data, error } = await supabase
        .from("tenant_features")
        .select("feature_key")
        .eq("company_id", companyId)
        .eq("status", "active");
      if (error) return [] as string[];
      return (data || []).map((d: any) => d.feature_key as string);
    },
    enabled: !!companyId,
    staleTime: 60_000,
  });

  const basketFeatures = new Set(basketQuery.data || []);

  const query = useQuery({
    queryKey: ["feature-access", companyId, user?.id, positionId],
    queryFn: async () => {
      if (!companyId) return EMPTY;
      const { data, error } = await supabase.rpc("get_feature_access", {
        p_company_id: companyId,
        p_user_id: user?.id || null,
        p_position_id: positionId || null,
      });
      if (error) throw error;
      return (data as unknown as FeatureAccessResult) || EMPTY;
    },
    enabled: !!companyId,
    staleTime: 60_000,
  });

  const access = query.data || EMPTY;

  /**
   * Universal feature check — works for both plan features and AI features.
   * Accepts raw feature keys (e.g. "payroll") or AI module aliases (e.g. "hr_operational").
   */
  const checkFeature = (keyOrAlias: string): { enabled: boolean; reason: string | null; source: string } => {
    // Resolve alias
    const key = AI_MODULE_MAP[keyOrAlias] || keyOrAlias;

    // Basket-based access: if tenant purchased this feature, it's enabled
    if (basketFeatures.has(key)) {
      // Still check quota from the RPC if available
      const feat = access.features[key];
      if (feat?.quota_exceeded) {
        return { enabled: false, reason: "quota_exceeded", source: feat.quota_detail || "usage" };
      }
      return { enabled: true, reason: null, source: "basket" };
    }

    // Fallback to legacy plan-based access
    if (!["active", "trial"].includes(access.status) && basketFeatures.size === 0) {
      const lockReason = STATUS_LOCK_REASONS[access.status] || "subscription_inactive";
      return { enabled: false, reason: lockReason, source: "subscription" };
    }

    const feat = access.features[key];
    if (!feat) {
      return { enabled: false, reason: "not_in_plan", source: "plan" };
    }
    if (feat.quota_exceeded) {
      return { enabled: false, reason: "quota_exceeded", source: feat.quota_detail || "usage" };
    }
    if (!feat.enabled) {
      return { enabled: false, reason: feat.reason || "not_in_plan", source: feat.source };
    }
    return { enabled: true, reason: null, source: feat.source };
  };

  const isSubscriptionActive = ["active", "trial"].includes(access.status) || basketFeatures.size > 0;

  /**
   * Check if the employee AI coach menu should be shown
   */
  const showEmployeeAiMenu = (() => {
    if (basketFeatures.has("ai_employee_career_coach")) return true;
    if (!isSubscriptionActive) return false;
    const feat = access.features["ai_employee_career_coach"];
    return feat?.enabled === true;
  })();

  return {
    ...query,
    access,
    checkFeature,
    isSubscriptionActive,
    subscriptionStatus: access.status,
    showEmployeeAiMenu,
  };
}
