/**
 * Standardized Role Badge component — used everywhere roles are displayed.
 */
import { Badge } from "@/components/ui/badge";
import { getRoleMeta, getPrimaryRole, type RoleMeta } from "@/lib/roles";
import type { AppRole } from "@/hooks/useRole";
import { cn } from "@/lib/utils";

interface RoleBadgeProps {
  role: AppRole;
  size?: "sm" | "md";
  className?: string;
}

export function RoleBadge({ role, size = "sm", className }: RoleBadgeProps) {
  const meta = getRoleMeta(role);
  return (
    <Badge
      variant="outline"
      className={cn(
        meta.color,
        size === "sm" ? "text-[10px] px-1.5 py-0" : "text-xs px-2 py-0.5",
        "font-heading whitespace-nowrap",
        className
      )}
    >
      {meta.labelAr}
    </Badge>
  );
}

interface RoleBadgeListProps {
  roles: AppRole[];
  max?: number;
  className?: string;
}

/**
 * Display a list of role badges with primary role first.
 * If roles exceed `max`, show "+N" overflow.
 */
export function RoleBadgeList({ roles, max = 3, className }: RoleBadgeListProps) {
  if (!roles.length) return null;

  const primary = getPrimaryRole(roles);
  const sorted = [primary, ...roles.filter((r) => r !== primary)];
  const visible = sorted.slice(0, max);
  const overflow = sorted.length - max;

  return (
    <div className={cn("flex flex-wrap gap-1 items-center", className)}>
      {visible.map((role) => (
        <RoleBadge key={role} role={role} />
      ))}
      {overflow > 0 && (
        <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-muted text-muted-foreground">
          +{overflow}
        </Badge>
      )}
    </div>
  );
}
