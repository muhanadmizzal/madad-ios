/**
 * Unified Feature Management Hook
 * Single source of truth for feature enable/disable, approval flow, and pricing.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "./useCompany";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export interface UnifiedFeatureStatus {
  id: string;
  company_id: string;
  feature_key: string;
  module_key: string | null;
  status: string; // active | inactive | pending_enable | pending_disable
  source: string; // package | manual | admin_override | legacy
  custom_price: number | null;
  activated_at: string | null;
  activated_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
  deactivated_at: string | null;
  requested_by: string | null;
  notes: string | null;
}

export interface FeatureChangeRequest {
  id: string;
  company_id: string;
  feature_key: string;
  module_key: string | null;
  action: string;
  request_type: string;
  estimated_monthly_impact: number;
  pricing_impact: number;
  current_feature_status: string;
  status: string;
  requested_by: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkflowSetting {
  setting_key: string;
  setting_value: boolean;
}

// --- Tenant feature statuses ---
export function useTenantFeatureStatuses(companyIdOverride?: string) {
  const { companyId: myCompanyId } = useCompany();
  const companyId = companyIdOverride || myCompanyId;

  return useQuery({
    queryKey: ["unified-tenant-features", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("tenant_features")
        .select("*")
        .eq("company_id", companyId);
      if (error) throw error;
      return (data || []) as unknown as UnifiedFeatureStatus[];
    },
    enabled: !!companyId,
  });
}

// --- Feature change requests ---
export function useFeatureChangeRequests(companyIdOverride?: string) {
  const { companyId: myCompanyId } = useCompany();
  const companyId = companyIdOverride || myCompanyId;

  return useQuery({
    queryKey: ["unified-feature-requests", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("feature_change_requests")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as FeatureChangeRequest[];
    },
    enabled: !!companyId,
  });
}

// --- Workflow settings ---
export function useWorkflowSettings() {
  return useQuery({
    queryKey: ["workflow-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("madad_workflow_settings")
        .select("setting_key, setting_value");
      if (error) throw error;
      const map: Record<string, boolean> = {};
      (data || []).forEach((s: any) => { map[s.setting_key] = s.setting_value; });
      return map;
    },
    staleTime: 300_000,
  });
}

// --- Feature toggle mutations ---
export function useFeatureToggle() {
  const { companyId } = useCompany();
  const { user } = useAuth();
  const qc = useQueryClient();

  const requestChange = useMutation({
    mutationFn: async ({
      featureKey,
      moduleKey,
      action,
      pricingImpact,
      currentStatus,
    }: {
      featureKey: string;
      moduleKey?: string;
      action: "enable" | "disable";
      pricingImpact?: number;
      currentStatus?: string;
    }) => {
      if (!companyId || !user) throw new Error("Missing context");
      const { error } = await supabase.from("feature_change_requests").insert({
        company_id: companyId,
        requested_by: user.id,
        action,
        request_type: action,
        feature_key: featureKey,
        module_key: moduleKey || null,
        estimated_monthly_impact: pricingImpact || 0,
        pricing_impact: pricingImpact || 0,
        current_feature_status: currentStatus || "inactive",
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["unified-feature-requests"] });
      qc.invalidateQueries({ queryKey: ["unified-tenant-features"] });
      toast({ title: "تم إرسال الطلب", description: "سيتم مراجعة طلبك" });
    },
    onError: (e: Error) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });

  // Direct toggle (for admin/owner with no approval required)
  const directToggle = useMutation({
    mutationFn: async ({
      featureKey,
      moduleKey,
      enable,
      source,
    }: {
      featureKey: string;
      moduleKey?: string;
      enable: boolean;
      source?: string;
    }) => {
      if (!companyId || !user) throw new Error("Missing context");

      if (enable) {
        const { error } = await supabase.from("tenant_features").upsert({
          company_id: companyId,
          feature_key: featureKey,
          module_key: moduleKey || null,
          status: "active",
          source: source || "manual",
          activated_by: user.id,
          activated_at: new Date().toISOString(),
          approved_by: user.id,
          approved_at: new Date().toISOString(),
          deactivated_at: null,
        } as any, { onConflict: "company_id,feature_key" });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("tenant_features")
          .update({
            status: "inactive",
            deactivated_at: new Date().toISOString(),
          } as any)
          .eq("company_id", companyId)
          .eq("feature_key", featureKey);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["unified-tenant-features"] });
      qc.invalidateQueries({ queryKey: ["tenant-basket-features"] });
      qc.invalidateQueries({ queryKey: ["feature-access"] });
      qc.invalidateQueries({ queryKey: ["tenant-features"] });
      toast({ title: "تم التحديث", description: "تم تحديث حالة الميزة" });
    },
    onError: (e: Error) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });

  // Approve/reject request (for business owner or super admin)
  const reviewRequest = useMutation({
    mutationFn: async ({
      requestId,
      status,
      notes,
      applyDirectly,
    }: {
      requestId: string;
      status: "approved" | "rejected";
      notes?: string;
      applyDirectly?: boolean;
    }) => {
      if (!user) throw new Error("Not authenticated");

      // Update request status
      const { data: req, error: updateErr } = await supabase
        .from("feature_change_requests")
        .update({
          status,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          review_notes: notes || null,
        } as any)
        .eq("id", requestId)
        .select()
        .single();
      if (updateErr) throw updateErr;

      // If approved and should apply directly, toggle the feature
      if (status === "approved" && applyDirectly && req) {
        const r = req as any;
        const enable = r.action === "activate" || r.action === "enable";
        if (enable) {
          await supabase.from("tenant_features").upsert({
            company_id: r.company_id,
            feature_key: r.feature_key,
            module_key: r.module_key || null,
            status: "active",
            source: "manual",
            activated_by: r.requested_by,
            activated_at: new Date().toISOString(),
            approved_by: user.id,
            approved_at: new Date().toISOString(),
            deactivated_at: null,
          } as any, { onConflict: "company_id,feature_key" });
        } else {
          await supabase
            .from("tenant_features")
            .update({ status: "inactive", deactivated_at: new Date().toISOString() } as any)
            .eq("company_id", r.company_id)
            .eq("feature_key", r.feature_key);
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["unified-feature-requests"] });
      qc.invalidateQueries({ queryKey: ["unified-tenant-features"] });
      qc.invalidateQueries({ queryKey: ["tenant-basket-features"] });
      qc.invalidateQueries({ queryKey: ["feature-access"] });
      qc.invalidateQueries({ queryKey: ["tenant-features"] });
      toast({ title: "تم", description: "تم تحديث حالة الطلب" });
    },
    onError: (e: Error) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });

  return { requestChange, directToggle, reviewRequest };
}

// Helper: get feature status label
export function getFeatureStatusLabel(status: string, lang: string): string {
  const labels: Record<string, { ar: string; en: string }> = {
    active: { ar: "فعال", en: "Active" },
    inactive: { ar: "غير فعال", en: "Inactive" },
    pending_enable: { ar: "بانتظار التفعيل", en: "Pending Activation" },
    pending_disable: { ar: "بانتظار الإلغاء", en: "Pending Deactivation" },
    pending: { ar: "بانتظار الموافقة", en: "Pending Approval" },
    approved: { ar: "تمت الموافقة", en: "Approved" },
    rejected: { ar: "مرفوض", en: "Rejected" },
  };
  return lang === "ar" ? (labels[status]?.ar || status) : (labels[status]?.en || status);
}

export function getFeatureStatusColor(status: string): string {
  const colors: Record<string, string> = {
    active: "bg-success/10 text-success",
    inactive: "bg-muted text-muted-foreground",
    pending_enable: "bg-warning/10 text-warning",
    pending_disable: "bg-warning/10 text-warning",
    pending: "bg-warning/10 text-warning",
    approved: "bg-success/10 text-success",
    rejected: "bg-destructive/10 text-destructive",
  };
  return colors[status] || "bg-muted text-muted-foreground";
}

export function getSourceLabel(source: string, lang: string): string {
  const labels: Record<string, { ar: string; en: string }> = {
    package: { ar: "مفعّل من الباقة", en: "From Package" },
    manual: { ar: "مفعّل يدوياً", en: "Manual" },
    admin_override: { ar: "مفعّل من الإدارة", en: "Admin Override" },
    legacy: { ar: "تفعيل قديم", en: "Legacy" },
    legacy_migrated: { ar: "مُرحّل", en: "Migrated" },
  };
  return lang === "ar" ? (labels[source]?.ar || source) : (labels[source]?.en || source);
}
