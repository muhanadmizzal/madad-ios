import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Check, CheckCheck, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { useAuth } from "@/contexts/AuthContext";

const typeLabels: Record<string, string> = {
  info: "معلومات",
  warning: "تنبيه",
  success: "نجاح",
  approval: "موافقة",
};
const typeColors: Record<string, string> = {
  info: "bg-primary/10 text-primary",
  warning: "bg-accent/10 text-accent-foreground",
  success: "bg-primary/10 text-primary",
  approval: "bg-accent/10 text-accent-foreground",
};

export default function Notifications() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { companyId } = useCompany();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .or(`user_id.eq.${user!.id},user_id.is.null`)
        .eq("company_id", companyId!)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user && !!companyId,
  });

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      const ids = notifications.filter((n: any) => !n.is_read).map((n: any) => n.id);
      if (ids.length === 0) return;
      await supabase.from("notifications").update({ is_read: true }).in("id", ids);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast({ title: "تم التعليم", description: "تم تعليم جميع الإشعارات كمقروءة" });
    },
  });

  const unread = notifications.filter((n: any) => !n.is_read);
  const read = notifications.filter((n: any) => n.is_read);

  const handleNotificationClick = (n: any) => {
    if (!n.is_read) markRead.mutate(n.id);
    if (n.link) navigate(n.link);
  };

  const renderNotification = (n: any) => (
    <Card
      key={n.id}
      className={`transition-colors cursor-pointer hover:bg-muted/50 ${!n.is_read ? "border-primary/30 bg-primary/5" : ""}`}
      onClick={() => handleNotificationClick(n)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {!n.is_read && <div className="w-2 h-2 rounded-full bg-primary shrink-0" />}
              <p className="font-heading font-bold text-sm truncate">{n.title}</p>
              {n.type && (
                <Badge variant="outline" className={`text-[10px] shrink-0 ${typeColors[n.type] || ""}`}>
                  {typeLabels[n.type] || n.type}
                </Badge>
              )}
            </div>
            {n.message && <p className="text-sm text-muted-foreground line-clamp-2">{n.message}</p>}
            {n.link && <p className="text-xs text-primary mt-1">🔗 اضغط لفتح</p>}
            <p className="text-xs text-muted-foreground mt-2">
              {new Date(n.created_at).toLocaleDateString("ar-IQ", { weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
          {!n.is_read && (
            <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={(e) => { e.stopPropagation(); markRead.mutate(n.id); }}>
              <Check className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading font-bold text-2xl text-foreground">الإشعارات</h1>
          <p className="text-muted-foreground text-sm mt-1">{unread.length} إشعار غير مقروء</p>
        </div>
        {unread.length > 0 && (
          <Button variant="outline" className="gap-2 font-heading" onClick={() => markAllRead.mutate()}>
            <CheckCheck className="h-4 w-4" />تعليم الكل كمقروء
          </Button>
        )}
      </div>

      <Tabs defaultValue="unread" dir="rtl">
        <TabsList>
          <TabsTrigger value="unread" className="font-heading">غير مقروء ({unread.length})</TabsTrigger>
          <TabsTrigger value="all" className="font-heading">الكل ({notifications.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="unread" className="space-y-3 mt-4">
          {unread.length > 0 ? unread.map(renderNotification) : (
            <div className="text-center py-16 text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-heading font-medium">لا توجد إشعارات جديدة</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="all" className="space-y-3 mt-4">
          {notifications.length > 0 ? notifications.map(renderNotification) : (
            <div className="text-center py-16 text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-heading font-medium">لا توجد إشعارات</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
