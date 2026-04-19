import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { ServicePermissions } from "./usePositionPermissions";

export interface PositionRoleData {
  positionId: string | null;
  systemRole: string | null;
  servicePermissions: ServicePermissions | null;
  positionTitle: string | null;
  isManager: boolean;
  isLoading: boolean;
}

/**
 * Fetches the current user's position-based role and service permissions.
 * The position's system_role determines the tenant-level role (auto-synced via DB trigger).
 * The position's service_permissions provide granular feature toggles.
 */
export function usePositionRole(): PositionRoleData {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["position-role", user?.id],
    queryFn: async () => {
      // Find employee record for this user
      const { data: emp, error: empErr } = await supabase
        .from("employees")
        .select("position_id")
        .eq("user_id", user!.id)
        .eq("status", "active")
        .maybeSingle();

      if (empErr || !emp?.position_id) return null;

      // Fetch position with system_role and service_permissions
      const { data: pos, error: posErr } = await supabase
        .from("positions")
        .select("id, title_ar, title_en, is_manager, service_permissions, system_role")
        .eq("id", emp.position_id)
        .single();

      if (posErr || !pos) return null;

      return {
        positionId: pos.id,
        systemRole: (pos as any).system_role || "employee",
        servicePermissions: pos.service_permissions as ServicePermissions | null,
        positionTitle: pos.title_ar || pos.title_en || null,
        isManager: pos.is_manager || false,
      };
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  return {
    positionId: data?.positionId || null,
    systemRole: data?.systemRole || null,
    servicePermissions: data?.servicePermissions || null,
    positionTitle: data?.positionTitle || null,
    isManager: data?.isManager || false,
    isLoading,
  };
}
