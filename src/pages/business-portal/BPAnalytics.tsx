import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  bp, KpiCard, EmptyState, BPPageHeader, BPSection, BPPageSkeleton, BPErrorState,
} from "@/components/business-portal/BPDesignSystem";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { Brain, Cpu, Coins, TrendingUp } from "lucide-react";

export default function BPAnalytics() {
  const { data: companies = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["bp-companies"],
    queryFn: async () => {
      const { data, error } = await supabase.from("companies").select("id, name, sector, status, created_at");
      if (error) throw error;
      return data || [];
    },
  });
  const { data: aiLogs = [] } = useQuery({
    queryKey: ["bp-ai-logs"],
    queryFn: async () => { const { data } = await supabase.from("ai_service_logs").select("*").order("created_at", { ascending: false }).limit(1000); return data || []; },
  });
  const { data: subscriptions = [] } = useQuery({
    queryKey: ["bp-subscriptions"],
    queryFn: async () => { const { data } = await supabase.from("tenant_subscriptions").select("status, plan_id, subscription_plans(name)"); return data || []; },
  });

  if (isLoading) return <BPPageSkeleton />;
  if (isError) return <BPErrorState onRetry={() => refetch()} />;

  const totalTokens = aiLogs.reduce((s: number, l: any) => s + (l.tokens_used || 0), 0);
  const totalCost = aiLogs.reduce((s: number, l: any) => s + Number(l.cost || 0), 0);
  const aiAdoption = new Set(aiLogs.map((l: any) => l.company_id)).size;

  const featureUsage: Record<string, number> = {};
  aiLogs.forEach((l: any) => { featureUsage[l.feature] = (featureUsage[l.feature] || 0) + 1; });
  const featureData = Object.entries(featureUsage).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, usage]) => ({ name: name.replace("wi_", "").replace("workforce_intelligence_", ""), usage }));

  const sectorMap: Record<string, number> = {};
  companies.forEach((c: any) => { sectorMap[c.sector || "other"] = (sectorMap[c.sector || "other"] || 0) + 1; });
  const pieColors = [bp.colors.primary, bp.colors.success, bp.colors.warning, bp.colors.secondary, bp.colors.danger, bp.colors.info];
  const sectorData = Object.entries(sectorMap).map(([name, value], i) => ({ name, value, color: pieColors[i % pieColors.length] }));

  const growthData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(); d.setMonth(d.getMonth() - (5 - i));
    const month = d.toLocaleDateString("en-US", { month: "short" });
    const total = companies.filter((c: any) => new Date(c.created_at) <= d).length;
    return { month, total };
  });

  return (
    <div className="space-y-6">
      <BPPageHeader title="تحليلات المنصة" subtitle="تحليلات مجمعة ومجهّلة" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="AI Requests" value={aiLogs.length.toLocaleString()} icon={Brain} />
        <KpiCard label="Tokens Used" value={totalTokens.toLocaleString()} icon={Cpu} />
        <KpiCard label="AI Cost" value={`$${totalCost.toFixed(2)}`} icon={Coins} />
        <KpiCard label="AI Adoption" value={`${aiAdoption} tenants`} icon={TrendingUp} trend="up" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <BPSection title="AI Feature Usage">
          {featureData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={featureData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke={bp.gridStroke} />
                <XAxis type="number" fontSize={11} tick={{ fill: bp.tickFill }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" fontSize={10} tick={{ fill: bp.tickFill }} axisLine={false} tickLine={false} width={120} />
                <Tooltip contentStyle={bp.tooltip} />
                <Bar dataKey="usage" fill={bp.colors.primary} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyState message="No AI usage data" />}
        </BPSection>

        <BPSection title="Tenant Growth">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={growthData}>
              <CartesianGrid strokeDasharray="3 3" stroke={bp.gridStroke} />
              <XAxis dataKey="month" fontSize={11} tick={{ fill: bp.tickFill }} axisLine={false} tickLine={false} />
              <YAxis fontSize={11} tick={{ fill: bp.tickFill }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={bp.tooltip} />
              <Line type="monotone" dataKey="total" stroke={bp.colors.success} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </BPSection>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <BPSection title="Sector Distribution">
          {sectorData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={sectorData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" stroke="hsl(var(--card))" strokeWidth={3}>
                    {sectorData.map((_, idx) => <Cell key={idx} fill={sectorData[idx].color} />)}
                  </Pie>
                  <Tooltip contentStyle={bp.tooltip} />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-2 mt-3">
                {sectorData.map((s) => (
                  <div key={s.name} className="flex items-center gap-2 text-xs">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                    <span className="text-muted-foreground capitalize">{s.name}</span>
                    <span className="text-foreground font-medium ml-auto">{s.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : <EmptyState />}
        </BPSection>

        <BPSection title="Subscription Distribution">
          <div className="space-y-3 mt-1">
            {(() => {
              const planMap: Record<string, number> = {};
              subscriptions.forEach((s: any) => { planMap[s.subscription_plans?.name || "Unknown"] = (planMap[s.subscription_plans?.name || "Unknown"] || 0) + 1; });
              return Object.entries(planMap).map(([name, count], i) => (
                <div key={name} className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: pieColors[i % pieColors.length] }} />
                  <span className="text-sm text-muted-foreground flex-1">{name}</span>
                  <span className="text-sm font-bold text-foreground tabular-nums">{count}</span>
                  <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(count / Math.max(subscriptions.length, 1)) * 100}%` }} />
                  </div>
                </div>
              ));
            })()}
            {subscriptions.length === 0 && <EmptyState message="No subscriptions" />}
          </div>
        </BPSection>
      </div>
    </div>
  );
}
