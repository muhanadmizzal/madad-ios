import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Bell, Settings, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useRole } from "@/hooks/useRole";
import { useCompany } from "@/hooks/useCompany";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ThemeToggle } from "./ThemeToggle";
import { PortalSwitcher } from "./PortalSwitcher";
import { GlobalSearch } from "./GlobalSearch";
import { hasPermission } from "@/lib/roles";

const ROLE_LABELS: Record<string, string> = {
  super_admin: "مشرف عام",
  business_admin: "مدير الأعمال",
  finance_manager: "مدير مالي",
  support_agent: "وكيل دعم",
  sales_manager: "مدير مبيعات",
  technical_admin: "مدير تقني",
  tenant_admin: "مدير المنشأة",
  admin: "مدير",
  hr_manager: "مدير HR",
  hr_officer: "مسؤول HR",
  manager: "مدير قسم",
  employee: "موظف",
};

export function UnifiedTopBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { companyId, profile } = useCompany();
  const { highestRole, roles, canAccessTenantPortal } = useRole();
  const queryClient = useQueryClient();
  const initials =
    profile?.full_name?.slice(0, 2) ||
    user?.email?.slice(0, 2).toUpperCase() ||
    "م";
  const primaryRole = highestRole || "employee";

  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .or(`user_id.eq.${user!.id},user_id.is.null`)
        .eq("company_id", companyId!)
        .order("created_at", { ascending: false })
        .limit(20);
      return data || [];
    },
    enabled: !!user && !!companyId,
  });

  useEffect(() => {
    if (!user || !companyId) return;
    const channel = supabase
      .channel("notifications-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["notifications"] });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, companyId, queryClient]);

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", id);
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      const ids = notifications.filter((n: any) => !n.is_read).map((n: any) => n.id);
      if (ids.length === 0) return;
      await supabase.from("notifications").update({ is_read: true }).in("id", ids);
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const unreadCount = notifications.filter((n: any) => !n.is_read).length;
  const [notifOpen, setNotifOpen] = useState(false);
  const canOpenSettings = canAccessTenantPortal && hasPermission(roles, "can_manage_settings");

  return (
    <>
      {/* Role badge — hidden on small mobile */}
      <Badge
        variant="outline"
        className="text-[10px] sm:text-xs font-heading hidden sm:flex bg-primary/10 text-primary border-primary/20"
      >
        <Shield className="h-3 w-3 ml-1" />
        {ROLE_LABELS[primaryRole] || primaryRole}
      </Badge>

      {/* Global Search — hidden on mobile */}
      <div className="hidden md:block flex-1 max-w-md mx-4">
        <GlobalSearch />
      </div>

      {/* Spacer to push right items */}
      <div className="flex-1 md:hidden" />

      <div className="flex items-center gap-1 sm:gap-2">
        <PortalSwitcher />
        <ThemeToggle />
        {canOpenSettings && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-muted-foreground hover:text-foreground"
            onClick={() => navigate(location.pathname.startsWith("/business-portal") ? "/business-portal/settings" : "/madad/tamkeen/settings")}
          >
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline mr-1">الإعدادات</span>
          </Button>
        )}

        {/* Notifications */}
        <Popover open={notifOpen} onOpenChange={setNotifOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="relative text-muted-foreground hover:text-foreground h-8 w-8"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-destructive rounded-full text-[10px] text-destructive-foreground flex items-center justify-center font-bold">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-0">
            <div className="flex items-center justify-between px-4 py-3 relative">
              <div className="absolute bottom-0 left-3 right-3 h-px" style={{ background: "linear-gradient(90deg, transparent, hsl(var(--gold) / 0.25), hsl(var(--gold) / 0.4), hsl(var(--gold) / 0.25), transparent)" }} />
              <h3 className="font-heading font-bold text-sm">الإشعارات</h3>
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => markAllRead.mutate()}
                >
                  تعليم الكل كمقروء
                </Button>
              )}
            </div>
            <ScrollArea className="max-h-80">
              {notifications.length > 0 ? (
                <div className="divide-y">
                  {notifications.map((n: any) => (
                    <div
                      key={n.id}
                      className={`px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors ${
                        !n.is_read ? "bg-primary/5" : ""
                      }`}
                      onClick={() => {
                        if (!n.is_read) markRead.mutate(n.id);
                        if (n.link) {
                          setNotifOpen(false);
                          navigate(n.link);
                        }
                      }}
                    >
                      <div className="flex items-start gap-2">
                        {!n.is_read && (
                          <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {n.title}
                          </p>
                          {n.message && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                              {n.message}
                            </p>
                          )}
                          {n.link && (
                            <p className="text-[10px] text-primary mt-0.5">🔗 اضغط لفتح</p>
                          )}
                          <p className="text-[10px] text-muted-foreground mt-1">
                            {new Date(n.created_at).toLocaleDateString("ar-IQ")}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-muted-foreground text-sm">
                  لا توجد إشعارات
                </div>
              )}
            </ScrollArea>
            <div className="border-t px-4 py-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs font-heading text-primary"
                onClick={() => {
                  setNotifOpen(false);
                  const isEmployee = location.pathname.startsWith("/employee-portal");
                  navigate(isEmployee ? "/employee-portal/notifications" : "/madad/tamkeen/notifications");
                }}
              >
                عرض جميع الإشعارات
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        {/* User avatar */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <Avatar className="h-7 w-7 sm:h-8 sm:w-8 border border-primary/20">
            <AvatarFallback className="bg-primary text-primary-foreground text-[10px] sm:text-xs font-heading">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="hidden md:block text-xs text-muted-foreground font-heading max-w-24 truncate">
            {profile?.full_name || user?.email}
          </span>
        </div>
      </div>
    </>
  );
}
