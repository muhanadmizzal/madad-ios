/**
 * FeatureRouteGuard — page-level guard that blocks access based on
 * unified access resolution (subscription + position + role).
 *
 * Shows an elegant lock screen instead of the page content.
 */
import { ReactNode } from "react";
import { useResolvedAccess } from "@/hooks/useResolvedAccess";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lock, Crown, AlertTriangle, Ban, ShieldOff, Sparkles } from "lucide-react";
import type { AccessReason } from "@/lib/access/resolveFeatureAccess";

interface Props {
  featureKey: string;
  children: ReactNode;
  /** Completely hide (render nothing) if blocked */
  hide?: boolean;
}

const REASON_UI: Record<string, { icon: any; label: string; sublabel: string }> = {
  not_in_plan: {
    icon: Crown,
    label: "غير متوفر في باقتك الحالية",
    sublabel: "يرجى ترقية الباقة للوصول لهذه الميزة",
  },
  disabled_by_position: {
    icon: ShieldOff,
    label: "غير مفعّل لمنصبك الوظيفي",
    sublabel: "تواصل مع مسؤول النظام لتفعيل هذه الميزة لمنصبك",
  },
  role_restricted: {
    icon: Lock,
    label: "ليس لديك صلاحية الوصول",
    sublabel: "هذه الصفحة متاحة لأدوار محددة فقط",
  },
  subscription_inactive: {
    icon: AlertTriangle,
    label: "الاشتراك غير نشط",
    sublabel: "يرجى تجديد الاشتراك للوصول لهذه الميزة",
  },
  no_subscription: {
    icon: Crown,
    label: "لا يوجد اشتراك نشط",
    sublabel: "اختر باقة للبدء باستخدام النظام",
  },
  platform_disabled: {
    icon: Ban,
    label: "هذه الميزة معطّلة حالياً",
    sublabel: "تم تعطيل هذه الميزة على مستوى المنصة",
  },
};

export function FeatureRouteGuard({ featureKey, children, hide }: Props) {
  const { canAccess, disabledReason, isLoading } = useResolvedAccess();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 rounded-lg bg-primary/20 animate-pulse" />
      </div>
    );
  }

  if (canAccess(featureKey)) {
    return <>{children}</>;
  }

  if (hide) return null;

  const reason = disabledReason(featureKey) || "not_in_plan";
  const ui = REASON_UI[reason] || REASON_UI.not_in_plan;
  const Icon = ui.icon;
  const isAi = featureKey.startsWith("ai_");

  return (
    <div className="flex items-center justify-center min-h-[400px] p-6">
      <Card className="border-dashed border-muted-foreground/20 bg-muted/10 max-w-md w-full">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center gap-4">
          <div className="p-4 rounded-full bg-muted/50">
            <Icon className="h-8 w-8 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <p className="text-base font-heading font-semibold text-muted-foreground">{ui.label}</p>
            <p className="text-sm text-muted-foreground/70">{ui.sublabel}</p>
          </div>
          <div className="flex items-center gap-2">
            {reason === "not_in_plan" && (
              <Badge variant="outline" className="text-[10px] gap-1">
                <Crown className="h-3 w-3" />ترقية الباقة
              </Badge>
            )}
            {isAi && (
              <Badge variant="outline" className="text-[10px] gap-1">
                <Sparkles className="h-3 w-3" />ميزة ذكاء اصطناعي
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Section-level guard — compact inline version for hiding sections within a page.
 */
export function FeatureSectionGuard({ featureKey, children, hide }: Props) {
  const { canAccess, disabledReasonLabel, isLoading } = useResolvedAccess();

  if (isLoading) return null;
  if (canAccess(featureKey)) return <>{children}</>;
  if (hide) return null;

  const label = disabledReasonLabel(featureKey) || "غير متاح";

  return (
    <div className="flex items-center gap-2 p-3 rounded-lg border border-dashed border-muted-foreground/20 bg-muted/10 text-muted-foreground text-xs">
      <Lock className="h-3.5 w-3.5 shrink-0" />
      <span>{label}</span>
    </div>
  );
}
