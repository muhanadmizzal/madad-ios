import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Settings2, Clock, AlertTriangle, TrendingUp, Calendar, DollarSign,
  Save, Plus, Trash2, Users, Building, GitBranch, FileText, Receipt, Copy
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { useToast } from "@/hooks/use-toast";
import { type WorkPolicy, DEFAULT_POLICY } from "@/hooks/useWorkPolicy";

const DAY_LABELS: Record<string, string> = {
  sun: "الأحد", mon: "الاثنين", tue: "الثلاثاء", wed: "الأربعاء",
  thu: "الخميس", fri: "الجمعة", sat: "السبت",
};

export default function WorkPolicyCenter() {
  const { companyId } = useCompany();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // All policies
  const { data: policies = [], isLoading } = useQuery({
    queryKey: ["work-policies", companyId],
    queryFn: async () => {
      const { data } = await supabase
        .from("payroll_policies")
        .select("*")
        .eq("company_id", companyId!)
        .order("is_default", { ascending: false });
      return data || [];
    },
    enabled: !!companyId,
  });

  // Assignments
  const { data: assignments = [] } = useQuery({
    queryKey: ["policy-assignments", companyId],
    queryFn: async () => {
      const { data } = await supabase
        .from("policy_assignments")
        .select("*, payroll_policies(name)")
        .eq("company_id", companyId!);
      return data || [];
    },
    enabled: !!companyId,
  });

  // Reference data
  const { data: departments = [] } = useQuery({
    queryKey: ["departments", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("departments").select("id, name").eq("company_id", companyId!);
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: branches = [] } = useQuery({
    queryKey: ["branches", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("branches").select("id, name").eq("company_id", companyId!);
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees-list", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("employees").select("id, name_ar, department_id, branch_id, contract_type").eq("company_id", companyId!).eq("status", "active");
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: positions = [] } = useQuery({
    queryKey: ["positions-list", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("positions").select("id, title_ar").eq("company_id", companyId!).order("title_ar");
      return data || [];
    },
    enabled: !!companyId,
  });

  const [selectedPolicyId, setSelectedPolicyId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");

  // Auto-select first policy
  useEffect(() => {
    if (!selectedPolicyId && policies.length > 0) setSelectedPolicyId(policies[0].id);
  }, [policies, selectedPolicyId]);

  const selectedPolicy = policies.find((p: any) => p.id === selectedPolicyId);

  // Form state
  const [form, setForm] = useState<any>({});
  useEffect(() => {
    if (selectedPolicy) {
      setForm({
        name: selectedPolicy.name || "",
        description: (selectedPolicy as any).description || "",
        salary_basis: selectedPolicy.salary_basis || "monthly_30",
        standard_hours_per_day: selectedPolicy.standard_hours_per_day || 8,
        working_days: (selectedPolicy as any).working_days || DEFAULT_POLICY.working_days,
        weekend_days: (selectedPolicy as any).weekend_days || DEFAULT_POLICY.weekend_days,
        working_hours_start: (selectedPolicy as any).working_hours_start || "08:00",
        working_hours_end: (selectedPolicy as any).working_hours_end || "16:00",
        late_grace_minutes: selectedPolicy.late_grace_minutes || 10,
        holiday_source: (selectedPolicy as any).holiday_source || "company",
        absence_definition: (selectedPolicy as any).absence_definition || "no_attendance_no_leave",
        absence_deduction_enabled: selectedPolicy.absence_deduction_enabled ?? true,
        late_deduction_enabled: selectedPolicy.late_deduction_enabled ?? true,
        late_deduction_type: selectedPolicy.late_deduction_type || "per_minute",
        late_deduction_rate: selectedPolicy.late_deduction_rate || 0,
        early_leave_deduction_enabled: selectedPolicy.early_leave_deduction_enabled ?? false,
        early_leave_deduction_rate: selectedPolicy.early_leave_deduction_rate || 0,
        overtime_enabled: selectedPolicy.overtime_enabled ?? true,
        overtime_threshold_minutes: (selectedPolicy as any).overtime_threshold_minutes || 0,
        overtime_rounding: (selectedPolicy as any).overtime_rounding || "none",
        unpaid_leave_deduction_enabled: selectedPolicy.unpaid_leave_deduction_enabled ?? true,
        leave_impact_rules: (selectedPolicy as any).leave_impact_rules || {},
        hourly_rate_basis: (selectedPolicy as any).hourly_rate_basis || "daily_divided",
        proration_enabled: selectedPolicy.proration_enabled ?? true,
        proration_basis: selectedPolicy.proration_basis || "calendar_days",
        overtime_multiplier: selectedPolicy.overtime_multiplier || 1.5,
        holiday_work_multiplier: selectedPolicy.holiday_work_multiplier || 2.0,
        weekend_work_multiplier: selectedPolicy.weekend_work_multiplier || 1.5,
        social_security_employee_pct: selectedPolicy.social_security_employee_pct || 5.0,
        social_security_employer_pct: selectedPolicy.social_security_employer_pct || 12.0,
        income_tax_enabled: selectedPolicy.income_tax_enabled ?? true,
        tax_mode: (selectedPolicy as any).tax_mode || "iraqi_brackets",
        loan_deduction_enabled: (selectedPolicy as any).loan_deduction_enabled ?? true,
        payslip_show_attendance: (selectedPolicy as any).payslip_show_attendance ?? true,
        payslip_show_overtime: (selectedPolicy as any).payslip_show_overtime ?? true,
        payslip_show_leave: (selectedPolicy as any).payslip_show_leave ?? true,
        payslip_language: (selectedPolicy as any).payslip_language || "ar",
      });
    }
  }, [selectedPolicy]);

  const set = (key: string, value: any) => setForm((f: any) => ({ ...f, [key]: value }));

  const toggleDay = (key: "working_days" | "weekend_days", day: string) => {
    const arr = [...(form[key] || [])];
    const idx = arr.indexOf(day);
    if (idx >= 0) arr.splice(idx, 1); else arr.push(day);
    set(key, arr);
  };

  // Save policy
  const savePolicy = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("payroll_policies").update({
        ...form,
        updated_at: new Date().toISOString(),
      } as any).eq("id", selectedPolicyId!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["work-policies"] });
      queryClient.invalidateQueries({ queryKey: ["work-policy-default"] });
      queryClient.invalidateQueries({ queryKey: ["payroll-policy"] });
      toast({ title: "تم حفظ السياسة" });
    },
    onError: (err: Error) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  // Create policy
  const createPolicy = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("payroll_policies").insert({
        company_id: companyId!,
        name: newName,
        description: newDesc || null,
        is_default: policies.length === 0,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["work-policies"] });
      setCreateOpen(false);
      setNewName("");
      setNewDesc("");
      toast({ title: "تم إنشاء السياسة" });
    },
    onError: (err: Error) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  // Duplicate policy
  const duplicatePolicy = useMutation({
    mutationFn: async () => {
      if (!selectedPolicy) return;
      const clone = { ...selectedPolicy } as any;
      delete clone.id;
      delete clone.created_at;
      delete clone.updated_at;
      clone.name = `${clone.name} (نسخة)`;
      clone.is_default = false;
      const { error } = await supabase.from("payroll_policies").insert(clone as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["work-policies"] });
      toast({ title: "تم نسخ السياسة" });
    },
    onError: (err: Error) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  // Delete policy
  const deletePolicy = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("payroll_policies").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      setSelectedPolicyId(null);
      queryClient.invalidateQueries({ queryKey: ["work-policies"] });
      toast({ title: "تم حذف السياسة" });
    },
  });

  // Set default
  const setDefault = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("payroll_policies").update({ is_default: false } as any).eq("company_id", companyId!);
      const { error } = await supabase.from("payroll_policies").update({ is_default: true } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["work-policies"] });
      toast({ title: "تم تعيين السياسة الافتراضية" });
    },
  });

  // Assignment
  const [assignType, setAssignType] = useState("employee");
  const [assignTarget, setAssignTarget] = useState("");

  const addAssignment = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("policy_assignments").insert({
        company_id: companyId!,
        policy_id: selectedPolicyId!,
        assignment_type: assignType,
        assignment_target_id: assignTarget,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["policy-assignments"] });
      setAssignTarget("");
      toast({ title: "تم التعيين" });
    },
    onError: (err: Error) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  const removeAssignment = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("policy_assignments").delete().eq("id", id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["policy-assignments"] });
      toast({ title: "تم الإزالة" });
    },
  });

  const policyAssignments = assignments.filter((a: any) => a.policy_id === selectedPolicyId);

  const getTargetLabel = (a: any) => {
    if (a.assignment_type === "employee") {
      const emp = employees.find((e: any) => e.id === a.assignment_target_id);
      return emp?.name_ar || a.assignment_target_id;
    }
    if (a.assignment_type === "position") {
      const pos = positions.find((p: any) => p.id === a.assignment_target_id);
      return pos?.title_ar || a.assignment_target_id;
    }
    if (a.assignment_type === "department") {
      const d = departments.find((d: any) => d.id === a.assignment_target_id);
      return d?.name || a.assignment_target_id;
    }
    if (a.assignment_type === "branch") {
      const b = branches.find((b: any) => b.id === a.assignment_target_id);
      return b?.name || a.assignment_target_id;
    }
    return a.assignment_target_id;
  };

  const assignTargetOptions = () => {
    if (assignType === "employee") return employees.map((e: any) => ({ id: e.id, label: e.name_ar }));
    if (assignType === "position") return positions.map((p: any) => ({ id: p.id, label: p.title_ar }));
    if (assignType === "department") return departments.map((d: any) => ({ id: d.id, label: d.name }));
    if (assignType === "branch") return branches.map((b: any) => ({ id: b.id, label: b.name }));
    return [
      { id: "permanent", label: "دائم" },
      { id: "contract", label: "عقد" },
      { id: "part_time", label: "دوام جزئي" },
    ];
  };

  if (isLoading) return <div className="text-center py-8 text-muted-foreground">جاري التحميل...</div>;

  return (
    <div className="space-y-6">
      {/* Policy Selector */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-heading font-bold text-xl flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-primary" />
            مركز سياسات العمل والرواتب
          </h2>
          <p className="text-sm text-muted-foreground mt-1">تكوين موحد لقواعد الحضور والإجازات والرواتب وكشف الراتب</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2 font-heading"><Plus className="h-4 w-4" />سياسة جديدة</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle className="font-heading">إنشاء سياسة جديدة</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2"><Label>اسم السياسة</Label><Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="مثال: سياسة الإداريين" /></div>
                <div className="space-y-2"><Label>الوصف</Label><Textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="وصف مختصر..." /></div>
                <Button className="w-full font-heading" onClick={() => createPolicy.mutate()} disabled={!newName || createPolicy.isPending}>إنشاء</Button>
              </div>
            </DialogContent>
          </Dialog>
          {selectedPolicy && (
            <Button className="gap-2 font-heading" onClick={() => savePolicy.mutate()} disabled={savePolicy.isPending}>
              <Save className="h-4 w-4" />{savePolicy.isPending ? "جاري الحفظ..." : "حفظ السياسة"}
            </Button>
          )}
        </div>
      </div>

      {/* Policy list */}
      <div className="flex gap-2 flex-wrap">
        {policies.map((p: any) => (
          <Button
            key={p.id}
            variant={selectedPolicyId === p.id ? "default" : "outline"}
            size="sm"
            className="gap-2 font-heading"
            onClick={() => setSelectedPolicyId(p.id)}
          >
            {p.name}
            {p.is_default && <Badge variant="secondary" className="text-[10px] px-1">افتراضية</Badge>}
          </Button>
        ))}
        {policies.length === 0 && (
          <p className="text-sm text-muted-foreground">لا توجد سياسات. أنشئ سياسة جديدة للبدء.</p>
        )}
      </div>

      {selectedPolicy && (
        <>
          {/* Policy actions bar */}
          <div className="flex gap-2 items-center">
            {!selectedPolicy.is_default && (
              <Button size="sm" variant="outline" className="font-heading text-xs" onClick={() => setDefault.mutate(selectedPolicy.id)}>تعيين كافتراضية</Button>
            )}
            <Button size="sm" variant="outline" className="font-heading text-xs gap-1" onClick={() => duplicatePolicy.mutate()}>
              <Copy className="h-3 w-3" />نسخ
            </Button>
            {!selectedPolicy.is_default && (
              <Button size="sm" variant="outline" className="font-heading text-xs text-destructive gap-1" onClick={() => deletePolicy.mutate(selectedPolicy.id)}>
                <Trash2 className="h-3 w-3" />حذف
              </Button>
            )}
          </div>

          {/* Section Tabs */}
          <Tabs defaultValue="calendar" className="w-full">
            <TabsList className="flex-wrap h-auto gap-1">
              <TabsTrigger value="calendar" className="font-heading text-xs gap-1"><Calendar className="h-3 w-3" />التقويم والأوقات</TabsTrigger>
              <TabsTrigger value="attendance" className="font-heading text-xs gap-1"><Clock className="h-3 w-3" />قواعد الحضور</TabsTrigger>
              <TabsTrigger value="leave" className="font-heading text-xs gap-1"><AlertTriangle className="h-3 w-3" />تأثير الإجازات</TabsTrigger>
              <TabsTrigger value="salary" className="font-heading text-xs gap-1"><DollarSign className="h-3 w-3" />حساب الراتب</TabsTrigger>
              <TabsTrigger value="deductions" className="font-heading text-xs gap-1"><TrendingUp className="h-3 w-3" />الخصومات والضرائب</TabsTrigger>
              <TabsTrigger value="payslip" className="font-heading text-xs gap-1"><Receipt className="h-3 w-3" />كشف الراتب</TabsTrigger>
              <TabsTrigger value="assignment" className="font-heading text-xs gap-1"><Users className="h-3 w-3" />التعيين</TabsTrigger>
            </TabsList>

            {/* 1. Calendar & Working Hours */}
            <TabsContent value="calendar">
              <Card>
                <CardHeader className="pb-3"><CardTitle className="font-heading text-base flex items-center gap-2"><Calendar className="h-4 w-4 text-primary" />التقويم وساعات العمل</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>اسم السياسة</Label>
                      <Input value={form.name || ""} onChange={e => set("name", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>الوصف</Label>
                      <Input value={form.description || ""} onChange={e => set("description", e.target.value)} placeholder="وصف مختصر" />
                    </div>
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <Label>أيام العمل</Label>
                    <div className="flex gap-2 flex-wrap">
                      {Object.entries(DAY_LABELS).map(([key, label]) => (
                        <Button
                          key={key}
                          type="button"
                          size="sm"
                          variant={(form.working_days || []).includes(key) ? "default" : "outline"}
                          onClick={() => toggleDay("working_days", key)}
                          className="font-heading text-xs"
                        >
                          {label}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>أيام العطلة الأسبوعية</Label>
                    <div className="flex gap-2 flex-wrap">
                      {Object.entries(DAY_LABELS).map(([key, label]) => (
                        <Button
                          key={key}
                          type="button"
                          size="sm"
                          variant={(form.weekend_days || []).includes(key) ? "destructive" : "outline"}
                          onClick={() => toggleDay("weekend_days", key)}
                          className="font-heading text-xs"
                        >
                          {label}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label>بداية الدوام</Label>
                      <Input type="time" value={form.working_hours_start || "08:00"} onChange={e => set("working_hours_start", e.target.value)} dir="ltr" className="text-left" />
                    </div>
                    <div className="space-y-2">
                      <Label>نهاية الدوام</Label>
                      <Input type="time" value={form.working_hours_end || "16:00"} onChange={e => set("working_hours_end", e.target.value)} dir="ltr" className="text-left" />
                    </div>
                    <div className="space-y-2">
                      <Label>ساعات العمل اليومية</Label>
                      <Input type="number" step="0.5" value={form.standard_hours_per_day || 8} onChange={e => set("standard_hours_per_day", Number(e.target.value))} dir="ltr" className="text-left" />
                    </div>
                    <div className="space-y-2">
                      <Label>فترة السماح (دقائق)</Label>
                      <Input type="number" value={form.late_grace_minutes || 10} onChange={e => set("late_grace_minutes", Number(e.target.value))} dir="ltr" className="text-left" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>مصدر العطل الرسمية</Label>
                    <Select value={form.holiday_source || "company"} onValueChange={v => set("holiday_source", v)}>
                      <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="company">جدول عطل الشركة</SelectItem>
                        <SelectItem value="national">العطل الوطنية</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 2. Attendance Rules */}
            <TabsContent value="attendance">
              <Card>
                <CardHeader className="pb-3"><CardTitle className="font-heading text-base flex items-center gap-2"><Clock className="h-4 w-4 text-primary" />قواعد الحضور والغياب</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>تعريف الغياب</Label>
                    <Select value={form.absence_definition || "no_attendance_no_leave"} onValueChange={v => set("absence_definition", v)}>
                      <SelectTrigger className="w-80"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="no_attendance_no_leave">لا حضور ولا إجازة مقبولة</SelectItem>
                        <SelectItem value="no_check_in">لا تسجيل دخول</SelectItem>
                        <SelectItem value="below_min_hours">أقل من الحد الأدنى للساعات</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div><Label>خصم الغياب بدون إذن</Label><p className="text-xs text-muted-foreground">خصم تلقائي عن كل يوم غياب</p></div>
                    <Switch checked={form.absence_deduction_enabled} onCheckedChange={v => set("absence_deduction_enabled", v)} />
                  </div>
                  <Separator />
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
                        <Input type="number" value={form.late_deduction_rate || 0} onChange={e => set("late_deduction_rate", Number(e.target.value))} dir="ltr" className="text-left" />
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
                        <Input type="number" value={form.early_leave_deduction_rate || 0} onChange={e => set("early_leave_deduction_rate", Number(e.target.value))} dir="ltr" className="text-left" />
                      </div>
                    </div>
                  )}
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div><Label>احتساب العمل الإضافي</Label></div>
                    <Switch checked={form.overtime_enabled} onCheckedChange={v => set("overtime_enabled", v)} />
                  </div>
                  {form.overtime_enabled && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pr-4 border-r-2 border-primary/20">
                      <div className="space-y-2">
                        <Label>حد أدنى للدقائق قبل الاحتساب</Label>
                        <Input type="number" value={form.overtime_threshold_minutes || 0} onChange={e => set("overtime_threshold_minutes", Number(e.target.value))} dir="ltr" className="text-left" />
                      </div>
                      <div className="space-y-2">
                        <Label>تقريب العمل الإضافي</Label>
                        <Select value={form.overtime_rounding || "none"} onValueChange={v => set("overtime_rounding", v)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">بدون تقريب</SelectItem>
                            <SelectItem value="round_15">تقريب لأقرب 15 دقيقة</SelectItem>
                            <SelectItem value="round_30">تقريب لأقرب 30 دقيقة</SelectItem>
                            <SelectItem value="round_60">تقريب لأقرب ساعة</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* 3. Leave Impact */}
            <TabsContent value="leave">
              <Card>
                <CardHeader className="pb-3"><CardTitle className="font-heading text-base flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-destructive" />تأثير الإجازات على الراتب</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div><Label>خصم الإجازة بدون راتب</Label><p className="text-xs text-muted-foreground">خصم تلقائي لأيام الإجازة غير المدفوعة</p></div>
                    <Switch checked={form.unpaid_leave_deduction_enabled} onCheckedChange={v => set("unpaid_leave_deduction_enabled", v)} />
                  </div>
                  <Separator />
                  <p className="text-sm text-muted-foreground">قواعد الإجازات الإضافية (نصف يوم، إجازة بالساعة) يتم تكوينها في إعدادات أنواع الإجازات.</p>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 4. Salary Calculation */}
            <TabsContent value="salary">
              <Card>
                <CardHeader className="pb-3"><CardTitle className="font-heading text-base flex items-center gap-2"><DollarSign className="h-4 w-4 text-primary" />قواعد حساب الراتب</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>أساس حساب اليومي</Label>
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
                      <Label>أساس حساب الساعة</Label>
                      <Select value={form.hourly_rate_basis || "daily_divided"} onValueChange={v => set("hourly_rate_basis", v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily_divided">اليومي ÷ ساعات العمل</SelectItem>
                          <SelectItem value="monthly_divided">الشهري ÷ (أيام × ساعات)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div><Label>تناسب الراتب (Proration)</Label><p className="text-xs text-muted-foreground">حساب تناسبي للملتحقين/المنسحبين خلال الشهر</p></div>
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
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                </CardContent>
              </Card>
            </TabsContent>

            {/* 5. Deductions & Statutory */}
            <TabsContent value="deductions">
              <Card>
                <CardHeader className="pb-3"><CardTitle className="font-heading text-base flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" />الخصومات والتأمينات والضرائب</CardTitle></CardHeader>
                <CardContent className="space-y-4">
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
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div><Label>ضريبة الدخل</Label></div>
                    <Switch checked={form.income_tax_enabled} onCheckedChange={v => set("income_tax_enabled", v)} />
                  </div>
                  {form.income_tax_enabled && (
                    <div className="pr-4 border-r-2 border-primary/20">
                      <div className="space-y-2 max-w-xs">
                        <Label>نظام الضريبة</Label>
                        <Select value={form.tax_mode || "iraqi_brackets"} onValueChange={v => set("tax_mode", v)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="iraqi_brackets">الشرائح العراقية</SelectItem>
                            <SelectItem value="flat_rate">نسبة ثابتة</SelectItem>
                            <SelectItem value="disabled">معطل</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div><Label>خصم أقساط السلف</Label><p className="text-xs text-muted-foreground">خصم تلقائي لأقساط السلف النشطة</p></div>
                    <Switch checked={form.loan_deduction_enabled ?? true} onCheckedChange={v => set("loan_deduction_enabled", v)} />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 6. Payslip Rules */}
            <TabsContent value="payslip">
              <Card>
                <CardHeader className="pb-3"><CardTitle className="font-heading text-base flex items-center gap-2"><Receipt className="h-4 w-4 text-primary" />إعدادات كشف الراتب</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div><Label>عرض ملخص الحضور</Label><p className="text-xs text-muted-foreground">إظهار بيانات الحضور والغياب في كشف الراتب</p></div>
                    <Switch checked={form.payslip_show_attendance ?? true} onCheckedChange={v => set("payslip_show_attendance", v)} />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div><Label>عرض تفاصيل العمل الإضافي</Label></div>
                    <Switch checked={form.payslip_show_overtime ?? true} onCheckedChange={v => set("payslip_show_overtime", v)} />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div><Label>عرض تفاصيل الإجازات</Label></div>
                    <Switch checked={form.payslip_show_leave ?? true} onCheckedChange={v => set("payslip_show_leave", v)} />
                  </div>
                  <Separator />
                  <div className="space-y-2 max-w-xs">
                    <Label>لغة كشف الراتب</Label>
                    <Select value={form.payslip_language || "ar"} onValueChange={v => set("payslip_language", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ar">العربية</SelectItem>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="both">ثنائي اللغة</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 7. Assignment */}
            <TabsContent value="assignment">
              <Card>
                <CardHeader className="pb-3"><CardTitle className="font-heading text-base flex items-center gap-2"><Users className="h-4 w-4 text-primary" />تعيين السياسة</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">عيّن هذه السياسة لموظفين أو أقسام أو فروع أو أنواع عقود محددة. الموظفون بدون تعيين يستخدمون السياسة الافتراضية.</p>

                  {policyAssignments.length > 0 && (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>النوع</TableHead>
                          <TableHead>الهدف</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {policyAssignments.map((a: any) => (
                          <TableRow key={a.id}>
                            <TableCell>
                              <Badge variant="outline">
                              {a.assignment_type === "employee" ? "موظف" :
                                 a.assignment_type === "position" ? "منصب" :
                                 a.assignment_type === "department" ? "قسم" :
                                 a.assignment_type === "branch" ? "فرع" : "نوع عقد"}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-medium">{getTargetLabel(a)}</TableCell>
                            <TableCell>
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => removeAssignment.mutate(a.id)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}

                  <Separator />
                  <div className="grid grid-cols-3 gap-3 items-end">
                    <div className="space-y-2">
                      <Label>نوع التعيين</Label>
                      <Select value={assignType} onValueChange={v => { setAssignType(v); setAssignTarget(""); }}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="employee">موظف</SelectItem>
                          <SelectItem value="position">منصب</SelectItem>
                          <SelectItem value="department">قسم</SelectItem>
                          <SelectItem value="branch">فرع</SelectItem>
                          <SelectItem value="contract_type">نوع عقد</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>الهدف</Label>
                      <Select value={assignTarget} onValueChange={setAssignTarget}>
                        <SelectTrigger><SelectValue placeholder="اختر..." /></SelectTrigger>
                        <SelectContent>
                          {assignTargetOptions().map((opt) => (
                            <SelectItem key={opt.id} value={opt.id}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button className="font-heading gap-1" onClick={() => addAssignment.mutate()} disabled={!assignTarget || addAssignment.isPending}>
                      <Plus className="h-4 w-4" />تعيين
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
