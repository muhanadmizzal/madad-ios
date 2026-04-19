import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Copy, Key, Plus, Shield, Activity, Trash2, CheckCircle, XCircle, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import WebhooksManager from "@/components/integrations/WebhooksManager";

export default function Integrations() {
  const { companyId } = useCompany();
  const qc = useQueryClient();
  const [newKeyName, setNewKeyName] = useState("Default");
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<any>(null);
  const [testing, setTesting] = useState(false);

  const baseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/api-v1`;

  // Fetch settings
  const { data: settings } = useQuery({
    queryKey: ["api-settings", companyId],
    queryFn: async () => {
      const { data } = await supabase
        .from("api_settings")
        .select("*")
        .eq("company_id", companyId!)
        .single();
      return data;
    },
    enabled: !!companyId,
  });

  // Fetch keys
  const { data: apiKeys = [] } = useQuery({
    queryKey: ["api-keys", companyId],
    queryFn: async () => {
      const { data } = await supabase
        .from("api_keys")
        .select("*")
        .eq("company_id", companyId!)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!companyId,
  });

  // Fetch access logs
  const { data: accessLogs = [] } = useQuery({
    queryKey: ["api-access-logs", companyId],
    queryFn: async () => {
      const { data } = await supabase
        .from("api_access_logs")
        .select("*")
        .eq("company_id", companyId!)
        .order("created_at", { ascending: false })
        .limit(50);
      return data || [];
    },
    enabled: !!companyId,
  });

  // Toggle API access
  const toggleApi = useMutation({
    mutationFn: async (enabled: boolean) => {
      if (settings) {
        await supabase
          .from("api_settings")
          .update({ api_enabled: enabled, updated_at: new Date().toISOString() })
          .eq("company_id", companyId!);
      } else {
        await supabase.from("api_settings").insert({
          company_id: companyId!,
          api_enabled: enabled,
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["api-settings"] });
      toast.success("تم تحديث إعدادات API");
    },
  });

  // Generate key
  const generateKey = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("generate_api_key", {
        p_company_id: companyId!,
        p_name: newKeyName,
        p_scopes: ["v1:read"],
      });
      if (error) throw error;
      return data as any;
    },
    onSuccess: (data) => {
      setGeneratedKey(data.key);
      qc.invalidateQueries({ queryKey: ["api-keys"] });
      toast.success("تم إنشاء مفتاح API جديد");
    },
    onError: () => toast.error("فشل إنشاء المفتاح"),
  });

  // Revoke key
  const revokeKey = useMutation({
    mutationFn: async (keyId: string) => {
      const { error } = await supabase.rpc("revoke_api_key", { p_key_id: keyId });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["api-keys"] });
      toast.success("تم إلغاء المفتاح");
    },
  });

  // Test API (health endpoint is public, no key needed)
  const testApi = async () => {
    setTesting(true);
    try {
      const res = await fetch(`${baseUrl}/health`);
      const data = await res.json();
      setTestResult({ status: res.status, data });
    } catch (err) {
      setTestResult({ status: 0, error: "Connection failed" });
    }
    setTesting(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="التكاملات"
        description="إدارة الوصول الخارجي عبر API والـ Webhooks للأنظمة الثالثة"
      />

      {/* Notice: Hybrid Access lives at MADAD platform level */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4 text-sm">
          <span className="font-medium">تنبيه:</span>{" "}
          الوصول الهجين (تشغيل عقدة محلية) أصبح قدرة على مستوى منصة MADAD وليس خاصاً بوحدة تمكين.
          يمكن إدارته من{" "}
          <a href="/madad/hybrid-access" className="text-primary underline underline-offset-2">
            مدد ← الوصول الهجين
          </a>
          .
        </CardContent>
      </Card>

      {/* API Toggle */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            إعدادات الوصول
          </CardTitle>
          <CardDescription>تفعيل أو تعطيل الوصول الخارجي عبر API</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>تفعيل API الخارجي</Label>
            <Switch
              checked={settings?.api_enabled ?? false}
              onCheckedChange={(v) => toggleApi.mutate(v)}
            />
          </div>
          <div className="rounded-md bg-muted p-3 text-sm font-mono break-all" dir="ltr">
            <span className="text-muted-foreground">Base URL: </span>
            <span>{baseUrl}</span>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 mr-2"
              onClick={() => { navigator.clipboard.writeText(baseUrl); toast.success("تم النسخ"); }}
            >
              <Copy className="h-3 w-3" />
            </Button>
          </div>

          {/* Test */}
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={testApi} disabled={testing}>
              <RefreshCw className={`h-4 w-4 ml-1 ${testing ? "animate-spin" : ""}`} />
              اختبار الاتصال
            </Button>
            {testResult && (
              <Badge variant={testResult.status === 200 ? "default" : "destructive"}>
                {testResult.status === 200 ? "متصل" : `خطأ ${testResult.status}`}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* API Keys */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              مفاتيح API
            </CardTitle>
            <CardDescription>إدارة مفاتيح الوصول للأنظمة الخارجية</CardDescription>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 ml-1" />
                إنشاء مفتاح
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>إنشاء مفتاح API جديد</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>اسم المفتاح</Label>
                  <Input value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)} placeholder="مثال: منصة مساعد" />
                </div>
                <Button onClick={() => generateKey.mutate()} disabled={generateKey.isPending}>
                  إنشاء
                </Button>
                {generatedKey && (
                  <div className="rounded-md bg-destructive/10 border border-destructive/30 p-3 text-sm space-y-2">
                    <p className="text-destructive font-medium">⚠️ انسخ المفتاح الآن - لن يظهر مرة أخرى!</p>
                    <div className="flex items-center gap-2 font-mono text-xs break-all" dir="ltr">
                      <span>{generatedKey}</span>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 shrink-0"
                        onClick={() => { navigator.clipboard.writeText(generatedKey); toast.success("تم النسخ"); }}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الاسم</TableHead>
                <TableHead>البادئة</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>آخر استخدام</TableHead>
                <TableHead>إجراء</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {apiKeys.map((key: any) => (
                <TableRow key={key.id}>
                  <TableCell className="font-medium">{key.name}</TableCell>
                  <TableCell className="font-mono text-xs" dir="ltr">{key.key_prefix}...</TableCell>
                  <TableCell>
                    {key.is_active ? (
                      <Badge variant="default" className="gap-1"><CheckCircle className="h-3 w-3" /> نشط</Badge>
                    ) : (
                      <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> ملغي</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {key.last_used_at ? format(new Date(key.last_used_at), "dd MMM yyyy HH:mm", { locale: ar }) : "لم يستخدم"}
                  </TableCell>
                  <TableCell>
                    {key.is_active && (
                      <Button size="icon" variant="ghost" className="text-destructive h-7 w-7" onClick={() => revokeKey.mutate(key.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {apiKeys.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    لا توجد مفاتيح API بعد
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Access Logs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            سجل الوصول
          </CardTitle>
          <CardDescription>آخر 50 طلب عبر API</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>المسار</TableHead>
                <TableHead>الطريقة</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>IP</TableHead>
                <TableHead>التاريخ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accessLogs.map((log: any) => (
                <TableRow key={log.id}>
                  <TableCell className="font-mono text-xs" dir="ltr">{log.endpoint}</TableCell>
                  <TableCell><Badge variant="outline">{log.method}</Badge></TableCell>
                  <TableCell>
                    <Badge variant={log.status_code < 400 ? "default" : "destructive"}>{log.status_code}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground" dir="ltr">{log.ip_address}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {format(new Date(log.created_at), "dd/MM HH:mm")}
                  </TableCell>
                </TableRow>
              ))}
              {accessLogs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    لا توجد سجلات بعد
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Hybrid sync endpoint info now lives inside LocalRuntimePanel, scoped per provisioned node */}

      {/* Webhooks */}
      {companyId && <WebhooksManager companyId={companyId} />}

      {/* API Documentation */}
      <Card>
        <CardHeader>
          <CardTitle>📖 توثيق API v1</CardTitle>
          <CardDescription>النقاط المتاحة حالياً للأنظمة الخارجية</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md bg-muted p-4 space-y-3 text-sm font-mono" dir="ltr">
            <p className="text-muted-foreground font-sans">Headers: <code>X-API-Key: tmk_...</code></p>
            <div className="space-y-2">
              <div><Badge variant="outline">GET</Badge> <span>/employees</span> <span className="text-muted-foreground font-sans">— قائمة الموظفين</span></div>
              <div><Badge variant="outline">GET</Badge> <span>/employees/:id</span> <span className="text-muted-foreground font-sans">— موظف واحد</span></div>
              <div><Badge variant="outline">GET</Badge> <span>/employees/status</span> <span className="text-muted-foreground font-sans">— إحصائيات الحالة</span></div>
              <div><Badge variant="outline">GET</Badge> <span>/employees/availability</span> <span className="text-muted-foreground font-sans">— حالة التوفر للحجز</span></div>
            </div>
            <div className="border-t pt-2 text-muted-foreground font-sans text-xs">
              <p>v2 (قريباً): الأقسام، المسميات، الجداول</p>
              <p>v3 (مقيد): بيانات HR داخلية</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
