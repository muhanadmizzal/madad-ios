import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCompany } from "@/hooks/useCompany";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Clock, Bell, Shield, Palette, Copy } from "lucide-react";

export default function TathbeetSettings() {
  const { t, lang } = useLanguage();
  const { companyId } = useCompany();
  const qc = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["tathbeet-settings", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("tathbeet_settings").select("*").eq("company_id", companyId!).maybeSingle();
      return data;
    },
    enabled: !!companyId,
  });

  const [form, setForm] = useState<Record<string, any>>({});
  const merged = { ...settings, ...form };
  const update = (key: string, value: any) => setForm((p) => ({ ...p, [key]: value }));

  const save = useMutation({
    mutationFn: async () => {
      if (!companyId) return;
      const payload = {
        company_id: companyId,
        advance_booking_notice_hours: merged.advance_booking_notice_hours ?? 1,
        booking_window_days: merged.booking_window_days ?? 30,
        cancellation_window_hours: merged.cancellation_window_hours ?? 2,
        reschedule_window_hours: merged.reschedule_window_hours ?? 2,
        buffer_before_minutes: merged.buffer_before_minutes ?? 0,
        buffer_after_minutes: merged.buffer_after_minutes ?? 0,
        slot_interval_minutes: merged.slot_interval_minutes ?? 15,
        walk_in_enabled: merged.walk_in_enabled ?? true,
        booking_confirmation_style: merged.booking_confirmation_style ?? "manual",
        waitlist_enabled: merged.waitlist_enabled ?? false,
        whatsapp_notifications_enabled: merged.whatsapp_notifications_enabled ?? false,
        currency: merged.currency ?? "IQD",
        smart_assignment_enabled: merged.smart_assignment_enabled ?? false,
        guest_booking_enabled: merged.guest_booking_enabled ?? true,
        max_reschedules: merged.max_reschedules ?? 2,
        reminder_hours_before: merged.reminder_hours_before ?? 24,
      };

      if (settings?.id) {
        const { error } = await supabase.from("tathbeet_settings").update(payload).eq("id", settings.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("tathbeet_settings").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tathbeet-settings"] });
      setForm({});
      toast.success(t("تم حفظ الإعدادات", "Settings saved"));
    },
    onError: () => toast.error(t("حدث خطأ", "An error occurred")),
  });

  const publicUrl = `${window.location.origin}/booking/${companyId}`;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="font-heading font-extrabold text-2xl">{t("إعدادات تثبيت", "Tathbeet Settings")}</h1>
        <div className="animate-pulse space-y-4">{[1, 2, 3].map((i) => <div key={i} className="h-32 bg-muted rounded-xl" />)}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading font-extrabold text-2xl">{t("إعدادات تثبيت", "Tathbeet Settings")}</h1>
        <Button onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending ? t("جاري الحفظ...", "Saving...") : t("حفظ الإعدادات", "Save Settings")}
        </Button>
      </div>

      <Tabs defaultValue="booking" dir={lang === "ar" ? "rtl" : "ltr"}>
        <TabsList className="grid grid-cols-4 w-full max-w-lg">
          <TabsTrigger value="booking"><Clock className="h-3.5 w-3.5 me-1" />{t("الحجز", "Booking")}</TabsTrigger>
          <TabsTrigger value="notifications"><Bell className="h-3.5 w-3.5 me-1" />{t("الإشعارات", "Alerts")}</TabsTrigger>
          <TabsTrigger value="branding"><Palette className="h-3.5 w-3.5 me-1" />{t("المظهر", "Branding")}</TabsTrigger>
          <TabsTrigger value="advanced"><Shield className="h-3.5 w-3.5 me-1" />{t("متقدم", "Advanced")}</TabsTrigger>
        </TabsList>

        {/* Booking Policies */}
        <TabsContent value="booking" className="space-y-4 mt-4">
          <Card className="border-border/50">
            <CardHeader><CardTitle className="text-base">{t("سياسات الحجز", "Booking Policies")}</CardTitle></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>{t("أقل مدة حجز مسبق (ساعات)", "Min advance booking (hours)")}</Label>
                <Input type="number" min={0} value={merged.advance_booking_notice_hours ?? 1} onChange={(e) => update("advance_booking_notice_hours", +e.target.value)} />
              </div>
              <div>
                <Label>{t("أقصى مدة حجز مسبق (أيام)", "Max advance booking (days)")}</Label>
                <Input type="number" min={1} value={merged.booking_window_days ?? 30} onChange={(e) => update("booking_window_days", +e.target.value)} />
              </div>
              <div>
                <Label>{t("إلغاء قبل (ساعات)", "Cancel before (hours)")}</Label>
                <Input type="number" min={0} value={merged.cancellation_window_hours ?? 2} onChange={(e) => update("cancellation_window_hours", +e.target.value)} />
              </div>
              <div>
                <Label>{t("إعادة جدولة قبل (ساعات)", "Reschedule before (hours)")}</Label>
                <Input type="number" min={0} value={merged.reschedule_window_hours ?? 2} onChange={(e) => update("reschedule_window_hours", +e.target.value)} />
              </div>
              <div>
                <Label>{t("فاصل قبل الموعد (دقائق)", "Buffer before (min)")}</Label>
                <Input type="number" min={0} value={merged.buffer_before_minutes ?? 0} onChange={(e) => update("buffer_before_minutes", +e.target.value)} />
              </div>
              <div>
                <Label>{t("فاصل بعد الموعد (دقائق)", "Buffer after (min)")}</Label>
                <Input type="number" min={0} value={merged.buffer_after_minutes ?? 0} onChange={(e) => update("buffer_after_minutes", +e.target.value)} />
              </div>
              <div>
                <Label>{t("فاصل الفترات (دقائق)", "Slot interval (min)")}</Label>
                <Select value={String(merged.slot_interval_minutes ?? 15)} onValueChange={(v) => update("slot_interval_minutes", +v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[10, 15, 20, 30, 60].map((m) => <SelectItem key={m} value={String(m)}>{m} {t("دقيقة", "min")}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t("تذكير قبل الموعد (ساعات)", "Reminder before (hours)")}</Label>
                <Input type="number" min={1} value={merged.reminder_hours_before ?? 24} onChange={(e) => update("reminder_hours_before", +e.target.value)} />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader><CardTitle className="text-base">{t("سلوك الحجز", "Booking Behavior")}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{t("تأكيد تلقائي", "Auto-confirm bookings")}</p>
                  <p className="text-xs text-muted-foreground">{t("الحجوزات تُقبل تلقائياً بدون مراجعة", "Bookings accepted without manual review")}</p>
                </div>
                <Select value={merged.booking_confirmation_style ?? "manual"} onValueChange={(v) => update("booking_confirmation_style", v)}>
                  <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">{t("تلقائي", "Auto")}</SelectItem>
                    <SelectItem value="manual">{t("يدوي", "Manual")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{t("السماح بالحضور المباشر", "Allow walk-ins")}</p>
                  <p className="text-xs text-muted-foreground">{t("تسجيل العملاء بدون حجز مسبق", "Register clients without prior booking")}</p>
                </div>
                <Switch checked={merged.walk_in_enabled ?? true} onCheckedChange={(v) => update("walk_in_enabled", v)} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{t("حجز الضيوف", "Guest booking")}</p>
                  <p className="text-xs text-muted-foreground">{t("السماح بالحجز بدون حساب", "Allow booking without account")}</p>
                </div>
                <Switch checked={merged.guest_booking_enabled ?? true} onCheckedChange={(v) => update("guest_booking_enabled", v)} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{t("التعيين الذكي", "Smart assignment")}</p>
                  <p className="text-xs text-muted-foreground">{t("توزيع الحجوزات تلقائياً على الموظفين", "Auto-assign bookings to staff")}</p>
                </div>
                <Switch checked={merged.smart_assignment_enabled ?? false} onCheckedChange={(v) => update("smart_assignment_enabled", v)} />
              </div>
              <div>
                <Label>{t("حد إعادة الجدولة", "Max reschedules")}</Label>
                <Input type="number" min={0} value={merged.max_reschedules ?? 2} onChange={(e) => update("max_reschedules", +e.target.value)} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications" className="space-y-4 mt-4">
          <Card className="border-border/50">
            <CardHeader><CardTitle className="text-base">{t("قنوات الإشعارات", "Notification Channels")}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{t("واتساب", "WhatsApp Notifications")}</p>
                  <p className="text-xs text-muted-foreground">{t("إرسال تأكيد وتذكير عبر واتساب", "Send confirmations via WhatsApp")}</p>
                </div>
                <Switch checked={merged.whatsapp_notifications_enabled ?? false} onCheckedChange={(v) => update("whatsapp_notifications_enabled", v)} />
              </div>
              {merged.whatsapp_notifications_enabled && (
                <div>
                  <Label>{t("رقم واتساب التجاري", "WhatsApp Business Phone")}</Label>
                  <Input value={merged.whatsapp_business_phone ?? ""} onChange={(e) => update("whatsapp_business_phone", e.target.value)} placeholder="+964..." />
                </div>
              )}
              <div>
                <Label>{t("بريد الدعم", "Support Email")}</Label>
                <Input value={merged.support_email ?? ""} onChange={(e) => update("support_email", e.target.value)} placeholder="support@example.com" />
              </div>
              <div>
                <Label>{t("هاتف الدعم", "Support Phone")}</Label>
                <Input value={merged.support_phone ?? ""} onChange={(e) => update("support_phone", e.target.value)} placeholder="+964..." />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Branding */}
        <TabsContent value="branding" className="space-y-4 mt-4">
          <Card className="border-border/50">
            <CardHeader><CardTitle className="text-base">{t("رابط الحجز العام", "Public Booking Link")}</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <Input readOnly value={publicUrl} className="font-mono text-xs" />
                <Button variant="outline" size="icon" onClick={() => { navigator.clipboard.writeText(publicUrl); toast.success(t("تم النسخ", "Copied")); }}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">{t("شارك هذا الرابط مع عملائك للحجز المباشر", "Share this link with customers for direct booking")}</p>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader><CardTitle className="text-base">{t("إعدادات عامة", "General")}</CardTitle></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>{t("العملة الافتراضية", "Default Currency")}</Label>
                <Select value={merged.currency ?? "IQD"} onValueChange={(v) => update("currency", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IQD">IQD - {t("دينار عراقي", "Iraqi Dinar")}</SelectItem>
                    <SelectItem value="USD">USD - {t("دولار أمريكي", "US Dollar")}</SelectItem>
                    <SelectItem value="SAR">SAR - {t("ريال سعودي", "Saudi Riyal")}</SelectItem>
                    <SelectItem value="AED">AED - {t("درهم إماراتي", "UAE Dirham")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t("اللغة الافتراضية", "Default Language")}</Label>
                <Select value={merged.default_language ?? "ar"} onValueChange={(v) => update("default_language", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ar">{t("العربية", "Arabic")}</SelectItem>
                    <SelectItem value="en">{t("الإنجليزية", "English")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Advanced */}
        <TabsContent value="advanced" className="space-y-4 mt-4">
          <Card className="border-border/50">
            <CardHeader><CardTitle className="text-base">{t("قائمة الانتظار", "Waitlist")}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{t("تفعيل قائمة الانتظار", "Enable waitlist")}</p>
                  <p className="text-xs text-muted-foreground">{t("يمكن للعملاء الانضمام للقائمة عند امتلاء المواعيد", "Clients can join when slots are full")}</p>
                </div>
                <Switch checked={merged.waitlist_enabled ?? false} onCheckedChange={(v) => update("waitlist_enabled", v)} />
              </div>
              {merged.waitlist_enabled && (
                <>
                  <div>
                    <Label>{t("حد قائمة الانتظار", "Max waitlist size")}</Label>
                    <Input type="number" min={1} value={merged.waitlist_max_size ?? 10} onChange={(e) => update("waitlist_max_size", +e.target.value)} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{t("ملء تلقائي", "Auto-fill from waitlist")}</p>
                      <p className="text-xs text-muted-foreground">{t("عند إلغاء حجز، ينتقل الأول في القائمة تلقائياً", "When a booking is cancelled, first in line gets it")}</p>
                    </div>
                    <Switch checked={merged.waitlist_auto_fill ?? false} onCheckedChange={(v) => update("waitlist_auto_fill", v)} />
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader><CardTitle className="text-base">{t("الإيداع والدفع", "Deposits")}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{t("طلب إيداع مسبق", "Require deposit")}</p>
                  <p className="text-xs text-muted-foreground">{t("يجب على العميل دفع مبلغ مقدم للحجز", "Client must pay upfront to book")}</p>
                </div>
                <Switch checked={merged.deposit_required ?? false} onCheckedChange={(v) => update("deposit_required", v)} />
              </div>
              {merged.deposit_required && (
                <>
                  <div>
                    <Label>{t("مبلغ الإيداع", "Deposit amount")}</Label>
                    <Input type="number" min={0} value={merged.deposit_amount ?? 0} onChange={(e) => update("deposit_amount", +e.target.value)} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{t("قابل للاسترداد", "Refundable")}</p>
                    </div>
                    <Switch checked={merged.deposit_refundable ?? true} onCheckedChange={(v) => update("deposit_refundable", v)} />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
