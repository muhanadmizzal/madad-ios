import { useLocation, Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import type { NavGroup } from "./UnifiedSidebar";

interface MobileBottomNavProps {
  navGroups: NavGroup[];
}

/**
 * Mobile bottom navigation bar — shows top 5 most important nav items
 * for quick thumb-access on mobile devices.
 */
export function MobileBottomNav({ navGroups }: MobileBottomNavProps) {
  const location = useLocation();

  // Flatten and pick first 5 items across groups
  const allItems = navGroups.flatMap((g) => g.items);
  const visibleItems = allItems.slice(0, 5);

  const isActive = (path: string, exact?: boolean) =>
    exact ? location.pathname === path : location.pathname.startsWith(path);

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-md border-t border-border safe-area-bottom">
      {/* Gold line on top */}
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent 5%, hsl(var(--gold) / 0.3) 30%, hsl(var(--gold) / 0.5) 50%, hsl(var(--gold) / 0.3) 70%, transparent 95%)",
        }}
      />
      <div className="flex items-center justify-around px-1 py-1">
        {visibleItems.map((item) => {
          const active = isActive(item.path, item.exact);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg min-w-0 flex-1 transition-colors",
                active
                  ? "text-primary"
                  : "text-muted-foreground"
              )}
            >
              <item.icon
                className={cn(
                  "h-5 w-5 shrink-0",
                  active && "text-primary"
                )}
              />
              <span
                className={cn(
                  "text-[10px] leading-tight truncate max-w-full",
                  active ? "font-semibold" : "font-normal"
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
