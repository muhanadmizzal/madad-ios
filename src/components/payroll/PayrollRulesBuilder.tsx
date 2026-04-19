import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Settings2, Clock, AlertTriangle, TrendingUp, Calendar, DollarSign, Save } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { useToast } from "@/hooks/use-toast";

export default function PayrollRulesBuilder() {
  const { companyId } = useCompany();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: policy, isLoading } = useQuery({
    queryKey: ["payroll-policy", companyId],
    queryFn: async () => {
      const { data } = await supabase
        .from("payroll_policies")
        .select("*")
        .eq("company_id", companyId!)
        .eq("is_default", true)
        .maybeSingle();
      return data;
    },
    enabled: !!companyId,
  });

  const [form, setForm] = useState({
    name: "السياسة الافتراضية",
    salary_basis: "monthly_30",
    standard_hours_per_day: 8,
    absence_deduction_enabled: true,
    unpaid_leave_deduction_enabled: true,
    late_deduction_enabled: true,
    late_deduction_type: "per_minute",
    late_deduction_rate: 0,
    late_grace_minutes: 10,
    early_leave_deduction_enabled: false,
    early_leave_deduction_rate: 0,
    overtime_enabled: true,
    overtime_multiplier: 1.5,
    holiday_work_multiplier: 2.0,
    weekend_work_multiplier: 1.5,
    proration_enabled: true,
    proration_basis: "calendar_days",
    social_security_employee_pct: 5.0,
    social_security_employer_pct: 12.0,
    income_tax_enabled: true,
  });

  useEffect(() => {
    if (policy) {
      setForm({
        name: policy.name || "السياسة الافتراضية",
        salary_basis: policy.salary_basis || "monthly_30",
        standard_hours_per_day: policy.standard_hours_per_day || 8,
        absence_deduction_enabled: policy.absence_deduction_enabled ?? true,
        unpaid_leave_deduction_enabled: policy.unpaid_leave_deduction_enabled ?? true,
        late_deduction_enabled: policy.late_deduction_enabled ?? true,
        late_deduction_type: policy.late_deduction_type || "per_minute",
        late_deduction_rate: policy.late_deduction_rate || 0,
        late_grace_minutes: policy.late_grace_minutes || 10,
        early_leave_deduction_enabled: policy.early_leave_deduction_enabled ?? false,
        early_leave_deduction_rate: policy.early_leave_deduction_rate || 0,
        overtime_enabled: policy.overtime_enabled ?? true,
        overtime_multiplier: policy.overtime_multiplier || 1.5,
        holiday_work_multiplier: policy.holiday_work_multiplier || 2.0,
        weekend_work_multiplier: policy.weekend_work_multiplier || 1.5,
        proration_enabled: policy.proration_enabled ?? true,
        proration_basis: policy.proration_basis || "calendar_days",
        social_security_employee_pct: policy.social_security_employee_pct || 5.0,
        social_security_employer_pct: policy.social_security_employer_pct || 12.0,
        income_tax_enabled: policy.income_tax_enabled ?? true,
      });
    }
  }, [policy]);

  const savePolicy = useMutation({
    mutationFn: async () => {
      if (policy?.id) {
        const { error } = await supabase.from("payroll_policies").update({ ...form, updated_at: new Date().toISOString() } as any).eq("id", policy.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("payroll_policies").insert({ ...form, company_id: companyId!, is_default: true } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payroll-policy"] });
      toast({ title: "تم حفظ سياسة الرواتب" });
    },
    onError: (err: Error) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  const set = (key: string, value: any) => setForm(f => ({ ...f, [key]: value }));

  if (isLoading) return <div className="text-center py-8 text-muted-foreground">جاري التحميل...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading font-bold text-xl flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-primary" />
            محرك قواعد الرواتب
          </h2>
          <p className="text-sm text-muted-foreground mt-1">تكوين سياسات حساب الراتب والخصومات</p>
        </div>
        <Button className="gap-2 font-heading" onClick={() => savePolicy.mutate()} disabled={savePolicy.isPending}>
          <Save className="h-4 w-4" />{savePolicy.isPending ? "جاري الحفظ..." : "حفظ السياسة"}
        </Button>
      </div>

      {/* Salary Basis */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="font-heading text-base flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-primary" />أساس حساب الراتب
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>طريقة حساب اليومي</Label>
              <Select value={form.salary_basis} onValueChange={v => set("salary_basis", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly_30">شهري / 30 يوم</SelectItem>
                  <SelectItem value="monthly_calendar">شهري / أيام الشهر الفعلية</SelectItem>
                  <SelectItem value="monthly_working">شهري / أيام العمل الفعلية</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>ساعات العمل اليومية</Label>
              <Input type="number" step="0.5" value={form.standard_hours_per_day} onChange={e => set("standard_hours_per_day", Number(e.target.value))} dir="ltr" className="text-left" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Absence & Leave */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="font-heading text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />الغياب والإجازات
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div><Label>خصم الغياب بدون إذن</Label><p className="text-xs text-muted-foreground">خصم تلقائي عن كل يوم غياب</p></div>
            <Switch checked={form.absence_deduction_enabled} onCheckedChange={v => set("absence_deduction_enabled", v)} />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div><Label>خصم الإجازة بدون راتب</Label><p className="text-xs text-muted-foreground">خصم تلقائي لأيام الإجازة غير المدفوعة</p></div>
            <Switch checked={form.unpaid_leave_deduction_enabled} onCheckedChange={v => set("unpaid_leave_deduction_enabled", v)} />
          </div>
        </CardContent>
      </Card>

      {/* Late / Early */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="font-heading text-base flex items-center gap-2">
            <Clock className="h-4 w-4 text-accent-foreground" />التأخير والخروج المبكر
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div><Label>خصم التأخير</Label></div>
            <Switch checked={form.late_deduction_enabled} onCheckedChange={v => set("late_deduction_enabled", v)} />
          </div>
          {form.late_deduction_enabled && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pr-4 border-r-2 border-primary/20">
              <div className="space-y-2">
                <Label>طريقة الخصم</Label>
                <Select value={form.late_deduction_type} onValueChange={v => set("late_deduction_type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="per_minute">لكل دقيقة</SelectItem>
                    <SelectItem value="per_incident">لكل حادثة تأخير</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>مبلغ الخصم (د.ع)</Label>
                <Input type="number" value={form.late_deduction_rate} onChange={e => set("late_deduction_rate", Number(e.target.value))} dir="ltr" className="text-left" />
              </div>
              <div className="space-y-2">
                <Label>فترة السماح (دقائق)</Label>
                <Input type="number" value={form.late_grace_minutes} onChange={e => set("late_grace_minutes", Number(e.target.value))} dir="ltr" className="text-left" />
              </div>
            </div>
          )}
          <Separator />
          <div className="flex items-center justify-between">
            <div><Label>خصم الخروج المبكر</Label></div>
            <Switch checked={form.early_leave_deduction_enabled} onCheckedChange={v => set("early_leave_deduction_enabled", v)} />
          </div>
          {form.early_leave_deduction_enabled && (
            <div className="pr-4 border-r-2 border-primary/20">
              <div className="space-y-2 max-w-xs">
                <Label>مبلغ خصم لكل دقيقة (د.ع)</Label>
                <Input type="number" value={form.early_leave_deduction_rate} onChange={e => set("early_leave_deduction_rate", Number(e.target.value))} dir="ltr" className="text-left" />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Overtime & Special Work */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="font-heading text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />العمل الإضافي والتعويضات
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div><Label>احتساب العمل الإضافي</Label></div>
            <Switch checked={form.overtime_enabled} onCheckedChange={v => set("overtime_enabled", v)} />
          </div>
          {form.overtime_enabled && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pr-4 border-r-2 border-primary/20">
              <div className="space-y-2">
                <Label>معامل العمل الإضافي</Label>
                <Input type="number" step="0.1" value={form.overtime_multiplier} onChange={e => set("overtime_multiplier", Number(e.target.value))} dir="ltr" className="text-left" />
              </div>
              <div className="space-y-2">
                <Label>معامل أيام العطل</Label>
                <Input type="number" step="0.1" value={form.holiday_work_multiplier} onChange={e => set("holiday_work_multiplier", Number(e.target.value))} dir="ltr" className="text-left" />
              </div>
              <div className="space-y-2">
                <Label>معامل نهاية الأسبوع</Label>
                <Input type="number" step="0.1" value={form.weekend_work_multiplier} onChange={e => set("weekend_work_multiplier", Number(e.target.value))} dir="ltr" className="text-left" />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Proration & Statutory */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="font-heading text-base flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />التناسب والتأمينات
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div><Label>تناسب الراتب للملتحقين/المنسحبين</Label><p className="text-xs text-muted-foreground">حساب تناسبي للموظفين الذين التحقوا أو غادروا خلال الشهر</p></div>
            <Switch checked={form.proration_enabled} onCheckedChange={v => set("proration_enabled", v)} />
          </div>
          {form.proration_enabled && (
            <div className="pr-4 border-r-2 border-primary/20">
              <div className="space-y-2 max-w-xs">
                <Label>أساس التناسب</Label>
                <Select value={form.proration_basis} onValueChange={v => set("proration_basis", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="calendar_days">أيام الشهر التقويمية</SelectItem>
                    <SelectItem value="working_days">أيام العمل الفعلية</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <Separator />
          <div className="flex items-center justify-between">
            <div><Label>ضريبة الدخل</Label></div>
            <Switch checked={form.income_tax_enabled} onCheckedChange={v => set("income_tax_enabled", v)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>نسبة التأمينات - الموظف (%)</Label>
              <Input type="number" step="0.1" value={form.social_security_employee_pct} onChange={e => set("social_security_employee_pct", Number(e.target.value))} dir="ltr" className="text-left" />
            </div>
            <div className="space-y-2">
              <Label>نسبة التأمينات - صاحب العمل (%)</Label>
              <Input type="number" step="0.1" value={form.social_security_employer_pct} onChange={e => set("social_security_employer_pct", Number(e.target.value))} dir="ltr" className="text-left" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
