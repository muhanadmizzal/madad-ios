import { useState } from "react";
import { Clock, Download, AlertTriangle, CheckCircle, XCircle, Calendar, BarChart3 } from "lucide-react";
import { AiModuleInsights } from "@/components/ai/AiModuleInsights";
import { FeatureGate } from "@/components/subscription/FeatureGate";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmployeeSearch } from "@/components/ui/employee-search";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { useRole } from "@/hooks/useRole";
import { useCreateWorkflowInstance } from "@/hooks/useApprovalWorkflow";
import * as XLSX from "xlsx";
import AttendanceToday from "@/components/attendance/AttendanceToday";
import AttendanceSummary from "@/components/attendance/AttendanceSummary";
import AttendanceViolations from "@/components/attendance/AttendanceViolations";

const corrStatusLabels: Record<string, string> = { pending: "معلقة", approved: "موافق عليها", rejected: "مرفوضة" };
const corrStatusColors: Record<string, string> = {
  pending: "bg-accent/10 text-accent-foreground border-accent/20",
  approved: "bg-primary/10 text-primary border-primary/20",
  rejected: "bg-destructive/10 text-destructive border-destructive/20",
};

export default function Attendance() {
  const { toast } = useToast();
  const { companyId } = useCompany();
  const { isHrManager } = useRole();
  const queryClient = useQueryClient();
  const [corrDialog, setCorrDialog] = useState(false);
  const [corrEmployee, setCorrEmployee] = useState("");
  const now = new Date();
  const today = now.toISOString().split("T")[0];
  const [startDate, setStartDate] = useState(() => {
    const d = new Date(); d.setDate(1); return d.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(today);
  const [historyEmployee, setHistoryEmployee] = useState("all");

  const { data: employees = [] } = useQuery({
    queryKey: ["employees", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("employees").select("id, name_ar, employee_code").eq("company_id", companyId!).eq("status", "active");
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: todayRecords = [] } = useQuery({
    queryKey: ["attendance-today", companyId, today],
    queryFn: async () => {
      const { data } = await supabase
        .from("attendance_records")
        .select("*, employees(name_ar)")
        .eq("company_id", companyId!)
        .eq("date", today)
        .order("check_in", { ascending: false });
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: historyRecords = [] } = useQuery({
    queryKey: ["attendance-history", companyId, startDate, endDate, historyEmployee],
    queryFn: async () => {
      let query = supabase
        .from("attendance_records")
        .select("*, employees(name_ar)")
        .eq("company_id", companyId!)
        .gte("date", startDate)
        .lte("date", endDate)
        .order("date", { ascending: false });
      if (historyEmployee !== "all") query = query.eq("employee_id", historyEmployee);
      const { data } = await query.limit(500);
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: corrections = [] } = useQuery({
    queryKey: ["attendance-corrections", companyId],
    queryFn: async () => {
      const { data } = await supabase
        .from("attendance_corrections")
        .select("*, employees(name_ar)")
        .eq("company_id", companyId!)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!companyId,
  });

  const createWorkflow = useCreateWorkflowInstance();

  const submitCorrection = useMutation({
    mutationFn: async (formData: FormData) => {
      const { data: correction, error } = await supabase.from("attendance_corrections").insert({
        company_id: companyId!,
        employee_id: corrEmployee,
        date: formData.get("corr_date") as string,
        requested_check_in: formData.get("corr_check_in") ? `${formData.get("corr_date")}T${formData.get("corr_check_in")}:00` : null,
        requested_check_out: formData.get("corr_check_out") ? `${formData.get("corr_date")}T${formData.get("corr_check_out")}:00` : null,
        reason: formData.get("corr_reason") as string,
      }).select().single();
      if (error) throw error;
      // Create workflow instance for approval
      if (correction) {
        await createWorkflow.mutateAsync({ requestType: "attendance_correction", referenceId: correction.id, companyId: companyId! });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance-corrections"] });
      toast({ title: "تم تقديم طلب التصحيح وإرساله للموافقة" });
      setCorrDialog(false);
    },
    onError: (err: Error) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  const updateCorrStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("attendance_corrections").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance-corrections"] });
      toast({ title: "تم التحديث" });
    },
  });

  const exportHistory = () => {
    const data = historyRecords.map((r: any) => ({
      "الموظف": r.employees?.name_ar || "",
      "التاريخ": r.date,
      "الدخول": r.check_in ? new Date(r.check_in).toLocaleTimeString("ar-IQ") : "",
      "الخروج": r.check_out ? new Date(r.check_out).toLocaleTimeString("ar-IQ") : "",
      "ساعات العمل": r.hours_worked || 0,
      "ساعات إضافية": r.overtime_hours || 0,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "الحضور");
    XLSX.writeFile(wb, `attendance_${startDate}_${endDate}.xlsx`);
  };

  const totalHours = historyRecords.reduce((s: number, r: any) => s + (r.hours_worked || 0), 0);
  const totalOvertime = historyRecords.reduce((s: number, r: any) => s + (r.overtime_hours || 0), 0);
  const pendingCorr = corrections.filter((c: any) => c.status === "pending").length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-heading font-bold text-2xl text-foreground">الحضور والانصراف</h1>
        <p className="text-muted-foreground text-sm mt-1">تسجيل ومتابعة حضور الموظفين</p>
      </div>

      <FeatureGate featureKey="hr_operational" compact>
        <AiModuleInsights
          module="attendance"
          title="رؤى الحضور الذكية"
          description="تحليل أنماط الحضور والمخالفات"
          feature="hr_operational"
          compact
          quickActions={[
            { label: "تحليل الحضور", question: "حلل أنماط الحضور والانصراف خلال الشهر الحالي. ما الأقسام الأكثر التزاماً؟" },
            { label: "مخالفات متكررة", question: "حدد الموظفين الذين لديهم مخالفات حضور متكررة واشرح الأنماط" },
            { label: "خطر الإرهاق", question: "من الموظفون المعرضون لخطر الإرهاق بناءً على العمل الإضافي المفرط وعدم أخذ إجازات؟" },
            { label: "توصيات تحسين", question: "قدم توصيات لتحسين معدلات الحضور وتقليل المخالفات" },
          ]}
        />
      </FeatureGate>

      <Tabs defaultValue="today">
        <TabsList>
          <TabsTrigger value="today" className="font-heading">اليوم</TabsTrigger>
          <TabsTrigger value="history" className="font-heading">السجل التاريخي</TabsTrigger>
          <TabsTrigger value="summary" className="font-heading gap-1"><BarChart3 className="h-3.5 w-3.5" />ملخص الحضور</TabsTrigger>
          <TabsTrigger value="violations" className="font-heading gap-1"><AlertTriangle className="h-3.5 w-3.5" />المخالفات</TabsTrigger>
          <TabsTrigger value="corrections" className="font-heading">
            طلبات التصحيح
            {pendingCorr > 0 && <Badge variant="destructive" className="mr-1 h-5 w-5 p-0 text-[10px] justify-center">{pendingCorr}</Badge>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="today">
          <AttendanceToday companyId={companyId!} employees={employees} todayRecords={todayRecords} isHrManager={isHrManager} />
        </TabsContent>

        <TabsContent value="history">
          <Card className="mb-4">
            <CardContent className="p-4">
              <div className="flex flex-wrap items-end gap-4">
                <div className="space-y-2"><Label>من تاريخ</Label><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} dir="ltr" className="text-left w-40" /></div>
                <div className="space-y-2"><Label>إلى تاريخ</Label><Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} dir="ltr" className="text-left w-40" /></div>
                <div className="space-y-2">
                  <Label>الموظف</Label>
                  <EmployeeSearch
                    employees={employees}
                    value={historyEmployee}
                    onChange={setHistoryEmployee}
                    showAllOption
                    className="w-56"
                  />
                </div>
                <Button variant="outline" className="gap-2 font-heading" onClick={exportHistory}><Download className="h-4 w-4" />تصدير Excel</Button>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-2 rounded-lg bg-muted text-primary"><Clock className="h-5 w-5" /></div><div><p className="text-sm text-muted-foreground">سجلات</p><p className="text-xl font-heading font-bold">{historyRecords.length}</p></div></CardContent></Card>
            <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-2 rounded-lg bg-muted text-primary"><Clock className="h-5 w-5" /></div><div><p className="text-sm text-muted-foreground">إجمالي ساعات العمل</p><p className="text-xl font-heading font-bold">{totalHours.toFixed(1)}</p></div></CardContent></Card>
            <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-2 rounded-lg bg-muted text-accent"><Clock className="h-5 w-5" /></div><div><p className="text-sm text-muted-foreground">إجمالي ساعات إضافية</p><p className="text-xl font-heading font-bold">{totalOvertime.toFixed(1)}</p></div></CardContent></Card>
          </div>

          <Card>
            <CardContent className="p-0">
              {historyRecords.length > 0 ? (
                <Table>
                  <TableHeader><TableRow><TableHead>الموظف</TableHead><TableHead>التاريخ</TableHead><TableHead>الدخول</TableHead><TableHead>الخروج</TableHead><TableHead>ساعات</TableHead><TableHead>إضافي</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {historyRecords.map((r: any) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.employees?.name_ar}</TableCell>
                        <TableCell dir="ltr">{r.date}</TableCell>
                        <TableCell dir="ltr">{r.check_in ? new Date(r.check_in).toLocaleTimeString("ar-IQ") : "—"}</TableCell>
                        <TableCell dir="ltr">{r.check_out ? new Date(r.check_out).toLocaleTimeString("ar-IQ") : "—"}</TableCell>
                        <TableCell>{r.hours_worked ? `${r.hours_worked}` : "—"}</TableCell>
                        <TableCell>{r.overtime_hours || "0"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12 text-muted-foreground"><Calendar className="h-12 w-12 mx-auto mb-3 opacity-20" /><p className="font-heading font-medium">لا توجد سجلات في هذه الفترة</p></div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="summary">
          {companyId && <AttendanceSummary companyId={companyId} employees={employees} />}
        </TabsContent>

        <TabsContent value="violations">
          {companyId && <AttendanceViolations companyId={companyId} employees={employees} />}
        </TabsContent>

        <TabsContent value="corrections">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="font-heading text-lg flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-accent" />
                طلبات تصحيح الحضور
              </CardTitle>
              <Dialog open={corrDialog} onOpenChange={setCorrDialog}>
                <DialogTrigger asChild>
                  <Button size="sm" className="font-heading gap-2"><AlertTriangle className="h-4 w-4" />طلب تصحيح</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle className="font-heading">طلب تصحيح حضور</DialogTitle></DialogHeader>
                  <form onSubmit={(e) => { e.preventDefault(); submitCorrection.mutate(new FormData(e.currentTarget)); }} className="space-y-4 pt-2">
                    <div className="space-y-2">
                      <Label>الموظف</Label>
                      <EmployeeSearch
                        employees={employees}
                        value={corrEmployee}
                        onChange={setCorrEmployee}
                      />
                    </div>
                    <div className="space-y-2"><Label>التاريخ</Label><Input name="corr_date" type="date" required /></div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2"><Label>وقت الدخول الصحيح</Label><Input name="corr_check_in" type="time" /></div>
                      <div className="space-y-2"><Label>وقت الخروج الصحيح</Label><Input name="corr_check_out" type="time" /></div>
                    </div>
                    <div className="space-y-2"><Label>السبب</Label><Textarea name="corr_reason" placeholder="اشرح سبب التصحيح..." required /></div>
                    <Button type="submit" className="w-full font-heading" disabled={submitCorrection.isPending || !corrEmployee}>
                      {submitCorrection.isPending ? "جاري الإرسال..." : "تقديم الطلب"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {corrections.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>الموظف</TableHead>
                      <TableHead>التاريخ</TableHead>
                      <TableHead>الدخول المطلوب</TableHead>
                      <TableHead>الخروج المطلوب</TableHead>
                      <TableHead>السبب</TableHead>
                      <TableHead>الحالة</TableHead>
                      {isHrManager && <TableHead>إجراء</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {corrections.map((c: any) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.employees?.name_ar}</TableCell>
                        <TableCell dir="ltr">{c.date}</TableCell>
                        <TableCell dir="ltr">{c.requested_check_in ? new Date(c.requested_check_in).toLocaleTimeString("ar-IQ", { hour: "2-digit", minute: "2-digit" }) : "—"}</TableCell>
                        <TableCell dir="ltr">{c.requested_check_out ? new Date(c.requested_check_out).toLocaleTimeString("ar-IQ", { hour: "2-digit", minute: "2-digit" }) : "—"}</TableCell>
                        <TableCell className="max-w-32 truncate">{c.reason}</TableCell>
                        <TableCell><Badge variant="outline" className={corrStatusColors[c.status]}>{corrStatusLabels[c.status]}</Badge></TableCell>
                        {isHrManager && (
                          <TableCell>
                            {c.status === "pending" && (
                              <div className="flex gap-1">
                                <Button size="icon" variant="ghost" className="h-7 w-7 text-primary" onClick={() => updateCorrStatus.mutate({ id: c.id, status: "approved" })}><CheckCircle className="h-4 w-4" /></Button>
                                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => updateCorrStatus.mutate({ id: c.id, status: "rejected" })}><XCircle className="h-4 w-4" /></Button>
                              </div>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground text-sm">لا توجد طلبات تصحيح</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
