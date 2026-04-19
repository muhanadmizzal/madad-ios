import { useState } from "react";
import { Plus, Trash2, GripVertical, Edit2, ChevronUp, ChevronDown, FileText, Route, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { useToast } from "@/hooks/use-toast";
import { requestTypeLabels } from "@/hooks/useApprovalWorkflow";

const ROLE_OPTIONS = [
  { value: "admin", label: "مدير" },
  { value: "hr_manager", label: "مدير HR" },
  { value: "hr_officer", label: "مسؤول HR" },
  { value: "manager", label: "مدير قسم" },
  { value: "tenant_admin", label: "مدير المنشأة" },
  { value: "finance_manager", label: "مدير مالي" },
];

const ROUTING_MODES = [
  { value: "role", label: "حسب الدور" },
  { value: "position", label: "حسب المنصب" },
  { value: "manager_chain", label: "سلسلة المدير" },
  { value: "hr_owner", label: "مسؤول HR" },
  { value: "finance_owner", label: "المسؤول المالي" },
  { value: "tenant_admin", label: "مدير المنشأة" },
];

const FALLBACK_MODES = [
  { value: "hr_manager", label: "مدير HR" },
  { value: "tenant_admin", label: "مدير المنشأة" },
  { value: "department_manager", label: "مدير القسم" },
  { value: "parent_position", label: "المنصب الأعلى" },
  { value: "none", label: "بدون بديل" },
];

const DOC_TYPE_OPTIONS = [
  { value: "certificate_employment", label: "تعريف بالعمل" },
  { value: "certificate_salary", label: "شهادة راتب" },
  { value: "certificate_experience", label: "شهادة خبرة" },
  { value: "leave_approval", label: "موافقة إجازة" },
  { value: "warning_letter", label: "خطاب إنذار" },
  { value: "offer_letter", label: "عرض عمل" },
  { value: "contract", label: "عقد عمل" },
  { value: "general", label: "مستند عام" },
];

export function WorkflowTemplateManager() {
  const { companyId } = useCompany();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialog, setDialog] = useState(false);
  const [selectedType, setSelectedType] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [editStep, setEditStep] = useState<any>(null);
  const [editStepName, setEditStepName] = useState("");
  const [editStepRole, setEditStepRole] = useState("");
  const [editStepSLA, setEditStepSLA] = useState("");
  const [editStepOptional, setEditStepOptional] = useState(false);
  const [editStepRoutingMode, setEditStepRoutingMode] = useState("role");
  const [editStepFallbackMode, setEditStepFallbackMode] = useState("hr_manager");
  const [editStepSkipVacant, setEditStepSkipVacant] = useState(false);
  const [editStepDeptScope, setEditStepDeptScope] = useState(false);
  const [editStepPositionId, setEditStepPositionId] = useState("");

  const { data: templates = [] } = useQuery({
    queryKey: ["workflow-templates", companyId],
    queryFn: async () => {
      const { data } = await supabase
        .from("workflow_templates")
        .select("*, workflow_steps(*)")
        .eq("company_id", companyId!)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: positions = [] } = useQuery({
    queryKey: ["positions-for-workflow", companyId],
    queryFn: async () => {
      const { data } = await (supabase as any).from("positions").select("id, title, title_ar").eq("company_id", companyId!).eq("is_active", true);
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: signatories = [] } = useQuery({
    queryKey: ["company-signatories", companyId],
    queryFn: async () => {
      const { data } = await (supabase as any).from("company_signatories").select("id, name, name_ar, role").eq("company_id", companyId!).eq("is_active", true);
      return data || [];
    },
    enabled: !!companyId,
  });

  const createTemplate = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error("لا يوجد سياق شركة");
      if (!templateName.trim()) throw new Error("اسم القالب مطلوب");
      if (!selectedType) throw new Error("نوع الطلب مطلوب");
      
      const { data: tmpl, error } = await supabase
        .from("workflow_templates")
        .insert({ company_id: companyId, name: templateName.trim(), request_type: selectedType })
        .select()
        .single();
      if (error) throw error;
      
      const { error: stepError } = await supabase.from("workflow_steps").insert({
        template_id: tmpl.id, step_order: 1, name: "موافقة المدير", approver_role: "admin", sla_hours: 48,
      });
      if (stepError) {
        toast({ title: "تم إنشاء القالب", description: "لكن فشل إضافة المرحلة الأولى", variant: "destructive" });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflow-templates"] });
      toast({ title: "تم إنشاء القالب بنجاح" });
      setDialog(false);
      setTemplateName("");
      setSelectedType("");
    },
    onError: (err: Error) => toast({ title: "خطأ في إنشاء القالب", description: err.message, variant: "destructive" }),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("workflow_templates").update({ is_active: active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["workflow-templates"] }),
  });

  const updateTemplateDocConfig = useMutation({
    mutationFn: async ({ id, auto_generate_document, target_document_type, target_signatory_id }: any) => {
      const { error } = await supabase.from("workflow_templates").update({
        auto_generate_document,
        target_document_type: target_document_type || null,
        target_signatory_id: target_signatory_id || null,
      } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflow-templates"] });
      toast({ title: "تم تحديث إعدادات المستند" });
    },
    onError: (err: Error) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("workflow_steps").delete().eq("template_id", id);
      const { error } = await supabase.from("workflow_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflow-templates"] });
      toast({ title: "تم حذف القالب" });
    },
  });

  const addStep = useMutation({
    mutationFn: async ({ templateId, stepOrder }: { templateId: string; stepOrder: number }) => {
      const { error } = await supabase.from("workflow_steps").insert({
        template_id: templateId, step_order: stepOrder, name: `مرحلة ${stepOrder}`, approver_role: "admin", sla_hours: 48,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["workflow-templates"] }),
    onError: (err: Error) => toast({ title: "خطأ في إضافة المرحلة", description: err.message, variant: "destructive" }),
  });

  const updateStep = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const { error } = await supabase.from("workflow_steps").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflow-templates"] });
      setEditStep(null);
      toast({ title: "تم تحديث المرحلة" });
    },
  });

  const deleteStep = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("workflow_steps").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflow-templates"] });
      toast({ title: "تم حذف المرحلة" });
    },
  });

  const reorderStep = useMutation({
    mutationFn: async ({ steps, stepId, direction }: { steps: any[]; stepId: string; direction: "up" | "down" }) => {
      const sorted = [...steps].sort((a, b) => a.step_order - b.step_order);
      const idx = sorted.findIndex((s) => s.id === stepId);
      if ((direction === "up" && idx === 0) || (direction === "down" && idx === sorted.length - 1)) return;
      const swapIdx = direction === "up" ? idx - 1 : idx + 1;
      const orderA = sorted[idx].step_order;
      const orderB = sorted[swapIdx].step_order;
      await supabase.from("workflow_steps").update({ step_order: orderB }).eq("id", sorted[idx].id);
      await supabase.from("workflow_steps").update({ step_order: orderA }).eq("id", sorted[swapIdx].id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["workflow-templates"] }),
  });

  const openEditStep = (step: any) => {
    setEditStep(step);
    setEditStepName(step.name);
    setEditStepRole(step.approver_role);
    setEditStepSLA(String(step.sla_hours || ""));
    setEditStepOptional(step.is_optional || false);
    setEditStepRoutingMode(step.routing_mode || "role");
    setEditStepFallbackMode(step.fallback_mode || "hr_manager");
    setEditStepSkipVacant(step.skip_if_position_vacant || false);
    setEditStepDeptScope(step.department_scope || false);
    setEditStepPositionId(step.approver_position_id || "");
  };

  const getRoutingLabel = (step: any) => {
    const mode = step.routing_mode || "role";
    if (mode === "position" && step.approver_position_id) {
      const pos = positions.find((p: any) => p.id === step.approver_position_id);
      return pos?.title_ar || pos?.title || "منصب";
    }
    return ROUTING_MODES.find(r => r.value === mode)?.label || mode;
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-heading font-semibold text-lg">قوالب سير العمل</h3>
        <Dialog open={dialog} onOpenChange={setDialog}>
          <DialogTrigger asChild>
            <Button className="gap-2 font-heading"><Plus className="h-4 w-4" /> قالب جديد</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-heading">إنشاء قالب سير عمل</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>اسم القالب</Label>
                <Input value={templateName} onChange={(e) => setTemplateName(e.target.value)} placeholder="مثال: موافقة الإجازات" />
              </div>
              <div className="space-y-2">
                <Label>نوع الطلب</Label>
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(requestTypeLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full font-heading" onClick={() => createTemplate.mutate()} disabled={!templateName || !selectedType || createTemplate.isPending}>
                إنشاء
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {templates.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          <p className="font-heading">لا توجد قوالب. أنشئ قالبًا لبدء سير العمل التلقائي.</p>
          <p className="text-xs mt-1">بدون قالب، تعمل الموافقات بخطوة واحدة مباشرة.</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-4">
          {templates.map((t: any) => {
            const sortedSteps = [...(t.workflow_steps || [])].sort((a: any, b: any) => a.step_order - b.step_order);
            const autoGen = (t as any).auto_generate_document || false;
            const targetDocType = (t as any).target_document_type || "";
            const targetSigId = (t as any).target_signatory_id || "";
            return (
              <Card key={t.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CardTitle className="font-heading text-base">{t.name}</CardTitle>
                      <Badge variant="outline">{requestTypeLabels[t.request_type] || t.request_type}</Badge>
                      {autoGen && <Badge className="text-[10px] gap-1"><FileText className="h-2.5 w-2.5" />مستند تلقائي</Badge>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{t.is_active ? "مفعّل" : "معطّل"}</span>
                      <Switch checked={t.is_active} onCheckedChange={(v) => toggleActive.mutate({ id: t.id, active: v })} />
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteTemplate.mutate(t.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">ترتيب</TableHead>
                        <TableHead>الاسم</TableHead>
                        <TableHead>التوجيه</TableHead>
                        <TableHead>الدور / المنصب</TableHead>
                        <TableHead>البديل</TableHead>
                        <TableHead>المهلة</TableHead>
                        <TableHead>خيارات</TableHead>
                        <TableHead className="w-20">إجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedSteps.map((s: any, idx: number) => (
                        <TableRow key={s.id}>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <span>{s.step_order}</span>
                              <div className="flex flex-col">
                                <Button variant="ghost" size="icon" className="h-4 w-4" disabled={idx === 0}
                                  onClick={() => reorderStep.mutate({ steps: sortedSteps, stepId: s.id, direction: "up" })}>
                                  <ChevronUp className="h-3 w-3" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-4 w-4" disabled={idx === sortedSteps.length - 1}
                                  onClick={() => reorderStep.mutate({ steps: sortedSteps, stepId: s.id, direction: "down" })}>
                                  <ChevronDown className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">{s.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px] gap-1">
                              <Route className="h-2.5 w-2.5" />
                              {ROUTING_MODES.find(r => r.value === (s.routing_mode || "role"))?.label || "حسب الدور"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="text-xs">
                              {getRoutingLabel(s)}
                              {(s.routing_mode || "role") === "role" && (
                                <span className="mr-1">{ROLE_OPTIONS.find(r => r.value === s.approver_role)?.label || s.approver_role}</span>
                              )}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-[10px] text-muted-foreground">
                              {FALLBACK_MODES.find(f => f.value === (s.fallback_mode || "hr_manager"))?.label || "—"}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm">{s.sla_hours ? `${s.sla_hours}س` : "—"}</TableCell>
                          <TableCell>
                            <div className="flex gap-1 flex-wrap">
                              {s.is_optional && <Badge variant="outline" className="text-[10px] h-4 px-1">اختياري</Badge>}
                              {s.skip_if_position_vacant && <Badge variant="outline" className="text-[10px] h-4 px-1 text-warning border-warning/30">تخطي إن شاغر</Badge>}
                              {s.department_scope && <Badge variant="outline" className="text-[10px] h-4 px-1">نطاق القسم</Badge>}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditStep(s)}>
                                <Edit2 className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteStep.mutate(s.id)}
                                disabled={sortedSteps.length <= 1}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <Button variant="outline" size="sm" className="gap-1.5 font-heading"
                    onClick={() => addStep.mutate({ templateId: t.id, stepOrder: sortedSteps.length + 1 })}>
                    <Plus className="h-3 w-3" /> إضافة مرحلة
                  </Button>

                  {/* Document Generation Config */}
                  <div className="border-t pt-3 space-y-3">
                    <div className="flex items-center gap-3">
                      <FileText className="h-4 w-4 text-primary" />
                      <span className="font-heading text-sm font-medium">إنشاء مستند تلقائي عند الاعتماد</span>
                      <Switch checked={autoGen} onCheckedChange={(v) => updateTemplateDocConfig.mutate({
                        id: t.id, auto_generate_document: v, target_document_type: targetDocType, target_signatory_id: targetSigId,
                      })} />
                    </div>
                    {autoGen && (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">نوع المستند المُنشأ</Label>
                          <Select value={targetDocType} onValueChange={(v) => updateTemplateDocConfig.mutate({
                            id: t.id, auto_generate_document: true, target_document_type: v, target_signatory_id: targetSigId,
                          })}>
                            <SelectTrigger className="h-8"><SelectValue placeholder="اختر" /></SelectTrigger>
                            <SelectContent>
                              {DOC_TYPE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">المفوض بالتوقيع</Label>
                          <Select value={targetSigId} onValueChange={(v) => updateTemplateDocConfig.mutate({
                            id: t.id, auto_generate_document: true, target_document_type: targetDocType, target_signatory_id: v === "__none__" ? null : v,
                          })}>
                            <SelectTrigger className="h-8"><SelectValue placeholder="تلقائي" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">تلقائي (أول مفوض نشط)</SelectItem>
                              {signatories.map((s: any) => (
                                <SelectItem key={s.id} value={s.id}>{s.name_ar || s.name} — {s.role}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit Step Dialog */}
      <Dialog open={!!editStep} onOpenChange={(o) => !o && setEditStep(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="font-heading">تعديل مرحلة</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>اسم المرحلة</Label>
              <Input value={editStepName} onChange={(e) => setEditStepName(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>نوع التوجيه</Label>
                <Select value={editStepRoutingMode} onValueChange={setEditStepRoutingMode}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROUTING_MODES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>البديل عند الغياب</Label>
                <Select value={editStepFallbackMode} onValueChange={setEditStepFallbackMode}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FALLBACK_MODES.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {editStepRoutingMode === "role" && (
              <div className="space-y-2">
                <Label>الدور المطلوب</Label>
                <Select value={editStepRole} onValueChange={setEditStepRole}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            {editStepRoutingMode === "position" && (
              <div className="space-y-2">
                <Label>المنصب المعتمد</Label>
                <Select value={editStepPositionId} onValueChange={setEditStepPositionId}>
                  <SelectTrigger><SelectValue placeholder="اختر منصب" /></SelectTrigger>
                  <SelectContent>
                    {positions.map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>{p.title_ar || p.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>المهلة (ساعات)</Label>
              <Input type="number" value={editStepSLA} onChange={(e) => setEditStepSLA(e.target.value)} dir="ltr" className="text-left" />
            </div>
            <div className="space-y-3 border-t pt-3">
              <div className="flex items-center gap-2">
                <Checkbox checked={editStepOptional} onCheckedChange={(v) => setEditStepOptional(!!v)} id="step-optional" />
                <Label htmlFor="step-optional">مرحلة اختيارية</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox checked={editStepSkipVacant} onCheckedChange={(v) => setEditStepSkipVacant(!!v)} id="step-skip-vacant" />
                <Label htmlFor="step-skip-vacant">تخطي إذا كان المنصب شاغراً</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox checked={editStepDeptScope} onCheckedChange={(v) => setEditStepDeptScope(!!v)} id="step-dept-scope" />
                <Label htmlFor="step-dept-scope">نطاق القسم (توجيه حسب قسم مقدم الطلب)</Label>
              </div>
            </div>
            <Button className="w-full font-heading" onClick={() => editStep && updateStep.mutate({
              id: editStep.id,
              updates: {
                name: editStepName,
                approver_role: editStepRole,
                sla_hours: Number(editStepSLA) || null,
                is_optional: editStepOptional,
                routing_mode: editStepRoutingMode,
                fallback_mode: editStepFallbackMode,
                skip_if_position_vacant: editStepSkipVacant,
                department_scope: editStepDeptScope,
                approver_position_id: editStepPositionId || null,
              },
            })} disabled={updateStep.isPending}>
              حفظ التغييرات
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
