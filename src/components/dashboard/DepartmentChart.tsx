import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { PieChart, Pie, Cell } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--gold))",
  "hsl(var(--secondary))",
  "hsl(var(--success))",
  "hsl(var(--info))",
  "hsl(var(--warning))",
];

export function DepartmentChart() {
  const { companyId } = useCompany();

  const { data, isLoading } = useQuery({
    queryKey: ["dept-chart", companyId],
    queryFn: async () => {
      const { data } = await supabase
        .from("employees")
        .select("department_id, departments(name)")
        .eq("company_id", companyId!)
        .eq("status", "active");

      const counts: Record<string, { name: string; value: number }> = {};
      data?.forEach((e: any) => {
        const name = e.departments?.name || "بدون قسم";
        if (!counts[name]) counts[name] = { name, value: 0 };
        counts[name].value++;
      });

      return Object.values(counts)
        .sort((a, b) => b.value - a.value)
        .slice(0, 6)
        .map((d, i) => ({ ...d, fill: COLORS[i % COLORS.length] }));
    },
    enabled: !!companyId,
  });

  if (isLoading) return <Skeleton className="h-[300px] w-full rounded-xl" />;

  const total = (data || []).reduce((s, d) => s + d.value, 0);

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-2">
        <CardTitle className="font-heading text-base">توزيع الأقسام</CardTitle>
      </CardHeader>
      <CardContent>
        {total > 0 ? (
          <>
            <ChartContainer config={{ value: { label: "موظف" } }} className="h-[200px] w-full mx-auto aspect-square">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={4} strokeWidth={2} stroke="hsl(var(--card))">
                  {data?.map((e, i) => <Cell key={i} fill={e.fill} />)}
                </Pie>
              </PieChart>
            </ChartContainer>
            <div className="flex flex-wrap justify-center gap-3 mt-3">
              {data?.map((d) => (
                <div key={d.name} className="flex items-center gap-1.5 text-xs">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.fill }} />
                  <span className="text-muted-foreground">{d.name} ({d.value})</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-14 text-muted-foreground text-sm">لا توجد بيانات</div>
        )}
      </CardContent>
    </Card>
  );
}
