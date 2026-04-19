import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "./useCompany";

export interface BillLineItem {
  type: string;
  description: string;
  amount: number;
  quantity: number;
}

export interface BillPreview {
  items: BillLineItem[];
  total: number;
  billing_cycle: string;
  status: string;
  plan: string | null;
  plan_ar: string | null;
  ai_package: string | null;
  start_date: string | null;
  end_date: string | null;
  currency: string;
}

const EMPTY: BillPreview = {
  items: [], total: 0, billing_cycle: "monthly", status: "no_subscription",
  plan: null, plan_ar: null, ai_package: null, start_date: null, end_date: null, currency: "USD",
};

export function useBillPreview(companyIdOverride?: string) {
  const { companyId: myCompanyId } = useCompany();
  const companyId = companyIdOverride || myCompanyId;

  return useQuery({
    queryKey: ["bill-preview", companyId],
    queryFn: async () => {
      if (!companyId) return EMPTY;
      const { data, error } = await supabase.rpc("preview_tenant_bill", { p_company_id: companyId });
      if (error) throw error;
      return (data as unknown as BillPreview) || EMPTY;
    },
    enabled: !!companyId,
    staleTime: 60_000,
  });
}
