/**
 * Workflow Settings — Super Admin controls for approval behavior
 * Route: /madad/admin/workflow-settings
 */
import { useLanguage } from "@/contexts/LanguageContext";
import { useWorkflowSettings } from "@/hooks/useUnifiedFeatureManagement";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Settings, Shield, Zap, CreditCard, Users } from "lucide-react";
import { toast } from "sonner";

const SETTING_DEFS = [
  {
    key: "require_owner_approval",
    icon: Users,
    titleAr: "موافقة مالك الأعمال مطلوبة",
    titleEn: "Require Business Owner Approval",
    descAr: "تغييرات الميزات من المستأجرين تتطلب موافقة مالك الأعمال",
    descEn: "Tenant feature changes require business owner approval",
  },
  {
    key: "require_admin_approval",
    icon: Shield,
    titleAr: "موافقة مدير المنصة مطلوبة",
    titleEn: "Require Super Admin Approval",
    descAr: "التغييرات المعتمدة من مالك الأعمال تتطلب موافقة مدير المنصة",
    descEn: "Owner-approved changes require super admin approval",
  },
  {
    key: "allow_self_service_activation",
    icon: Zap,
    titleAr: "السماح بالتفعيل الذاتي",
    titleEn: "Allow Self-Service Activation",
    descAr: "المستأجرون يمكنهم طلب تفعيل الوحدات بأنفسهم",
    descEn: "Tenants can self-request module activation",
  },
  {
    key: "manual_payment_requires_confirmation",
    icon: CreditCard,
    titleAr: "الدفع اليدوي يتطلب تأكيد",
    titleEn: "Manual Payment Requires Confirmation",
    descAr: "المدفوعات اليدوية تتطلب تأكيد المسؤول قبل التفعيل",
    descEn: "Manual payments require admin confirmation before activation",
  },
];

export default function MadadWorkflowSettings() {
  const { t } = useLanguage();
  const { data: settings = {}, isLoading } = useWorkflowSettings();
  const qc = useQueryClient();

  const toggleSetting = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: boolean }) => {
      const { error } = await supabase
        .from("madad_workflow_settings")
        .update({ setting_value: value, updated_at: new Date().toISOString() } as any)
        .eq("setting_key", key);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workflow-settings"] });
      toast.success(t("تم تحديث الإعداد", "Setting updated"));
    },
    onError: () => toast.error(t("حدث خطأ", "Error")),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading font-extrabold text-2xl flex items-center gap-2">
          <Settings className="h-6 w-6" style={{ color: "hsl(var(--gold))" }} />
          {t("إعدادات سير العمل", "Workflow Settings")}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t("التحكم في سلوك الموافقات وتفعيل الميزات على مستوى المنصة", "Control platform-level approval and activation behavior")}
        </p>
      </div>

      <div className="space-y-3">
        {SETTING_DEFS.map((def) => {
          const Icon = def.icon;
          const currentValue = settings[def.key] ?? true;

          return (
            <Card key={def.key} className="border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-primary/5 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Label className="font-heading font-bold text-sm cursor-pointer">
                        {t(def.titleAr, def.titleEn)}
                      </Label>
                      <Badge variant="outline" className="text-[9px]">
                        {currentValue ? t("مفعّل", "Enabled") : t("معطّل", "Disabled")}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{t(def.descAr, def.descEn)}</p>
                  </div>
                  <Switch
                    checked={currentValue}
                    onCheckedChange={(v) => toggleSetting.mutate({ key: def.key, value: v })}
                    disabled={isLoading || toggleSetting.isPending}
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
