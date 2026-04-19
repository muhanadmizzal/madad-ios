import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Server, Copy, Pause, Play, X, RefreshCw } from "lucide-react";
import {
  useLocalAccessRequests,
  useLocalNodes,
  useProvisionLocalNode,
  useRejectLocalAccessRequest,
  useSetLocalNodeStatus,
  useRefreshNodeEntitlements,
  useNodeEntitlements,
  useNodeSyncLogs,
} from "@/hooks/useLocalNodes";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

const STATUS_LABEL: Record<string, string> = {
  provisioned: "مُهيأ",
  active: "نشط",
  suspended: "موقوف",
  revoked: "ملغى",
  pending: "قيد المراجعة",
  approved: "مقبول",
  rejected: "مرفوض",
  cancelled: "ملغى",
};

const HEALTH_STYLE: Record<string, string> = {
  healthy: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  degraded: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
  stale: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
  error: "bg-destructive/15 text-destructive border-destructive/30",
  unknown: "bg-muted text-muted-foreground border-border",
};

export default function MadadAdminLocalNodes() {
  const { data: requests = [] } = useLocalAccessRequests("all");
  const { data: nodes = [] } = useLocalNodes("all");
  const provision = useProvisionLocalNode();
  const reject = useRejectLocalAccessRequest();
  const setStatus = useSetLocalNodeStatus();
  const refreshEntitlements = useRefreshNodeEntitlements();

  const { data: companies = [] } = useQuery({
    queryKey: ["all-companies-for-nodes"],
    queryFn: async () => {
      const { data } = await supabase.from("companies").select("id,name,name_ar");
      return data || [];
    },
  });
  const companyMap = useMemo(() => {
    const m = new Map<string, any>();
    companies.forEach((c: any) => m.set(c.id, c));
    return m;
  }, [companies]);

  const pendingRequests = requests.filter((r) => r.request_status === "pending");

  const [approveOpen, setApproveOpen] = useState<string | null>(null);
  const [rejectOpen, setRejectOpen] = useState<string | null>(null);
  const [provisionToken, setProvisionToken] = useState<{ token: string; expires: string; nodeId: string } | null>(null);
  const [nodeName, setNodeName] = useState("");
  const [reviewNotes, setReviewNotes] = useState("");

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const { data: entitlements } = useNodeEntitlements(selectedNodeId);
  const { data: syncLogs = [] } = useNodeSyncLogs(selectedNodeId);
  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  const handleApprove = async () => {
    if (!approveOpen || !nodeName.trim()) return;
    try {
      const result = await provision.mutateAsync({
        requestId: approveOpen,
        nodeName: nodeName.trim(),
        reviewNotes: reviewNotes || undefined,
      });
      setProvisionToken({
        token: result.provisioning_token,
        expires: result.expires_at,
        nodeId: result.node_id,
      });
      setApproveOpen(null);
      setNodeName("");
      setReviewNotes("");
      toast.success("تم تهيئة العقدة وإصدار رمز التفعيل");
    } catch (e: any) {
      toast.error(e.message || "فشل التهيئة");
    }
  };

  const handleReject = async () => {
    if (!rejectOpen) return;
    try {
      await reject.mutateAsync({ requestId: rejectOpen, reviewNotes: reviewNotes || undefined });
      setRejectOpen(null);
      setReviewNotes("");
      toast.success("تم رفض الطلب");
    } catch (e: any) {
      toast.error(e.message || "فشل الرفض");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="إدارة العقد الهجينة (Hybrid Local Nodes)"
        description="مراجعة طلبات الوصول الهجين، تهيئة العقد المرتبطة بالمستأجرين، إدارة الصلاحيات الموروثة من الاشتراكات، ومتابعة المزامنة"
      />

      <Tabs defaultValue="requests">
        <TabsList>
          <TabsTrigger value="requests">
            الطلبات
            {pendingRequests.length > 0 && (
              <Badge className="mr-2" variant="destructive">{pendingRequests.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="nodes">العقد المُهيأة</TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>طلبات الوصول الهجين</CardTitle>
              <CardDescription>طلبات تهيئة عقد محلية مرتبطة بالمستأجرين</CardDescription>
            </CardHeader>
            <CardContent>
              {requests.length === 0 ? (
                <div className="text-center text-sm text-muted-foreground py-8">لا توجد طلبات</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>التاريخ</TableHead>
                      <TableHead>المستأجر</TableHead>
                      <TableHead>ملاحظات</TableHead>
                      <TableHead>الحالة</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requests.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="text-xs">
                          {format(new Date(r.created_at), "dd MMM yyyy HH:mm", { locale: ar })}
                        </TableCell>
                        <TableCell className="font-medium">
                          {companyMap.get(r.company_id)?.name_ar || companyMap.get(r.company_id)?.name || r.company_id}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                          {r.notes || "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={r.request_status === "pending" ? "default" : "outline"}>
                            {STATUS_LABEL[r.request_status]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {r.request_status === "pending" && (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => {
                                  setApproveOpen(r.id);
                                  const cName =
                                    companyMap.get(r.company_id)?.name ||
                                    companyMap.get(r.company_id)?.name_ar ||
                                    "node";
                                  setNodeName(`${cName} - Local Node`);
                                }}
                              >
                                موافقة
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setRejectOpen(r.id)}>
                                رفض
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="nodes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5" />
                العقد المحلية
              </CardTitle>
              <CardDescription>كل العقد المُهيأة عبر النظام</CardDescription>
            </CardHeader>
            <CardContent>
              {nodes.length === 0 ? (
                <div className="text-center text-sm text-muted-foreground py-8">لا توجد عقد</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>الاسم</TableHead>
                      <TableHead>المستأجر</TableHead>
                      <TableHead>الحالة</TableHead>
                      <TableHead>الصحة</TableHead>
                      <TableHead>آخر مزامنة</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {nodes.map((n) => (
                      <TableRow key={n.id}>
                        <TableCell className="font-medium">{n.node_name}</TableCell>
                        <TableCell className="text-xs">
                          {companyMap.get(n.company_id)?.name_ar || companyMap.get(n.company_id)?.name || n.company_id}
                        </TableCell>
                        <TableCell>
                          <Badge variant={n.node_status === "active" ? "default" : "secondary"}>
                            {STATUS_LABEL[n.node_status] || n.node_status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={HEALTH_STYLE[n.sync_health] || ""}>
                            {n.sync_health}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {n.last_sync_at
                            ? format(new Date(n.last_sync_at), "dd/MM HH:mm", { locale: ar })
                            : "—"}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" onClick={() => setSelectedNodeId(n.id)}>
                              تفاصيل
                            </Button>
                            {n.node_status !== "suspended" && n.node_status !== "revoked" && (
                              <Button
                                size="icon"
                                variant="ghost"
                                title="إيقاف"
                                onClick={() => setStatus.mutate({ nodeId: n.id, status: "suspended" })}
                              >
                                <Pause className="h-4 w-4" />
                              </Button>
                            )}
                            {n.node_status === "suspended" && (
                              <Button
                                size="icon"
                                variant="ghost"
                                title="إعادة تفعيل"
                                onClick={() => setStatus.mutate({ nodeId: n.id, status: "active" })}
                              >
                                <Play className="h-4 w-4" />
                              </Button>
                            )}
                            {n.node_status !== "revoked" && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="text-destructive"
                                title="إلغاء"
                                onClick={() => {
                                  if (confirm("سيُلغى الوصول نهائياً. متابعة؟"))
                                    setStatus.mutate({ nodeId: n.id, status: "revoked" });
                                }}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Approve dialog */}
      <Dialog open={!!approveOpen} onOpenChange={(o) => !o && setApproveOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تهيئة عقدة محلية</DialogTitle>
            <DialogDescription>
              سيتم إنشاء عقدة جديدة، ونسخ صلاحيات الاشتراك الحالية، وإصدار رمز تفعيل لمرة واحدة
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>اسم العقدة</Label>
              <Input value={nodeName} onChange={(e) => setNodeName(e.target.value)} />
            </div>
            <div>
              <Label>ملاحظات المراجعة (اختياري)</Label>
              <Textarea value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleApprove} disabled={provision.isPending || !nodeName.trim()}>
              تهيئة وإصدار الرمز
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject dialog */}
      <Dialog open={!!rejectOpen} onOpenChange={(o) => !o && setRejectOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>رفض الطلب</DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder="سبب الرفض"
            value={reviewNotes}
            onChange={(e) => setReviewNotes(e.target.value)}
          />
          <DialogFooter>
            <Button variant="destructive" onClick={handleReject} disabled={reject.isPending}>
              رفض
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Provisioning token (one-time view) */}
      <Dialog open={!!provisionToken} onOpenChange={(o) => !o && setProvisionToken(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>رمز التفعيل (يظهر مرة واحدة فقط!)</DialogTitle>
            <DialogDescription>
              زوّد المستأجر بهذا الرمز لتفعيل خادمه المحلي. صالح حتى{" "}
              {provisionToken && format(new Date(provisionToken.expires), "dd MMM yyyy HH:mm", { locale: ar })}
            </DialogDescription>
          </DialogHeader>
          {provisionToken && (
            <div className="rounded-md bg-destructive/10 border border-destructive/30 p-3 text-xs space-y-2">
              <p className="text-destructive font-medium">⚠️ احفظ الرمز الآن - لن يظهر مرة أخرى</p>
              <div className="flex items-center gap-2 font-mono break-all" dir="ltr">
                <span className="flex-1">{provisionToken.token}</span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 shrink-0"
                  onClick={() => {
                    navigator.clipboard.writeText(provisionToken.token);
                    toast.success("تم النسخ");
                  }}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Node detail */}
      <Dialog open={!!selectedNodeId} onOpenChange={(o) => !o && setSelectedNodeId(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>تفاصيل العقدة</DialogTitle>
            {selectedNode && <DialogDescription>{selectedNode.node_name}</DialogDescription>}
          </DialogHeader>
          <Tabs defaultValue="entitlements">
            <TabsList>
              <TabsTrigger value="entitlements">الصلاحيات</TabsTrigger>
              <TabsTrigger value="sync">سجل المزامنة</TabsTrigger>
            </TabsList>
            <TabsContent value="entitlements" className="space-y-3">
              {selectedNodeId && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    refreshEntitlements.mutate(selectedNodeId);
                    toast.success("تم تحديث الصلاحيات من الاشتراك الحالي");
                  }}
                  disabled={refreshEntitlements.isPending}
                >
                  <RefreshCw className="h-3 w-3 ml-1" />
                  مزامنة الصلاحيات من الاشتراك
                </Button>
              )}
              <div>
                <Label className="text-xs">الوحدات</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {entitlements?.modules.length === 0 ? (
                    <span className="text-xs text-muted-foreground">لا توجد</span>
                  ) : (
                    entitlements?.modules.map((m: any) => (
                      <Badge key={m.id} variant="secondary">{m.module_slug}</Badge>
                    ))
                  )}
                </div>
              </div>
              <div>
                <Label className="text-xs">الميزات</Label>
                <div className="flex flex-wrap gap-2 mt-2 max-h-48 overflow-y-auto">
                  {entitlements?.features.length === 0 ? (
                    <span className="text-xs text-muted-foreground">لا توجد</span>
                  ) : (
                    entitlements?.features.map((f: any) => (
                      <Badge key={f.id} variant="outline" className="text-xs">{f.feature_key}</Badge>
                    ))
                  )}
                </div>
              </div>
            </TabsContent>
            <TabsContent value="sync">
              {syncLogs.length === 0 ? (
                <div className="text-center text-sm text-muted-foreground py-6">لا سجلات</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>الاتجاه</TableHead>
                      <TableHead>الحالة</TableHead>
                      <TableHead>الأحداث</TableHead>
                      <TableHead>التاريخ</TableHead>
                      <TableHead>خطأ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {syncLogs.map((l: any) => (
                      <TableRow key={l.id}>
                        <TableCell className="text-xs">
                          {l.sync_direction === "local_to_cloud" ? "محلي → سحابي" : "سحابي → محلي"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={l.sync_status === "success" ? "default" : "destructive"}>
                            {l.sync_status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">{l.events_count}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {format(new Date(l.created_at), "dd/MM HH:mm", { locale: ar })}
                        </TableCell>
                        <TableCell className="text-xs text-destructive max-w-xs truncate">
                          {l.error_message || "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}
