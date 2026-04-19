import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export type WorkflowStatus = "draft" | "submitted" | "pending_approval" | "approved" | "rejected" | "returned" | "locked" | "archived";
export type ApprovalAction = "submit" | "approve" | "reject" | "return" | "escalate" | "lock" | "archive";
export type RoutingMode = "role" | "position" | "manager_chain" | "hr_owner" | "finance_owner" | "tenant_admin";

export const workflowStatusLabels: Record<string, string> = {
  draft: "مسودة",
  pending: "معلق",
  submitted: "مقدم",
  pending_approval: "بانتظار الموافقة",
  approved: "موافق عليه",
  rejected: "مرفوض",
  returned: "مرجع للتعديل",
  locked: "مقفل",
  archived: "مؤرشف",
};

export const workflowStatusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground border-muted",
  pending: "bg-accent/10 text-accent-foreground border-accent/20",
  submitted: "bg-accent/10 text-accent-foreground border-accent/20",
  pending_approval: "bg-accent/10 text-accent-foreground border-accent/20",
  approved: "bg-primary/10 text-primary border-primary/20",
  rejected: "bg-destructive/10 text-destructive border-destructive/20",
  returned: "bg-warning/10 text-warning border-warning/20",
  locked: "bg-muted text-muted-foreground border-muted",
  archived: "bg-muted text-muted-foreground border-muted",
};

export const requestTypeLabels: Record<string, string> = {
  leave: "إجازة",
  attendance_correction: "تصحيح حضور",
  payroll: "رواتب",
  salary_change: "تغيير راتب",
  contract: "عقد",
  document: "مستند",
  onboarding: "تعيين",
  final_settlement: "تسوية نهائية",
  certificate: "شهادة",
  certificate_experience: "شهادة خبرة",
  certificate_salary: "شهادة راتب",
  certificate_employment: "تعريف بالراتب",
  promotion: "ترقية / نقل",
  expense: "مصروفات / بدلات",
  offer_approval: "موافقة على عرض توظيف",
  general: "عام",
};

export function useWorkflowInstances(filter?: { status?: string; requestType?: string }) {
  const { companyId } = useCompany();
  
  return useQuery({
    queryKey: ["workflow-instances", companyId, filter],
    queryFn: async () => {
      // Use the role-based visibility RPC
      const { data, error } = await supabase.rpc("get_my_visible_workflow_instances", {
        p_status: filter?.status || null,
        p_request_type: filter?.requestType || null,
      });
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!companyId,
  });
}

export function useWorkflowInstanceByRef(requestType: string, referenceId: string | undefined) {
  const { companyId } = useCompany();

  return useQuery({
    queryKey: ["workflow-instance-ref", requestType, referenceId],
    queryFn: async () => {
      const { data } = await supabase
        .from("workflow_instances")
        .select("*")
        .eq("company_id", companyId!)
        .eq("request_type", requestType)
        .eq("reference_id", referenceId!)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!companyId && !!referenceId,
  });
}

export function useApprovalActions(instanceId: string | undefined) {
  return useQuery({
    queryKey: ["approval-actions", instanceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("approval_actions")
        .select("*")
        .eq("instance_id", instanceId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!instanceId,
  });
}

export function useProcessApproval() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ instanceId, action, comments, signatureData }: {
      instanceId: string;
      action: ApprovalAction;
      comments?: string;
      signatureData?: string;
    }) => {
      const { data, error } = await supabase.rpc("process_approval_action", {
        p_instance_id: instanceId,
        p_action: action,
        p_comments: comments || null,
        p_signature_data: signatureData || null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: async (data: any) => {
      // If a document was auto-generated, trigger PDF finalization
      if (data?.generated_doc_id) {
        try {
          const { data: pdfResult, error: pdfError } = await supabase.functions.invoke("generate-document", {
            body: { documentId: data.generated_doc_id, action: "generate_and_store" },
          });
          if (pdfError) {
            console.error("Auto PDF finalization error:", pdfError);
          } else if (pdfResult?.error) {
            console.error("Auto PDF finalization failed:", pdfResult.error);
          }
        } catch (e) {
          console.error("Auto PDF finalization exception:", e);
        }
      }

      queryClient.invalidateQueries({ queryKey: ["workflow-instances"] });
      queryClient.invalidateQueries({ queryKey: ["workflow-instance-ref"] });
      queryClient.invalidateQueries({ queryKey: ["approval-actions"] });
      queryClient.invalidateQueries({ queryKey: ["ep-leaves"] });
      queryClient.invalidateQueries({ queryKey: ["leave-requests"] });
      queryClient.invalidateQueries({ queryKey: ["corrections"] });
      queryClient.invalidateQueries({ queryKey: ["payroll-runs"] });
      queryClient.invalidateQueries({ queryKey: ["all-contracts"] });
      queryClient.invalidateQueries({ queryKey: ["exit-clearance"] });
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["ep-generated-docs"] });
      queryClient.invalidateQueries({ queryKey: ["hr-generated-docs"] });
      queryClient.invalidateQueries({ queryKey: ["generated-documents"] });
      queryClient.invalidateQueries({ queryKey: ["my-request-documents"] });
      queryClient.invalidateQueries({ queryKey: ["company-request-documents"] });

      const actionLabels: Record<string, string> = {
        approve: "تمت الموافقة",
        reject: "تم الرفض",
        return: "تم الإرجاع",
        submit: "تم التقديم",
        escalate: "تم التصعيد",
        lock: "تم القفل",
        archive: "تم الأرشفة",
      };
      toast({ title: actionLabels[data?.action] || "تم التحديث" });
    },
    onError: (err: Error) => {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    },
  });
}

export function useCreateWorkflowInstance() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ requestType, referenceId, companyId }: {
      requestType: string;
      referenceId: string;
      companyId?: string;
    }) => {
      const { data, error } = await supabase.rpc("create_workflow_instance", {
        p_request_type: requestType,
        p_reference_id: referenceId,
        p_company_id: companyId || null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflow-instances"] });
    },
    onError: (err: Error) => {
      toast({ title: "خطأ في إنشاء سير العمل", description: err.message, variant: "destructive" });
    },
  });
}

export function useRepairStuckWorkflows() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("repair_stuck_workflow_instances");
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["workflow-instances"] });
      queryClient.invalidateQueries({ queryKey: ["ep-leaves"] });
      queryClient.invalidateQueries({ queryKey: ["leave-requests"] });
      toast({
        title: "تم إصلاح سير العمل",
        description: `تم إنشاء ${data?.created || 0} وإصلاح ${data?.repaired || 0} طلب`,
      });
    },
    onError: (err: Error) => {
      toast({ title: "خطأ في الإصلاح", description: err.message, variant: "destructive" });
    },
  });
}
