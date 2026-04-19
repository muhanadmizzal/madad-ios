import { useLanguage } from "@/contexts/LanguageContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { MODULE_REGISTRY } from "@/lib/moduleConfig";
import { CheckCircle2, XCircle, Clock, Shield, FileText, Building2 } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

export default function MadadAdminActivationRequests() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [reviewDialog, setReviewDialog] = useState<{ id: string; action: "approved" | "rejected" } | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["admin-activation-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activation_requests")
        .select("*, companies:company_id(name, name_ar)")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: string; notes: string }) => {
      const { error } = await supabase
        .from("activation_requests")
        .update({
          status,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          review_notes: notes,
        } as any)
        .eq("id", id);
      if (error) throw error;

      // If approved, activate the modules AND individual features
      if (status === "approved") {
        const req = requests.find((r: any) => r.id === id);
        if (req) {
          // Activate modules
          for (const moduleKey of (req as any).module_keys || []) {
            const { data: modData } = await supabase
              .from("madad_modules")
              .select("id")
              .eq("key", moduleKey)
              .maybeSingle();
            if (modData) {
              await supabase.from("madad_tenant_modules").upsert({
                company_id: (req as any).company_id,
                module_id: modData.id,
                is_active: true,
                activated_at: new Date().toISOString(),
              } as any, { onConflict: "company_id,module_id" });
            }
          }

          // Activate each requested feature in tenant_features
          for (const featureKey of (req as any).feature_keys || []) {
            await supabase.from("tenant_features").upsert({
              company_id: (req as any).company_id,
              feature_key: featureKey,
              module_key: ((req as any).module_keys || [])[0] || null,
              status: "active",
              source: "admin_override",
              activated_by: (req as any).requested_by,
              activated_at: new Date().toISOString(),
              approved_by: user?.id,
              approved_at: new Date().toISOString(),
              deactivated_at: null,
            } as any, { onConflict: "company_id,feature_key" });
          }

          // Also update related feature_change_requests to approved
          for (const featureKey of (req as any).feature_keys || []) {
            await supabase.from("feature_change_requests")
              .update({
                status: "approved",
                reviewed_by: user?.id,
                reviewed_at: new Date().toISOString(),
                review_notes: notes || "Approved via activation request",
              } as any)
              .eq("company_id", (req as any).company_id)
              .eq("feature_key", featureKey)
              .eq("status", "pending");
          }
        }
      }
    },
    onSuccess: () => {
      toast.success(t("تمت المراجعة بنجاح", "Review completed"));
      setReviewDialog(null);
      setReviewNotes("");
      qc.invalidateQueries({ queryKey: ["admin-activation-requests"] });
      qc.invalidateQueries({ queryKey: ["unified-tenant-features"] });
      qc.invalidateQueries({ queryKey: ["tenant-basket-features"] });
      qc.invalidateQueries({ queryKey: ["feature-access"] });
      qc.invalidateQueries({ queryKey: ["tenant-features"] });
      qc.invalidateQueries({ queryKey: ["unified-feature-requests"] });
    },
    onError: () => toast.error(t("حدث خطأ", "Error")),
  });

  const statusBadge = (s: string) => {
    if (s === "approved") return <Badge className="bg-success/10 text-success">{t("تمت الموافقة", "Approved")}</Badge>;
    if (s === "rejected") return <Badge className="bg-destructive/10 text-destructive">{t("مرفوض", "Rejected")}</Badge>;
    if (s === "pending") return <Badge className="bg-warning/10 text-warning">{t("بانتظار المراجعة", "Pending")}</Badge>;
    return <Badge className="bg-muted text-muted-foreground">{s}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading font-extrabold text-2xl flex items-center gap-2">
          <Shield className="h-6 w-6" style={{ color: "hsl(var(--gold))" }} />
          {t("طلبات التفعيل", "Activation Requests")}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">{t("مراجعة والموافقة على طلبات تفعيل الوحدات", "Review and approve module activation requests")}</p>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">{t("جاري التحميل...", "Loading...")}</div>
      ) : requests.length === 0 ? (
        <Card className="border-border/50">
          <CardContent className="py-12 text-center text-muted-foreground">
            <FileText className="h-10 w-10 mx-auto mb-2 opacity-30" />
            <p>{t("لا توجد طلبات", "No requests")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {requests.map((r: any) => (
            <Card key={r.id} className="border-border/50">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="font-heading font-bold text-sm">{r.companies?.name_ar || r.companies?.name || "—"}</span>
                      {statusBadge(r.status)}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {(r.module_keys || []).map((k: string) => {
                        const m = MODULE_REGISTRY[k];
                        return <Badge key={k} variant="secondary" className="text-xs">{m ? t(m.nameAr, m.nameEn) : k}</Badge>;
                      })}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{r.request_type === "upgrade" ? t("ترقية", "Upgrade") : t("تفعيل", "Activation")}</span>
                      <span>{r.billing_cycle === "yearly" ? t("سنوي", "Yearly") : t("شهري", "Monthly")}</span>
                      <span>{r.payment_method_key || "—"}</span>
                      <span>{new Date(r.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-heading font-extrabold text-lg">${r.total}</span>
                    {r.status === "pending" && (
                      <div className="flex gap-1.5">
                        <Button size="sm" className="gap-1 bg-success hover:bg-success/90" onClick={() => { setReviewDialog({ id: r.id, action: "approved" }); setReviewNotes(""); }}>
                          <CheckCircle2 className="h-3.5 w-3.5" /> {t("موافقة", "Approve")}
                        </Button>
                        <Button size="sm" variant="destructive" className="gap-1" onClick={() => { setReviewDialog({ id: r.id, action: "rejected" }); setReviewNotes(""); }}>
                          <XCircle className="h-3.5 w-3.5" /> {t("رفض", "Reject")}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
                {r.review_notes && (
                  <p className="text-xs text-muted-foreground mt-2 p-2 rounded bg-muted/30">{r.review_notes}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Review Dialog */}
      <Dialog open={!!reviewDialog} onOpenChange={() => setReviewDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading">
              {reviewDialog?.action === "approved" ? t("تأكيد الموافقة", "Confirm Approval") : t("تأكيد الرفض", "Confirm Rejection")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Textarea
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              placeholder={t("ملاحظات (اختياري)", "Notes (optional)")}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewDialog(null)}>{t("إلغاء", "Cancel")}</Button>
            <Button
              className={reviewDialog?.action === "rejected" ? "bg-destructive hover:bg-destructive/90" : ""}
              disabled={reviewMutation.isPending}
              onClick={() => reviewDialog && reviewMutation.mutate({ id: reviewDialog.id, status: reviewDialog.action, notes: reviewNotes })}
            >
              {reviewMutation.isPending ? t("جاري...", "...") : t("تأكيد", "Confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
