import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type AppRole =
  | "super_admin"
  | "business_admin"
  | "finance_manager"
  | "support_agent"
  | "sales_manager"
  | "technical_admin"
  | "tenant_admin"
  | "admin"
  | "hr_manager"
  | "hr_officer"
  | "manager"
  | "employee";

export type PortalType = "business" | "tenant" | "employee" | "unauthorized";

const ROLE_PRIORITY: AppRole[] = [
  "super_admin",
  "business_admin",
  "finance_manager",
  "support_agent",
  "sales_manager",
  "technical_admin",
  "tenant_admin",
  "admin",
  "hr_manager",
  "hr_officer",
  "manager",
  "employee",
];

const PLATFORM_ROLES: AppRole[] = [
  "super_admin",
  "business_admin",
  "finance_manager",
  "support_agent",
  "sales_manager",
  "technical_admin",
];

const TENANT_ROLES: AppRole[] = [
  "tenant_admin",
  "admin",
  "hr_manager",
  "hr_officer",
  "finance_manager",
  "manager",
];

const EMPLOYEE_ROLES: AppRole[] = ["employee"];

export interface UserRoleEntry {
  role: AppRole;
  scope_type: string;
  tenant_id: string | null;
}

export function useRole() {
  const { user } = useAuth();

  const { data: roleEntries = [], isLoading, error } = useQuery({
    queryKey: ["user-roles", user?.id],
    queryFn: async () => {
      console.log("[useRole] Fetching roles for user:", user!.id);
      const { data, error } = await supabase
        .from("user_roles")
        .select("role, scope_type, tenant_id")
        .eq("user_id", user!.id);
      if (error) {
        console.error("[useRole] Error fetching roles:", error);
        throw error;
      }
      console.log("[useRole] Roles loaded:", data);

      // Fallback recovery via secure server-side RPC (no direct insert)
      if (!data || data.length === 0) {
        console.warn("[useRole] No roles found for user:", user!.id, "— calling recover_own_role RPC");
        const { data: recovered, error: rpcErr } = await supabase.rpc("recover_own_role");

        if (rpcErr) {
          console.error("[useRole] Recovery RPC failed:", rpcErr.message);
        } else if (recovered && Array.isArray(recovered) && recovered.length > 0) {
          console.log("[useRole] Recovery successful via RPC:", recovered);
          return recovered as unknown as UserRoleEntry[];
        } else {
          console.warn("[useRole] Recovery RPC returned no roles");
        }
      }

      return (data || []) as unknown as UserRoleEntry[];
    },
    enabled: !!user,
    retry: 2,
    staleTime: 30_000,
  });

  const roles = roleEntries.map((r) => r.role);

  // Determine highest priority role
  const highestRole = ROLE_PRIORITY.find((r) => roles.includes(r)) || null;

  // Determine primary portal
  const getPrimaryPortal = (): PortalType => {
    if (roles.some((r) => PLATFORM_ROLES.includes(r))) return "business";
    if (roles.some((r) => TENANT_ROLES.includes(r))) return "tenant";
    if (roles.some((r) => EMPLOYEE_ROLES.includes(r))) return "employee";
    return "unauthorized";
  };

  // Get all portals user has access to
  const getAccessiblePortals = (): PortalType[] => {
    const portals: PortalType[] = [];
    if (roles.some((r) => PLATFORM_ROLES.includes(r))) portals.push("business");
    if (roles.some((r) => TENANT_ROLES.includes(r))) portals.push("tenant");
    if (roles.some((r) => EMPLOYEE_ROLES.includes(r))) portals.push("employee");
    return portals;
  };

  // Portal access checks
  const canAccessBusinessPortal = roles.some((r) => PLATFORM_ROLES.includes(r));
  const canAccessTenantPortal = roles.some((r) => TENANT_ROLES.includes(r));
  const canAccessEmployeePortal = roles.some((r) => EMPLOYEE_ROLES.includes(r));

  // Get redirect path — all users go to MADAD dashboard
  const getRedirectPath = (): string => {
    return "/madad/home";
  };

  // Legacy compatibility
  const isSuperAdmin = roles.includes("super_admin");
  const isAdmin = roles.includes("admin") || roles.includes("tenant_admin") || isSuperAdmin;
  const isHrManager = roles.includes("hr_manager") || roles.includes("hr_officer") || isAdmin;
  const isEmployee = roles.includes("employee") || isHrManager;

  const hasRole = (role: AppRole) => {
    if (isSuperAdmin) return true;
    if (role === "admin" || role === "tenant_admin") return isAdmin;
    if (role === "hr_manager" || role === "hr_officer") return isHrManager;
    if (role === "manager") return isHrManager || roles.includes("manager");
    if (role === "employee") return isEmployee;
    return roles.includes(role);
  };

  return {
    roles,
    roleEntries,
    highestRole,
    isLoading,
    isSuperAdmin,
    isAdmin,
    isHrManager,
    isEmployee,
    hasRole,
    getPrimaryPortal,
    getAccessiblePortals,
    getRedirectPath,
    canAccessBusinessPortal,
    canAccessTenantPortal,
    canAccessEmployeePortal,
  };
}
