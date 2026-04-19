import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Server, Activity, Wifi, WifiOff, RefreshCw, Power, Copy, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  useLocalNodes,
  useLocalAccessRequests,
  useNodeEntitlements,
  useNodeSyncLogs,
  useRequestLocalAccess,
  useCancelLocalAccessRequest,
  type LocalNode,
} from "@/hooks/useLocalNodes";
import { useRuntimeMode, type RuntimeMode } from "@/hooks/useRuntimeMode";

const HEALTH_STYLE: Record<string, string> = {
  healthy: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  degraded: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
  stale: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
  error: "bg-destructive/15 text-destructive border-destructive/30",
  unknown: "bg-muted text-muted-foreground border-border",
};

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

export default function LocalRuntimePanel() {
  const { data: nodes = [] } = useLocalNodes("tenant");
  const { data: requests = [] } = useLocalAccessRequests("tenant");
  const requestAccess = useRequestLocalAccess();
  const cancelRequest = useCancelLocalAccessRequest();

  const runtime = useRuntimeMode();

  const [requestNotes, setRequestNotes] = useState("");
  const [requestOpen, setRequestOpen] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const pendingRequest = useMemo(
    () => requests.find((r) => r.request_status === "pending"),
    [requests],
  );

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) ?? null;
  const { data: entitlements } = useNodeEntitlements(selectedNodeId);
  const { data: syncLogs = [] } = useNodeSyncLogs(selectedNodeId);

  const handleRequest = async () => {
    try {
      await requestAccess.mutateAsync(requestNotes || null);
      toast.success("تم إرسال طلب التشغيل المحلي");
      setRequestOpen(false);
      setRequestNotes("");
    } catch (e: any) {
      toast.error(e.message || "فشل إرسال الطلب");
    }
  };

  return (
    <div className="space-y-6">
      {/* Hybrid model intro — platform-wide, all MADAD modules */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4 text-sm space-y-1">
          <div className="font-medium">الوصول الهجين MADAD — على مستوى المنصة</div>
          <p className="text-muted-foreground text-xs leading-relaxed">
            هذه قدرة منصة MADAD وليست خاصة بوحدة واحدة. تُورَّث للعقدة المحلية فقط الوحدات والميزات
            المشترك بها التينانت (تمكين، تثبيت، تحصيل، تخزين، أو أي وحدة قادمة)، وفق صلاحيات المستخدمين.
            MADAD يبقى مصدر الاشتراكات والصلاحيات والسياسات. العقدة المحلية امتداد لـ MADAD وليست منتجاً منفصلاً.
          </p>
        </CardContent>
      </Card>

      {/* Runtime mode toggle */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {runtime.online ? <Wifi className="h-5 w-5 text-emerald-500" /> : <WifiOff className="h-5 w-5 text-destructive" />}
            وضع التشغيل
          </CardTitle>
          <CardDescription>
            تحديد وضع التشغيل: سحابي، عقدة محلية، أو تلقائي حسب توفر الإنترنت
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-md border bg-muted/40 p-3">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium">الحالة الفعلية:</span>
              <Badge variant={runtime.effectiveMode === "online" ? "default" : "secondary"}>
                {runtime.effectiveMode === "online" ? "سحابي (Online)" : "محلي (Local)"}
              </Badge>
              <span className="text-muted-foreground">
                · الإنترنت: {runtime.online ? "متصل" : "غير متصل"}
              </span>
            </div>
          </div>

          <RadioGroup
            value={runtime.mode}
            onValueChange={(v) => runtime.setMode(v as RuntimeMode)}
            className="grid grid-cols-1 md:grid-cols-3 gap-3"
          >
            {(
              [
                { v: "auto", t: "تلقائي", d: "يكتشف اتصال الإنترنت ويبدّل تلقائياً" },
                { v: "online", t: "سحابي", d: "العمل مباشرة على السحابة فقط" },
                { v: "local", t: "محلي", d: "العمل على الخادم المحلي والمزامنة لاحقاً" },
              ] as const
            ).map((opt) => (
              <label
                key={opt.v}
                htmlFor={`mode-${opt.v}`}
                className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 text-sm hover:bg-muted/50 ${
                  runtime.mode === opt.v ? "border-primary bg-primary/5" : ""
                }`}
              >
                <RadioGroupItem id={`mode-${opt.v}`} value={opt.v} className="mt-1" />
                <div>
                  <div className="font-medium">{opt.t}</div>
                  <div className="text-xs text-muted-foreground">{opt.d}</div>
                </div>
              </label>
            ))}
          </RadioGroup>

          {runtime.mode === "local" && (
            <div className="space-y-2">
              <Label className="text-xs">رابط الخادم المحلي (Local Base URL)</Label>
              <Input
                dir="ltr"
                placeholder="http://192.168.1.10:3000"
                value={runtime.localBaseUrl}
                onChange={(e) => runtime.setLocalBaseUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                يستخدم في وضع "محلي" فقط لتوجيه الواجهة إلى الخادم المحلي
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Local Nodes */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              عقدك المحلية (Hybrid Local Nodes)
            </CardTitle>
            <CardDescription>
              عقد محلية مرتبطة بحسابك ومُصدرة من MADAD — تورّث صلاحيات اشتراكك تلقائياً
            </CardDescription>
          </div>
          <Dialog open={requestOpen} onOpenChange={setRequestOpen}>
            <DialogTrigger asChild>
              <Button size="sm" disabled={!!pendingRequest}>
                <Plus className="h-4 w-4 ml-1" />
                طلب وصول هجين جديد
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>طلب وصول هجين (Hybrid Access)</DialogTitle>
                <DialogDescription>
                  سيراجع مسؤول MADAD طلبك ويصدر رمز تفعيل لمرة واحدة لربط العقدة بحسابك.
                  لن يتم تنزيل منتج منفصل — العقدة جزء من نفس MADAD وتحت سياساته.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <Label>ملاحظات (اختياري)</Label>
                <Textarea
                  placeholder="مثال: فرع البصرة - عقدة محلية للحجوزات تعمل دون اتصال"
                  value={requestNotes}
                  onChange={(e) => setRequestNotes(e.target.value)}
                />
              </div>
              <DialogFooter>
                <Button onClick={handleRequest} disabled={requestAccess.isPending}>
                  إرسال الطلب
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {nodes.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-8">
              لا توجد عقد محلية. اطلب وصولاً هجيناً ليعتمده مسؤول MADAD.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الاسم</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>الصحة</TableHead>
                  <TableHead>آخر مزامنة</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {nodes.map((n: LocalNode) => (
                  <TableRow key={n.id}>
                    <TableCell className="font-medium">{n.node_name}</TableCell>
                    <TableCell>
                      <Badge variant={n.node_status === "active" ? "default" : "secondary"}>
                        {STATUS_LABEL[n.node_status] || n.node_status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={HEALTH_STYLE[n.sync_health] || ""}>
                        <Activity className="h-3 w-3 ml-1" />
                        {n.sync_health}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {n.last_sync_at
                        ? format(new Date(n.last_sync_at), "dd MMM yyyy HH:mm", { locale: ar })
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="ghost" onClick={() => setSelectedNodeId(n.id)}>
                        تفاصيل
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pending request banner */}
      {pendingRequest && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="flex items-center justify-between p-4 text-sm">
            <div>
              <Badge variant="outline" className="ml-2">قيد المراجعة</Badge>
              لديك طلب وصول هجين بانتظار موافقة مسؤول MADAD
              {pendingRequest.notes && <span className="text-muted-foreground"> — {pendingRequest.notes}</span>}
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                if (confirm("إلغاء الطلب؟")) cancelRequest.mutate(pendingRequest.id);
              }}
            >
              إلغاء الطلب
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Requests history */}
      {requests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>سجل طلبات الوصول الهجين</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>الملاحظات</TableHead>
                  <TableHead>رد المسؤول</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs">
                      {format(new Date(r.created_at), "dd MMM yyyy", { locale: ar })}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{STATUS_LABEL[r.request_status]}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{r.notes || "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{r.review_notes || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Node detail dialog */}
      <Dialog open={!!selectedNodeId} onOpenChange={(o) => !o && setSelectedNodeId(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>تفاصيل العقدة المحلية</DialogTitle>
            {selectedNode && (
              <DialogDescription>
                {selectedNode.node_name} · {STATUS_LABEL[selectedNode.node_status]}
              </DialogDescription>
            )}
          </DialogHeader>
          <Tabs defaultValue="entitlements">
            <TabsList>
              <TabsTrigger value="entitlements">الصلاحيات</TabsTrigger>
              <TabsTrigger value="sync">سجل المزامنة</TabsTrigger>
            </TabsList>
            <TabsContent value="entitlements" className="space-y-4">
              <div>
                <Label className="text-xs">الوحدات المفعّلة محلياً</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {entitlements?.modules.length === 0 ? (
                    <span className="text-xs text-muted-foreground">لا توجد وحدات</span>
                  ) : (
                    entitlements?.modules.map((m: any) => (
                      <Badge key={m.id} variant="secondary">{m.module_slug}</Badge>
                    ))
                  )}
                </div>
              </div>
              <div>
                <Label className="text-xs">الميزات المفعّلة محلياً</Label>
                <div className="flex flex-wrap gap-2 mt-2 max-h-40 overflow-y-auto">
                  {entitlements?.features.length === 0 ? (
                    <span className="text-xs text-muted-foreground">لا توجد ميزات</span>
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
                <div className="text-center text-sm text-muted-foreground py-6">
                  لا توجد سجلات مزامنة بعد
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>الاتجاه</TableHead>
                      <TableHead>الحالة</TableHead>
                      <TableHead>الأحداث</TableHead>
                      <TableHead>التاريخ</TableHead>
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
