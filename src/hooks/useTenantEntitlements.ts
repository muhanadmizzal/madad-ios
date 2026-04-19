import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "./useCompany";

export interface TenantEntitlements {
  plan: string | null;
  plan_id: string | null;
  ai_package: string | null;
  ai_package_id: string | null;
  billing_cycle: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  features: Record<string, boolean>;
  limits: Record<string, number>;
  addons: Array<{ id: string; addon_key: string; status: string; custom_price: number | null }>;
  monthly_price: number;
  yearly_price: number;
  ai_monthly_price: number;
  ai_yearly_price: number;
}

const EMPTY: TenantEntitlements = {
  plan: null, plan_id: null, ai_package: null, ai_package_id: null,
  billing_cycle: "monthly", status: "no_subscription",
  start_date: null, end_date: null,
  features: {}, limits: {}, addons: [],
  monthly_price: 0, yearly_price: 0, ai_monthly_price: 0, ai_yearly_price: 0,
};

export function useTenantEntitlements() {
  const { companyId } = useCompany();

  const query = useQuery({
    queryKey: ["tenant-entitlements", companyId],
    queryFn: async () => {
      if (!companyId) return EMPTY;
      const { data, error } = await supabase.rpc("get_tenant_entitlements", { p_company_id: companyId });
      if (error) throw error;
      return (data as unknown as TenantEntitlements) || EMPTY;
    },
    enabled: !!companyId,
    staleTime: 60_000,
  });

  const entitlements = query.data || EMPTY;

  const hasFeature = (key: string): boolean => entitlements.features[key] === true;

  const getLimit = (key: string): number => entitlements.limits[key] ?? 0;

  const totalMonthly = entitlements.monthly_price + entitlements.ai_monthly_price +
    entitlements.addons.reduce((s, a) => s + (a.custom_price || 0), 0);

  return {
    ...query,
    entitlements,
    hasFeature,
    getLimit,
    totalMonthly,
    isSubscribed: entitlements.status === "active",
  };
}
