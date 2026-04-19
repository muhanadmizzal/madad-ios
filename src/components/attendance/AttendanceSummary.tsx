import { Clock, Users, AlertTriangle, TrendingUp, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  companyId: string;
  employees: any[];
}

export default function AttendanceSummary({ companyId, employees }: Props) {
  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
  const today = now.toISOString().split("T")[0];

  const { data: monthRecords = [] } = useQuery({
    queryKey: ["attendance-month-summary", companyId, firstOfMonth],
    queryFn: async () => {
      const { data } = await supabase
        .from("attendance_records")
        .select("employee_id, date, check_in, check_out, hours_worked, overtime_hours")
        .eq("company_id", companyId)
        .gte("date", firstOfMonth)
        .lte("date", today);
      return data || [];
    },
    enabled: !!companyId,
  });

  // Compute per-employee stats
  const workingDays = (() => {
    let count = 0;
    const d = new Date(firstOfMonth);
    const endDate = new Date(today);
    while (d <= endDate) {
      const day = d.getDay();
      if (day !== 5 && day !== 6) count++; // Fri/Sat off
      d.setDate(d.getDate() + 1);
    }
    return count;
  })();

  const empStats = employees.map((emp: any) => {
    const records = monthRecords.filter((r: any) => r.employee_id === emp.id);
    const presentDays = records.length;
    const absentDays = Math.max(0, workingDays - presentDays);
    const totalHours = records.reduce((s: number, r: any) => s + (r.hours_worked || 0), 0);
    const totalOvertime = records.reduce((s: number, r: any) => s + (r.overtime_hours || 0), 0);
    const lateDays = records.filter((r: any) => {
      if (!r.check_in) return false;
      const d = new Date(r.check_in);
      return d.getHours() > 8 || (d.getHours() === 8 && d.getMinutes() > 30);
    }).length;
    const earlyLeaveDays = records.filter((r: any) => {
      if (!r.check_out) return false;
      return new Date(r.check_out).getHours() < 16;
    }).length;
    const attendanceRate = workingDays > 0 ? Math.round((presentDays / workingDays) * 100) : 0;
    return { ...emp, presentDays, absentDays, totalHours: Math.round(totalHours * 10) / 10, totalOvertime: Math.round(totalOvertime * 10) / 10, lateDays, earlyLeaveDays, attendanceRate };
  });

  const totalPresent = empStats.reduce((s, e) => s + e.presentDays, 0);
  const totalAbsent = empStats.reduce((s, e) => s + e.absentDays, 0);
  const totalLate = empStats.reduce((s, e) => s + e.lateDays, 0);
  const totalOT = empStats.reduce((s, e) => s + e.totalOvertime, 0);
  const avgRate = empStats.length > 0 ? Math.round(empStats.reduce((s, e) => s + e.attendanceRate, 0) / empStats.length) : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <Card><CardContent className="p-4 text-center"><Users className="h-5 w-5 mx-auto text-primary mb-1" /><p className="text-xs text-muted-foreground">أيام حضور</p><p className="text-2xl font-heading font-bold">{totalPresent}</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><AlertTriangle className="h-5 w-5 mx-auto text-destructive mb-1" /><p className="text-xs text-muted-foreground">أيام غياب</p><p className="text-2xl font-heading font-bold">{totalAbsent}</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><Clock className="h-5 w-5 mx-auto text-accent-foreground mb-1" /><p className="text-xs text-muted-foreground">تأخيرات</p><p className="text-2xl font-heading font-bold">{totalLate}</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><TrendingUp className="h-5 w-5 mx-auto text-primary mb-1" /><p className="text-xs text-muted-foreground">ساعات إضافية</p><p className="text-2xl font-heading font-bold">{Math.round(totalOT * 10) / 10}</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><Calendar className="h-5 w-5 mx-auto text-primary mb-1" /><p className="text-xs text-muted-foreground">معدل الحضور</p><p className="text-2xl font-heading font-bold">{avgRate}%</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="font-heading text-lg">ملخص حضور الشهر الحالي ({workingDays} يوم عمل)</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الموظف</TableHead>
                <TableHead>أيام حضور</TableHead>
                <TableHead>غياب</TableHead>
                <TableHead>تأخير</TableHead>
                <TableHead>خروج مبكر</TableHead>
                <TableHead>ساعات إضافية</TableHead>
                <TableHead>معدل الحضور</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {empStats.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-medium">{e.name_ar}</TableCell>
                  <TableCell>{e.presentDays}</TableCell>
                  <TableCell>{e.absentDays > 0 ? <Badge variant="outline" className="bg-destructive/10 text-destructive">{e.absentDays}</Badge> : "0"}</TableCell>
                  <TableCell>{e.lateDays > 0 ? <Badge variant="outline" className="bg-accent/10 text-accent-foreground">{e.lateDays}</Badge> : "0"}</TableCell>
                  <TableCell>{e.earlyLeaveDays > 0 ? <Badge variant="outline" className="bg-accent/10 text-accent-foreground">{e.earlyLeaveDays}</Badge> : "0"}</TableCell>
                  <TableCell>{e.totalOvertime}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={e.attendanceRate} className="h-2 w-16" />
                      <span className="text-sm font-heading">{e.attendanceRate}%</span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
