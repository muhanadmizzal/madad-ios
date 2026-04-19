import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";

/**
 * Check if an active workflow template exists for a given request type.
 * Falls back to category prefix and then 'general'.
 */
export function useWorkflowTemplateCheck(requestType: string | null) {
  const { companyId } = useCompany();

  return useQuery({
    queryKey: ["workflow-template-check", companyId, requestType],
    queryFn: async () => {
      if (!companyId || !requestType) return { exists: false, templateName: null };

      // Exact match
      const { data: exact } = await supabase
        .from("workflow_templates")
        .select("id, name")
        .eq("company_id", companyId)
        .eq("request_type", requestType)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();

      if (exact) return { exists: true, templateName: exact.name, templateId: exact.id };

      // Category prefix fallback
      const category = requestType.split("_")[0];
      if (category !== requestType) {
        const { data: catMatch } = await supabase
          .from("workflow_templates")
          .select("id, name")
          .eq("company_id", companyId)
          .eq("request_type", category)
          .eq("is_active", true)
          .limit(1)
          .maybeSingle();
        if (catMatch) return { exists: true, templateName: catMatch.name, templateId: catMatch.id };
      }

      // General fallback
      const { data: general } = await supabase
        .from("workflow_templates")
        .select("id, name")
        .eq("company_id", companyId)
        .eq("request_type", "general")
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();

      if (general) return { exists: true, templateName: general.name, templateId: general.id };

      return { exists: false, templateName: null, templateId: null };
    },
    enabled: !!companyId && !!requestType,
    staleTime: 60_000,
  });
}
