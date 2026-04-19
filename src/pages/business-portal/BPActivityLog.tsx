import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import {
  EmptyState, BPPageHeader, BPPageSkeleton, BPErrorState, BPFilterBar, BPSearchInput,
} from "@/components/business-portal/BPDesignSystem";
import {
  Building2, CreditCard, Users, Settings, ToggleRight, FileText, Brain, Shield, Edit,
} from "lucide-react";
import { cn } from "@/lib/utils";

const categoryConfig: Record<string, { label: string; icon: any }> = {
  tenant: { label: "Tenants", icon: Building2 },
  package: { label: "Packages", icon: CreditCard },
  billing: { label: "Billing", icon: CreditCard },
  staff: { label: "Staff", icon: Users },
  feature: { label: "Features", icon: ToggleRight },
  ai_package: { label: "AI Packages", icon: Brain },
  settings: { label: "Settings", icon: Settings },
  company: { label: "Company", icon: Building2 },
  platform_settings: { label: "Settings", icon: Settings },
  platform_features: { label: "Features", icon: ToggleRight },
  subscription_plan: { label: "Plans", icon: CreditCard },
  plan_features: { label: "Plan Features", icon: Shield },
};

const actionIcons: Record<string, any> = {
  tenant_created: Building2, tenant_suspended: Shield, tenant_reactivated: Building2,
  package_updated: Edit, package_activated: ToggleRight, package_deactivated: ToggleRight,
  enable_feature: ToggleRight, disable_feature: ToggleRight, update_platform_settings: Settings,
  plan_price_updated: CreditCard, plan_feature_toggled: Shield,
};

export default function BPActivityLog() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [visibleCount, setVisibleCount] = useState(100);

  const { data: auditLogs = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["bp-audit-logs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("business_audit_logs").select("*").order("created_at", { ascending: false }).limit(500);
      if (error) throw error;
      return data || [];
    },
  });

  if (isLoading) return <BPPageSkeleton cards={0} />;
  if (isError) return <BPErrorState onRetry={() => refetch()} />;

  const filtered = auditLogs.filter((a: any) => {
    const matchSearch = a.action?.includes(search) || a.target_type?.includes(search) || JSON.stringify(a.after_state || {}).includes(search);
    const matchCategory = categoryFilter === "all" || a.target_type === categoryFilter;
    return matchSearch && matchCategory;
  });

  const visible = filtered.slice(0, visibleCount);

  const grouped = visible.reduce((acc: Record<string, any[]>, event: any) => {
    const date = new Date(event.created_at).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
    if (!acc[date]) acc[date] = [];
    acc[date].push(event);
    return acc;
  }, {});

  const typeCounts: Record<string, number> = {};
  auditLogs.forEach((l: any) => { typeCounts[l.target_type] = (typeCounts[l.target_type] || 0) + 1; });
  const categories = Object.entries(categoryConfig).filter(([key]) => typeCounts[key]);

  return (
    <div className="space-y-6">
      <BPPageHeader title="Activity Log" subtitle="سجل النشاط — جميع الإجراءات">
        <Badge variant="secondary">{auditLogs.length} events</Badge>
      </BPPageHeader>

      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setCategoryFilter("all")} className={cn(
            "px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
            categoryFilter === "all" ? "border-primary/30 bg-primary/5 text-primary" : "border-border bg-card text-muted-foreground hover:text-foreground"
          )}>All ({auditLogs.length})</button>
          {categories.map(([key, cfg]) => (
            <button key={key} onClick={() => setCategoryFilter(categoryFilter === key ? "all" : key)} className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1.5",
              categoryFilter === key ? "border-primary/30 bg-primary/5 text-primary" : "border-border bg-card text-muted-foreground hover:text-foreground"
            )}>
              <cfg.icon className="h-3 w-3" />{cfg.label} ({typeCounts[key]})
            </button>
          ))}
        </div>
      )}

      <BPFilterBar>
        <BPSearchInput value={search} onChange={setSearch} placeholder="Search activity..." />
      </BPFilterBar>

      <div className="space-y-8">
        {Object.entries(grouped).map(([date, events]) => (
          <div key={date}>
            <div className="flex items-center gap-3 mb-3">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{date}</h3>
              <div className="flex-1 h-px bg-border" />
              <span className="text-[11px] text-muted-foreground">{events.length} events</span>
            </div>
            <div className="space-y-1.5">
              {events.map((event: any) => {
                const cat = categoryConfig[event.target_type] || { label: event.target_type, icon: FileText };
                const Icon = actionIcons[event.action] || cat.icon;
                return (
                  <Card key={event.id} className="shadow-none hover:shadow-sm transition-shadow">
                    <CardContent className="p-3 flex items-center gap-4">
                      <div className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center bg-primary/10">
                        <Icon className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground capitalize">{event.action.replace(/_/g, " ")}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {event.target_type} {event.target_id ? `• ${event.target_id.slice(0, 8)}…` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <Badge variant="secondary" className="text-[10px] h-5">{cat.label}</Badge>
                        <span className="text-[11px] text-muted-foreground tabular-nums">
                          {new Date(event.created_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {filtered.length > visibleCount && (
        <div className="flex justify-center">
          <button onClick={() => setVisibleCount((c) => c + 100)} className="text-xs text-primary hover:underline">
            Load more ({filtered.length - visibleCount} remaining)
          </button>
        </div>
      )}

      {filtered.length === 0 && <EmptyState message="No activity logged yet. Actions will appear here automatically." />}
    </div>
  );
}
