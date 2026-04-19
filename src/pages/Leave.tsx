import { useState, useMemo } from "react";
import { Plus, CalendarDays, CheckCircle, XCircle, Clock, BarChart3, Users, Sparkles, AlertTriangle, TrendingUp, Ban, RefreshCw } from "lucide-react";
import TeamLeaveCalendar from "@/components/leave/TeamLeaveCalendar";
import { AiModuleInsights } from "@/components/ai/AiModuleInsights";
import { FeatureGate } from "@/components/subscription/FeatureGate";
import { useCreateWorkflowInstance, useWorkflowInstances } from "@/hooks/useApprovalWorkflow";
import { useWorkflowTemplateCheck } from "@/hooks/useWorkflowTemplate";
import { WorkflowStatusBadge } from "@/components/approvals/WorkflowStatusBadge";
import { ApprovalActionButtons } from "@/components/approvals/ApprovalActionButtons";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";


export default function Leave() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [selectedLeaveType, setSelectedLeaveType] = useState("");
  const [balanceEmployee, setBalanceEmployee] = useState("all");
  const { toast } = useToast();
  const { companyId } = useCompany();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Check workflow template exists for leave
  const { data: workflowCheck, isLoading: checkingTemplate } = useWorkflowTemplateCheck("leave");
  const hasWorkflowTemplate = workflowCheck?.exists === true;

  // Fetch workflow instances for leave requests to show inline action buttons
  const { data: leaveWorkflows = [] } = useWorkflowInstances({ requestType: "leave" });
  const workflowMap: Record<string, any> = {};
  leaveWorkflows.forEach((wi: any) => { workflowMap[wi.reference_id] = wi; });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("employees").select("id, name_ar, hire_date").eq("company_id", companyId!);
      return data || [];
    },
    enabled: !!companyId && !!user,
  });

  const { data: leaveTypes = [] } = useQuery({
    queryKey: ["leave-types", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("leave_types").select("*").eq("company_id", companyId!);
      return data || [];
    },
    enabled: !!companyId && !!user,
  });

  const { data: leaveRequests = [], isLoading } = useQuery({
    queryKey: ["leave-requests", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leave_requests")
        .select("*, employees(name_ar), leave_types(name)")
        .eq("company_id", companyId!)
        .order("created_at", { ascending: false });
      if (error) {
        console.error("[Leave] Error fetching leave requests:", error);
        throw error;
      }
      return data || [];
    },
    enabled: !!companyId && !!user,
  });

  // Leave balances
  const { data: leaveBalances = [] } = useQuery({
    queryKey: ["leave-balances", companyId],
    queryFn: async () => {
      const { data } = await supabase
        .from("leave_balances")
        .select("*, employees(name_ar), leave_types(name, days_allowed)")
        .eq("company_id", companyId!)
        .eq("year", new Date().getFullYear())
        .order("created_at");
      return data || [];
    },
    enabled: !!companyId && !!user,
  });

  const createWorkflow = useCreateWorkflowInstance();

  // Compute remaining balance for selected employee + leave type
  const selectedBalance = useMemo(() => {
    if (!selectedEmployee || !selectedLeaveType) return null;
    const bal = leaveBalances.find(
      (b: any) => b.employee_id === selectedEmployee && b.leave_type_id === selectedLeaveType
    );
    if (!bal) return null;
    const total = (bal.entitled_days || 0) + (bal.carried_days || 0);
    const remaining = total - (bal.used_days || 0);
    return { total, used: bal.used_days || 0, remaining, carried: bal.carried_days || 0 };
  }, [selectedEmployee, selectedLeaveType, leaveBalances]);

  // Calculate requested days from form dates
  const [requestedDays, setRequestedDays] = useState(0);

  const createLeave = useMutation({
    mutationFn: async (formData: FormData) => {
      const startDate = formData.get("start_date") as string;
      const endDate = formData.get("end_date") as string;
      const reason = formData.get("reason") as string;

      // Enforce workflow template exists
      if (!hasWorkflowTemplate) {
        throw new Error("لا يوجد قالب سير عمل مفعّل للإجازات. يرجى إعداده أولاً من صفحة الموافقات.");
      }

      // Validate balance before submitting
      if (selectedBalance && requestedDays > 0 && selectedBalance.remaining <= 0) {
        throw new Error("رصيد الإجازات منتهي. لا يمكن تقديم الطلب.");
      }
      if (selectedBalance && requestedDays > selectedBalance.remaining) {
        throw new Error(`الأيام المطلوبة (${requestedDays}) تتجاوز الرصيد المتبقي (${selectedBalance.remaining} يوم).`);
      }

      const { data, error } = await supabase.from("leave_requests").insert({
        company_id: companyId!,
        employee_id: selectedEmployee,
        leave_type_id: selectedLeaveType || null,
        start_date: startDate,
        end_date: endDate,
        reason: reason || null,
      }).select().single();
      if (error) throw error;

      // Create workflow instance — BLOCKING: workflow must succeed
      await createWorkflow.mutateAsync({ requestType: "leave", referenceId: data.id, companyId: companyId! });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leave-requests"] });
      queryClient.invalidateQueries({ queryKey: ["leave-balances"] });
      queryClient.invalidateQueries({ queryKey: ["workflow-instances"] });
      toast({ title: "تم تقديم الطلب" });
      setDialogOpen(false);
      setSelectedEmployee("");
      setSelectedLeaveType("");
      setRequestedDays(0);
    },
    onError: (err: Error) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  // Initialize balances starting from zero — accrual based on months of service
  const initBalances = useMutation({
    mutationFn: async () => {
      const currentYear = new Date().getFullYear();
      for (const emp of employees) {
        for (const lt of leaveTypes) {
          // Calculate months of service this year
          const hireDate = (emp as any).hire_date ? new Date((emp as any).hire_date) : null;
          let monthsOfService = 12;
          if (hireDate) {
            const startOfYear = new Date(currentYear, 0, 1);
            const effectiveStart = hireDate > startOfYear ? hireDate : startOfYear;
            monthsOfService = Math.max(0, 12 - effectiveStart.getMonth());
          }
          // Prorate from zero: entitled = (months / 12) * days_allowed
          const entitled = Math.round((monthsOfService / 12) * (lt as any).days_allowed * 100) / 100;

          // Upsert balance
          await supabase.from("leave_balances").upsert({
            company_id: companyId!,
            employee_id: emp.id,
            leave_type_id: lt.id,
            year: currentYear,
            entitled_days: entitled,
            used_days: 0,
            carried_days: 0,
          }, { onConflict: "company_id,employee_id,leave_type_id,year" });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leave-balances"] });
      toast({ title: "تم تهيئة الأرصدة من الصفر بناءً على أشهر الخدمة" });
    },
    onError: (err: Error) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  const pendingCount = leaveRequests.filter((r: any) => r.status === "pending").length;

  const filteredBalances = balanceEmployee === "all"
    ? leaveBalances
    : leaveBalances.filter((b: any) => b.employee_id === balanceEmployee);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading font-bold text-2xl text-foreground">الإجازات</h1>
          <p className="text-muted-foreground text-sm mt-1">إدارة طلبات الإجازات والأرصدة</p>
        </div>
        <div className="flex gap-2 flex-wrap">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 font-heading"><Plus className="h-4 w-4" />طلب إجازة</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-heading">طلب إجازة جديد</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); createLeave.mutate(new FormData(e.currentTarget)); }} className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>الموظف</Label>
                <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                  <SelectTrigger><SelectValue placeholder="اختر الموظف" /></SelectTrigger>
                  <SelectContent>{employees.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.name_ar}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>نوع الإجازة</Label>
                <Select value={selectedLeaveType} onValueChange={setSelectedLeaveType}>
                  <SelectTrigger><SelectValue placeholder="اختر النوع" /></SelectTrigger>
                  <SelectContent>{leaveTypes.map((lt: any) => <SelectItem key={lt.id} value={lt.id}>{lt.name} ({lt.days_allowed} يوم)</SelectItem>)}</SelectContent>
                </Select>
              </div>

              {/* Balance Alert Card */}
              {selectedBalance && (
                <div className={`rounded-lg border p-3 ${selectedBalance.remaining <= 0 ? 'border-destructive/50 bg-destructive/5' : selectedBalance.remaining <= 3 ? 'border-warning/50 bg-warning/5' : 'border-primary/30 bg-primary/5'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      {selectedBalance.remaining <= 0 ? <Ban className="h-3.5 w-3.5 text-destructive" /> : <Clock className="h-3.5 w-3.5 text-primary" />}
                      رصيد الإجازات
                    </span>
                    <Badge variant={selectedBalance.remaining <= 0 ? "destructive" : selectedBalance.remaining <= 3 ? "secondary" : "outline"}>
                      {selectedBalance.remaining} يوم متبقي
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded bg-background/60 p-1.5">
                      <p className="text-sm font-bold text-foreground">{selectedBalance.total}</p>
                      <p className="text-[9px] text-muted-foreground">المستحق</p>
                    </div>
                    <div className="rounded bg-background/60 p-1.5">
                      <p className="text-sm font-bold text-foreground">{selectedBalance.used}</p>
                      <p className="text-[9px] text-muted-foreground">المستخدم</p>
                    </div>
                    <div className="rounded bg-background/60 p-1.5">
                      <p className="text-sm font-bold text-foreground">{selectedBalance.carried}</p>
                      <p className="text-[9px] text-muted-foreground">مرحّل</p>
                    </div>
                  </div>
                  <Progress value={selectedBalance.total > 0 ? (selectedBalance.used / selectedBalance.total) * 100 : 0} className="h-1.5 mt-2" />
                  {selectedBalance.remaining <= 0 && (
                    <p className="text-xs text-destructive font-medium mt-2 flex items-center gap-1">
                      <Ban className="h-3 w-3" /> رصيد الإجازات منتهي — لا يمكن تقديم الطلب
                    </p>
                  )}
                  {selectedBalance.remaining > 0 && selectedBalance.remaining <= 3 && (
                    <p className="text-xs text-warning font-medium mt-2 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" /> تنبيه: الرصيد المتبقي منخفض
                    </p>
                  )}
                  {requestedDays > 0 && requestedDays > selectedBalance.remaining && (
                    <p className="text-xs text-destructive font-medium mt-1 flex items-center gap-1">
                      <Ban className="h-3 w-3" /> الأيام المطلوبة ({requestedDays}) تتجاوز الرصيد المتبقي
                    </p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>من تاريخ</Label><Input name="start_date" type="date" required onChange={(e) => {
                  const endEl = e.target.form?.querySelector('[name="end_date"]') as HTMLInputElement;
                  if (endEl?.value && e.target.value) {
                    const diff = Math.ceil((new Date(endEl.value).getTime() - new Date(e.target.value).getTime()) / 86400000) + 1;
                    setRequestedDays(Math.max(0, diff));
                  }
                }} /></div>
                <div className="space-y-2"><Label>إلى تاريخ</Label><Input name="end_date" type="date" required onChange={(e) => {
                  const startEl = e.target.form?.querySelector('[name="start_date"]') as HTMLInputElement;
                  if (startEl?.value && e.target.value) {
                    const diff = Math.ceil((new Date(e.target.value).getTime() - new Date(startEl.value).getTime()) / 86400000) + 1;
                    setRequestedDays(Math.max(0, diff));
                  }
                }} /></div>
              </div>
              {requestedDays > 0 && (
                <p className="text-xs text-muted-foreground">مدة الإجازة: <span className="font-bold text-foreground">{requestedDays} يوم</span></p>
              )}
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" name="is_half_day" className="rounded border-border" onChange={(e) => {
                    const endInput = e.target.form?.querySelector('[name="end_date"]') as HTMLInputElement;
                    const startInput = e.target.form?.querySelector('[name="start_date"]') as HTMLInputElement;
                    if (e.target.checked && startInput?.value) { endInput.value = startInput.value; setRequestedDays(0.5); }
                  }} />
                  نصف يوم
                </label>
                <Select name="half_day_period" defaultValue="morning">
                  <SelectTrigger className="w-32 h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="morning">الفترة الصباحية</SelectItem>
                    <SelectItem value="afternoon">الفترة المسائية</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>السبب</Label><Input name="reason" placeholder="سبب الإجازة (اختياري)" /></div>

              {/* Workflow template enforcement warning */}
              {!checkingTemplate && !hasWorkflowTemplate && (
                <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-3 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-destructive">لا يوجد قالب سير عمل للإجازات</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">يجب إعداد قالب سير عمل مفعّل للإجازات من صفحة الموافقات قبل تقديم الطلبات.</p>
                  </div>
                </div>
              )}

              <Button
                type="submit"
                className="w-full font-heading"
                disabled={createLeave.isPending || !selectedEmployee || !hasWorkflowTemplate || (selectedBalance !== null && selectedBalance.remaining <= 0)}
              >
                {createLeave.isPending ? "جاري الإرسال..." : !hasWorkflowTemplate ? "يتطلب قالب سير عمل" : selectedBalance && selectedBalance.remaining <= 0 ? "الرصيد منتهي" : "تقديم الطلب"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-2 rounded-lg bg-accent/10"><Clock className="h-5 w-5 text-accent" /></div><div><p className="text-2xl font-heading font-bold">{pendingCount}</p><p className="text-xs text-muted-foreground">معلقة</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-2 rounded-lg bg-primary/10"><CheckCircle className="h-5 w-5 text-primary" /></div><div><p className="text-2xl font-heading font-bold">{leaveRequests.filter((r: any) => r.status === "approved").length}</p><p className="text-xs text-muted-foreground">موافق عليها</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-2 rounded-lg bg-destructive/10"><XCircle className="h-5 w-5 text-destructive" /></div><div><p className="text-2xl font-heading font-bold">{leaveRequests.filter((r: any) => r.status === "rejected").length}</p><p className="text-xs text-muted-foreground">مرفوضة</p></div></CardContent></Card>
      </div>

      <Tabs defaultValue="requests">
        <TabsList>
          <TabsTrigger value="requests" className="font-heading">الطلبات</TabsTrigger>
          <TabsTrigger value="balances" className="font-heading">أرصدة الإجازات</TabsTrigger>
          <TabsTrigger value="calendar" className="font-heading gap-1"><Users className="h-3.5 w-3.5" />تقويم الفريق</TabsTrigger>
        </TabsList>

        <TabsContent value="requests">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الموظف</TableHead>
                    <TableHead>النوع</TableHead>
                    <TableHead>من</TableHead>
                    <TableHead>إلى</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>إجراء</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaveRequests.map((r: any) => {
                    const wfInstance = workflowMap[r.id];
                    // Use workflow status if available, otherwise use request's own status
                    const displayStatus = wfInstance?.status || r.status || "pending";
                    return (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.employees?.name_ar}</TableCell>
                      <TableCell>{r.leave_types?.name || "—"}</TableCell>
                      <TableCell dir="ltr" className="text-left">{r.start_date}</TableCell>
                      <TableCell dir="ltr" className="text-left">{r.end_date}</TableCell>
                      <TableCell><WorkflowStatusBadge status={displayStatus} /></TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        {wfInstance ? (
                          <ApprovalActionButtons
                            instanceId={wfInstance.id}
                            status={wfInstance.status}
                            isRequester={wfInstance.requester_user_id === user?.id}
                          />
                        ) : (
                          <Badge variant="outline" className="text-[10px]">
                            {r.status === "approved" ? "موافق عليه" : r.status === "rejected" ? "مرفوض" : "بدون سير عمل"}
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                    );
                  })}
                  {isLoading && (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">جاري تحميل الطلبات...</TableCell></TableRow>
                  )}
                  {!isLoading && leaveRequests.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">لا توجد طلبات إجازة — قدّم طلبًا جديدًا</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="balances">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="font-heading text-lg flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                أرصدة الإجازات — {new Date().getFullYear()}
                {leaveTypes.some((lt: any) => lt.allow_carry_over) && (
                  <Badge variant="outline" className="text-[10px] gap-1 font-normal">
                    <RefreshCw className="h-2.5 w-2.5" />يوجد ترحيل
                  </Badge>
                )}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Select value={balanceEmployee} onValueChange={setBalanceEmployee}>
                  <SelectTrigger className="w-48 h-8 text-sm"><SelectValue placeholder="كل الموظفين" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">كل الموظفين</SelectItem>
                    {employees.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.name_ar}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button size="sm" variant="outline" className="font-heading text-xs" onClick={() => initBalances.mutate()} disabled={initBalances.isPending}>
                  {initBalances.isPending ? "جاري..." : "تهيئة الأرصدة"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {filteredBalances.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>الموظف</TableHead>
                      <TableHead>نوع الإجازة</TableHead>
                      <TableHead>المستحق</TableHead>
                      <TableHead>المستخدم</TableHead>
                      <TableHead>مرحّل</TableHead>
                      <TableHead>المتبقي</TableHead>
                      <TableHead>الاستهلاك</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBalances.map((b: any) => {
                      const total = (b.entitled_days || 0) + (b.carried_days || 0);
                      const pct = total > 0 ? ((b.used_days || 0) / total) * 100 : 0;
                      return (
                        <TableRow key={b.id}>
                          <TableCell className="font-medium">{b.employees?.name_ar}</TableCell>
                          <TableCell>{b.leave_types?.name}</TableCell>
                          <TableCell>{b.entitled_days} يوم</TableCell>
                          <TableCell>{b.used_days} يوم</TableCell>
                          <TableCell>{b.carried_days} يوم</TableCell>
                          <TableCell className="font-bold">{b.remaining_days} يوم</TableCell>
                          <TableCell className="w-32">
                            <div className="flex items-center gap-2">
                              <Progress value={pct} className="h-2 flex-1" />
                              <span className="text-xs text-muted-foreground">{Math.round(pct)}%</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-sm">لا توجد أرصدة مسجلة</p>
                  <p className="text-xs mt-1">اضغط "تهيئة الأرصدة" لإنشاء أرصدة لجميع الموظفين</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="calendar">
          {companyId && <TeamLeaveCalendar companyId={companyId} />}
        </TabsContent>
      </Tabs>

      {/* AI Leave Insights */}
      <AiModuleInsights
        module="leave"
        title="رؤى الإجازات الذكية"
        description="تحليل أنماط الإجازات والمخاطر"
        feature="workforce_analytics"
        compact
        quickActions={[
          { label: "أنماط الإجازات", question: "حلل أنماط الإجازات عبر الأقسام وحدد الاتجاهات غير الطبيعية.", icon: <TrendingUp className="h-3 w-3" /> },
          { label: "مخاطر الغياب", question: "حدد الموظفين أو الأقسام ذوي الغياب المرتفع واشرح العوامل المؤثرة.", icon: <AlertTriangle className="h-3 w-3" /> },
          { label: "توصيات سياسة الإجازات", question: "قدم توصيات لتحسين سياسة الإجازات بناءً على بيانات الاستخدام الفعلية.", icon: <Sparkles className="h-3 w-3" /> },
        ]}
        contextData={`طلبات الإجازات: ${leaveRequests.length}\nمعلقة: ${pendingCount}\nموافق عليها: ${leaveRequests.filter((r: any) => r.status === "approved").length}\nأنواع الإجازات: ${leaveTypes.map((t: any) => `${t.name} (${t.days_allowed} يوم)`).join(", ")}`}
      />
    </div>
  );
}
