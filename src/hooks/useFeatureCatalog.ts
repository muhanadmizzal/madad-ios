import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "./useCompany";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export interface CatalogItem {
  id: string;
  key: string;
  name: string;
  name_ar: string;
  category: string;
  description: string | null;
  icon: string;
  pricing_type: string;
  pricing_status: "priced" | "free" | "hidden";
  monthly_price: number;
  per_user_price: number;
  sort_order: number;
  includes_limits: Record<string, number>;
  is_active: boolean;
  feature_type: "page" | "feature" | "action";
  module_key: string | null;
}

export interface TenantFeature {
  id: string;
  company_id: string;
  feature_key: string;
  status: string;
  custom_price: number | null;
  activated_at: string;
}

export interface BasketBill {
  items: Array<{
    feature_key: string;
    description: string;
    category: string;
    pricing_type: string;
    unit_price: number;
    quantity: number;
    amount: number;
  }>;
  total: number;
  employee_count: number;
  currency: string;
  status: string;
}

const EMPTY_BILL: BasketBill = { items: [], total: 0, employee_count: 0, currency: "USD", status: "no_subscription" };

export function useFeatureCatalog() {
  return useQuery({
    queryKey: ["feature-catalog"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("feature_catalog")
        .select("*")
        .eq("is_active", true)
        .order("sort_order" as any);
      if (error) throw error;
      return (data || []) as unknown as CatalogItem[];
    },
    staleTime: 300_000,
  });
}

export function useTenantFeatures() {
  const { companyId } = useCompany();
  return useQuery({
    queryKey: ["tenant-features", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("tenant_features")
        .select("*")
        .eq("company_id", companyId);
      if (error) throw error;
      return (data || []) as unknown as TenantFeature[];
    },
    enabled: !!companyId,
  });
}

export function useBasketBill(companyIdOverride?: string) {
  const { companyId: myCompanyId } = useCompany();
  const companyId = companyIdOverride || myCompanyId;

  return useQuery({
    queryKey: ["basket-bill", companyId],
    queryFn: async () => {
      if (!companyId) return EMPTY_BILL;
      const { data, error } = await supabase.rpc("calculate_basket_bill", { p_company_id: companyId });
      if (error) throw error;
      return (data as unknown as BasketBill) || EMPTY_BILL;
    },
    enabled: !!companyId,
    staleTime: 30_000,
  });
}
// Re-export from unified hook for backward compatibility
export type { FeatureChangeRequest } from "./useUnifiedFeatureManagement";
export { useFeatureChangeRequests as useFeatureRequests } from "./useUnifiedFeatureManagement";

/**
 * Unified toggle — delegates to useUnifiedFeatureManagement.
 * Kept for backward compat with TenantSubscription and FeatureCostConfirmDialog.
 */
export function useToggleFeature() {
  const { companyId } = useCompany();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const requestFeature = useMutation({
    mutationFn: async ({ featureKey, action, estimatedImpact, moduleKey }: {
      featureKey: string;
      action: "activate" | "deactivate";
      estimatedImpact?: number;
      moduleKey?: string;
    }) => {
      if (!companyId || !user) throw new Error("Missing context");
      const { error } = await supabase.from("feature_change_requests").insert({
        company_id: companyId,
        requested_by: user.id,
        action: action === "activate" ? "enable" : "disable",
        request_type: action === "activate" ? "enable" : "disable",
        feature_key: featureKey,
        module_key: moduleKey || null,
        estimated_monthly_impact: estimatedImpact || 0,
        pricing_impact: estimatedImpact || 0,
        current_feature_status: action === "activate" ? "inactive" : "active",
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feature-change-requests"] });
      queryClient.invalidateQueries({ queryKey: ["unified-feature-requests"] });
      queryClient.invalidateQueries({ queryKey: ["tenant-basket-features"] });
      queryClient.invalidateQueries({ queryKey: ["tenant-features"] });
      toast({ title: "تم إرسال الطلب", description: "سيتم مراجعة طلبك من إدارة المنصة" });
    },
    onError: (e: Error) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });

  const cancelRequest = useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase
        .from("feature_change_requests")
        .update({ status: "cancelled" } as any)
        .eq("id", requestId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feature-change-requests"] });
      queryClient.invalidateQueries({ queryKey: ["unified-feature-requests"] });
      toast({ title: "تم الإلغاء", description: "تم إلغاء الطلب" });
    },
    onError: (e: Error) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });

  return { requestFeature, cancelRequest };
}
