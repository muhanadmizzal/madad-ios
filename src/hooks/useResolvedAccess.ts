import { useMemo } from "react";
import { useFeatureAccessQuery } from "./useFeatureAccess";
import { type ServicePermissions, useServiceCatalog } from "./usePositionPermissions";
import {
  resolveFeatureAccess,
  buildAccessMap,
  type AccessCheckResult,
  type AccessReason,
} from "@/lib/access/resolveFeatureAccess";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "./useCompany";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Unified access resolver hook.
 * Combines tenant subscription + position service_permissions + role checks.
 */
export function useResolvedAccess() {
  const { user } = useAuth();
  const { companyId } = useCompany();
  const { checkFeature, isSubscriptionActive, subscriptionStatus, isLoading: featureLoading, isFetched: featureFetched } = useFeatureAccessQuery();
  const { catalog: liveCatalog } = useServiceCatalog();

  // Fetch current user's position service_permissions
  const { data: positionPerms, isLoading: posLoading } = useQuery({
    queryKey: ["my-position-perms", companyId, user?.id],
    queryFn: async () => {
      if (!companyId || !user?.id) return null;
      const { data: emp } = await supabase
        .from("employees")
        .select("position_id")
        .eq("company_id", companyId)
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle();

      if (!emp?.position_id) return null;

      const { data: pos } = await supabase
        .from("positions")
        .select("service_permissions")
        .eq("id", emp.position_id)
        .maybeSingle();

      return (pos?.service_permissions as ServicePermissions) || null;
    },
    enabled: !!companyId && !!user?.id,
    staleTime: 60_000,
  });

  // Treat "not yet ready" (companyId still loading) as loading to avoid premature blocking
  const isLoading = featureLoading || posLoading || (!featureFetched && !!user);

  const accessMap = useMemo(
    () => buildAccessMap(checkFeature, positionPerms, liveCatalog),
    [checkFeature, positionPerms, liveCatalog]
  );

  const canAccess = (featureKey: string): boolean => {
    const check = accessMap[featureKey];
    return !check || check.allowed;
  };

  const canView = canAccess; // alias

  const disabledReason = (featureKey: string): AccessReason | null => {
    const check = accessMap[featureKey];
    if (!check || check.allowed) return null;
    return check.reason;
  };

  const disabledReasonLabel = (featureKey: string): string | null => {
    const check = accessMap[featureKey];
    if (!check || check.allowed) return null;
    return check.reasonLabel;
  };

  return {
    isLoading,
    isSubscriptionActive,
    subscriptionStatus,
    accessMap,
    canAccess,
    canView,
    disabledReason,
    disabledReasonLabel,
    positionPermissions: positionPerms,
    checkFeature, // pass-through for backward compat
  };
}
