import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Calculator } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import {
  calculateSalary,
  projectSalary,
  DEFAULT_FORMULA,
  type FormulaComponent,
} from "@/hooks/useSalaryEquation";

interface Props {
  formula: FormulaComponent[];
  basicSalary: number;
  serviceYears: number;
  projectionYears: number;
  gradeIncrement?: number | null;
  gradeIncrementPct?: number | null;
  gradeName?: string;
  yearsToNextGrade?: number | null;
  compact?: boolean;
}

export default function SalaryProjectionView({
  formula,
  basicSalary,
  serviceYears,
  projectionYears,
  gradeIncrement,
  gradeIncrementPct,
  gradeName,
  yearsToNextGrade,
  compact = false,
}: Props) {
  const activeFormula = formula.length > 0 ? formula : DEFAULT_FORMULA;

  const current = useMemo(
    () => calculateSalary(activeFormula, basicSalary, serviceYears, gradeIncrement, gradeIncrementPct),
    [activeFormula, basicSalary, serviceYears, gradeIncrement, gradeIncrementPct]
  );

  const projections = useMemo(
    () =>
      projectSalary(
        activeFormula,
        basicSalary,
        serviceYears,
        projectionYears,
        gradeIncrement,
        gradeIncrementPct,
        gradeName,
        yearsToNextGrade
      ),
    [activeFormula, basicSalary, serviceYears, projectionYears, gradeIncrement, gradeIncrementPct, gradeName, yearsToNextGrade]
  );

  if (!basicSalary) return null;

  return (
    <div className="space-y-3">
      {/* Current breakdown */}
      <Card className="border-primary/20">
        <CardContent className={compact ? "p-2.5" : "p-3"}>
          <div className="flex items-center gap-1.5 mb-2">
            <Calculator className="h-3.5 w-3.5 text-primary" />
            <span className={`font-heading font-bold ${compact ? "text-[10px]" : "text-xs"} text-foreground`}>
              تفصيل الراتب الحالي
            </span>
          </div>
          <div className="space-y-1">
            {current.breakdown.map((item, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{item.label}</span>
                <span className={`font-mono ${item.type === "deduction" ? "text-destructive" : "text-foreground"}`}>
                  {item.type === "deduction" ? "-" : "+"}{item.amount.toLocaleString("ar-IQ")}
                </span>
              </div>
            ))}
            <div className="border-t border-border pt-1 mt-1 flex items-center justify-between font-bold text-sm">
              <span>الصافي</span>
              <span className="text-primary font-mono">{current.total.toLocaleString("ar-IQ")} د.ع</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Projection Chart */}
      {projections.length > 1 && (
        <Card>
          <CardContent className={compact ? "p-2.5" : "p-3"}>
            <div className="flex items-center gap-1.5 mb-2">
              <TrendingUp className="h-3.5 w-3.5 text-primary" />
              <span className={`font-heading font-bold ${compact ? "text-[10px]" : "text-xs"} text-foreground`}>
                الإسقاط المالي ({projectionYears} سنوات)
              </span>
            </div>
            <div className={compact ? "h-32" : "h-44"}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={projections}>
                  <defs>
                    <linearGradient id="salaryGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                  <XAxis dataKey="year" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 9 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} width={40} />
                  <Tooltip
                    formatter={(value: number) => [`${value.toLocaleString("ar-IQ")} د.ع`, "الراتب الصافي"]}
                    labelFormatter={(label) => `سنة ${label}`}
                    contentStyle={{ fontSize: 11, direction: "rtl" }}
                  />
                  <Area type="monotone" dataKey="total" stroke="hsl(var(--primary))" fill="url(#salaryGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Projection table */}
            <div className="mt-2 max-h-32 overflow-y-auto">
              <table className="w-full text-[10px]">
                <thead>
                  <tr className="text-muted-foreground border-b">
                    <th className="text-right pb-1">السنة</th>
                    <th className="text-right pb-1">الخدمة</th>
                    <th className="text-right pb-1">الأساسي</th>
                    <th className="text-right pb-1">الصافي</th>
                    <th className="text-right pb-1">الدرجة</th>
                  </tr>
                </thead>
                <tbody>
                  {projections.map((p) => (
                    <tr key={p.year} className="border-b border-border/30">
                      <td className="py-0.5 font-mono">{p.year}</td>
                      <td>{p.serviceYears} سنة</td>
                      <td className="font-mono">{p.basicSalary.toLocaleString("ar-IQ")}</td>
                      <td className="font-mono font-bold text-primary">{p.total.toLocaleString("ar-IQ")}</td>
                      <td>{p.grade}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
