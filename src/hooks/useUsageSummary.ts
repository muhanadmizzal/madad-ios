import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "./useCompany";

export interface UsageBucket {
  used: number;
  limit: number;
  over_limit?: boolean;
}

export interface UsageSummary {
  period: string;
  employees: UsageBucket;
  branches: UsageBucket;
  ai_requests: UsageBucket;
  ai_tokens: UsageBucket;
}

const EMPTY: UsageSummary = {
  period: "",
  employees: { used: 0, limit: 0 },
  branches: { used: 0, limit: 0 },
  ai_requests: { used: 0, limit: 0 },
  ai_tokens: { used: 0, limit: 0 },
};

export function useUsageSummary(companyIdOverride?: string) {
  const { companyId: myCompanyId } = useCompany();
  const companyId = companyIdOverride || myCompanyId;

  return useQuery({
    queryKey: ["usage-summary", companyId],
    queryFn: async () => {
      if (!companyId) return EMPTY;
      const { data, error } = await supabase.rpc("get_tenant_usage_summary", { p_company_id: companyId });
      if (error) throw error;
      return (data as unknown as UsageSummary) || EMPTY;
    },
    enabled: !!companyId,
    staleTime: 30_000,
  });
}
