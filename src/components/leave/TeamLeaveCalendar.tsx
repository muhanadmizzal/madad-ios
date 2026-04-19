import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronRight, ChevronLeft, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface TeamLeaveCalendarProps {
  companyId: string;
}

export default function TeamLeaveCalendar({ companyId }: TeamLeaveCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();

  const monthStart = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const monthEnd = `${year}-${String(month + 1).padStart(2, "0")}-${daysInMonth}`;

  const { data: approvedLeaves = [] } = useQuery({
    queryKey: ["team-leaves", companyId, monthStart, monthEnd],
    queryFn: async () => {
      const { data } = await supabase
        .from("leave_requests")
        .select("*, employees(name_ar), leave_types(name)")
        .eq("company_id", companyId)
        .eq("status", "approved")
        .lte("start_date", monthEnd)
        .gte("end_date", monthStart);
      return data || [];
    },
    enabled: !!companyId,
  });

  const getLeaveForDay = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return approvedLeaves.filter((l: any) => l.start_date <= dateStr && l.end_date >= dateStr);
  };

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const weekDays = ["أحد", "إثن", "ثلا", "أرب", "خمي", "جمع", "سبت"];
  const monthName = currentDate.toLocaleDateString("ar-IQ", { month: "long", year: "numeric" });

  const days: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="font-heading text-lg flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            تقويم إجازات الفريق
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button size="icon" variant="ghost" onClick={prevMonth}><ChevronRight className="h-4 w-4" /></Button>
            <span className="font-heading font-medium text-sm min-w-[120px] text-center">{monthName}</span>
            <Button size="icon" variant="ghost" onClick={nextMonth}><ChevronLeft className="h-4 w-4" /></Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-1">
          {weekDays.map(d => (
            <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">{d}</div>
          ))}
          {days.map((day, i) => {
            if (!day) return <div key={`empty-${i}`} />;
            const leaves = getLeaveForDay(day);
            const today = new Date();
            const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
            return (
              <div
                key={day}
                className={`min-h-[60px] p-1 rounded-lg border text-xs ${
                  isToday ? "border-primary bg-primary/5" : "border-border/50"
                } ${leaves.length > 0 ? "bg-destructive/5" : ""}`}
              >
                <span className={`font-medium ${isToday ? "text-primary" : "text-foreground"}`}>{day}</span>
                <div className="mt-0.5 space-y-0.5">
                  {leaves.slice(0, 2).map((l: any) => (
                    <div key={l.id} className="truncate text-[10px] text-destructive/80 bg-destructive/10 rounded px-1">
                      {l.employees?.name_ar?.split(" ")[0]}
                    </div>
                  ))}
                  {leaves.length > 2 && (
                    <span className="text-[10px] text-muted-foreground">+{leaves.length - 2}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        {approvedLeaves.length > 0 && (
          <div className="mt-4 space-y-2">
            <h4 className="font-heading font-medium text-sm">الإجازات هذا الشهر</h4>
            <div className="flex flex-wrap gap-2">
              {approvedLeaves.map((l: any) => (
                <Badge key={l.id} variant="outline" className="bg-destructive/5 text-destructive border-destructive/20 text-xs">
                  {l.employees?.name_ar} — {l.leave_types?.name} ({l.start_date} → {l.end_date})
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
