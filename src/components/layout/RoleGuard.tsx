import { Navigate } from "react-router-dom";
import { useRole, type AppRole } from "@/hooks/useRole";

interface RoleGuardProps {
  children: React.ReactNode;
  minRole?: AppRole;
  allowedRoles?: AppRole[];
  fallback?: string;
}

export function RoleGuard({ children, minRole, allowedRoles, fallback = "/dashboard" }: RoleGuardProps) {
  const { hasRole, roles, isLoading } = useRole();

  if (isLoading) return null;

  const isSuperAdmin = roles.includes("super_admin");
  const hasAllowedRole =
    allowedRoles && allowedRoles.length > 0
      ? isSuperAdmin || allowedRoles.some((role) => roles.includes(role))
      : minRole
      ? hasRole(minRole)
      : true;

  if (!hasAllowedRole) return <Navigate to={fallback} replace />;
  return <>{children}</>;
}
