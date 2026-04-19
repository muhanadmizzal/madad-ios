import { useLanguage } from "@/contexts/LanguageContext";
import { PageHeader } from "@/components/layout/PageHeader";
import LocalRuntimePanel from "@/components/integrations/LocalRuntimePanel";
import { Card, CardContent } from "@/components/ui/card";
import { Server, ShieldCheck, Layers } from "lucide-react";

/**
 * MADAD Tenant — Hybrid Access management page.
 * Platform-wide entry point for managing local nodes that mirror the tenant's
 * full subscription scope across ALL MADAD modules (Tamkeen, Tathbeet,
 * Tahseel, Takzeen, future modules).
 *
 * This is NOT a Tamkeen-specific feature.
 */
export default function MadadHybridAccess() {
  const { t } = useLanguage();

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("الوصول الهجين (Hybrid Access)", "Hybrid Access")}
        description={t(
          "تشغيل وحدات اشتراكك في MADAD على عقدة محلية تعمل دون اتصال، مع بقاء MADAD مصدر الاشتراكات والصلاحيات والسياسات",
          "Run your subscribed MADAD modules on a local offline-capable node, while MADAD remains the source of truth for subscriptions, permissions, and policy",
        )}
      />

      {/* Platform-wide rule banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4 flex items-start gap-3">
            <div className="h-9 w-9 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
              <Layers className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="font-medium text-sm">
                {t("منصة-واسع لجميع الوحدات", "Platform-wide for all modules")}
              </div>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                {t(
                  "يدعم تمكين، تثبيت، تحصيل، تخزين، وأي وحدات قادمة — فقط ضمن نطاق اشتراكك الفعلي.",
                  "Supports Tamkeen, Tathbeet, Tahseel, Takzeen, and future modules — strictly within your actual subscription scope.",
                )}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4 flex items-start gap-3">
            <div className="h-9 w-9 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
              <ShieldCheck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="font-medium text-sm">
                {t("سحابة MADAD = مصدر الحقيقة", "MADAD cloud = source of truth")}
              </div>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                {t(
                  "تفعيل الوحدات، الميزات، والصلاحيات تُحكَم من MADAD وتُورَّث للعقدة بعد كل مزامنة.",
                  "Module activation, features, and permissions are governed by MADAD and propagated to the node on each sync.",
                )}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4 flex items-start gap-3">
            <div className="h-9 w-9 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
              <Server className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="font-medium text-sm">
                {t("ليست منتجاً منفصلاً", "Not a separate product")}
              </div>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                {t(
                  "العقدة المحلية امتداد لـ MADAD، تخضع لنفس سياساته وحدوده. يمكن تعليقها أو إلغاؤها مركزياً.",
                  "The local node is an extension of MADAD under the same policy and limits. It can be suspended or revoked centrally.",
                )}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Operational panel: nodes, requests, runtime mode, sync */}
      <LocalRuntimePanel />
    </div>
  );
}
