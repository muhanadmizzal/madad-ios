import { useState } from "react";
import { Clock, LogIn, LogOut, Calendar, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmployeeSearch } from "@/components/ui/employee-search";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  companyId: string;
  employees: any[];
  todayRecords: any[];
  isHrManager: boolean;
}

export default function AttendanceToday({ companyId, employees, todayRecords, isHrManager }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [manualDialog, setManualDialog] = useState(false);
  const [manualEmployee, setManualEmployee] = useState("");
  const now = new Date();
  const today = now.toISOString().split("T")[0];

  const currentRecord = todayRecords.find((r: any) => r.employee_id === selectedEmployee);

  const checkIn = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("attendance_records").insert({
        company_id: companyId, employee_id: selectedEmployee, date: today, check_in: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance-today"] });
      toast({ title: "تم تسجيل الحضور ✅" });
    },
    onError: (err: Error) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  const checkOut = useMutation({
    mutationFn: async () => {
      if (!currentRecord) return;
      // Fetch company working hours for accurate overtime calc
      const { data: company } = await supabase.from("companies").select("working_hours_start, working_hours_end, overtime_multiplier").eq("id", companyId).single();
      const standardHours = (() => {
        if (!company?.working_hours_start || !company?.working_hours_end) return 8;
        const [sh, sm] = company.working_hours_start.split(":").map(Number);
        const [eh, em] = company.working_hours_end.split(":").map(Number);
        return (eh + em / 60) - (sh + sm / 60);
      })();
      const checkInTime = new Date(currentRecord.check_in);
      const checkOutTime = new Date();
      const hoursWorked = ((checkOutTime.getTime() - checkInTime.getTime()) / 3600000).toFixed(2);
      const overtime = Math.max(0, Number(hoursWorked) - standardHours);
      const { error } = await supabase.from("attendance_records").update({
        check_out: checkOutTime.toISOString(), hours_worked: Number(hoursWorked), overtime_hours: Number(overtime.toFixed(2)),
      }).eq("id", currentRecord.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance-today"] });
      toast({ title: "تم تسجيل الانصراف ✅" });
    },
    onError: (err: Error) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  // HR Manual entry
  const manualEntry = useMutation({
    mutationFn: async (formData: FormData) => {
      const empId = manualEmployee;
      const date = formData.get("manual_date") as string;
      const checkInStr = formData.get("manual_check_in") as string;
      const checkOutStr = formData.get("manual_check_out") as string;
      const notes = formData.get("manual_notes") as string;

      const checkInTime = checkInStr ? `${date}T${checkInStr}:00` : null;
      const checkOutTime = checkOutStr ? `${date}T${checkOutStr}:00` : null;

      let hoursWorked = null;
      let overtimeHours = 0;
      if (checkInTime && checkOutTime) {
        hoursWorked = Math.round(((new Date(checkOutTime).getTime() - new Date(checkInTime).getTime()) / 3600000) * 100) / 100;
        overtimeHours = Math.max(0, hoursWorked - 8);
      }

      const { error } = await supabase.from("attendance_records").insert({
        company_id: companyId,
        employee_id: empId,
        date,
        check_in: checkInTime,
        check_out: checkOutTime,
        hours_worked: hoursWorked,
        overtime_hours: overtimeHours,
        notes: notes || "إدخال يدوي من HR",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance-today"] });
      queryClient.invalidateQueries({ queryKey: ["attendance-history"] });
      toast({ title: "تم إضافة السجل يدوياً ✅" });
      setManualDialog(false);
    },
    onError: (err: Error) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  // Detect late (after 8:30 AM) and early leave (before 4:00 PM)
  const getAttendanceStatus = (record: any) => {
    const badges = [];
    if (record.check_in) {
      const checkInHour = new Date(record.check_in).getHours();
      const checkInMin = new Date(record.check_in).getMinutes();
      if (checkInHour > 8 || (checkInHour === 8 && checkInMin > 30)) {
        badges.push(<Badge key="late" variant="outline" className="bg-destructive/10 text-destructive text-[10px]">متأخر</Badge>);
      }
    }
    if (record.check_out) {
      const checkOutHour = new Date(record.check_out).getHours();
      if (checkOutHour < 16) {
        badges.push(<Badge key="early" variant="outline" className="bg-accent/10 text-accent-foreground text-[10px]">خروج مبكر</Badge>);
      }
    }
    if (record.overtime_hours > 0) {
      badges.push(<Badge key="ot" variant="outline" className="bg-primary/10 text-primary text-[10px]">إضافي</Badge>);
    }
    return badges;
  };

  return (
    <>
      <Card className="border-primary/20 mb-4">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-center sm:text-right">
              <p className="text-muted-foreground text-sm">التاريخ الحالي</p>
              <p className="font-heading font-bold text-xl mt-1">
                {now.toLocaleDateString("ar-IQ", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
              </p>
              <p className="text-3xl font-heading font-bold text-primary mt-2" dir="ltr">
                {now.toLocaleTimeString("ar-IQ", { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <div className="space-y-2">
                <Label>الموظف</Label>
                <EmployeeSearch
                  employees={employees}
                  value={selectedEmployee}
                  onChange={setSelectedEmployee}
                  className="w-56"
                />
              </div>
              <div className="flex gap-3">
                <Button onClick={() => checkIn.mutate()} disabled={!selectedEmployee || !!currentRecord} className="gap-2 font-heading">
                  <LogIn className="h-5 w-5" />تسجيل حضور
                </Button>
                <Button onClick={() => checkOut.mutate()} disabled={!selectedEmployee || !currentRecord || !!currentRecord?.check_out} variant="outline" className="gap-2 font-heading">
                  <LogOut className="h-5 w-5" />تسجيل انصراف
                </Button>
              </div>
              {isHrManager && (
                <Dialog open={manualDialog} onOpenChange={setManualDialog}>
                  <DialogTrigger asChild>
                    <Button variant="secondary" size="sm" className="gap-2 font-heading"><Plus className="h-4 w-4" />إدخال يدوي</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle className="font-heading">إدخال حضور يدوي</DialogTitle></DialogHeader>
                    <form onSubmit={(e) => { e.preventDefault(); manualEntry.mutate(new FormData(e.currentTarget)); }} className="space-y-4 pt-2">
                      <div className="space-y-2">
                        <Label>الموظف</Label>
                        <EmployeeSearch
                          employees={employees}
                          value={manualEmployee}
                          onChange={setManualEmployee}
                        />
                      </div>
                      <div className="space-y-2"><Label>التاريخ</Label><Input name="manual_date" type="date" defaultValue={today} required /></div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2"><Label>وقت الدخول</Label><Input name="manual_check_in" type="time" /></div>
                        <div className="space-y-2"><Label>وقت الخروج</Label><Input name="manual_check_out" type="time" /></div>
                      </div>
                      <div className="space-y-2"><Label>ملاحظات</Label><Textarea name="manual_notes" placeholder="سبب الإدخال اليدوي..." /></div>
                      <Button type="submit" className="w-full font-heading" disabled={manualEntry.isPending || !manualEmployee}>
                        {manualEntry.isPending ? "جاري الحفظ..." : "حفظ السجل"}
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-4">
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-2 rounded-lg bg-muted text-primary"><Clock className="h-5 w-5" /></div><div><p className="text-sm text-muted-foreground">حاضرون</p><p className="text-xl font-heading font-bold">{todayRecords.length}</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-2 rounded-lg bg-muted text-accent"><Calendar className="h-5 w-5" /></div><div><p className="text-sm text-muted-foreground">لم يسجلوا انصراف</p><p className="text-xl font-heading font-bold">{todayRecords.filter((r: any) => !r.check_out).length}</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-2 rounded-lg bg-destructive/10 text-destructive"><Clock className="h-5 w-5" /></div><div><p className="text-sm text-muted-foreground">متأخرون</p><p className="text-xl font-heading font-bold">{todayRecords.filter((r: any) => { if (!r.check_in) return false; const d = new Date(r.check_in); return d.getHours() > 8 || (d.getHours() === 8 && d.getMinutes() > 30); }).length}</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-2 rounded-lg bg-muted text-primary"><Clock className="h-5 w-5" /></div><div><p className="text-sm text-muted-foreground">ساعات إضافية</p><p className="text-xl font-heading font-bold">{todayRecords.reduce((s: number, r: any) => s + (r.overtime_hours || 0), 0).toFixed(1)}</p></div></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="font-heading text-lg">سجل حضور اليوم</CardTitle></CardHeader>
        <CardContent className="p-0">
          {todayRecords.length > 0 ? (
            <Table>
              <TableHeader><TableRow><TableHead>الموظف</TableHead><TableHead>وقت الدخول</TableHead><TableHead>وقت الخروج</TableHead><TableHead>ساعات العمل</TableHead><TableHead>الحالة</TableHead></TableRow></TableHeader>
              <TableBody>
                {todayRecords.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.employees?.name_ar}</TableCell>
                    <TableCell dir="ltr">{r.check_in ? new Date(r.check_in).toLocaleTimeString("ar-IQ") : "—"}</TableCell>
                    <TableCell dir="ltr">{r.check_out ? new Date(r.check_out).toLocaleTimeString("ar-IQ") : "—"}</TableCell>
                    <TableCell>{r.hours_worked ? `${r.hours_worked} ساعة` : "—"}</TableCell>
                    <TableCell><div className="flex gap-1 flex-wrap">{getAttendanceStatus(r)}</div></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-muted-foreground"><Clock className="h-12 w-12 mx-auto mb-3 opacity-20" /><p className="font-heading font-medium">لا توجد سجلات اليوم</p></div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
