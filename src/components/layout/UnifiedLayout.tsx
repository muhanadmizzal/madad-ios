import { ReactNode, useState } from "react";
import { Menu, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { UnifiedSidebar, type NavGroup } from "./UnifiedSidebar";
import { UnifiedTopBar } from "./UnifiedTopBar";
import { MobileBottomNav } from "./MobileBottomNav";
import { useTenantTheme } from "@/hooks/useTenantTheme";

interface UnifiedLayoutProps {
  children: ReactNode;
  navGroups: NavGroup[];
  portalLabel?: string;
  showTenantLogo?: boolean;
  portalType?: "business" | "tenant" | "employee";
  moduleLabel?: string;
  moduleLogo?: string;
  /** CSS class for module-specific theming (e.g. "module-tamkeen") */
  moduleClass?: string;
}

export function UnifiedLayout({
  children,
  navGroups,
  portalLabel,
  showTenantLogo = false,
  portalType,
  moduleLabel,
  moduleLogo,
  moduleClass,
}: UnifiedLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useTenantTheme();

  return (
    <div className={cn("min-h-screen flex", portalType === "business" && "portal-business", moduleClass)} dir="rtl">
      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute right-0 top-0 bottom-0 w-60 shadow-2xl">
            <UnifiedSidebar
              groups={navGroups}
              portalLabel={portalLabel}
              collapsed={false}
              onCollapse={setCollapsed}
              onNavClick={() => setMobileOpen(false)}
              showTenantLogo={showTenantLogo}
              moduleLabel={moduleLabel}
              moduleLogo={moduleLogo}
            />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden lg:block shrink-0 sticky top-0 h-screen border-l border-sidebar-border transition-all duration-[250ms] ease-in-out overflow-hidden",
          collapsed ? "w-[72px]" : "w-60"
        )}
        style={{ boxShadow: "-1px 0 20px hsl(var(--sidebar-background) / 0.15)" }}
      >
        <UnifiedSidebar
          groups={navGroups}
          portalLabel={portalLabel}
          collapsed={collapsed}
          onCollapse={setCollapsed}
          showTenantLogo={showTenantLogo}
          moduleLabel={moduleLabel}
          moduleLogo={moduleLogo}
        />
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 h-screen">
        {/* Top bar */}
        <header className="h-12 lg:h-14 bg-card/80 backdrop-blur-sm flex items-center px-3 lg:px-4 sticky top-0 z-20 gap-1.5 lg:gap-2 relative">
          <div className="absolute bottom-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg, transparent 5%, hsl(var(--gold) / 0.3) 30%, hsl(var(--gold) / 0.5) 50%, hsl(var(--gold) / 0.3) 70%, transparent 95%)" }} />
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden text-muted-foreground hover:text-foreground h-8 w-8"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="hidden lg:flex text-muted-foreground hover:text-foreground h-8 w-8"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? (
              <ChevronLeft className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
          <UnifiedTopBar />
        </header>

        <main className="flex-1 min-h-0 p-3 md:p-4 lg:p-6 pb-20 lg:pb-6 overflow-auto bg-background geometric-stars">
          {children}
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <MobileBottomNav navGroups={navGroups} />
    </div>
  );
}
