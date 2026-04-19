import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Webhook, Plus, Trash2, CheckCircle, XCircle, Send, Eye } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { useAuth } from "@/contexts/AuthContext";

const AVAILABLE_EVENTS = [
  { key: "employee.created", label: "إضافة موظف" },
  { key: "employee.updated", label: "تحديث موظف" },
  { key: "employee.terminated", label: "إنهاء خدمة" },
  { key: "leave.approved", label: "اعتماد إجازة" },
  { key: "leave.rejected", label: "رفض إجازة" },
  { key: "attendance.checked_in", label: "تسجيل حضور" },
  { key: "attendance.checked_out", label: "تسجيل انصراف" },
  { key: "payroll.processed", label: "تشغيل الرواتب" },
];

interface Props {
  companyId: string;
}

export default function WebhooksManager({ companyId }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [viewEndpointId, setViewEndpointId] = useState<string | null>(null);

  const { data: endpoints = [] } = useQuery({
    queryKey: ["webhook-endpoints", companyId],
    queryFn: async () => {
      const { data } = await supabase
        .from("webhook_endpoints")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: deliveries = [] } = useQuery({
    queryKey: ["webhook-deliveries", companyId, viewEndpointId],
    queryFn: async () => {
      const { data } = await supabase
        .from("webhook_deliveries")
        .select("*")
        .eq("company_id", companyId)
        .eq("endpoint_id", viewEndpointId!)
        .order("created_at", { ascending: false })
        .limit(20);
      return data || [];
    },
    enabled: !!companyId && !!viewEndpointId,
  });

  const createEndpoint = useMutation({
    mutationFn: async () => {
      const secret = `whsec_${crypto.randomUUID().replace(/-/g, "")}`;
      const { error } = await supabase.from("webhook_endpoints").insert({
        company_id: companyId,
        url,
        description,
        events: selectedEvents,
        secret,
        created_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["webhook-endpoints"] });
      toast.success("تم إضافة نقطة الاتصال");
      setOpen(false);
      setUrl("");
      setDescription("");
      setSelectedEvents([]);
    },
    onError: () => toast.error("فشل الإضافة"),
  });

  const toggleEndpoint = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      await supabase
        .from("webhook_endpoints")
        .update({ is_active: active, updated_at: new Date().toISOString() })
        .eq("id", id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["webhook-endpoints"] }),
  });

  const deleteEndpoint = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("webhook_endpoints").delete().eq("id", id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["webhook-endpoints"] });
      toast.success("تم حذف نقطة الاتصال");
    },
  });

  const toggleEvent = (key: string) => {
    setSelectedEvents((prev) =>
      prev.includes(key) ? prev.filter((e) => e !== key) : [...prev, key]
    );
  };

  return (
    <>
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Webhook className="h-5 w-5" />
              Webhooks صادرة
            </CardTitle>
            <CardDescription>إرسال إشعارات تلقائية للأنظمة الخارجية عند حدوث أحداث معينة</CardDescription>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 ml-1" />
                إضافة Webhook
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>إضافة نقطة اتصال خارجية</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>عنوان URL</Label>
                  <Input
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://example.com/webhook"
                    dir="ltr"
                  />
                </div>
                <div>
                  <Label>الوصف</Label>
                  <Input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="مثال: ربط منصة مساعد"
                  />
                </div>
                <div>
                  <Label className="mb-2 block">الأحداث المشترك بها</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {AVAILABLE_EVENTS.map((ev) => (
                      <label key={ev.key} className="flex items-center gap-2 text-sm cursor-pointer">
                        <Checkbox
                          checked={selectedEvents.includes(ev.key)}
                          onCheckedChange={() => toggleEvent(ev.key)}
                        />
                        {ev.label}
                      </label>
                    ))}
                  </div>
                </div>
                <Button
                  onClick={() => createEndpoint.mutate()}
                  disabled={!url || selectedEvents.length === 0 || createEndpoint.isPending}
                  className="w-full"
                >
                  إنشاء
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الوصف</TableHead>
                <TableHead>URL</TableHead>
                <TableHead>الأحداث</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>إجراء</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {endpoints.map((ep: any) => (
                <TableRow key={ep.id}>
                  <TableCell className="font-medium">{ep.description || "—"}</TableCell>
                  <TableCell className="font-mono text-xs max-w-[200px] truncate" dir="ltr">
                    {ep.url}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {(ep.events || []).slice(0, 2).map((e: string) => (
                        <Badge key={e} variant="outline" className="text-xs">
                          {AVAILABLE_EVENTS.find((a) => a.key === e)?.label || e}
                        </Badge>
                      ))}
                      {(ep.events || []).length > 2 && (
                        <Badge variant="outline" className="text-xs">+{ep.events.length - 2}</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={ep.is_active}
                      onCheckedChange={(v) => toggleEndpoint.mutate({ id: ep.id, active: v })}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => setViewEndpointId(ep.id)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive"
                        onClick={() => deleteEndpoint.mutate(ep.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {endpoints.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    لا توجد نقاط اتصال Webhook بعد
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Delivery Logs Dialog */}
      <Dialog open={!!viewEndpointId} onOpenChange={() => setViewEndpointId(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              سجل الإرسال
            </DialogTitle>
          </DialogHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الحدث</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>الاستجابة</TableHead>
                <TableHead>المحاولات</TableHead>
                <TableHead>التاريخ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deliveries.map((d: any) => (
                <TableRow key={d.id}>
                  <TableCell className="text-xs">{d.event}</TableCell>
                  <TableCell>
                    <Badge variant={d.status === "delivered" ? "default" : d.status === "failed" ? "destructive" : "secondary"}>
                      {d.status === "delivered" ? "تم" : d.status === "failed" ? "فشل" : "قيد الإرسال"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">{d.response_status || "—"}</TableCell>
                  <TableCell className="text-xs">{d.attempt_count}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {format(new Date(d.created_at), "dd/MM HH:mm")}
                  </TableCell>
                </TableRow>
              ))}
              {deliveries.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                    لا توجد سجلات إرسال
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>
    </>
  );
}
