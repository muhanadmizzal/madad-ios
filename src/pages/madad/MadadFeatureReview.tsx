/**
 * Feature Review Center — Business owner reviews feature change requests
 * Route: /madad/feature-requests
 */
import { useState, useMemo } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCompany } from "@/hooks/useCompany";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  useFeatureChangeRequests,
  useTenantFeatureStatuses,
  useFeatureToggle,
  getFeatureStatusLabel,
  getFeatureStatusColor,
  getSourceLabel,
} from "@/hooks/useUnifiedFeatureManagement";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CheckCircle2, XCircle, Clock, Search, Filter,
  Shield, Zap, ToggleRight, FileText, ArrowUpRight,
  ChevronLeft, ChevronRight, MessageSquare,
} from "lucide-react";

export default function MadadFeatureReview() {
  const { t, lang } = useLanguage();
  const { companyId } = useCompany();
  const { user } = useAuth();
  const { reviewRequest } = useFeatureToggle();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});

  // All change requests for this company
  const { data: requests = [], isLoading: reqLoading } = useFeatureChangeRequests();
  // Current feature statuses
  const { data: featureStatuses = [] } = useTenantFeatureStatuses();

  // Catalog for names
  const { data: catalog = [] } = useQuery({
    queryKey: ["feature-catalog-all"],
    queryFn: async () => {
      const { data } = await supabase.from("feature_catalog").select("key, name, name_ar, category, module_key, monthly_price").eq("is_active", true);
      return data || [];
    },
  });

  const catalogMap = useMemo(() => {
    const map: Record<string, any> = {};
    catalog.forEach((c: any) => { map[c.key] = c; });
    return map;
  }, [catalog]);

  const featureStatusMap = useMemo(() => {
    const map: Record<string, any> = {};
    featureStatuses.forEach((f) => { map[f.feature_key] = f; });
    return map;
  }, [featureStatuses]);

  // Filter requests
  const filteredRequests = useMemo(() => {
    let list = requests;
    if (statusFilter !== "all") {
      list = list.filter((r) => r.status === statusFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((r) => {
        const cat = catalogMap[r.feature_key];
        return r.feature_key.toLowerCase().includes(q) ||
          (cat?.name || "").toLowerCase().includes(q) ||
          (cat?.name_ar || "").includes(q);
      });
    }
    return list;
  }, [requests, statusFilter, searchQuery, catalogMap]);

  const pendingCount = requests.filter((r) => r.status === "pending").length;
  const approvedCount = requests.filter((r) => r.status === "approved").length;
  const rejectedCount = requests.filter((r) => r.status === "rejected").length;

  const handleReview = (requestId: string, status: "approved" | "rejected") => {
    reviewRequest.mutate({
      requestId,
      status,
      notes: reviewNotes[requestId] || undefined,
      applyDirectly: status === "approved",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-heading font-extrabold text-2xl flex items-center gap-2">
          <Shield className="h-6 w-6" style={{ color: "hsl(var(--gold))" }} />
          {t("مركز مراجعة الميزات", "Feature Review Center")}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t("مراجعة والموافقة على طلبات تفعيل وإلغاء الميزات", "Review and approve feature activation/deactivation requests")}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-warning/20 bg-warning/5">
          <CardContent className="py-4 text-center">
            <Clock className="h-5 w-5 text-warning mx-auto mb-1" />
            <p className="font-heading font-extrabold text-2xl text-warning">{pendingCount}</p>
            <p className="text-xs text-muted-foreground">{t("بانتظار المراجعة", "Pending")}</p>
          </CardContent>
        </Card>
        <Card className="border-success/20 bg-success/5">
          <CardContent className="py-4 text-center">
            <CheckCircle2 className="h-5 w-5 text-success mx-auto mb-1" />
            <p className="font-heading font-extrabold text-2xl text-success">{approvedCount}</p>
            <p className="text-xs text-muted-foreground">{t("تمت الموافقة", "Approved")}</p>
          </CardContent>
        </Card>
        <Card className="border-destructive/20 bg-destructive/5">
          <CardContent className="py-4 text-center">
            <XCircle className="h-5 w-5 text-destructive mx-auto mb-1" />
            <p className="font-heading font-extrabold text-2xl text-destructive">{rejectedCount}</p>
            <p className="text-xs text-muted-foreground">{t("مرفوض", "Rejected")}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("بحث عن ميزة...", "Search features...")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="ps-9"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {[
            { key: "all", label: t("الكل", "All") },
            { key: "pending", label: t("بانتظار", "Pending") },
            { key: "approved", label: t("موافق", "Approved") },
            { key: "rejected", label: t("مرفوض", "Rejected") },
          ].map((f) => (
            <Button key={f.key} variant={statusFilter === f.key ? "default" : "outline"} size="sm" className="text-xs h-8" onClick={() => setStatusFilter(f.key)}>
              {f.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Tabs: Requests vs Current Features */}
      <Tabs defaultValue="requests">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="requests" className="gap-1">
            <FileText className="h-3.5 w-3.5" />
            {t("الطلبات", "Requests")} {pendingCount > 0 && <Badge className="bg-warning/10 text-warning text-[10px] ms-1">{pendingCount}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="current" className="gap-1">
            <ToggleRight className="h-3.5 w-3.5" />
            {t("الميزات الحالية", "Current Features")}
          </TabsTrigger>
        </TabsList>

        {/* Requests Tab */}
        <TabsContent value="requests" className="space-y-3 mt-4">
          {filteredRequests.length === 0 ? (
            <Card className="border-dashed border-muted-foreground/20">
              <CardContent className="py-12 text-center">
                <CheckCircle2 className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">{t("لا توجد طلبات", "No requests found")}</p>
              </CardContent>
            </Card>
          ) : (
            filteredRequests.map((req) => {
              const cat = catalogMap[req.feature_key];
              const isPending = req.status === "pending";

              return (
                <Card key={req.id} className={`border-border/50 ${isPending ? "ring-1 ring-warning/20" : ""}`}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-heading font-bold text-sm">
                            {cat ? t(cat.name_ar || cat.name, cat.name) : req.feature_key}
                          </p>
                          <Badge className={getFeatureStatusColor(req.status)}>
                            {getFeatureStatusLabel(req.status, lang)}
                          </Badge>
                          <Badge variant="outline" className="text-[10px]">
                            {req.action === "enable" || req.action === "activate"
                              ? t("طلب تفعيل", "Enable Request")
                              : t("طلب إلغاء", "Disable Request")}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          {req.module_key && <span>{req.module_key}</span>}
                          <span>{new Date(req.created_at).toLocaleDateString()}</span>
                          {(req.pricing_impact || req.estimated_monthly_impact) > 0 && (
                            <span className="font-heading font-bold text-primary">
                              {(req.action === "enable" || req.action === "activate") ? "+" : "-"}${req.pricing_impact || req.estimated_monthly_impact}/{t("شهر", "mo")}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Review actions for pending requests */}
                    {isPending && (
                      <div className="space-y-2 pt-2 border-t border-border/30">
                        <Textarea
                          placeholder={t("ملاحظات المراجعة (اختياري)...", "Review notes (optional)...")}
                          value={reviewNotes[req.id] || ""}
                          onChange={(e) => setReviewNotes((p) => ({ ...p, [req.id]: e.target.value }))}
                          className="text-sm min-h-[60px]"
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="gap-1 flex-1 bg-success hover:bg-success/90 text-success-foreground"
                            onClick={() => handleReview(req.id, "approved")}
                            disabled={reviewRequest.isPending}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            {t("موافقة وتفعيل", "Approve & Activate")}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="gap-1 flex-1"
                            onClick={() => handleReview(req.id, "rejected")}
                            disabled={reviewRequest.isPending}
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            {t("رفض", "Reject")}
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Show review info for reviewed requests */}
                    {req.review_notes && !isPending && (
                      <div className="flex items-start gap-2 p-2 rounded bg-muted/30 text-xs">
                        <MessageSquare className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                        <span>{req.review_notes}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        {/* Current Features Tab */}
        <TabsContent value="current" className="space-y-3 mt-4">
          {featureStatuses.length === 0 ? (
            <Card className="border-dashed border-muted-foreground/20">
              <CardContent className="py-12 text-center">
                <ToggleRight className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">{t("لا توجد ميزات مفعّلة", "No features activated yet")}</p>
              </CardContent>
            </Card>
          ) : (
            featureStatuses.map((feat) => {
              const cat = catalogMap[feat.feature_key];
              return (
                <div key={feat.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/20 border border-border/30">
                  <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${feat.status === "active" ? "bg-success" : "bg-muted-foreground/30"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {cat ? t(cat.name_ar || cat.name, cat.name) : feat.feature_key}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge className={`${getFeatureStatusColor(feat.status)} text-[10px]`}>
                        {getFeatureStatusLabel(feat.status, lang)}
                      </Badge>
                      <Badge variant="outline" className="text-[9px]">
                        {getSourceLabel(feat.source, lang)}
                      </Badge>
                      {feat.module_key && (
                        <span className="text-[10px] text-muted-foreground">{feat.module_key}</span>
                      )}
                    </div>
                  </div>
                  {feat.activated_at && (
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {new Date(feat.activated_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
              );
            })
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
