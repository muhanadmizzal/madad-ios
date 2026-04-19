import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "./useCompany";

export interface MadadPackage {
  id: string;
  key: string;
  name_ar: string;
  name_en: string;
  monthly_price: number;
  yearly_price: number;
  currency: string;
  badge_ar: string | null;
  badge_en: string | null;
}

export interface MadadModule {
  key: string;
  name_ar: string;
  name_en: string;
  is_active: boolean;
  status: string;
}

export interface MadadFeature {
  feature_key: string;
  feature_label_ar: string;
  feature_label_en: string;
  value: string;
}

export interface MadadSubscriptionDetails {
  status: string;
  billing_cycle: string | null;
  start_date: string | null;
  end_date: string | null;
  trial_ends_at: string | null;
  package: MadadPackage | null;
  modules: MadadModule[];
  features: MadadFeature[];
}

export interface MadadDashboardStats {
  employees: number;
  departments: number;
  branches: number;
  bookings: number;
  active_modules: number;
  pending_approvals: number;
  recent_activity: Array<{
    action: string;
    table_name: string;
    created_at: string;
    user_id: string;
  }>;
}

const EMPTY_SUB: MadadSubscriptionDetails = {
  status: "no_subscription",
  billing_cycle: null,
  start_date: null,
  end_date: null,
  trial_ends_at: null,
  package: null,
  modules: [],
  features: [],
};

const EMPTY_STATS: MadadDashboardStats = {
  employees: 0,
  departments: 0,
  branches: 0,
  bookings: 0,
  active_modules: 0,
  pending_approvals: 0,
  recent_activity: [],
};

export function useMadadSubscription() {
  const { companyId } = useCompany();

  const subQuery = useQuery({
    queryKey: ["madad-subscription-details", companyId],
    queryFn: async () => {
      if (!companyId) return EMPTY_SUB;
      const { data, error } = await supabase.rpc("get_madad_subscription_details", {
        p_company_id: companyId,
      });
      if (error) throw error;
      return (data as unknown as MadadSubscriptionDetails) || EMPTY_SUB;
    },
    enabled: !!companyId,
    staleTime: 60_000,
  });

  const subscription = subQuery.data || EMPTY_SUB;

  const isActive = ["active", "trial"].includes(subscription.status);
  const isTrial = subscription.status === "trial";

  const isModuleActive = (moduleKey: string): boolean => {
    if (moduleKey === "tamkeen") return true; // always active as base
    return subscription.modules.some((m) => m.key === moduleKey && m.is_active);
  };

  const hasFeature = (featureKey: string): boolean => {
    return subscription.features.some((f) => f.feature_key === featureKey);
  };

  const getFeatureValue = (featureKey: string): string | null => {
    const f = subscription.features.find((f) => f.feature_key === featureKey);
    return f?.value || null;
  };

  const activeModuleKeys = subscription.modules
    .filter((m) => m.is_active)
    .map((m) => m.key);
  // Always include tamkeen
  if (!activeModuleKeys.includes("tamkeen")) activeModuleKeys.unshift("tamkeen");

  return {
    ...subQuery,
    subscription,
    isActive,
    isTrial,
    isModuleActive,
    hasFeature,
    getFeatureValue,
    activeModuleKeys,
    packageName: subscription.package
      ? { ar: subscription.package.name_ar, en: subscription.package.name_en }
      : null,
  };
}

export function useMadadDashboardStats() {
  const { companyId } = useCompany();

  return useQuery({
    queryKey: ["madad-dashboard-stats", companyId],
    queryFn: async () => {
      if (!companyId) return EMPTY_STATS;
      const { data, error } = await supabase.rpc("get_madad_dashboard_stats", {
        p_company_id: companyId,
      });
      if (error) throw error;
      return (data as unknown as MadadDashboardStats) || EMPTY_STATS;
    },
    enabled: !!companyId,
    staleTime: 30_000,
  });
}
