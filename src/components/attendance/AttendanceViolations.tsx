import { useState } from "react";
import { AlertTriangle, CheckCircle, Shield, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const violationLabels: Record<string, string> = {
  late: "تأخر",
  early_departure: "انصراف مبكر",
  absent: "غياب",
  overtime_unapproved: "عمل إضافي غير معتمد",
};

const statusLabels: Record<string, string> = {
  pending: "معلق",
  excused: "معذور",
  penalized: "مخالفة",
};

const statusColors: Record<string, string> = {
  pending: "bg-accent/10 text-accent-foreground",
  excused: "bg-primary/10 text-primary",
  penalized: "bg-destructive/10 text-destructive",
};

interface Props {
  companyId: string;
  employees: any[];
}

export default function AttendanceViolations({ companyId, employees }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const { data: violations = [] } = useQuery({
    queryKey: ["attendance-violations", companyId],
    queryFn: async () => {
      const { data } = await supabase
        .from("attendance_violations")
        .select("*, employees(name_ar)")
        .eq("company_id", companyId)
        .order("date", { ascending: false })
        .limit(200);
      return data || [];
    },
    enabled: !!companyId,
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("attendance_violations").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance-violations"] });
      toast({ title: "تم التحديث" });
    },
  });

  // Run violation detection client-side
  const detectViolations = useMutation({
    mutationFn: async () => {
      // Get company working hours
      const { data: company } = await supabase.from("companies").select("working_hours_start, working_hours_end, grace_minutes").eq("id", companyId).single();
      if (!company) throw new Error("لم يتم العثور على بيانات الشركة");

      const graceMinutes = (company as any).grace_minutes || 10;
      const workStart = (company as any).working_hours_start || "08:00";
      const workEnd = (company as any).working_hours_end || "16:00";

      // Get today's attendance
      const today = new Date().toISOString().split("T")[0];
      const { data: records } = await supabase
        .from("attendance_records")
        .select("*")
        .eq("company_id", companyId)
        .eq("date", today);

      const { data: activeEmployees } = await supabase
        .from("employees")
        .select("id, shift_id, name_ar")
        .eq("company_id", companyId)
        .eq("status", "active");

      const newViolations: any[] = [];
      const attendedIds = new Set((records || []).map((r: any) => r.employee_id));

      for (const emp of activeEmployees || []) {
        // Check for absence
        if (!attendedIds.has(emp.id)) {
          // Check if on approved leave
          const { data: leaves } = await supabase
            .from("leave_requests")
            .select("id")
            .eq("employee_id", emp.id)
            .eq("status", "approved")
            .lte("start_date", today)
            .gte("end_date", today)
            .limit(1);

          if (!leaves || leaves.length === 0) {
            newViolations.push({
              company_id: companyId,
              employee_id: emp.id,
              date: today,
              violation_type: "absent",
              minutes_diff: 0,
            });
          }
          continue;
        }

        const record = (records || []).find((r: any) => r.employee_id === emp.id);
        if (!record) continue;

        // Late check
        if (record.check_in) {
          const checkIn = new Date(record.check_in);
          const [startH, startM] = workStart.split(":").map(Number);
          const expectedStart = new Date(checkIn);
          expectedStart.setHours(startH, startM + graceMinutes, 0, 0);

          if (checkIn > expectedStart) {
            const diffMs = checkIn.getTime() - expectedStart.getTime();
            const diffMinutes = Math.round(diffMs / 60000);
            newViolations.push({
              company_id: companyId,
              employee_id: emp.id,
              date: today,
              violation_type: "late",
              minutes_diff: diffMinutes,
            });
          }
        }

        // Early departure check
        if (record.check_out) {
          const checkOut = new Date(record.check_out);
          const [endH, endM] = workEnd.split(":").map(Number);
          const expectedEnd = new Date(checkOut);
          expectedEnd.setHours(endH, endM, 0, 0);

          if (checkOut < expectedEnd) {
            const diffMs = expectedEnd.getTime() - checkOut.getTime();
            const diffMinutes = Math.round(diffMs / 60000);
            if (diffMinutes > graceMinutes) {
              newViolations.push({
                company_id: companyId,
                employee_id: emp.id,
                date: today,
                violation_type: "early_departure",
                minutes_diff: diffMinutes,
              });
            }
          }
        }
      }

      if (newViolations.length > 0) {
        const { error } = await supabase.from("attendance_violations").insert(newViolations);
        if (error) throw error;
      }

      return newViolations.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["attendance-violations"] });
      toast({ title: "تم الكشف", description: `تم رصد ${count} مخالفة جديدة` });
    },
    onError: (err: Error) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  const filtered = violations.filter((v: any) => {
    if (filterType !== "all" && v.violation_type !== filterType) return false;
    if (filterStatus !== "all" && v.status !== filterStatus) return false;
    return true;
  });

  const pendingCount = violations.filter((v: any) => v.status === "pending").length;
  const lateCount = violations.filter((v: any) => v.violation_type === "late").length;
  const absentCount = violations.filter((v: any) => v.violation_type === "absent").length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-muted text-accent"><AlertTriangle className="h-5 w-5" /></div>
          <div><p className="text-sm text-muted-foreground">إجمالي المخالفات</p><p className="text-xl font-heading font-bold">{violations.length}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-muted text-destructive"><Clock className="h-5 w-5" /></div>
          <div><p className="text-sm text-muted-foreground">تأخر</p><p className="text-xl font-heading font-bold">{lateCount}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-muted text-destructive"><Shield className="h-5 w-5" /></div>
          <div><p className="text-sm text-muted-foreground">غياب</p><p className="text-xl font-heading font-bold">{absentCount}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-muted text-accent"><AlertTriangle className="h-5 w-5" /></div>
          <div><p className="text-sm text-muted-foreground">معلقة</p><p className="text-xl font-heading font-bold">{pendingCount}</p></div>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="font-heading text-lg flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-accent" />
            مخالفات الحضور
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-36 h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الأنواع</SelectItem>
                <SelectItem value="late">تأخر</SelectItem>
                <SelectItem value="early_departure">انصراف مبكر</SelectItem>
                <SelectItem value="absent">غياب</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-28 h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الحالات</SelectItem>
                <SelectItem value="pending">معلق</SelectItem>
                <SelectItem value="excused">معذور</SelectItem>
                <SelectItem value="penalized">مخالفة</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" className="font-heading gap-2" onClick={() => detectViolations.mutate()} disabled={detectViolations.isPending}>
              <Shield className="h-4 w-4" />
              {detectViolations.isPending ? "جاري الكشف..." : "كشف المخالفات"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الموظف</TableHead>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>النوع</TableHead>
                  <TableHead>الدقائق</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>إجراء</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((v: any) => (
                  <TableRow key={v.id}>
                    <TableCell className="font-medium">{v.employees?.name_ar}</TableCell>
                    <TableCell dir="ltr">{v.date}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={v.violation_type === "absent" ? "bg-destructive/10 text-destructive" : "bg-accent/10 text-accent-foreground"}>
                        {violationLabels[v.violation_type] || v.violation_type}
                      </Badge>
                    </TableCell>
                    <TableCell>{v.minutes_diff > 0 ? `${v.minutes_diff} دقيقة` : "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusColors[v.status]}>
                        {statusLabels[v.status] || v.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {v.status === "pending" && (
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" className="h-7 text-xs text-primary" onClick={() => updateStatus.mutate({ id: v.id, status: "excused" })}>
                            <CheckCircle className="h-3.5 w-3.5 ml-1" />معذور
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive" onClick={() => updateStatus.mutate({ id: v.id, status: "penalized" })}>
                            <AlertTriangle className="h-3.5 w-3.5 ml-1" />مخالفة
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground text-sm">لا توجد مخالفات مسجلة</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
