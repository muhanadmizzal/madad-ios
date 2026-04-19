
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Fingerprint, Globe, MapPin, Copy, Key, Shield, Loader2, Clock, DollarSign } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { useToast } from "@/hooks/use-toast";

type DeductionMode = "per_hour" | "per_day" | "per_event" | "none";

interface AttendanceMethods {
  web_clock_enabled: boolean;
  require_gps: boolean;
  biometric_enabled: boolean;
  api_key: string;
  delay_deduction_enabled: boolean;
  delay_deduction_mode: DeductionMode;
  delay_deduction_amount: number;
  delay_deduction_currency: string;
  delay_grace_minutes: number;
}

const DEFAULT_SETTINGS: AttendanceMethods = {
  web_clock_enabled: true,
  require_gps: false,
  biometric_enabled: false,
  api_key: "",
  delay_deduction_enabled: false,
  delay_deduction_mode: "per_event",
  delay_deduction_amount: 0,
  delay_deduction_currency: "IQD",
  delay_grace_minutes: 15,
};

function generateApiKey() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "atk_";
  for (let i = 0; i < 32; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
  return result;
}

export default function AttendanceSettings() {
  const { companyId } = useCompany();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["attendance-settings", companyId],
    queryFn: async () => {
      const { data } = await supabase
        .from("tenant_settings")
        .select("value")
        .eq("company_id", companyId!)
        .eq("key", "attendance_methods")
        .maybeSingle();
      return (data?.value as unknown as AttendanceMethods) || DEFAULT_SETTINGS;
    },
    enabled: !!companyId,
  });

  const [webClock, setWebClock] = useState(true);
  const [requireGps, setRequireGps] = useState(false);
  const [biometric, setBiometric] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [deductionEnabled, setDeductionEnabled] = useState(false);
  const [deductionMode, setDeductionMode] = useState<DeductionMode>("per_event");
  const [deductionAmount, setDeductionAmount] = useState(0);
  const [deductionCurrency, setDeductionCurrency] = useState("IQD");
  const [delayGrace, setDelayGrace] = useState(15);

  useEffect(() => {
    if (settings) {
      setWebClock(settings.web_clock_enabled);
      setRequireGps(settings.require_gps);
      setBiometric(settings.biometric_enabled);
      setApiKey(settings.api_key || "");
      setDeductionEnabled(settings.delay_deduction_enabled ?? false);
      setDeductionMode(settings.delay_deduction_mode || "per_event");
      setDeductionAmount(settings.delay_deduction_amount || 0);
      setDeductionCurrency(settings.delay_deduction_currency || "IQD");
      setDelayGrace(settings.delay_grace_minutes ?? 15);
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const value: AttendanceMethods = {
        web_clock_enabled: webClock,
        require_gps: requireGps,
        biometric_enabled: biometric,
        api_key: apiKey,
        delay_deduction_enabled: deductionEnabled,
        delay_deduction_mode: deductionMode,
        delay_deduction_amount: deductionAmount,
        delay_deduction_currency: deductionCurrency,
        delay_grace_minutes: delayGrace,
      };
      const { error } = await supabase
        .from("tenant_settings")
        .upsert(
          { company_id: companyId!, key: "attendance_methods", value: value as any, updated_at: new Date().toISOString() },
          { onConflict: "company_id,key" }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance-settings"] });
      toast({ title: "تم حفظ إعدادات الحضور" });
    },
    onError: (err: Error) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  const webhookUrl = companyId
    ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/attendance-device`
    : "";

  const handleGenerateKey = () => {
    setApiKey(generateApiKey());
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: `تم نسخ ${label}` });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Web / Mobile Clock-in */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Globe className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="font-heading text-base">تسجيل الحضور عبر بوابة الموظف</CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  السماح للموظفين بتسجيل الحضور والانصراف يدوياً من خلال بوابة الخدمة الذاتية
                </CardDescription>
              </div>
            </div>
            <Switch checked={webClock} onCheckedChange={setWebClock} />
          </div>
        </CardHeader>
        {webClock && (
          <CardContent className="pt-0">
            <div className="rounded-lg border border-border/60 bg-muted/30 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <div>
                  <Label className="text-sm font-medium">تفعيل التتبع الجغرافي (GPS Geofencing)</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">يتطلب موافقة الموظف على مشاركة الموقع</p>
                </div>
              </div>
              <Switch checked={requireGps} onCheckedChange={setRequireGps} />
            </div>
          </CardContent>
        )}
      </Card>

      {/* Biometric Integration */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-accent/20 flex items-center justify-center">
                <Fingerprint className="h-5 w-5 text-accent-foreground" />
              </div>
              <div>
                <CardTitle className="font-heading text-base">الربط مع أجهزة البصمة</CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  الاعتماد على أجهزة البصمة المادية (ZKTeco, HikVision) لسحب بيانات الحضور آلياً عبر الـ API
                </CardDescription>
              </div>
            </div>
            <Switch checked={biometric} onCheckedChange={setBiometric} />
          </div>
        </CardHeader>
        {biometric && (
          <CardContent className="pt-0 space-y-4">
            <Alert className="border-primary/20 bg-primary/5">
              <Shield className="h-4 w-4 text-primary" />
              <AlertDescription className="text-xs">
                استخدم البيانات أدناه لتكوين أجهزة البصمة الخاصة بشركتك للإرسال التلقائي
              </AlertDescription>
            </Alert>

            {/* Webhook URL */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Webhook URL</Label>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-muted rounded-lg px-3 py-2.5 text-xs font-mono text-foreground border border-border/60 break-all" dir="ltr">
                  {webhookUrl}
                </code>
                <Button variant="outline" size="icon" className="shrink-0" onClick={() => copyToClipboard(webhookUrl, "Webhook URL")}>
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* API Key */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">API Key</Label>
              {apiKey ? (
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-muted rounded-lg px-3 py-2.5 text-xs font-mono text-foreground border border-border/60 break-all" dir="ltr">
                    {apiKey}
                  </code>
                  <Button variant="outline" size="icon" className="shrink-0" onClick={() => copyToClipboard(apiKey, "API Key")}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <Button variant="outline" size="sm" className="gap-2 font-heading" onClick={handleGenerateKey}>
                  <Key className="h-3.5 w-3.5" /> توليد مفتاح API
                </Button>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="text-xs">ZKTeco</Badge>
              <Badge variant="outline" className="text-xs">HikVision</Badge>
              <Badge variant="outline" className="text-xs">Suprema</Badge>
              <Badge variant="outline" className="text-xs">REST API</Badge>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Delay Deduction Policy */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <CardTitle className="font-heading text-base">سياسة الاستقطاع عن التأخير</CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  تفعيل خصم تلقائي من راتب الموظف عند التأخر عن موعد الحضور
                </CardDescription>
              </div>
            </div>
            <Switch checked={deductionEnabled} onCheckedChange={setDeductionEnabled} />
          </div>
        </CardHeader>
        {deductionEnabled && (
          <CardContent className="pt-0 space-y-4">
            {/* Deduction Mode */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold">نوع الاستقطاع</Label>
              <Select value={deductionMode} onValueChange={(v) => setDeductionMode(v as DeductionMode)}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="per_hour">
                    <div className="flex flex-col">
                      <span className="font-medium">لكل ساعة تأخير</span>
                      <span className="text-[10px] text-muted-foreground">يُحسب المبلغ بناءً على عدد ساعات التأخير</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="per_day">
                    <div className="flex flex-col">
                      <span className="font-medium">لكل يوم فيه تأخير</span>
                      <span className="text-[10px] text-muted-foreground">مبلغ ثابت يُخصم عن كل يوم يتأخر فيه الموظف</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="per_event">
                    <div className="flex flex-col">
                      <span className="font-medium">لكل حالة تأخير</span>
                      <span className="text-[10px] text-muted-foreground">مبلغ ثابت يُخصم عن كل مرة تأخير بغض النظر عن المدة</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Amount & Currency */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs font-semibold flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  مبلغ الخصم
                  {deductionMode === "per_hour" && <span className="text-muted-foreground font-normal">/ ساعة</span>}
                  {deductionMode === "per_day" && <span className="text-muted-foreground font-normal">/ يوم</span>}
                  {deductionMode === "per_event" && <span className="text-muted-foreground font-normal">/ حالة</span>}
                </Label>
                <Input
                  type="number"
                  min={0}
                  value={deductionAmount}
                  onChange={e => setDeductionAmount(Number(e.target.value))}
                  placeholder="0"
                  dir="ltr"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold">العملة</Label>
                <Select value={deductionCurrency} onValueChange={setDeductionCurrency}>
                  <SelectTrigger className="h-10 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IQD">د.ع (دينار عراقي)</SelectItem>
                    <SelectItem value="USD">$ (دولار أمريكي)</SelectItem>
                    <SelectItem value="SAR">ر.س (ريال سعودي)</SelectItem>
                    <SelectItem value="AED">د.إ (درهم إماراتي)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Grace Period */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold">فترة السماح (بالدقائق)</Label>
              <p className="text-[11px] text-muted-foreground">لن يُحتسب تأخير إذا كان ضمن فترة السماح</p>
              <Input
                type="number"
                min={0}
                max={120}
                value={delayGrace}
                onChange={e => setDelayGrace(Number(e.target.value))}
                dir="ltr"
              />
            </div>

            {/* Summary */}
            <Alert className="border-destructive/20 bg-destructive/5">
              <Clock className="h-4 w-4 text-destructive" />
              <AlertDescription className="text-xs">
                {deductionMode === "per_hour" && `سيتم خصم ${deductionAmount} ${deductionCurrency} عن كل ساعة تأخير بعد ${delayGrace} دقيقة سماح.`}
                {deductionMode === "per_day" && `سيتم خصم ${deductionAmount} ${deductionCurrency} عن كل يوم يتأخر فيه الموظف بعد ${delayGrace} دقيقة سماح.`}
                {deductionMode === "per_event" && `سيتم خصم ${deductionAmount} ${deductionCurrency} عن كل حالة تأخير بعد ${delayGrace} دقيقة سماح.`}
              </AlertDescription>
            </Alert>
          </CardContent>
        )}
      </Card>

      {/* Summary & Save */}
      <div className="flex items-center justify-between">
        <div className="flex flex-wrap gap-2">
          {webClock && <Badge className="bg-primary/10 text-primary border-primary/20">بوابة الموظف</Badge>}
          {biometric && <Badge className="bg-accent/10 text-accent-foreground border-accent/20">أجهزة البصمة</Badge>}
          {deductionEnabled && <Badge className="bg-destructive/10 text-destructive border-destructive/20">استقطاع التأخير</Badge>}
          {!webClock && !biometric && <Badge variant="destructive">لا توجد طريقة مفعّلة</Badge>}
        </div>
        <Button className="font-heading" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
          {saveMutation.isPending ? "جاري الحفظ..." : "حفظ الإعدادات"}
        </Button>
      </div>
    </div>
  );
}
