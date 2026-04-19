import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LogOut, ChevronDown, Home } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/hooks/useCompany";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { MADAD_LOGO } from "@/lib/moduleConfig";

export interface NavItem {
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

interface UnifiedSidebarProps {
  groups: NavGroup[];
  portalLabel?: string;
  collapsed: boolean;
  onCollapse: (collapsed: boolean) => void;
  onNavClick?: () => void;
  showTenantLogo?: boolean;
  moduleLabel?: string;
  moduleLogo?: string;
}

export function UnifiedSidebar({
  groups,
  portalLabel,
  collapsed,
  onNavClick,
  showTenantLogo = false,
  moduleLabel,
  moduleLogo,
}: UnifiedSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { companyId } = useCompany();

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    () => Object.fromEntries(groups.map((g) => [g.label, true]))
  );

  const toggleGroup = (label: string) => {
    setExpandedGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const { data: company } = useQuery({
    queryKey: ["sidebar-company", companyId],
    queryFn: async () => {
      const { data } = await supabase
        .from("companies")
        .select("name, name_ar, logo_url")
        .eq("id", companyId!)
        .single();
      return data;
    },
    enabled: !!companyId && showTenantLogo,
    staleTime: 5 * 60 * 1000,
  });

  const displayLogo = moduleLogo || MADAD_LOGO;
  const logoAlt = moduleLabel || "مدد";

  const isActive = (path: string, exact?: boolean) =>
    exact ? location.pathname === path : location.pathname.startsWith(path);

  // Show company name if available
  const companyName = showTenantLogo ? (company?.name_ar || company?.name) : null;

  return (
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground">
      {/* Brand Header — MADAD */}
      <div className="relative px-4 pt-5 pb-4">
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            background:
              "radial-gradient(ellipse 120% 80% at 50% 0%, hsl(var(--sidebar-primary)) 0%, transparent 70%)",
          }}
        />

        <div
          className={cn(
            "relative z-10 flex items-center gap-3 transition-all duration-[250ms] ease-in-out",
            collapsed && "justify-center"
          )}
        >
          <img
            src={displayLogo}
            alt={logoAlt}
            className={cn(
              "flex-shrink-0 transition-all duration-[200ms] ease-in-out w-auto object-contain rounded",
              collapsed ? "h-8" : "h-10"
            )}
          />
          {!collapsed && (
            <div className="animate-fade-in min-w-0">
              <p className="font-heading font-bold text-sm text-sidebar-primary truncate">
                {moduleLabel || "مدد"}
              </p>
              {moduleLabel && (
                <p className="text-[10px] font-body" style={{ color: "hsl(var(--gold))" }}>
                  من مدد
                </p>
              )}
              {!moduleLabel && portalLabel && (
                <p className="text-[10px] text-sidebar-primary/60 uppercase tracking-[0.15em] font-medium font-body truncate">
                  {portalLabel}
                </p>
              )}
              {companyName && (
                <p className="text-[10px] text-sidebar-primary/50 font-body truncate mt-0.5">
                  {companyName}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Gold divider */}
      <div className="mx-4 mb-2 h-px" style={{ background: "linear-gradient(90deg, transparent, hsl(var(--gold) / 0.35), hsl(var(--gold) / 0.5), hsl(var(--gold) / 0.35), transparent)" }} />

      {/* MADAD Hub link when inside a module */}
      {moduleLabel && !collapsed && (
        <div className="px-3 mb-1">
          <button
            onClick={() => { navigate("/madad/home"); onNavClick?.(); }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] text-sidebar-primary/50 hover:text-sidebar-primary hover:bg-sidebar-accent/10 transition-colors"
          >
            <Home className="h-3.5 w-3.5" />
            <span>العودة لمدد</span>
          </button>
        </div>
      )}
      {moduleLabel && collapsed && (
        <div className="px-3 mb-1">
          <button
            onClick={() => { navigate("/madad/home"); onNavClick?.(); }}
            className="w-full flex items-center justify-center px-3 py-2 rounded-lg text-sidebar-primary/50 hover:text-sidebar-primary hover:bg-sidebar-accent/10 transition-colors"
          >
            <Home className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Navigation Groups */}
      <nav className="flex-1 overflow-y-auto px-3 space-y-2 py-1">
        {groups.map((group) => {
          const isExpanded = expandedGroups[group.label] !== false;
          return (
            <div key={group.label}>
              {!collapsed ? (
                <button
                  onClick={() => toggleGroup(group.label)}
                  className="w-full flex items-center justify-between text-[10px] text-sidebar-primary/50 uppercase tracking-wider font-medium px-3 mb-1 font-body hover:text-sidebar-primary transition-colors"
                >
                  <span>{group.label}</span>
                  <ChevronDown
                    className={cn(
                      "h-3 w-3 transition-transform duration-200",
                      !isExpanded && "-rotate-90"
                    )}
                  />
                </button>
              ) : null}
                <div
                  className={cn(
                    "space-y-0.5 overflow-hidden transition-all duration-200",
                    !collapsed && !isExpanded && "max-h-0 opacity-0",
                    !collapsed && isExpanded && "max-h-[2000px] opacity-100",
                    collapsed && "max-h-[2000px] opacity-100"
                  )}
                >
                {group.items.map((item) => {
                  const active = isActive(item.path, item.exact);
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={onNavClick}
                      className={cn(
                        "relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] transition-all duration-200 group",
                        active
                          ? "bg-sidebar-accent/25 text-sidebar-primary font-medium"
                          : "text-sidebar-primary/70 hover:text-sidebar-primary hover:bg-sidebar-accent/10"
                      )}
                    >
                      {active && (
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-l-full bg-sidebar-primary animate-[accent-bar-in_0.25s_ease-out]" />
                      )}
                      <item.icon
                        className={cn(
                          "h-[18px] w-[18px] shrink-0 transition-colors",
                          active
                            ? "text-sidebar-primary"
                            : "group-hover:text-sidebar-primary"
                        )}
                      />
                      {!collapsed && (
                        <span className="truncate transition-opacity duration-[250ms] ease-in-out">
                          {item.label}
                        </span>
                      )}
                      {collapsed && <span className="sr-only">{item.label}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 relative">
        <div className="absolute top-0 left-3 right-3 h-px" style={{ background: "linear-gradient(90deg, transparent, hsl(var(--gold) / 0.3), hsl(var(--gold) / 0.45), hsl(var(--gold) / 0.3), transparent)" }} />
        <button
          onClick={() => signOut()}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] text-sidebar-primary/40 hover:bg-destructive/10 hover:text-destructive transition-colors",
            collapsed && "justify-center"
          )}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span>تسجيل خروج</span>}
        </button>
      </div>
    </div>
  );
}
