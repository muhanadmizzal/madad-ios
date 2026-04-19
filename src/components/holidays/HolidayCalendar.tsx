import { useMemo, useState } from "react";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const MONTHS_AR = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
const DAYS_AR = ["أحد", "اثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"];

interface HolidayCalendarProps {
  holidays: any[];
}

export function HolidayCalendar({ holidays }: HolidayCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const prev = () => setCurrentDate(new Date(year, month - 1, 1));
  const next = () => setCurrentDate(new Date(year, month + 1, 1));

  const holidayMap = useMemo(() => {
    const map: Record<string, any[]> = {};
    holidays.forEach((h: any) => {
      const key = h.date;
      if (!map[key]) map[key] = [];
      map[key].push(h);
    });
    return map;
  }, [holidays]);

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const today = new Date().toISOString().split("T")[0];

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="font-heading text-lg">
            {MONTHS_AR[month]} {year}
          </CardTitle>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={prev}><ChevronRight className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={next}><ChevronLeft className="h-4 w-4" /></Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-px text-center mb-2">
          {DAYS_AR.map((d) => (
            <div key={d} className="text-xs font-heading font-medium text-muted-foreground py-1">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-px">
          {cells.map((day, i) => {
            if (day === null) return <div key={`empty-${i}`} />;
            const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const dayHolidays = holidayMap[dateStr];
            const isToday = dateStr === today;
            const isFriday = new Date(year, month, day).getDay() === 5;

            return (
              <div
                key={dateStr}
                className={`
                  relative p-1 min-h-[52px] rounded-md text-center transition-colors
                  ${isToday ? "ring-2 ring-primary bg-primary/5" : ""}
                  ${dayHolidays ? "bg-destructive/10" : ""}
                  ${isFriday ? "bg-muted/50" : ""}
                `}
              >
                <span className={`text-xs font-heading ${isToday ? "font-bold text-primary" : "text-foreground"}`}>
                  {day}
                </span>
                {dayHolidays && (
                  <div className="mt-0.5">
                    {dayHolidays.map((h: any) => (
                      <Badge
                        key={h.id}
                        variant="outline"
                        className="text-[9px] bg-destructive/10 text-destructive border-destructive/20 px-1 py-0 leading-tight block mt-0.5 truncate"
                      >
                        {h.name}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export const IRAQI_HOLIDAYS_2026 = [
  { name: "رأس السنة الميلادية", date: "2026-01-01" },
  { name: "عيد الجيش العراقي", date: "2026-01-06" },
  { name: "المولد النبوي الشريف", date: "2026-01-16" },
  { name: "ذكرى تحرير الموصل", date: "2026-03-10" },
  { name: "عيد نوروز", date: "2026-03-21" },
  { name: "عيد الفطر المبارك", date: "2026-03-20" },
  { name: "عيد الفطر المبارك", date: "2026-03-21" },
  { name: "عيد الفطر المبارك", date: "2026-03-22" },
  { name: "يوم العمال العالمي", date: "2026-05-01" },
  { name: "عيد الأضحى المبارك", date: "2026-05-27" },
  { name: "عيد الأضحى المبارك", date: "2026-05-28" },
  { name: "عيد الأضحى المبارك", date: "2026-05-29" },
  { name: "عيد الأضحى المبارك", date: "2026-05-30" },
  { name: "رأس السنة الهجرية", date: "2026-06-17" },
  { name: "عاشوراء", date: "2026-06-26" },
  { name: "ذكرى ثورة 14 تموز", date: "2026-07-14" },
  { name: "يوم النصر الكبير", date: "2026-12-10" },
  { name: "عيد الميلاد المجيد", date: "2026-12-25" },
];
