/**
 * Effective Permissions Summary — shows what a user can/cannot access and why.
 * Used in employee detail, position detail, and admin user views.
 */
import { useMemo } from "react";
import { Shield, Lock, CheckCircle, AlertTriangle, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  SERVICE_CATALOG,
  CATEGORY_META,
  type ServiceCategory,
  type ServicePermissions,
} from "@/hooks/usePositionPermissions";
import { useFeatureAccessQuery } from "@/hooks/useFeatureAccess";
import { cn } from "@/lib/utils";

interface Props {
  servicePermissions?: ServicePermissions | null;
  roles?: string[];
  subscriptionStatus?: string;
  compact?: boolean;
}

const REASON_LABELS: Record<string, { label: string; icon: typeof Lock; cls: string }> = {
  subscription: { label: "غير متوفر في الباقة", icon: Lock, cls: "text-muted-foreground" },
  position: { label: "معطّل للمنصب", icon: AlertTriangle, cls: "text-accent-foreground" },
  allowed: { label: "متاح", icon: CheckCircle, cls: "text-primary" },
};

export function EffectivePermissionsSummary({ servicePermissions, roles, subscriptionStatus, compact }: Props) {
  const { checkFeature, isSubscriptionActive } = useFeatureAccessQuery();

  const resolved = useMemo(() => {
    const accessible: { key: string; nameAr: string; category: ServiceCategory }[] = [];
    const restricted: { key: string; nameAr: string; category: ServiceCategory; reason: string }[] = [];

    for (const feat of SERVICE_CATALOG) {
      const planCheck = checkFeature(feat.key);
      const posEnabled = servicePermissions?.[feat.key] !== undefined
        ? servicePermissions[feat.key]
        : true;

      if (!planCheck.enabled) {
        restricted.push({ key: feat.key, nameAr: feat.nameAr, category: feat.category, reason: "subscription" });
      } else if (!posEnabled) {
        restricted.push({ key: feat.key, nameAr: feat.nameAr, category: feat.category, reason: "position" });
      } else {
        accessible.push({ key: feat.key, nameAr: feat.nameAr, category: feat.category });
      }
    }

    return { accessible, restricted };
  }, [checkFeature, servicePermissions]);

  if (compact) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 text-xs font-heading font-semibold text-muted-foreground">
          <Shield className="h-3.5 w-3.5" />
          الصلاحيات الفعلية
        </div>
        <div className="flex flex-wrap gap-1">
          <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20">
            {resolved.accessible.length} متاح
          </Badge>
          {resolved.restricted.filter(r => r.reason === "position").length > 0 && (
            <Badge variant="outline" className="text-[10px] bg-accent/10 text-accent-foreground border-accent/20">
              {resolved.restricted.filter(r => r.reason === "position").length} معطّل للمنصب
            </Badge>
          )}
          {resolved.restricted.filter(r => r.reason === "subscription").length > 0 && (
            <Badge variant="outline" className="text-[10px] bg-muted text-muted-foreground">
              {resolved.restricted.filter(r => r.reason === "subscription").length} غير متوفر بالباقة
            </Badge>
          )}
        </div>
      </div>
    );
  }

  const categories = Object.keys(CATEGORY_META) as ServiceCategory[];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-heading flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          ملخص الصلاحيات الفعلية
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!isSubscriptionActive && (
          <div className="p-2 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center gap-2 text-xs text-destructive">
            <AlertTriangle className="h-3.5 w-3.5" />
            <span className="font-heading font-semibold">الاشتراك غير نشط — جميع الخدمات معطّلة</span>
          </div>
        )}

        {roles && roles.length > 0 && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">الأدوار:</span>
            <div className="flex flex-wrap gap-1">
              {roles.map(r => (
                <Badge key={r} variant="outline" className="text-[10px]">{r}</Badge>
              ))}
            </div>
          </div>
        )}

        {categories.map(cat => {
          const catAccessible = resolved.accessible.filter(f => f.category === cat);
          const catRestricted = resolved.restricted.filter(f => f.category === cat);
          if (catAccessible.length === 0 && catRestricted.length === 0) return null;

          return (
            <div key={cat} className="space-y-1">
              <p className="text-[10px] font-heading font-semibold text-muted-foreground">
                {CATEGORY_META[cat].labelAr}
              </p>
              <div className="grid grid-cols-1 gap-0.5">
                {catAccessible.map(f => (
                  <div key={f.key} className="flex items-center gap-1.5 text-xs py-0.5 px-2 rounded bg-primary/5">
                    <CheckCircle className="h-2.5 w-2.5 text-primary" />
                    <span>{f.nameAr}</span>
                  </div>
                ))}
                {catRestricted.map(f => (
                  <div key={f.key} className={cn(
                    "flex items-center gap-1.5 text-xs py-0.5 px-2 rounded",
                    f.reason === "position" ? "bg-accent/5" : "bg-muted/50"
                  )}>
                    <Lock className="h-2.5 w-2.5 text-muted-foreground" />
                    <span className="text-muted-foreground">{f.nameAr}</span>
                    <Badge variant="outline" className="text-[9px] h-4 px-1 mr-auto">
                      {f.reason === "position" ? "معطّل للمنصب" : "غير بالباقة"}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        <div className="flex items-start gap-1.5 text-[10px] text-muted-foreground pt-1 border-t">
          <Info className="h-3 w-3 mt-0.5" />
          <span>الصلاحيات = باقة الاشتراك + إعدادات المنصب + الدور الوظيفي</span>
        </div>
      </CardContent>
    </Card>
  );
}
