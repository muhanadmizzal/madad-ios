import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lock, Crown, AlertTriangle, UserX, ShieldOff, Ban, Sparkles } from "lucide-react";
import { useFeatureAccessQuery } from "@/hooks/useFeatureAccess";

export type LockReason =
  | "not_in_plan"
  | "disabled_by_admin"
  | "disabled_for_user"
  | "role_restricted"
  | "subscription_inactive"
  | "subscription_suspended"
  | "subscription_overdue"
  | "subscription_cancelled"
  | "subscription_pending"
  | "no_subscription"
  | "quota_exceeded"
  | "platform_disabled"
  | null;

interface Props {
  featureKey: string;
  children: ReactNode;
  fallback?: ReactNode;
  compact?: boolean;
  /** Hide entirely instead of showing lock state */
  hide?: boolean;
}

const REASON_CONFIG: Record<string, { icon: any; label: string; cta: string }> = {
  not_in_plan: { icon: Crown, label: "هذه الميزة غير متوفرة في باقتك الحالية", cta: "ترقية الباقة" },
  disabled_by_admin: { icon: ShieldOff, label: "تم تعطيل هذه الميزة من قبل الإدارة", cta: "تواصل مع المسؤول" },
  disabled_for_user: { icon: UserX, label: "هذه الميزة غير مفعّلة لحسابك", cta: "تواصل مع المسؤول" },
  role_restricted: { icon: Lock, label: "ليس لديك صلاحية الوصول لهذه الميزة", cta: "" },
  position_restricted: { icon: Lock, label: "هذه الميزة غير مفعّلة لمنصبك الوظيفي", cta: "تواصل مع المسؤول" },
  subscription_inactive: { icon: AlertTriangle, label: "الاشتراك غير نشط", cta: "تجديد الاشتراك" },
  subscription_suspended: { icon: Ban, label: "الاشتراك موقوف — تواصل مع إدارة المنصة", cta: "" },
  subscription_overdue: { icon: AlertTriangle, label: "الاشتراك متأخر — يرجى تسوية المستحقات", cta: "عرض الفواتير" },
  subscription_cancelled: { icon: Ban, label: "تم إلغاء الاشتراك", cta: "إعادة الاشتراك" },
  subscription_pending: { icon: AlertTriangle, label: "الاشتراك قيد المراجعة", cta: "" },
  no_subscription: { icon: Crown, label: "لا يوجد اشتراك نشط", cta: "اختيار باقة" },
  quota_exceeded: { icon: AlertTriangle, label: "تم تجاوز حد الاستخدام", cta: "ترقية الباقة" },
  platform_disabled: { icon: Ban, label: "هذه الميزة معطّلة على مستوى المنصة", cta: "" },
};

function LockState({ reason, compact, isAi }: { reason: string; compact?: boolean; isAi?: boolean }) {
  const config = REASON_CONFIG[reason] || REASON_CONFIG.not_in_plan;
  const Icon = config.icon;

  if (compact) {
    return (
      <div className="flex items-center gap-2 p-2 rounded-md border border-border bg-muted/30 text-muted-foreground text-xs">
        <Icon className="h-3.5 w-3.5 shrink-0" />
        <span>{config.label}</span>
        {isAi && (
          <Badge variant="outline" className="text-[9px] gap-0.5 ml-auto">
            <Sparkles className="h-2.5 w-2.5" />AI
          </Badge>
        )}
      </div>
    );
  }

  return (
    <Card className="border-dashed border-muted-foreground/20 bg-muted/10">
      <CardContent className="flex flex-col items-center justify-center py-10 text-center gap-3">
        <div className="p-3 rounded-full bg-muted/50">
          <Icon className="h-6 w-6 text-muted-foreground" />
        </div>
        <div className="space-y-1.5">
          <p className="text-sm font-medium text-muted-foreground">{config.label}</p>
          <div className="flex items-center justify-center gap-2">
            {config.cta && (
              <Badge variant="outline" className="text-[10px] gap-1">
                <Crown className="h-3 w-3" />
                {config.cta}
              </Badge>
            )}
            {isAi && (
              <Badge variant="outline" className="text-[10px] gap-1">
                <Sparkles className="h-3 w-3" />
                ميزة ذكاء اصطناعي
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Unified FeatureGate — works for both plan features and AI features.
 * Accepts any feature key or AI module alias.
 */
export function FeatureGate({ featureKey, children, fallback, compact, hide }: Props) {
  const { checkFeature, isLoading } = useFeatureAccessQuery();

  if (isLoading) return null;

  const { enabled, reason } = checkFeature(featureKey);
  const isAi = featureKey.startsWith("ai_") || [
    "hr_operational", "workforce_analytics", "gap_analysis", "hiring_strategy",
    "career_coach", "planning", "ats_cv_analysis", "ats_interview",
    "ats_communication", "generate_document", "business_analytics",
  ].includes(featureKey);

  if (!enabled) {
    if (hide) return null;
    return fallback ? <>{fallback}</> : <LockState reason={reason || "not_in_plan"} compact={compact} isAi={isAi} />;
  }

  return <>{children}</>;
}

/**
 * Hook to check feature access with detailed reason
 */
export function useFeatureGate(featureKey: string) {
  const { checkFeature, isSubscriptionActive, subscriptionStatus } = useFeatureAccessQuery();
  const result = checkFeature(featureKey);
  return { ...result, isSubscriptionActive, subscriptionStatus };
}
