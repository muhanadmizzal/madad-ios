import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { AlertCircle, ArrowRightLeft, Copy, Pencil, Plus, Power, UserPlus } from "lucide-react";
import { logOrgAudit } from "@/lib/orgAudit";
import { useTransferEmployee } from "@/hooks/useTransferEmployee";

/* ═══════ Helper: auto-generate next position code ═══════ */
async function getNextPositionCode(companyId: string): Promise<string> {
  const { data } = await supabase.rpc("generate_position_code", { p_company_id: companyId });
  return (data as string) || "POS-0001";
}

/* ═══════ Add Node Dialog ═══════ */
type OrgNodeLevel = "department" | "section" | "unit" | "position";

const levelLabels: Record<OrgNodeLevel, string> = {
  department: "قسم",
  section: "شعبة",
  unit: "وحدة",
  position: "منصب",
};

interface AddNodeProps {
  open: boolean;
  onClose: () => void;
  companyId: string;
  parentPositionId?: string | null;
  parentDepartmentId?: string | null;
  parentType: "company" | "department" | "position";
  initialNodeType?: string;
}

export function AddNodeDialog({ open, onClose, companyId, parentPositionId, parentDepartmentId, parentType, initialNodeType }: AddNodeProps) {
  const qc = useQueryClient();

  // Determine allowed node types based on parent
  const getAllowedTypes = (): OrgNodeLevel[] => {
    // When initialNodeType is set (e.g. "position" from toolbar), lock to that type
    if (initialNodeType) return [initialNodeType as OrgNodeLevel];
    // "إضافة تشكيل" — allow department/section/unit selection
    if (parentType === "company") return ["department", "section", "unit", "position"];
    if (parentType === "department") return ["section", "unit", "position"];
    if (parentType === "position") return ["position"];
    return ["department", "section", "unit", "position"];
  };

  const allowedTypes = getAllowedTypes();
  const [nodeType, setNodeType] = useState<OrgNodeLevel>(allowedTypes[0]);
  const [titleAr, setTitleAr] = useState("");
  const [titleEn, setTitleEn] = useState("");
  const [departmentId, setDepartmentId] = useState(parentDepartmentId || "");
  const [isManager, setIsManager] = useState(false);
  const [gradeLevel, setGradeLevel] = useState("");
  const [positionCode, setPositionCode] = useState("");
  const [branchId, setBranchId] = useState("");
  const [autoCodeLoading, setAutoCodeLoading] = useState(false);

  // Reset nodeType when allowedTypes change (dialog reopens with different parent)
  useEffect(() => {
    if (open) {
      const allowed = getAllowedTypes();
      if (initialNodeType && allowed.includes(initialNodeType as OrgNodeLevel)) {
        setNodeType(initialNodeType as OrgNodeLevel);
      } else {
        setNodeType(allowed[0]);
      }
    }
  }, [open, parentType, initialNodeType]);

  // Auto-generate position code when creating a position
  useEffect(() => {
    if (open && (nodeType === "position") && !positionCode) {
      setAutoCodeLoading(true);
      getNextPositionCode(companyId).then(code => {
        setPositionCode(code);
        setAutoCodeLoading(false);
      }).catch(() => setAutoCodeLoading(false));
    }
  }, [open, nodeType, companyId]);

  const { data: departments = [] } = useQuery({
    queryKey: ["org-departments-list", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("departments").select("id, name, level, parent_department_id").eq("company_id", companyId).order("name");
      return data || [];
    },
    enabled: open && !!companyId,
  });

  const { data: branches = [] } = useQuery({
    queryKey: ["org-branches-list", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("branches").select("id, name").eq("company_id", companyId).order("name");
      return data || [];
    },
    enabled: open && (nodeType === "department") && !!companyId,
  });

  // Filter parent departments based on what we're creating
  const parentDepartments = departments.filter(d => {
    if (nodeType === "section") return (d as any).level === "department"; // شعبة goes under قسم
    if (nodeType === "unit") return (d as any).level === "section"; // وحدة goes under شعبة
    return true;
  });

  const addDept = useMutation({
    mutationFn: async () => {
      const level = nodeType === "section" ? "section" : nodeType === "unit" ? "unit" : "department";
      const parentDeptId = (nodeType === "section" || nodeType === "unit") ? departmentId : null;
      const { error } = await supabase.from("departments").insert({
        company_id: companyId,
        name: titleAr,
        branch_id: (nodeType === "department" && branchId) ? branchId : null,
        parent_department_id: parentDeptId || null,
        level,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: `تم إضافة ${levelLabels[nodeType]} بنجاح` });
      logOrgAudit(companyId, "INSERT", "departments", "", null, { name: titleAr, level: nodeType });
      qc.invalidateQueries({ queryKey: ["org-departments"] });
      handleClose();
    },
    onError: (e: any) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });

  const addPos = useMutation({
    mutationFn: async () => {
      // Auto-generate code if empty
      let code = positionCode;
      if (!code) {
        code = await getNextPositionCode(companyId);
      }
      const { error } = await supabase.from("positions").insert({
        company_id: companyId,
        title_ar: titleAr,
        title_en: titleEn || null,
        department_id: departmentId || null,
        parent_position_id: parentPositionId || null,
        is_manager: isManager,
        grade_level: gradeLevel ? parseInt(gradeLevel) : null,
        position_code: code,
        status: "vacant",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "تم إضافة المنصب بنجاح" });
      logOrgAudit(companyId, "INSERT", "positions", "", null, { title_ar: titleAr, department_id: departmentId, is_manager: isManager });
      qc.invalidateQueries({ queryKey: ["org-positions"] });
      handleClose();
    },
    onError: (e: any) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });

  const handleClose = () => {
    setTitleAr(""); setTitleEn(""); setDepartmentId(parentDepartmentId || "");
    setIsManager(false); setGradeLevel(""); setBranchId(""); setPositionCode("");
    onClose();
  };

  const handleSubmit = () => {
    if (!titleAr.trim()) { toast({ title: "يرجى إدخال الاسم بالعربية", variant: "destructive" }); return; }
    if (nodeType === "position") addPos.mutate();
    else addDept.mutate();
  };

  const loading = addDept.isPending || addPos.isPending;
  const isDeptType = nodeType === "department" || nodeType === "section" || nodeType === "unit";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Plus className="h-5 w-5" />إضافة عنصر للهيكل</DialogTitle>
          <DialogDescription>أضف قسم أو شعبة أو وحدة أو منصب للهيكل التنظيمي</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {allowedTypes.length > 1 && (
            <div className="space-y-1.5">
              <Label>النوع</Label>
              <Select value={nodeType} onValueChange={(v) => { setNodeType(v as OrgNodeLevel); setDepartmentId(parentDepartmentId || ""); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {allowedTypes.map(t => (
                    <SelectItem key={t} value={t}>{levelLabels[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1.5">
            <Label>الاسم بالعربية *</Label>
            <Input value={titleAr} onChange={(e) => setTitleAr(e.target.value)} placeholder={`مثال: ${nodeType === "department" ? "قسم الموارد البشرية" : nodeType === "section" ? "شعبة التوظيف" : nodeType === "unit" ? "وحدة المقابلات" : "مدير التسويق"}`} dir="rtl" />
          </div>

          {/* Position-specific fields */}
          {nodeType === "position" && (
            <>
              <div className="space-y-1.5">
                <Label>الاسم بالإنجليزية</Label>
                <Input value={titleEn} onChange={(e) => setTitleEn(e.target.value)} placeholder="e.g. Marketing Manager" dir="ltr" />
              </div>
              <div className="space-y-1.5">
                <Label>رمز المنصب (تلقائي)</Label>
                <Input value={positionCode} onChange={(e) => setPositionCode(e.target.value)} placeholder={autoCodeLoading ? "جاري التوليد..." : "POS-0001"} dir="ltr" className="font-mono" />
                <p className="text-[10px] text-muted-foreground">يتم توليد الرمز تلقائياً، يمكنك تعديله</p>
              </div>
              <div className="space-y-1.5">
                <Label>القسم / الوحدة</Label>
                <Select value={departmentId} onValueChange={setDepartmentId}>
                  <SelectTrigger><SelectValue placeholder="اختر القسم أو الوحدة" /></SelectTrigger>
                  <SelectContent>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {(d as any).level === "section" ? "↳ " : (d as any).level === "unit" ? "  ↳ " : ""}{d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <Label>منصب إداري</Label>
                <Switch checked={isManager} onCheckedChange={setIsManager} />
              </div>
              <div className="space-y-1.5">
                <Label>الدرجة الوظيفية</Label>
                <Input type="number" value={gradeLevel} onChange={(e) => setGradeLevel(e.target.value)} placeholder="1-15" />
              </div>
            </>
          )}

          {/* Section / Unit parent selection */}
          {(nodeType === "section" || nodeType === "unit") && (
            <div className="space-y-1.5">
              <Label>{nodeType === "section" ? "القسم الأب" : "الشعبة الأم"}</Label>
              <Select value={departmentId} onValueChange={setDepartmentId}>
                <SelectTrigger><SelectValue placeholder={nodeType === "section" ? "اختر القسم" : "اختر الشعبة"} /></SelectTrigger>
                <SelectContent>
                  {parentDepartments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Department branch selection */}
          {nodeType === "department" && (
            <div className="space-y-1.5">
              <Label>الفرع</Label>
              <Select value={branchId} onValueChange={setBranchId}>
                <SelectTrigger><SelectValue placeholder="اختر الفرع (اختياري)" /></SelectTrigger>
                <SelectContent>
                  {branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>إلغاء</Button>
          <Button onClick={handleSubmit} disabled={loading}>{loading ? "جاري..." : "إضافة"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ═══════ Assign Employee Dialog ═══════ */
interface AssignEmployeeProps {
  open: boolean;
  onClose: () => void;
  companyId: string;
  positionId: string;
  positionTitle: string;
}

export function AssignEmployeeDialog({ open, onClose, companyId, positionId, positionTitle }: AssignEmployeeProps) {
  const qc = useQueryClient();
  const [selectedEmpId, setSelectedEmpId] = useState("");
  const [selectedPosId, setSelectedPosId] = useState(positionId || "");

  useEffect(() => {
    if (open) setSelectedPosId(positionId || "");
  }, [open, positionId]);

  const effectivePosId = positionId || selectedPosId;

  // Vacant positions for selection when no positionId provided
  const { data: vacantPositions = [] } = useQuery({
    queryKey: ["vacant-positions", companyId],
    queryFn: async () => {
      const { data } = await supabase
        .from("positions").select("id, title_ar, position_code")
        .eq("company_id", companyId).eq("status", "vacant").order("title_ar");
      return data || [];
    },
    enabled: open && !positionId && !!companyId,
  });

  const { data: unassigned = [] } = useQuery({
    queryKey: ["unassigned-employees", companyId],
    queryFn: async () => {
      const { data } = await supabase
        .from("employees").select("id, name_ar, employee_code")
        .eq("company_id", companyId).eq("status", "active")
        .is("position_id", null).order("name_ar");
      return data || [];
    },
    enabled: open && !!companyId,
  });

  const assign = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("employees").update({ position_id: effectivePosId }).eq("id", selectedEmpId);
      if (error) throw error;
      await supabase.from("positions").update({ status: "filled" }).eq("id", effectivePosId);
    },
    onSuccess: () => {
      toast({ title: "تم تعيين الموظف بنجاح" });
      logOrgAudit(companyId, "UPDATE", "employees", selectedEmpId, { position_id: null }, { position_id: effectivePosId });
      qc.invalidateQueries({ queryKey: ["org-positions"] });
      qc.invalidateQueries({ queryKey: ["org-employees"] });
      setSelectedEmpId("");
      setSelectedPosId("");
      onClose();
    },
    onError: (e: any) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });

  const selectedPosTitle = positionTitle || vacantPositions.find(p => p.id === selectedPosId)?.title_ar || "";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><UserPlus className="h-5 w-5" />تعيين موظف</DialogTitle>
          <DialogDescription>{selectedPosTitle ? `تعيين موظف للمنصب: ${selectedPosTitle}` : "اختر المنصب والموظف"}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {/* Position picker when opened from toolbar */}
          {!positionId && (
            <div className="space-y-1.5">
              <Label>المنصب الشاغر</Label>
              <Select value={selectedPosId} onValueChange={setSelectedPosId}>
                <SelectTrigger><SelectValue placeholder="اختر المنصب الشاغر" /></SelectTrigger>
                <SelectContent>
                  {vacantPositions.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.title_ar} ({p.position_code})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {vacantPositions.length === 0 && <p className="text-xs text-muted-foreground">لا يوجد مناصب شاغرة حالياً</p>}
            </div>
          )}
          <div className="space-y-1.5">
            <Label>اختر الموظف</Label>
            <Select value={selectedEmpId} onValueChange={setSelectedEmpId}>
              <SelectTrigger><SelectValue placeholder="اختر موظف غير معيّن" /></SelectTrigger>
              <SelectContent>
                {unassigned.map((e) => (
                  <SelectItem key={e.id} value={e.id}>{e.name_ar} ({e.employee_code})</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {unassigned.length === 0 && <p className="text-xs text-muted-foreground">لا يوجد موظفين بدون منصب حالياً</p>}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>إلغاء</Button>
          <Button onClick={() => assign.mutate()} disabled={!selectedEmpId || !effectivePosId || assign.isPending}>
            {assign.isPending ? "جاري..." : "تعيين"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ═══════ Clone Position Dialog ═══════ */
interface ClonePositionProps {
  open: boolean;
  onClose: () => void;
  companyId: string;
  position: any;
}

export function ClonePositionDialog({ open, onClose, companyId, position }: ClonePositionProps) {
  const qc = useQueryClient();

  const clone = useMutation({
    mutationFn: async () => {
      if (!position) return;
      const titleAr = position.title_ar || position.label || "منصب";
      const newCode = await getNextPositionCode(companyId);
      const { error } = await supabase.from("positions").insert({
        company_id: companyId,
        title_ar: titleAr + " (نسخة)",
        title_en: position.title_en ? position.title_en + " (Copy)" : null,
        department_id: position.department_id || null,
        parent_position_id: position.parent_position_id || null,
        is_manager: position.is_manager ?? position.isManager ?? false,
        grade_level: position.grade_level || null,
        position_code: newCode,
        status: "vacant",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "تم نسخ المنصب بنجاح" });
      logOrgAudit(companyId, "INSERT", "positions", "", null, { cloned_from: position?.id, title_ar: (position?.title_ar || position?.label) + " (نسخة)" });
      qc.invalidateQueries({ queryKey: ["org-positions"] });
      onClose();
    },
    onError: (e: any) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });

  if (!position) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Copy className="h-5 w-5" />نسخ المنصب</DialogTitle>
          <DialogDescription>سيتم إنشاء نسخة شاغرة من المنصب "{position.title_ar || position.label}" مع رمز جديد تلقائي</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>إلغاء</Button>
          <Button onClick={() => clone.mutate()} disabled={clone.isPending}>{clone.isPending ? "جاري..." : "نسخ"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ═══════ Archive Confirm Dialog ═══════ */
interface ArchiveProps {
  open: boolean;
  onClose: () => void;
  nodeType: "department" | "position";
  nodeId: string;
  nodeTitle: string;
}

export function ArchiveConfirmDialog({ open, onClose, nodeType, nodeId, nodeTitle }: ArchiveProps) {
  const qc = useQueryClient();

  const archive = useMutation({
    mutationFn: async () => {
      if (nodeType === "position") {
        const { error } = await supabase.from("positions").update({ status: "inactive" }).eq("id", nodeId);
        if (error) throw error;
      } else {
        // Check for child departments
        const { count: childDeptCount } = await supabase.from("departments").select("id", { count: "exact", head: true }).eq("parent_department_id", nodeId);
        if (childDeptCount && childDeptCount > 0) {
          throw new Error("لا يمكن أرشفة عنصر يحتوي على عناصر فرعية. قم بنقل أو حذف العناصر الفرعية أولاً.");
        }
        const { count } = await supabase.from("positions").select("id", { count: "exact", head: true }).eq("department_id", nodeId);
        if (count && count > 0) {
          throw new Error("لا يمكن أرشفة قسم يحتوي على مناصب. قم بنقل أو حذف المناصب أولاً.");
        }
        const { error } = await supabase.from("departments").delete().eq("id", nodeId);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({ title: nodeType === "position" ? "تم أرشفة المنصب" : "تم حذف القسم" });
      qc.invalidateQueries({ queryKey: ["org-positions"] });
      qc.invalidateQueries({ queryKey: ["org-departments"] });
      onClose();
    },
    onError: (e: any) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive"><AlertCircle className="h-5 w-5" />تأكيد الأرشفة</DialogTitle>
          <DialogDescription>
            هل أنت متأكد من {nodeType === "position" ? "أرشفة" : "حذف"} "{nodeTitle}"؟
            {nodeType === "position" ? " سيتم تعيين الحالة إلى غير فعال." : " لا يمكن التراجع."}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>إلغاء</Button>
          <Button variant="destructive" onClick={() => archive.mutate()} disabled={archive.isPending}>
            {archive.isPending ? "جاري..." : "تأكيد"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ═══════ Edit Position Dialog (Comprehensive) ═══════ */
interface EditPositionProps {
  open: boolean;
  onClose: () => void;
  companyId: string;
  position: any;
}

const POSITION_STATUSES = [
  { value: "filled", label: "مشغول" },
  { value: "vacant", label: "شاغر" },
  { value: "hiring", label: "قيد التوظيف" },
  { value: "optional", label: "اختياري" },
  { value: "inactive", label: "غير فعال" },
];

const SYSTEM_ROLES = [
  { value: "tenant_admin", label: "مدير الشركة" },
  { value: "admin", label: "مسؤول" },
  { value: "hr_manager", label: "مدير الموارد البشرية" },
  { value: "hr_officer", label: "موظف موارد بشرية" },
  { value: "manager", label: "مدير قسم" },
  { value: "employee", label: "موظف" },
];

export function EditPositionDialog({ open, onClose, companyId, position }: EditPositionProps) {
  const qc = useQueryClient();
  const [titleAr, setTitleAr] = useState("");
  const [titleEn, setTitleEn] = useState("");
  const [isManager, setIsManager] = useState(false);
  const [gradeLevel, setGradeLevel] = useState("");
  const [positionCode, setPositionCode] = useState("");
  const [minSalary, setMinSalary] = useState("");
  const [maxSalary, setMaxSalary] = useState("");
  const [description, setDescription] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [parentPositionId, setParentPositionId] = useState("");
  const [status, setStatus] = useState("vacant");
  const [systemRole, setSystemRole] = useState("employee");

  useEffect(() => {
    if (open && position) {
      setTitleAr(position.title_ar || position.label || "");
      setTitleEn(position.title_en || "");
      setIsManager(position.is_manager ?? position.isManager ?? false);
      setGradeLevel(position.grade_level ? String(position.grade_level) : (position.salaryGrade || ""));
      setPositionCode(position.position_code ?? position.positionCode ?? "");
      setMinSalary(position.min_salary ? String(position.min_salary) : (position.minSalary ? String(position.minSalary) : ""));
      setMaxSalary(position.max_salary ? String(position.max_salary) : (position.maxSalary ? String(position.maxSalary) : ""));
      setDescription(position.description || "");
      setJobDescription(position.job_description || position.jobDescription || "");
      setDepartmentId(position.department_id || position.departmentId || "");
      setParentPositionId(position.parent_position_id || "");
      setStatus(position.status || "vacant");
      setSystemRole(position.system_role || position.systemRole || "employee");
    }
  }, [open, position?.id || position?.positionId]);

  const { data: departments = [] } = useQuery({
    queryKey: ["org-departments-list", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("departments").select("id, name, level").eq("company_id", companyId).order("name");
      return data || [];
    },
    enabled: open && !!companyId,
  });

  const { data: allPositions = [] } = useQuery({
    queryKey: ["org-positions-list", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("positions").select("id, title_ar, position_code").eq("company_id", companyId).order("title_ar");
      return data || [];
    },
    enabled: open && !!companyId,
  });

  const posId = position?.id || position?.positionId;
  const otherPositions = allPositions.filter(p => p.id !== posId);

  const update = useMutation({
    mutationFn: async () => {
      if (!posId) return;
      const oldValues = {
        title_ar: position.title_ar, status: position.status, department_id: position.department_id,
        parent_position_id: position.parent_position_id, system_role: position.system_role,
      };
      const newValues: any = {
        title_ar: titleAr,
        title_en: titleEn || null,
        is_manager: isManager,
        grade_level: gradeLevel ? parseInt(gradeLevel) : null,
        position_code: positionCode || null,
        min_salary: minSalary ? parseFloat(minSalary) : null,
        max_salary: maxSalary ? parseFloat(maxSalary) : null,
        description: description || null,
        job_description: jobDescription || null,
        department_id: departmentId || null,
        parent_position_id: parentPositionId || null,
        status,
        system_role: systemRole,
      };
      const { error } = await supabase.from("positions").update(newValues).eq("id", posId);
      if (error) throw error;
      logOrgAudit(companyId, "UPDATE", "positions", posId, oldValues, newValues);
    },
    onSuccess: () => {
      toast({ title: "تم تحديث المنصب بنجاح" });
      qc.invalidateQueries({ queryKey: ["org-positions"] });
      qc.invalidateQueries({ queryKey: ["org-employees"] });
      handleClose();
    },
    onError: (e: any) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });

  const handleClose = () => {
    setTitleAr(""); setTitleEn(""); setIsManager(false); setGradeLevel("");
    setPositionCode(""); setMinSalary(""); setMaxSalary(""); setDescription("");
    setJobDescription(""); setDepartmentId(""); setParentPositionId("");
    setStatus("vacant"); setSystemRole("employee");
    onClose();
  };

  if (!position) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Pencil className="h-5 w-5" />تعديل المنصب</DialogTitle>
          <DialogDescription>تعديل جميع خصائص المنصب الوظيفي</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-1">
          {/* Names */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">الاسم بالعربية *</Label>
              <Input value={titleAr} onChange={(e) => setTitleAr(e.target.value)} className="h-9 text-sm" dir="rtl" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">الاسم بالإنجليزية</Label>
              <Input value={titleEn} onChange={(e) => setTitleEn(e.target.value)} className="h-9 text-sm" dir="ltr" />
            </div>
          </div>

          {/* Code + Grade */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">رمز المنصب</Label>
              <Input value={positionCode} onChange={(e) => setPositionCode(e.target.value)} className="h-9 text-sm font-mono" dir="ltr" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">الدرجة الوظيفية</Label>
              <Input type="number" value={gradeLevel} onChange={(e) => setGradeLevel(e.target.value)} className="h-9 text-sm" placeholder="1-15" />
            </div>
          </div>

          {/* Status + System Role */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">الحالة</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {POSITION_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">دور النظام</Label>
              <Select value={systemRole} onValueChange={setSystemRole}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SYSTEM_ROLES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Department + Parent Position (Reporting Line) */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">القسم / الوحدة</Label>
              <Select value={departmentId} onValueChange={setDepartmentId}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="اختر القسم" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">بدون قسم</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {(d as any).level === "section" ? "↳ " : (d as any).level === "unit" ? "  ↳ " : ""}{d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">تبعية لـ (المنصب الأب)</Label>
              <Select value={parentPositionId} onValueChange={setParentPositionId}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="بدون تبعية" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">بدون تبعية (مستقل)</SelectItem>
                  {otherPositions.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.title_ar} {p.position_code ? `(${p.position_code})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Manager toggle */}
          <div className="flex items-center justify-between rounded-lg border border-border p-2.5">
            <Label className="text-xs">منصب إداري</Label>
            <Switch checked={isManager} onCheckedChange={setIsManager} />
          </div>

          {/* Salary Range */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">الحد الأدنى للراتب</Label>
              <Input type="number" value={minSalary} onChange={(e) => setMinSalary(e.target.value)} className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">الحد الأقصى للراتب</Label>
              <Input type="number" value={maxSalary} onChange={(e) => setMaxSalary(e.target.value)} className="h-9 text-sm" />
            </div>
          </div>

          {/* Description + Job Description */}
          <div className="space-y-1.5">
            <Label className="text-xs">الوصف</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="text-sm" rows={2} dir="rtl" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">الوصف الوظيفي / المسؤوليات</Label>
            <Textarea value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} className="text-sm" rows={3} dir="rtl" placeholder="المهام والمسؤوليات الرئيسية..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>إلغاء</Button>
          <Button onClick={() => update.mutate()} disabled={update.isPending || !titleAr.trim()}>
            {update.isPending ? "جاري..." : "حفظ"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ═══════ Edit Department Dialog ═══════ */
interface EditDepartmentProps {
  open: boolean;
  onClose: () => void;
  companyId: string;
  department: any;
}

export function EditDepartmentDialog({ open, onClose, companyId, department }: EditDepartmentProps) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [branchId, setBranchId] = useState("");
  const [parentDeptId, setParentDeptId] = useState("");
  const [managerPositionId, setManagerPositionId] = useState("");

  useEffect(() => {
    if (open && department) {
      setName(department.name || "");
      setBranchId(department.branch_id || "");
      setParentDeptId(department.parent_department_id || "");
      setManagerPositionId(department.manager_position_id || "");
    }
  }, [open, department?.id]);

  const { data: branches = [] } = useQuery({
    queryKey: ["org-branches-list", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("branches").select("id, name").eq("company_id", companyId).order("name");
      return data || [];
    },
    enabled: open && !!companyId,
  });

  const { data: departments = [] } = useQuery({
    queryKey: ["org-departments-list", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("departments").select("id, name, level").eq("company_id", companyId).order("name");
      return data || [];
    },
    enabled: open && !!companyId,
  });

  const { data: positions = [] } = useQuery({
    queryKey: ["org-positions-list", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("positions").select("id, title_ar, position_code, is_manager").eq("company_id", companyId).order("title_ar");
      return data || [];
    },
    enabled: open && !!companyId,
  });

  const deptId = department?.id;
  const otherDepts = departments.filter(d => d.id !== deptId);

  const update = useMutation({
    mutationFn: async () => {
      if (!deptId) return;
      const updates: any = {
        name,
        branch_id: branchId || null,
        parent_department_id: parentDeptId || null,
        manager_position_id: managerPositionId || null,
      };
      const { error } = await supabase.from("departments").update(updates).eq("id", deptId);
      if (error) throw error;
      logOrgAudit(companyId, "UPDATE", "departments", deptId, { name: department.name }, updates);
    },
    onSuccess: () => {
      toast({ title: "تم تحديث القسم بنجاح" });
      qc.invalidateQueries({ queryKey: ["org-departments"] });
      handleClose();
    },
    onError: (e: any) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });

  const handleClose = () => {
    setName(""); setBranchId(""); setParentDeptId(""); setManagerPositionId("");
    onClose();
  };

  if (!department) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Pencil className="h-5 w-5" />تعديل القسم</DialogTitle>
          <DialogDescription>تعديل بيانات القسم / الشعبة / الوحدة</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">الاسم *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="h-9 text-sm" dir="rtl" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">الفرع</Label>
            <Select value={branchId} onValueChange={setBranchId}>
              <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="بدون فرع" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">بدون فرع</SelectItem>
                {branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">القسم الأب</Label>
            <Select value={parentDeptId} onValueChange={setParentDeptId}>
              <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="بدون قسم أب" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">بدون قسم أب (مستقل)</SelectItem>
                {otherDepts.map(d => (
                  <SelectItem key={d.id} value={d.id}>
                    {(d as any).level === "section" ? "↳ " : (d as any).level === "unit" ? "  ↳ " : ""}{d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">المنصب الإداري (مدير القسم)</Label>
            <Select value={managerPositionId} onValueChange={setManagerPositionId}>
              <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="بدون مدير" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">بدون مدير</SelectItem>
                {positions.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.title_ar} {p.position_code ? `(${p.position_code})` : ""} {p.is_manager ? "⭐" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>إلغاء</Button>
          <Button onClick={() => update.mutate()} disabled={update.isPending || !name.trim()}>
            {update.isPending ? "جاري..." : "حفظ"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ═══════ Activate Position Dialog ═══════ */
interface ActivateProps {
  open: boolean;
  onClose: () => void;
  positionId: string;
  positionTitle: string;
}

export function ActivatePositionDialog({ open, onClose, positionId, positionTitle }: ActivateProps) {
  const qc = useQueryClient();

  const activate = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("positions").update({ status: "vacant" }).eq("id", positionId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "تم تفعيل المنصب بنجاح" });
      qc.invalidateQueries({ queryKey: ["org-positions"] });
      onClose();
    },
    onError: (e: any) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Power className="h-5 w-5 text-primary" />تفعيل المنصب</DialogTitle>
          <DialogDescription>هل تريد إعادة تفعيل المنصب "{positionTitle}"؟ سيتم تعيين حالته إلى "شاغر".</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>إلغاء</Button>
          <Button onClick={() => activate.mutate()} disabled={activate.isPending}>
            {activate.isPending ? "جاري..." : "تفعيل"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ═══════ Transfer Employee Dialog ═══════ */
interface TransferProps {
  open: boolean;
  onClose: () => void;
  companyId: string;
  employeeId: string;
  employeeName: string;
  currentPositionId?: string;
}

export function TransferEmployeeDialog({ open, onClose, companyId, employeeId, employeeName, currentPositionId }: TransferProps) {
  const [selectedDeptId, setSelectedDeptId] = useState("");
  const [selectedPosId, setSelectedPosId] = useState("");
  const [reason, setReason] = useState("");
  const transfer = useTransferEmployee();

  const { data: departments = [] } = useQuery({
    queryKey: ["transfer-departments", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("departments").select("id, name, level").eq("company_id", companyId).order("name");
      return data || [];
    },
    enabled: open && !!companyId,
  });

  const { data: vacantPositions = [] } = useQuery({
    queryKey: ["transfer-vacant-positions", companyId, selectedDeptId],
    queryFn: async () => {
      let query = supabase.from("positions")
        .select("id, title_ar, position_code, department_id, grade_level, status")
        .eq("company_id", companyId)
        .in("status", ["vacant", "hiring"])
        .order("title_ar");
      if (selectedDeptId) query = query.eq("department_id", selectedDeptId);
      const { data } = await query;
      return (data || []).filter(p => p.id !== currentPositionId);
    },
    enabled: open && !!companyId,
  });

  const handleClose = () => {
    setSelectedDeptId(""); setSelectedPosId(""); setReason("");
    onClose();
  };

  const handleTransfer = () => {
    transfer.mutate(
      { employeeId, newPositionId: selectedPosId, reason: reason || undefined },
      { onSuccess: handleClose }
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><ArrowRightLeft className="h-5 w-5 text-primary" />نقل موظف</DialogTitle>
          <DialogDescription>نقل {employeeName} إلى منصب جديد. سيتم تحديث القسم والفرع والصلاحيات تلقائياً.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>تصفية حسب القسم (اختياري)</Label>
            <Select value={selectedDeptId} onValueChange={(v) => { setSelectedDeptId(v); setSelectedPosId(""); }}>
              <SelectTrigger><SelectValue placeholder="جميع الأقسام" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">جميع الأقسام</SelectItem>
                {departments.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {(d as any).level === "section" ? "↳ " : (d as any).level === "unit" ? "  ↳ " : ""}{d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>المنصب الجديد *</Label>
            <Select value={selectedPosId} onValueChange={setSelectedPosId}>
              <SelectTrigger><SelectValue placeholder="اختر المنصب الشاغر" /></SelectTrigger>
              <SelectContent>
                {vacantPositions.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.title_ar} {p.position_code ? `(${p.position_code})` : ""} {p.grade_level ? `— درجة ${p.grade_level}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {vacantPositions.length === 0 && <p className="text-xs text-muted-foreground">لا توجد مناصب شاغرة {selectedDeptId ? "في هذا القسم" : ""}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>سبب النقل</Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="ترقية، إعادة هيكلة..." rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>إلغاء</Button>
          <Button onClick={handleTransfer} disabled={!selectedPosId || transfer.isPending}>
            {transfer.isPending ? "جاري النقل..." : "نقل الموظف"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
