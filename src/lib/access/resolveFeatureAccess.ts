import { SERVICE_CATALOG, type ServicePermissions } from "@/hooks/usePositionPermissions";

export type AccessReason =
  | "allowed"
  | "not_in_plan"
  | "disabled_by_position"
  | "role_restricted"
  | "subscription_inactive"
  | "no_subscription"
  | "platform_disabled";

export interface AccessCheckResult {
  allowed: boolean;
  reason: AccessReason;
  reasonLabel: string;
}

const REASON_LABELS: Record<AccessReason, string> = {
  allowed: "متاح",
  not_in_plan: "غير متوفر في الباقة الحالية",
  disabled_by_position: "غير مفعّل لمنصبك الوظيفي",
  role_restricted: "ليس لديك صلاحية الوصول",
  subscription_inactive: "الاشتراك غير نشط",
  no_subscription: "لا يوجد اشتراك نشط",
  platform_disabled: "معطّل على مستوى المنصة",
};

/**
 * Pure function: resolve feature access from multiple layers.
 * No hooks — can be called from anywhere.
 */
export function resolveFeatureAccess(
  featureKey: string,
  planCheck: { enabled: boolean; reason: string | null; source: string },
  servicePermissions: ServicePermissions | null | undefined,
): AccessCheckResult {
  // Layer 1: plan/subscription check
  if (!planCheck.enabled) {
    const reason = mapPlanReason(planCheck.reason);
    return { allowed: false, reason, reasonLabel: REASON_LABELS[reason] };
  }

  // Layer 2: position service_permissions check (permissive default)
  if (servicePermissions && servicePermissions[featureKey] === false) {
    return { allowed: false, reason: "disabled_by_position", reasonLabel: REASON_LABELS.disabled_by_position };
  }

  return { allowed: true, reason: "allowed", reasonLabel: REASON_LABELS.allowed };
}

function mapPlanReason(reason: string | null): AccessReason {
  if (!reason) return "not_in_plan";
  if (reason.startsWith("subscription_") || reason === "subscription_inactive") return "subscription_inactive";
  if (reason === "no_subscription") return "no_subscription";
  if (reason === "platform_disabled") return "platform_disabled";
  if (reason === "role_restricted") return "role_restricted";
  return "not_in_plan";
}

/**
 * Build a full access map for all known features.
 * Uses DB catalog when available, falls back to static SERVICE_CATALOG.
 */
export function buildAccessMap(
  checkFeature: (key: string) => { enabled: boolean; reason: string | null; source: string },
  servicePermissions: ServicePermissions | null | undefined,
  catalogOverride?: { key: string }[],
): Record<string, AccessCheckResult> {
  const map: Record<string, AccessCheckResult> = {};
  const features = catalogOverride || SERVICE_CATALOG;
  for (const feat of features) {
    map[feat.key] = resolveFeatureAccess(feat.key, checkFeature(feat.key), servicePermissions);
  }
  return map;
}

/**
 * Filter navigation items by access map.
 * Items without a featureKey are always shown.
 */
export function filterByAccess<T extends { featureKey?: string }>(
  items: T[],
  accessMap: Record<string, AccessCheckResult>,
): T[] {
  return items.filter((item) => {
    if (!item.featureKey) return true;
    const check = accessMap[item.featureKey];
    return !check || check.allowed;
  });
}
