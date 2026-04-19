import { Bot } from "lucide-react";
import { useResolvedAccess } from "@/hooks/useResolvedAccess";
import type { NavGroup } from "./UnifiedSidebar";
import { employeePortalNav } from "./portalNavConfig";

/**
 * Returns employee portal nav groups filtered by unified access
 * (subscription + position service_permissions).
 */
export function useEmployeePortalNav(): NavGroup[] {
  const { canAccess, isLoading } = useResolvedAccess();

  // Start with base nav, filter by unified access
  const baseGroups: NavGroup[] = employeePortalNav.map((g) => ({
    label: g.label,
    items: g.items.filter((item) => {
      if (!item.featureKey) return true;
      if (isLoading) return false;
      return canAccess(item.featureKey);
    }),
  }));

  // Conditionally add AI Coach
  const aiCoachEnabled = !isLoading && canAccess("ai_employee_career_coach");

  if (aiCoachEnabled) {
    return baseGroups.map((group, i) => {
      if (i === 0) {
        const hasAi = group.items.some((item) => item.path === "/employee-portal/ai-coach");
        if (hasAi) return group;
        return {
          ...group,
          items: [
            ...group.items,
            { path: "/employee-portal/ai-coach", label: "المدرب الذكي", icon: Bot },
          ],
        };
      }
      return group;
    });
  }

  return baseGroups;
}
