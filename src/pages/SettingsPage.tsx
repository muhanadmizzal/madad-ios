import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trash2, Palette, Settings2, Brain, GitBranch, PenTool, Fingerprint, Calculator, Wrench } from "lucide-react";
import SystemHealthCheck from "@/components/settings/SystemHealthCheck";
import CompanyBranding from "@/components/settings/CompanyBranding";
import WorkPolicyCenter from "@/components/settings/WorkPolicyCenter";
import AiSettingsAdmin from "@/components/ai/AiSettingsAdmin";
import { WorkflowTemplateManager } from "@/components/approvals/WorkflowTemplateManager";
import SignatoriesManager from "@/components/settings/SignatoriesManager";
import OfficialDocEditor from "@/components/settings/OfficialDocEditor";
import AttendanceSettings from "@/components/settings/AttendanceSettings";
import SalaryEquationSettings from "@/components/settings/SalaryEquationSettings";
import LocalModeSettings from "@/components/settings/LocalModeSettings";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { useRole } from "@/hooks/useRole";
import { useState, useEffect } from "react";

export default function SettingsPage() {
  const { toast } = useToast();
  const { companyId } = useCompany();
  const { isAdmin } = useRole();
  const queryClient = useQueryClient();

  // Company settings
  const { data: company } = useQuery({
    queryKey: ["company", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("companies").select("*").eq("id", companyId!).single();
      return data;
    },
    enabled: !!companyId,
  });

  const [name, setName] = useState("");
  const [sector, setSector] = useState("");
  const [currency, setCurrency] = useState("IQD");
  const [empRange, setEmpRange] = useState("");
  const [workStart, setWorkStart] = useState("08:00");
  const [workEnd, setWorkEnd] = useState("16:00");
  const [overtimeMultiplier, setOvertimeMultiplier] = useState("1.5");
  const [graceMinutes, setGraceMinutes] = useState("10");

  useEffect(() => {
    if (company) {
      setName(company.name || "");
      setSector(company.sector || "");
      setCurrency(company.default_currency || "IQD");
      setEmpRange(company.employee_count_range || "");
      setWorkStart((company as any).working_hours_start || "08:00");
      setWorkEnd((company as any).working_hours_end || "16:00");
      setOvertimeMultiplier(String((company as any).overtime_multiplier || "1.5"));
      setGraceMinutes(String((company as any).grace_minutes || "10"));
    }
  }, [company]);

  const updateCompany = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("companies").update({
        name, sector: sector || null, default_currency: currency, employee_count_range: empRange || null,
        working_hours_start: workStart, working_hours_end: workEnd, overtime_multiplier: Number(overtimeMultiplier),
        grace_minutes: Number(graceMinutes),
      } as any).eq("id", companyId!);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["company"] }); toast({ title: "تم الحفظ" }); },
    onError: (err: Error) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  // Positions
  const { data: positions = [] } = useQuery({
    queryKey: ["positions", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("positions").select("*").eq("company_id", companyId!).order("grade_level");
      return data || [];
    },
    enabled: !!companyId,
  });

  const addPosition = useMutation({
    mutationFn: async (formData: FormData) => {
      const { error } = await supabase.from("positions").insert({
        company_id: companyId!,
        title_ar: formData.get("title_ar") as string,
        title_en: (formData.get("title_en") as string) || null,
        grade_level: Number(formData.get("grade_level")) || null,
        min_salary: Number(formData.get("min_salary")) || 0,
        max_salary: Number(formData.get("max_salary")) || 0,
      });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["positions"] }); toast({ title: "تم الحفظ" }); },
    onError: (err: Error) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  const deletePosition = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("positions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["positions"] }); toast({ title: "تم الحذف" }); },
  });

  // Salary components
  const { data: salaryComponents = [] } = useQuery({
    queryKey: ["salary-components", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("salary_components").select("*").eq("company_id", companyId!).order("type");
      return data || [];
    },
    enabled: !!companyId,
  });

  const [scType, setScType] = useState("earning");
  const [scCalcType, setScCalcType] = useState("fixed");
  const [scTaxable, setScTaxable] = useState(true);

  const addSalaryComponent = useMutation({
    mutationFn: async (formData: FormData) => {
      const { error } = await supabase.from("salary_components").insert({
        company_id: companyId!,
        name: formData.get("sc_name") as string,
        type: scType,
        calculation_type: scCalcType,
        amount: Number(formData.get("sc_amount")) || null,
        percentage: Number(formData.get("sc_percentage")) || null,
        is_taxable: scTaxable,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["salary-components"] });
      toast({ title: "تم الحفظ" });
    },
    onError: (err: Error) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  // Leave types
  const { data: leaveTypes = [] } = useQuery({
    queryKey: ["leave-types", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("leave_types").select("*").eq("company_id", companyId!);
      return data || [];
    },
    enabled: !!companyId,
  });

  const addLeaveType = useMutation({
    mutationFn: async (formData: FormData) => {
      const { error } = await supabase.from("leave_types").insert({
        company_id: companyId!,
        name: formData.get("lt_name") as string,
        days_allowed: Number(formData.get("lt_days")) || 0,
        is_paid: formData.get("lt_paid") === "on",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leave-types"] });
      toast({ title: "تم الحفظ" });
    },
    onError: (err: Error) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  const deleteLeaveType = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("leave_types").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["leave-types"] }); toast({ title: "تم الحذف" }); },
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-heading font-bold text-2xl text-foreground">الإعدادات</h1>
        <p className="text-muted-foreground text-sm mt-1">إعدادات الشركة والنظام</p>
      </div>

      <Tabs defaultValue="company">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="company" className="font-heading">الشركة</TabsTrigger>
          <TabsTrigger value="positions" className="font-heading">المناصب</TabsTrigger>
          <TabsTrigger value="salary" className="font-heading">مكونات الراتب</TabsTrigger>
          {isAdmin && <TabsTrigger value="salary-equation" className="font-heading gap-1"><Calculator className="h-3.5 w-3.5" />معادلة الراتب</TabsTrigger>}
          <TabsTrigger value="leave" className="font-heading">أنواع الإجازات</TabsTrigger>
          {isAdmin && <TabsTrigger value="workflows" className="font-heading gap-1"><GitBranch className="h-3.5 w-3.5" />سير العمل</TabsTrigger>}
          {isAdmin && <TabsTrigger value="doc-templates" className="font-heading gap-1"><PenTool className="h-3.5 w-3.5" />قوالب المستندات</TabsTrigger>}
          {isAdmin && <TabsTrigger value="signatories" className="font-heading gap-1"><PenTool className="h-3.5 w-3.5" />المفوضون</TabsTrigger>}
          {isAdmin && <TabsTrigger value="payroll-rules" className="font-heading gap-1"><Settings2 className="h-3.5 w-3.5" />سياسات العمل</TabsTrigger>}
          {isAdmin && <TabsTrigger value="ai-settings" className="font-heading gap-1"><Brain className="h-3.5 w-3.5" />AI</TabsTrigger>}
          {isAdmin && <TabsTrigger value="branding" className="font-heading gap-1"><Palette className="h-3.5 w-3.5" />الهوية</TabsTrigger>}
          {isAdmin && <TabsTrigger value="attendance" className="font-heading gap-1"><Fingerprint className="h-3.5 w-3.5" />الحضور</TabsTrigger>}
          {isAdmin && <TabsTrigger value="health" className="font-heading gap-1"><Wrench className="h-3.5 w-3.5" />فحص النظام</TabsTrigger>}
          {isAdmin && <TabsTrigger value="local-runtime" className="font-heading gap-1"><Wrench className="h-3.5 w-3.5" />Local Runtime</TabsTrigger>}
        </TabsList>

        <TabsContent value="company">
          <Card className="max-w-2xl">
            <CardHeader><CardTitle className="font-heading text-lg">معلومات الشركة</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2"><Label>اسم الشركة</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>القطاع</Label><Select value={sector} onValueChange={setSector}><SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger><SelectContent><SelectItem value="public">القطاع العام</SelectItem><SelectItem value="private">القطاع الخاص</SelectItem><SelectItem value="oil">النفط والغاز</SelectItem><SelectItem value="ngo">منظمة غير حكومية</SelectItem></SelectContent></Select></div>
                <div className="space-y-2"><Label>العملة</Label><Select value={currency} onValueChange={setCurrency}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="IQD">دينار عراقي</SelectItem><SelectItem value="USD">دولار أمريكي</SelectItem></SelectContent></Select></div>
              </div>
              <div className="space-y-2"><Label>عدد الموظفين</Label><Select value={empRange} onValueChange={setEmpRange}><SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger><SelectContent><SelectItem value="1-10">1-10</SelectItem><SelectItem value="11-50">11-50</SelectItem><SelectItem value="51-200">51-200</SelectItem><SelectItem value="201-500">201-500</SelectItem><SelectItem value="500+">أكثر من 500</SelectItem></SelectContent></Select></div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2"><Label>بداية الدوام</Label><Input type="time" value={workStart} onChange={(e) => setWorkStart(e.target.value)} dir="ltr" className="text-left" /></div>
                <div className="space-y-2"><Label>نهاية الدوام</Label><Input type="time" value={workEnd} onChange={(e) => setWorkEnd(e.target.value)} dir="ltr" className="text-left" /></div>
                <div className="space-y-2"><Label>معامل العمل الإضافي</Label><Input type="number" step="0.1" value={overtimeMultiplier} onChange={(e) => setOvertimeMultiplier(e.target.value)} dir="ltr" className="text-left" /></div>
              </div>
              <div className="space-y-2"><Label>فترة السماح (دقائق)</Label><Input type="number" value={graceMinutes} onChange={(e) => setGraceMinutes(e.target.value)} dir="ltr" className="text-left w-32" /><p className="text-xs text-muted-foreground">دقائق التأخير المسموحة قبل تسجيل مخالفة</p></div>
              <Button className="font-heading" onClick={() => updateCompany.mutate()} disabled={updateCompany.isPending}>{updateCompany.isPending ? "جاري الحفظ..." : "حفظ"}</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="positions">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="font-heading text-lg">سلم المناصب والدرجات</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {positions.length > 0 && (
                <Table>
                  <TableHeader><TableRow><TableHead>المسمى</TableHead><TableHead>بالإنجليزية</TableHead><TableHead>الدرجة</TableHead><TableHead>الحد الأدنى</TableHead><TableHead>الحد الأقصى</TableHead><TableHead></TableHead></TableRow></TableHeader>
                  <TableBody>
                    {positions.map((p: any) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.title_ar}</TableCell>
                        <TableCell>{p.title_en || "—"}</TableCell>
                        <TableCell>{p.grade_level || "—"}</TableCell>
                        <TableCell>{(p.min_salary || 0).toLocaleString("ar-IQ")}</TableCell>
                        <TableCell>{(p.max_salary || 0).toLocaleString("ar-IQ")}</TableCell>
                        <TableCell><Button size="icon" variant="ghost" className="text-destructive h-8 w-8" onClick={() => deletePosition.mutate(p.id)}><Trash2 className="h-4 w-4" /></Button></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              <form onSubmit={(e) => { e.preventDefault(); addPosition.mutate(new FormData(e.currentTarget)); e.currentTarget.reset(); }} className="border-t pt-4 space-y-3">
                <p className="font-heading font-bold text-sm">إضافة منصب</p>
                <div className="grid grid-cols-5 gap-3">
                  <Input name="title_ar" placeholder="المسمى بالعربية" required />
                  <Input name="title_en" placeholder="بالإنجليزية" dir="ltr" className="text-left" />
                  <Input name="grade_level" type="number" placeholder="الدرجة" />
                  <Input name="min_salary" type="number" placeholder="حد أدنى" dir="ltr" className="text-left" />
                  <Input name="max_salary" type="number" placeholder="حد أقصى" dir="ltr" className="text-left" />
                </div>
                <Button size="sm" type="submit" className="font-heading" disabled={addPosition.isPending}>حفظ</Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="salary">
          <Card>
            <CardHeader><CardTitle className="font-heading text-lg">مكونات الراتب</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {salaryComponents.length > 0 && (
                <Table>
                  <TableHeader><TableRow><TableHead>المكون</TableHead><TableHead>النوع</TableHead><TableHead>طريقة الحساب</TableHead><TableHead>المبلغ / النسبة</TableHead><TableHead>خاضع للضريبة</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {salaryComponents.map((sc: any) => (
                      <TableRow key={sc.id}>
                        <TableCell className="font-medium">{sc.name}</TableCell>
                        <TableCell><Badge variant="outline" className={sc.type === "earning" ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}>{sc.type === "earning" ? "استحقاق" : "خصم"}</Badge></TableCell>
                        <TableCell>{sc.calculation_type === "fixed" ? "ثابت" : "نسبة"}</TableCell>
                        <TableCell>{sc.calculation_type === "fixed" ? `${(sc.amount || 0).toLocaleString("ar-IQ")} د.ع` : `${sc.percentage || 0}%`}</TableCell>
                        <TableCell>{sc.is_taxable ? "✅" : "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              <form onSubmit={(e) => { e.preventDefault(); addSalaryComponent.mutate(new FormData(e.currentTarget)); e.currentTarget.reset(); }} className="border-t pt-4 space-y-3">
                <p className="font-heading font-bold text-sm">إضافة مكون</p>
                <div className="grid grid-cols-2 gap-3">
                  <Input name="sc_name" placeholder="الاسم (بدل سكن)" required />
                  <Select value={scType} onValueChange={setScType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="earning">استحقاق</SelectItem><SelectItem value="deduction">خصم</SelectItem></SelectContent></Select>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <Select value={scCalcType} onValueChange={setScCalcType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="fixed">مبلغ ثابت</SelectItem><SelectItem value="percentage">نسبة مئوية</SelectItem></SelectContent></Select>
                  <Input name="sc_amount" type="number" placeholder="المبلغ" dir="ltr" className="text-left" />
                  <Input name="sc_percentage" type="number" placeholder="النسبة %" dir="ltr" className="text-left" />
                </div>
                <div className="flex items-center gap-2"><Switch checked={scTaxable} onCheckedChange={setScTaxable} /><Label>خاضع للضريبة</Label></div>
                <Button size="sm" type="submit" className="font-heading" disabled={addSalaryComponent.isPending}>حفظ</Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {isAdmin && (
          <TabsContent value="salary-equation">
            <SalaryEquationSettings />
          </TabsContent>
        )}
        <TabsContent value="leave">
          <Card>
            <CardHeader><CardTitle className="font-heading text-lg">أنواع الإجازات</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {leaveTypes.length > 0 && (
                <Table>
                  <TableHeader><TableRow><TableHead>النوع</TableHead><TableHead>أيام الاستحقاق</TableHead><TableHead>مدفوعة</TableHead><TableHead></TableHead></TableRow></TableHeader>
                  <TableBody>
                    {leaveTypes.map((lt: any) => (
                      <TableRow key={lt.id}>
                        <TableCell className="font-medium">{lt.name}</TableCell>
                        <TableCell>{lt.days_allowed} يوم</TableCell>
                        <TableCell>{lt.is_paid ? "✅ مدفوعة" : "❌ بدون راتب"}</TableCell>
                        <TableCell><Button size="icon" variant="ghost" className="text-destructive h-8 w-8" onClick={() => deleteLeaveType.mutate(lt.id)}><Trash2 className="h-4 w-4" /></Button></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              <form onSubmit={(e) => { e.preventDefault(); addLeaveType.mutate(new FormData(e.currentTarget)); e.currentTarget.reset(); }} className="border-t pt-4 space-y-3">
                <p className="font-heading font-bold text-sm">إضافة نوع إجازة</p>
                <div className="grid grid-cols-3 gap-3">
                  <Input name="lt_name" placeholder="نوع الإجازة" required />
                  <Input name="lt_days" type="number" placeholder="عدد الأيام" required />
                  <div className="flex items-center gap-2"><input type="checkbox" name="lt_paid" defaultChecked className="h-4 w-4" /><Label>مدفوعة</Label></div>
                </div>
                <Button size="sm" type="submit" className="font-heading" disabled={addLeaveType.isPending}>حفظ</Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {isAdmin && (
          <TabsContent value="workflows">
            <WorkflowTemplateManager />
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="doc-templates">
            <OfficialDocEditor />
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="signatories">
            <SignatoriesManager />
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="payroll-rules">
            <WorkPolicyCenter />
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="ai-settings">
            <AiSettingsAdmin />
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="branding">
            {companyId && company && <CompanyBranding company={company} companyId={companyId} />}
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="attendance">
            <AttendanceSettings />
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="health">
            <SystemHealthCheck />
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="local-runtime">
            <LocalModeSettings />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
