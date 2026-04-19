import { useState } from "react";
import { Plus, UserX, CheckCircle, AlertTriangle, FileText, Calculator, ClipboardList, Check, X, Send, BarChart3, MessageSquare } from "lucide-react";
import { AiModuleInsights } from "@/components/ai/AiModuleInsights";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { useCreateWorkflowInstance } from "@/hooks/useApprovalWorkflow";
import { ExitSurveyDialog } from "@/components/exit/ExitSurveyDialog";
import { ExitAnalyticsDashboard } from "@/components/exit/ExitAnalyticsDashboard";

const statusLabels: Record<string, string> = {
  pending: "معلق", in_progress: "قيد المعالجة", completed: "مكتمل", cancelled: "ملغى",
};
const statusColors: Record<string, string> = {
  pending: "bg-accent/10 text-accent-foreground",
  in_progress: "bg-primary/10 text-primary",
  completed: "bg-primary/20 text-primary",
  cancelled: "bg-destructive/10 text-destructive",
};
const exitTypeLabels: Record<string, string> = {
  resignation: "استقالة", termination: "إنهاء خدمة", retirement: "تقاعد", contract_end: "انتهاء عقد",
};

export default function ExitManagement() {
  const [dialog, setDialog] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [exitType, setExitType] = useState("resignation");
  const [settlementDialog, setSettlementDialog] = useState<any>(null);
  const [clearanceDialog, setClearanceDialog] = useState<any>(null);
  const [surveyDialog, setSurveyDialog] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("records");

  const clearanceItems = [
    { key: "laptop", label: "جهاز الحاسوب" },
    { key: "phone", label: "هاتف الشركة" },
    { key: "badge", label: "بطاقة الدخول / المعرف" },
    { key: "keys", label: "المفاتيح" },
    { key: "documents", label: "المستندات والملفات" },
    { key: "email", label: "إلغاء الوصول للبريد" },
    { key: "systems", label: "إلغاء صلاحيات الأنظمة" },
    { key: "parking", label: "إعادة بطاقة المواقف" },
  ];
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const { toast } = useToast();
  const { companyId } = useCompany();
  const queryClient = useQueryClient();

  const { data: employees = [] } = useQuery({
    queryKey: ["employees-active", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("employees").select("id, name_ar, employee_code, basic_salary, hire_date").eq("company_id", companyId!).eq("status", "active");
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: exitRecords = [] } = useQuery({
    queryKey: ["exit-clearance", companyId],
    queryFn: async () => {
      const { data } = await supabase
        .from("exit_clearance")
        .select("*, employees(name_ar, employee_code, basic_salary, hire_date)")
        .eq("company_id", companyId!)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!companyId,
  });

  // Check which records already have surveys
  const { data: existingSurveys = [] } = useQuery({
    queryKey: ["exit-surveys-ids", companyId],
    queryFn: async () => {
      const { data } = await supabase
        .from("exit_surveys" as any)
        .select("exit_clearance_id")
        .eq("company_id", companyId!);
      return (data || []).map((s: any) => s.exit_clearance_id);
    },
    enabled: !!companyId,
  });

  const createWorkflow = useCreateWorkflowInstance();

  const createExit = useMutation({
    mutationFn: async (formData: FormData) => {
      const { data: exitRec, error } = await supabase.from("exit_clearance").insert({
        company_id: companyId!,
        employee_id: selectedEmployee,
        exit_type: exitType,
        resignation_date: (formData.get("resignation_date") as string) || null,
        last_working_date: (formData.get("last_working_date") as string) || null,
        notice_period_days: Number(formData.get("notice_period_days")) || 30,
        exit_interview_notes: (formData.get("exit_interview_notes") as string) || null,
      }).select().single();
      if (error) throw error;
      await createWorkflow.mutateAsync({ requestType: "final_settlement", referenceId: exitRec.id, companyId: companyId! });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exit-clearance"] });
      toast({ title: "تم بنجاح", description: "تم إنشاء سجل إنهاء الخدمة وإرساله للموافقة" });
      setDialog(false);
      setSelectedEmployee("");
    },
    onError: (err: Error) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  const updateExit = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const { error } = await supabase.from("exit_clearance").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exit-clearance"] });
      toast({ title: "تم التحديث" });
    },
    onError: (err: Error) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  const completeExit = useMutation({
    mutationFn: async (record: any) => {
      const settlement = calculateSettlement(record);
      const { error: exitError } = await supabase.from("exit_clearance").update({
        status: "completed",
        final_settlement_amount: settlement,
      }).eq("id", record.id);
      if (exitError) throw exitError;
      const { error: empError } = await supabase.from("employees").update({
        status: "terminated",
      }).eq("id", record.employee_id);
      if (empError) throw empError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exit-clearance", "employees-active", "employees"] });
      toast({ title: "تم إكمال إنهاء الخدمة", description: "تم تحديث حالة الموظف وحساب المستحقات" });
    },
    onError: (err: Error) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  const calculateSettlement = (record: any) => {
    const emp = record.employees;
    if (!emp) return 0;
    const monthlySalary = emp.basic_salary || 0;
    const hireDate = emp.hire_date ? new Date(emp.hire_date) : new Date();
    const lastDate = record.last_working_date ? new Date(record.last_working_date) : new Date();
    const yearsOfService = (lastDate.getTime() - hireDate.getTime()) / (365.25 * 86400000);
    const endOfServiceDays = Math.floor(yearsOfService) * 15;
    const dailyRate = monthlySalary / 30;
    return Math.round(endOfServiceDays * dailyRate);
  };

  const pendingCount = exitRecords.filter((r: any) => r.status === "pending" || r.status === "in_progress").length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading font-bold text-2xl text-foreground">إنهاء الخدمة</h1>
          <p className="text-muted-foreground text-sm mt-1">{exitRecords.length} سجل • {pendingCount} قيد المعالجة</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <AiModuleInsights
            module="exit"
            title="رؤى إنهاء الخدمة"
            description="تحليل معدلات الدوران وأسباب المغادرة"
            feature="gap_analysis"
            compact
            quickActions={[
              { label: "تحليل الدوران", question: "حلل أسباب ومعدلات ترك الموظفين للعمل. ما الأنماط والتوصيات؟" },
              { label: "تكلفة الدوران", question: "قدّر تكلفة دوران الموظفين على الشركة وقدم توصيات للاحتفاظ بالمواهب" },
              { label: "مخاطر المغادرة", question: "من الموظفون المعرضون لخطر المغادرة بناءً على أنماط البيانات؟" },
            ]}
          />
          <Dialog open={dialog} onOpenChange={setDialog}>
            <DialogTrigger asChild>
              <Button className="gap-2 font-heading"><Plus className="h-4 w-4" />إنشاء سجل إنهاء</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle className="font-heading">إنشاء سجل إنهاء خدمة</DialogTitle></DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); createExit.mutate(new FormData(e.currentTarget)); }} className="space-y-4">
                <div className="space-y-2">
                  <Label>الموظف</Label>
                  <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                    <SelectTrigger><SelectValue placeholder="اختر الموظف" /></SelectTrigger>
                    <SelectContent>{employees.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.name_ar} ({e.employee_code})</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>نوع الإنهاء</Label>
                  <Select value={exitType} onValueChange={setExitType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{Object.entries(exitTypeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>تاريخ الاستقالة</Label><Input name="resignation_date" type="date" dir="ltr" className="text-left" /></div>
                  <div className="space-y-2"><Label>آخر يوم عمل</Label><Input name="last_working_date" type="date" dir="ltr" className="text-left" /></div>
                </div>
                <div className="space-y-2"><Label>فترة الإشعار (أيام)</Label><Input name="notice_period_days" type="number" defaultValue={30} dir="ltr" className="text-left" /></div>
                <div className="space-y-2"><Label>ملاحظات مقابلة الخروج</Label><Textarea name="exit_interview_notes" rows={3} /></div>
                <Button type="submit" className="w-full font-heading" disabled={!selectedEmployee || createExit.isPending}>
                  {createExit.isPending ? "جاري الحفظ..." : "إنشاء السجل"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="records" className="gap-1.5 font-heading"><FileText className="h-4 w-4" />السجلات</TabsTrigger>
          <TabsTrigger value="analytics" className="gap-1.5 font-heading"><BarChart3 className="h-4 w-4" />تحليلات الخروج</TabsTrigger>
        </TabsList>

        <TabsContent value="records" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card><CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted text-accent"><AlertTriangle className="h-5 w-5" /></div>
              <div><p className="text-sm text-muted-foreground">قيد المعالجة</p><p className="text-2xl font-heading font-bold">{pendingCount}</p></div>
            </CardContent></Card>
            <Card><CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted text-primary"><CheckCircle className="h-5 w-5" /></div>
              <div><p className="text-sm text-muted-foreground">مكتمل</p><p className="text-2xl font-heading font-bold">{exitRecords.filter((r: any) => r.status === "completed").length}</p></div>
            </CardContent></Card>
            <Card><CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted text-primary"><UserX className="h-5 w-5" /></div>
              <div><p className="text-sm text-muted-foreground">إجمالي</p><p className="text-2xl font-heading font-bold">{exitRecords.length}</p></div>
            </CardContent></Card>
          </div>

          {exitRecords.length > 0 ? (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>الموظف</TableHead>
                      <TableHead>النوع</TableHead>
                      <TableHead>تاريخ الاستقالة</TableHead>
                      <TableHead>آخر يوم</TableHead>
                      <TableHead>سنوات الخدمة</TableHead>
                      <TableHead>الأصول</TableHead>
                      <TableHead>المستحقات</TableHead>
                      <TableHead>الاستبيان</TableHead>
                      <TableHead>الحالة</TableHead>
                      <TableHead>إجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {exitRecords.map((r: any) => {
                      const settlement = calculateSettlement(r);
                      const emp = r.employees;
                      const hireDate = emp?.hire_date ? new Date(emp.hire_date) : null;
                      const lastDate = r.last_working_date ? new Date(r.last_working_date) : new Date();
                      const years = hireDate ? ((lastDate.getTime() - hireDate.getTime()) / (365.25 * 86400000)).toFixed(1) : "—";
                      const hasSurvey = existingSurveys.includes(r.id);
                      return (
                        <TableRow key={r.id}>
                          <TableCell className="font-medium">
                            <div>{emp?.name_ar}</div>
                            <div className="text-xs text-muted-foreground">{emp?.employee_code}</div>
                          </TableCell>
                          <TableCell>{exitTypeLabels[r.exit_type] || r.exit_type}</TableCell>
                          <TableCell dir="ltr">{r.resignation_date || "—"}</TableCell>
                          <TableCell dir="ltr">{r.last_working_date || "—"}</TableCell>
                          <TableCell>{years} سنة</TableCell>
                          <TableCell>{r.assets_returned ? <CheckCircle className="h-4 w-4 text-primary" /> : <AlertTriangle className="h-4 w-4 text-accent" />}</TableCell>
                          <TableCell className="font-heading font-bold">{(r.final_settlement_amount || settlement).toLocaleString("ar-IQ")} د.ع</TableCell>
                          <TableCell>
                            {hasSurvey ? (
                              <Badge variant="outline" className="text-primary text-xs">مكتمل</Badge>
                            ) : (
                              <Button size="sm" variant="ghost" className="h-7 text-xs gap-1"
                                onClick={() => setSurveyDialog(r)}>
                                <MessageSquare className="h-3 w-3" />استبيان
                              </Button>
                            )}
                          </TableCell>
                          <TableCell><Badge variant="outline" className={statusColors[r.status]}>{statusLabels[r.status]}</Badge></TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {r.status !== "completed" && r.status !== "cancelled" && (
                                <>
                                  <Button size="sm" variant="ghost" className="h-7 text-xs font-heading"
                                    onClick={() => updateExit.mutate({ id: r.id, updates: { assets_returned: !r.assets_returned } })}>
                                    {r.assets_returned ? "إلغاء تسليم" : "تسليم أصول"}
                                  </Button>
                                  <Button size="sm" variant="ghost" className="h-7 text-xs font-heading gap-1" onClick={() => { setClearanceDialog(r); setCheckedItems({}); }}>
                                    <ClipboardList className="h-3 w-3" />إخلاء طرف
                                  </Button>
                                  <Button size="sm" variant="ghost" className="h-7 text-xs font-heading gap-1" onClick={() => setSettlementDialog(r)}>
                                    <Calculator className="h-3 w-3" />حساب
                                  </Button>
                                  <Button size="sm" variant="ghost" className="h-7 text-xs font-heading text-primary"
                                    onClick={() => completeExit.mutate(r)} disabled={completeExit.isPending}>
                                    إكمال
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : (
            <Card><CardContent className="py-16 text-center text-muted-foreground">
              <UserX className="h-16 w-16 mx-auto mb-4 opacity-20" />
              <p className="font-heading font-medium text-lg">لا توجد سجلات إنهاء خدمة</p>
            </CardContent></Card>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="mt-4">
          <ExitAnalyticsDashboard />
        </TabsContent>
      </Tabs>

      {/* Exit Survey Dialog */}
      {surveyDialog && (
        <ExitSurveyDialog
          open={!!surveyDialog}
          onOpenChange={() => setSurveyDialog(null)}
          exitRecord={surveyDialog}
        />
      )}

      {/* Settlement Detail Dialog */}
      <Dialog open={!!settlementDialog} onOpenChange={() => setSettlementDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-heading">تفاصيل مستحقات نهاية الخدمة</DialogTitle></DialogHeader>
          {settlementDialog && (() => {
            const emp = settlementDialog.employees;
            const salary = emp?.basic_salary || 0;
            const hireDate = emp?.hire_date ? new Date(emp.hire_date) : new Date();
            const lastDate = settlementDialog.last_working_date ? new Date(settlementDialog.last_working_date) : new Date();
            const years = (lastDate.getTime() - hireDate.getTime()) / (365.25 * 86400000);
            const days = Math.floor(years) * 15;
            const dailyRate = salary / 30;
            const total = Math.round(days * dailyRate);
            return (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="p-3 bg-muted rounded-lg"><p className="text-muted-foreground">الموظف</p><p className="font-heading font-bold">{emp?.name_ar}</p></div>
                  <div className="p-3 bg-muted rounded-lg"><p className="text-muted-foreground">الراتب الأساسي</p><p className="font-heading font-bold">{salary.toLocaleString("ar-IQ")} د.ع</p></div>
                  <div className="p-3 bg-muted rounded-lg"><p className="text-muted-foreground">سنوات الخدمة</p><p className="font-heading font-bold">{years.toFixed(1)} سنة</p></div>
                  <div className="p-3 bg-muted rounded-lg"><p className="text-muted-foreground">الأجر اليومي</p><p className="font-heading font-bold">{dailyRate.toLocaleString("ar-IQ")} د.ع</p></div>
                </div>
                <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                  <p className="text-sm text-muted-foreground">القانون العراقي: 15 يوم لكل سنة خدمة</p>
                  <p className="text-sm mt-1">{Math.floor(years)} سنة × 15 يوم = {days} يوم</p>
                  <p className="text-sm">{days} يوم × {dailyRate.toLocaleString("ar-IQ")} = <span className="font-heading font-bold text-primary text-lg">{total.toLocaleString("ar-IQ")} د.ع</span></p>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Clearance Checklist Dialog */}
      <Dialog open={!!clearanceDialog} onOpenChange={() => setClearanceDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-heading">قائمة إخلاء الطرف</DialogTitle></DialogHeader>
          {clearanceDialog && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">الموظف: <span className="font-heading font-bold text-foreground">{clearanceDialog.employees?.name_ar}</span></p>
              <div className="space-y-3">
                {clearanceItems.map((item) => (
                  <div key={item.key} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                    <Checkbox
                      checked={!!checkedItems[item.key]}
                      onCheckedChange={(v) => setCheckedItems(prev => ({ ...prev, [item.key]: !!v }))}
                    />
                    <span className="text-sm font-medium flex-1">{item.label}</span>
                    {checkedItems[item.key] ? <Check className="h-4 w-4 text-primary" /> : <X className="h-4 w-4 text-muted-foreground/30" />}
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between pt-2">
                <span className="text-sm text-muted-foreground">
                  {Object.values(checkedItems).filter(Boolean).length} / {clearanceItems.length} مكتمل
                </span>
                <Button
                  className="font-heading"
                  disabled={Object.values(checkedItems).filter(Boolean).length < clearanceItems.length}
                  onClick={() => {
                    updateExit.mutate({ id: clearanceDialog.id, updates: { assets_returned: true } });
                    setClearanceDialog(null);
                  }}
                >
                  تأكيد إخلاء الطرف
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
