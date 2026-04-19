import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import {
  bp, KpiCard, StatusBadge, BPPageHeader, BPSection, BPPageSkeleton, BPErrorState, BPLiveBadge, BPAlertStat,
} from "@/components/business-portal/BPDesignSystem";
import {
  Building2, Users, TrendingUp, DollarSign, Activity, AlertTriangle,
  Brain, CreditCard, Clock, Inbox,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";

export default function BPDashboard() {
  const { data: companies = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["bp-companies"],
    queryFn: async () => {
      const { data, error } = await supabase.from("companies").select("id, name, status, sector, created_at, employee_count_range").order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
  const { data: allEmployees = [] } = useQuery({
    queryKey: ["bp-employees-count"],
    queryFn: async () => {
      const { data } = await supabase.from("employees").select("id, company_id");
      return data || [];
    },
  });
  const { data: subscriptions = [] } = useQuery({
    queryKey: ["bp-subscriptions"],
    queryFn: async () => {
      const { data } = await supabase.from("tenant_subscriptions").select("*, subscription_plans(name, price_monthly)");
      return data || [];
    },
  });
  const { data: invoices = [] } = useQuery({
    queryKey: ["bp-invoices-summary"],
    queryFn: async () => {
      const { data } = await supabase.from("billing_invoices").select("status, amount").limit(500);
      return data || [];
    },
  });
  const { data: aiLogs = [] } = useQuery({
    queryKey: ["bp-ai-summary"],
    queryFn: async () => {
      const { data } = await supabase.from("ai_service_logs").select("company_id, tokens_used, cost").limit(500);
      return data || [];
    },
  });
  const { data: tickets = [] } = useQuery({
    queryKey: ["bp-tickets-summary"],
    queryFn: async () => {
      const { data } = await supabase.from("support_tickets").select("status").limit(200);
      return data || [];
    },
  });

  if (isLoading) return <BPPageSkeleton cards={6} />;
  if (isError) return <BPErrorState message="Failed to load dashboard data" onRetry={() => refetch()} />;

  const activeTenants = companies.filter((c: any) => c.status === "active").length;
  const trialTenants = companies.filter((c: any) => c.status === "trial").length;
  const suspendedTenants = companies.filter((c: any) => c.status === "suspended").length;
  const mrr = subscriptions.reduce((sum: number, s: any) => {
    if (s.status === "active" && s.subscription_plans) return sum + Number(s.subscription_plans.price_monthly || 0);
    return sum;
  }, 0);
  const overdueInvoices = invoices.filter((i: any) => i.status === "overdue").length;
  const totalAiRequests = aiLogs.length;
  const aiAdoptionRate = companies.length > 0 ? Math.round((new Set(aiLogs.map((l: any) => l.company_id)).size / companies.length) * 100) : 0;
  const openTickets = tickets.filter((t: any) => t.status === "open").length;
  const alertCount = suspendedTenants + overdueInvoices + openTickets;

  const growthData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i));
    const month = d.toLocaleDateString("en-US", { month: "short" });
    const count = companies.filter((c: any) => new Date(c.created_at) <= d).length;
    return { month, tenants: count };
  });

  const planMap: Record<string, number> = {};
  subscriptions.forEach((s: any) => {
    const name = s.subscription_plans?.name || "Free";
    planMap[name] = (planMap[name] || 0) + 1;
  });
  const unsubscribed = companies.length - subscriptions.length;
  if (unsubscribed > 0) planMap["Free"] = (planMap["Free"] || 0) + unsubscribed;
  const pieColors = [bp.colors.primary, bp.colors.success, bp.colors.warning, bp.colors.secondary, bp.colors.info];
  const planDistribution = Object.entries(planMap).map(([name, value], i) => ({ name, value, color: pieColors[i % pieColors.length] }));

  return (
    <div className="space-y-6">
      <BPPageHeader
        title="لوحة التحكم التنفيذية"
        subtitle={`لوحة القيادة — ${new Date().toLocaleDateString("ar-IQ", { month: "long", year: "numeric" })}`}
      >
        <BPLiveBadge />
      </BPPageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        <KpiCard label="إجمالي الشركات" value={companies.length} icon={Building2} />
        <KpiCard label="نشط" value={activeTenants} delta={`${trialTenants} تجريبي`} icon={Activity} trend="up" />
        <KpiCard label="MRR" value={`$${mrr.toLocaleString()}`} icon={TrendingUp} trend="up" />
        <KpiCard label="ARR" value={`$${(mrr * 12).toLocaleString()}`} icon={DollarSign} />
        <KpiCard label="AI Adoption" value={`${aiAdoptionRate}%`} delta={`${totalAiRequests} req`} icon={Brain} trend="up" />
        <KpiCard label="تنبيهات" value={alertCount} delta={overdueInvoices > 0 ? `${overdueInvoices} overdue` : "clear"} icon={AlertTriangle} trend={alertCount > 0 ? "down" : "neutral"} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <BPSection title="Tenant Growth" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={growthData}>
              <defs>
                <linearGradient id="bp-growth" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={bp.colors.primary} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={bp.colors.primary} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={bp.gridStroke} />
              <XAxis dataKey="month" fontSize={11} tick={{ fill: bp.tickFill }} axisLine={false} tickLine={false} />
              <YAxis fontSize={11} tick={{ fill: bp.tickFill }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={bp.tooltip} />
              <Area type="monotone" dataKey="tenants" stroke={bp.colors.primary} fill="url(#bp-growth)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </BPSection>

        <BPSection title="Plan Distribution">
          {planDistribution.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={planDistribution} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value" stroke="hsl(var(--card))" strokeWidth={3}>
                    {planDistribution.map((entry, idx) => <Cell key={idx} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={bp.tooltip} />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-2 mt-3">
                {planDistribution.map((p) => (
                  <div key={p.name} className="flex items-center gap-2 text-xs">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                    <span className="text-muted-foreground truncate">{p.name}</span>
                    <span className="text-foreground font-medium ml-auto">{p.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">No subscription data</p>
          )}
        </BPSection>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <BPSection title="Recent Tenants" actions={
          <Badge variant="secondary" className="text-[11px]">{companies.length} total</Badge>
        }>
          <div className="space-y-0">
            {companies.slice(0, 8).map((c: any) => {
              const empCount = allEmployees.filter((e: any) => e.company_id === c.id).length;
              return (
                <div key={c.id} className="flex items-center justify-between py-2.5 border-b border-border/50 last:border-0 hover:bg-muted/30 -mx-1 px-1 rounded-lg transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                      {c.name?.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{c.name}</p>
                      <p className="text-[11px] text-muted-foreground">{empCount} موظف • {c.sector || "—"}</p>
                    </div>
                  </div>
                  <StatusBadge status={c.status} />
                </div>
              );
            })}
            {companies.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No tenants yet</p>}
          </div>
        </BPSection>

        <BPSection title="Quick Stats">
          <div className="space-y-2">
            <BPAlertStat label="فواتير متأخرة" value={overdueInvoices} icon={AlertTriangle} alert={overdueInvoices > 0} />
            <BPAlertStat label="اشتراكات نشطة" value={subscriptions.filter((s: any) => s.status === "active").length} icon={CreditCard} />
            <BPAlertStat label="شركات تجريبية" value={trialTenants} icon={Clock} />
            <BPAlertStat label="موظفون عبر المنصة" value={allEmployees.length} icon={Users} />
            <BPAlertStat label="تذاكر دعم مفتوحة" value={openTickets} icon={Inbox} />
          </div>
        </BPSection>
      </div>
    </div>
  );
}
