import { useNavigate, useLocation } from "react-router-dom";
import { useRole } from "@/hooks/useRole";
import { Building2, LayoutDashboard, UserCircle, ArrowLeftRight, Home } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useMadadSubscription } from "@/hooks/useMadadSubscription";
import { MODULE_REGISTRY } from "@/lib/moduleConfig";

const PORTAL_CONFIG: Record<string, { label: string; icon: any; path: string; color: string }> = {
  madad: { label: "مدد — لوحة التحكم", icon: Home, path: "/madad/dashboard", color: "text-[hsl(var(--gold))]" },
  business: { label: "إدارة المنصة", icon: Building2, path: "/business-portal", color: "text-[hsl(217,91%,60%)]" },
  employee: { label: "بوابة الموظف", icon: UserCircle, path: "/employee-portal", color: "text-accent-foreground" },
};

export function PortalSwitcher() {
  const { getAccessiblePortals, canAccessBusinessPortal } = useRole();
  const { isModuleActive } = useMadadSubscription();
  const navigate = useNavigate();
  const location = useLocation();

  const portals = getAccessiblePortals();

  // Detect current portal context
  const currentPortal: string = location.pathname.startsWith("/business-portal")
    ? "business"
    : location.pathname.startsWith("/employee-portal")
    ? "employee"
    : (() => {
        for (const key of Object.keys(MODULE_REGISTRY)) {
          if (location.pathname.startsWith(`/madad/${key}`)) return key;
        }
        return "madad";
      })();

  // Build available portals list
  const availablePortals: string[] = ["madad"];
  if (canAccessBusinessPortal) availablePortals.push("business");
  // Add all active modules
  for (const [key, mod] of Object.entries(MODULE_REGISTRY)) {
    if (isModuleActive(key)) {
      availablePortals.push(key);
    }
  }
  if (portals.includes("employee")) availablePortals.push("employee");

  if (availablePortals.length <= 1) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2 text-xs font-heading h-8">
          <ArrowLeftRight className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">تبديل البوابة</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-heading text-xs">البوابات المتاحة</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {availablePortals.map((portal) => {
          // Check if it's a module from registry
          const mod = MODULE_REGISTRY[portal];
          const config = PORTAL_CONFIG[portal];
          const label = mod ? `${mod.nameAr} — من مدد` : config?.label;
          const path = mod ? mod.route : config?.path;
          const IconComp = config?.icon || LayoutDashboard;
          const colorClass = config?.color || "text-primary";
          const isActive = portal === currentPortal;

          if (!label || !path) return null;

          return (
            <DropdownMenuItem
              key={portal}
              onClick={() => navigate(path)}
              className={`gap-3 cursor-pointer ${isActive ? "bg-muted" : ""}`}
            >
              {mod ? (
                <img src={mod.iconLogo} alt={mod.nameAr} className="h-4 w-4 object-contain" />
              ) : (
                <IconComp className={`h-4 w-4 ${colorClass}`} />
              )}
              <span className="flex-1 font-heading text-sm">{label}</span>
              {isActive && (
                <Badge variant="outline" className="text-[10px] h-5 px-1.5">الحالية</Badge>
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
