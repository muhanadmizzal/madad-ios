import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "./useCompany";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Employee's own request documents - filtered by requester_user_id or employee link.
 * RLS also enforces this, but we filter client-side for clean UX.
 */
export function useMyRequestDocuments(requestType?: string) {
  const { companyId } = useCompany();
  const { user } = useAuth();

  return useQuery({
    queryKey: ["my-request-documents", companyId, user?.id, requestType],
    queryFn: async () => {
      // First get employee id for this user
      const { data: emp } = await supabase
        .from("employees")
        .select("id")
        .eq("company_id", companyId!)
        .eq("user_id", user!.id)
        .maybeSingle();

      let q = (supabase as any)
        .from("request_documents")
        .select("*")
        .eq("company_id", companyId!)
        .order("created_at", { ascending: false });

      // Filter: either requester_user_id matches, or employee_id matches
      if (emp?.id) {
        q = q.or(`requester_user_id.eq.${user!.id},employee_id.eq.${emp.id}`);
      } else {
        q = q.eq("requester_user_id", user!.id);
      }

      if (requestType && requestType !== "all") {
        q = q.eq("request_type", requestType);
      }

      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!companyId && !!user,
  });
}

export function useRequestDocument(id: string | undefined) {
  return useQuery({
    queryKey: ["request-document", id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("request_documents")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data as any;
    },
    enabled: !!id,
  });
}

/**
 * HR/Admin: all company request documents (RLS restricts to HR roles).
 */
export function useCompanyRequestDocuments(requestType?: string, status?: string) {
  const { companyId } = useCompany();

  return useQuery({
    queryKey: ["company-request-documents", companyId, requestType, status],
    queryFn: async () => {
      let q = (supabase as any)
        .from("request_documents")
        .select("*, employees(id, name_ar, employee_code, position, basic_salary, hire_date, national_id, department_id, departments(name))")
        .eq("company_id", companyId!)
        .order("created_at", { ascending: false });

      if (requestType && requestType !== "all") q = q.eq("request_type", requestType);
      if (status && status !== "all") q = q.eq("status", status);

      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!companyId,
  });
}
