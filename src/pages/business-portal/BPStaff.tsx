import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import {
  EmptyState, BPPageHeader, BPPageSkeleton, BPErrorState, BPFilterBar, BPSearchInput,
  KpiCard, BPDataTable, type BPColumn,
} from "@/components/business-portal/BPDesignSystem";
import { Users, Shield, DollarSign, HeadphonesIcon, TrendingUp, Wrench } from "lucide-react";

const roleConfig: Record<string, { label: string; labelAr: string; icon: any }> = {
  super_admin: { label: "Super Admin", labelAr: "مدير أعلى", icon: Shield },
  business_admin: { label: "Business Admin", labelAr: "مدير الأعمال", icon: TrendingUp },
  finance_manager: { label: "Finance Manager", labelAr: "مدير المالية", icon: DollarSign },
  support_agent: { label: "Support Agent", labelAr: "دعم العملاء", icon: HeadphonesIcon },
  sales_manager: { label: "Sales Manager", labelAr: "مدير المبيعات", icon: TrendingUp },
  technical_admin: { label: "Technical Admin", labelAr: "مدير تقني", icon: Wrench },
};

type StaffMember = { user_id: string; roles: string[]; full_name: string };

export default function BPStaff() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const { data: staff = [], isLoading, isError, refetch } = useQuery<StaffMember[]>({
    queryKey: ["platform-staff"],
    queryFn: async () => {
      const { data: roles, error } = await supabase.from("user_roles").select("user_id, role").eq("scope_type", "platform");
      if (error) throw error;
      const userIds = [...new Set((roles || []).map((r: any) => r.user_id))];
      if (userIds.length === 0) return [];
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", userIds);
      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p.full_name || "Unknown"]));
      const userMap = new Map<string, StaffMember>();
      (roles || []).forEach((row: any) => {
        const uid = row.user_id;
        const existing = userMap.get(uid);
        if (existing) { existing.roles.push(row.role); }
        else { userMap.set(uid, { user_id: uid, roles: [row.role], full_name: profileMap.get(uid) || "Unknown" }); }
      });
      return Array.from(userMap.values());
    },
  });

  if (isLoading) return <BPPageSkeleton />;
  if (isError) return <BPErrorState onRetry={() => refetch()} />;

  const filtered = staff.filter((s) => {
    const matchSearch = s.full_name.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === "all" || s.roles.includes(roleFilter);
    return matchSearch && matchRole;
  });
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  const topRoles = Object.entries(roleConfig).slice(0, 4).map(([key, cfg]) => ({
    ...cfg, key, count: staff.filter((s) => s.roles.includes(key)).length,
  }));

  const columns: BPColumn<StaffMember>[] = [
    { key: "name", header: "Staff Member", render: (m) => (
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">{m.full_name.charAt(0)}</div>
        <span className="font-medium text-sm text-foreground">{m.full_name}</span>
      </div>
    )},
    { key: "roles", header: "Roles", render: (m) => (
      <div className="flex flex-wrap gap-1">
        {m.roles.map((r) => { const cfg = roleConfig[r]; return cfg ? <Badge key={r} variant="secondary" className="text-[10px] h-5">{cfg.label}</Badge> : null; })}
      </div>
    )},
    { key: "id", header: "ID", className: "w-[100px]", render: (m) => <span className="text-xs text-muted-foreground font-mono">{m.user_id.slice(0, 8)}…</span> },
  ];

  return (
    <div className="space-y-6">
      <BPPageHeader title="Platform Staff" subtitle={`إدارة فريق المنصة — ${staff.length} عضو`} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {topRoles.map((r) => <KpiCard key={r.key} label={r.labelAr} value={r.count} icon={r.icon} />)}
      </div>

      <BPFilterBar>
        <BPSearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search staff..." />
        <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v); setPage(1); }}>
          <SelectTrigger className="w-44"><SelectValue placeholder="All Roles" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            {Object.entries(roleConfig).map(([key, cfg]) => <SelectItem key={key} value={key}>{cfg.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </BPFilterBar>

      <BPDataTable columns={columns} data={paged} emptyMessage="No platform staff found" emptyIcon={Users}
        page={page} pageSize={pageSize} totalCount={filtered.length} onPageChange={setPage} />
    </div>
  );
}
