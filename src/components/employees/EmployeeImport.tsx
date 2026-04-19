import { useRef, useState } from "react";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, Settings2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import * as XLSX from "xlsx";

interface EmployeeImportProps {
  companyId: string;
  departments: any[];
  branches: any[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ImportRow {
  name_ar: string;
  name_en?: string;
  position?: string;
  phone?: string;
  email?: string;
  basic_salary?: number;
  hire_date?: string;
  national_id?: string;
  gender?: string;
  department?: string;
  branch?: string;
  manager?: string;
  employee_code?: string;
  error?: string;
  // Resolved refs
  _departmentId?: string | null;
  _branchId?: string | null;
  _positionAction?: "create" | "match_vacant" | "error";
  _positionTitle?: string;
  _matchedPositionId?: string | null;
  _managerResolved?: boolean;
}

interface ImportSettings {
  autoCreatePositions: boolean;
  matchVacantFirst: boolean;
  autoCreateDepartments: boolean;
  createPlaceholderManagers: boolean;
}

const FIELD_MAP: Record<string, string> = {
  "الاسم": "name_ar", "الاسم بالعربي": "name_ar", "name_ar": "name_ar", "الاسم العربي": "name_ar",
  "الاسم بالإنجليزي": "name_en", "name_en": "name_en",
  "المنصب": "position", "الوظيفة": "position", "position": "position",
  "الهاتف": "phone", "رقم الهاتف": "phone", "phone": "phone",
  "البريد الإلكتروني": "email", "الإيميل": "email", "email": "email",
  "الراتب": "basic_salary", "الراتب الأساسي": "basic_salary", "basic_salary": "basic_salary",
  "تاريخ التعيين": "hire_date", "hire_date": "hire_date",
  "الرقم الوطني": "national_id", "national_id": "national_id",
  "الجنس": "gender", "gender": "gender",
  "القسم": "department", "department": "department",
  "الفرع": "branch", "branch": "branch",
  "المدير": "manager", "manager": "manager", "المسؤول": "manager",
  "رمز الموظف": "employee_code", "employee_code": "employee_code", "الرمز": "employee_code",
};

export function EmployeeImport({ companyId, departments, branches, open, onOpenChange }: EmployeeImportProps) {
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<"upload" | "preview" | "result">("upload");
  const [result, setResult] = useState<{ success: number; failed: number; positionsCreated: number; positionsMatched: number } | null>(null);
  const [settings, setSettings] = useState<ImportSettings>({
    autoCreatePositions: true,
    matchVacantFirst: true,
    autoCreateDepartments: false,
    createPlaceholderManagers: false,
  });
  const [showSettings, setShowSettings] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const wb = XLSX.read(evt.target?.result, { type: "binary" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const raw: any[] = XLSX.utils.sheet_to_json(ws, { defval: "" });

      const parsed: ImportRow[] = raw.map((row) => {
        const mapped: any = {};
        Object.entries(row).forEach(([key, val]) => {
          const field = FIELD_MAP[key.trim()];
          if (field) mapped[field] = typeof val === "string" ? val.trim() : val;
        });

        if (!mapped.name_ar) mapped.error = "الاسم مطلوب";
        if (mapped.basic_salary) mapped.basic_salary = Number(mapped.basic_salary) || 0;
        if (mapped.gender) {
          const g = String(mapped.gender).trim().toLowerCase();
          mapped.gender = g === "ذكر" || g === "male" ? "male" : g === "أنثى" || g === "female" ? "female" : null;
        }

        return mapped as ImportRow;
      });

      // Resolve departments and branches
      const resolved = await resolveReferences(parsed);
      setRows(resolved);
      setPhase("preview");
    };
    reader.readAsBinaryString(file);
    e.target.value = "";
  };

  const resolveReferences = async (parsed: ImportRow[]): Promise<ImportRow[]> => {
    // Fetch existing vacant positions for matching
    const { data: vacantPositions } = await supabase
      .from("positions")
      .select("id, title_ar, title_en, department_id, branch_id, status")
      .eq("company_id", companyId)
      .eq("status", "vacant");

    return parsed.map((row) => {
      if (row.error) return row;

      // Resolve department
      if (row.department) {
        const dept = departments.find((d: any) =>
          d.name === row.department || d.name?.includes(row.department)
        );
        row._departmentId = dept?.id || null;
        if (!dept && !settings.autoCreateDepartments) {
          row._departmentId = null;
        }
      }

      // Resolve branch
      if (row.branch) {
        const br = branches.find((b: any) =>
          b.name === row.branch || b.name?.includes(row.branch)
        );
        row._branchId = br?.id || null;
      }

      // Determine position action
      const posTitle = row.position || `موظف - ${row.name_ar}`;
      row._positionTitle = posTitle;

      if (settings.matchVacantFirst && vacantPositions) {
        const match = vacantPositions.find((vp) =>
          vp.title_ar === posTitle &&
          vp.department_id === row._departmentId &&
          vp.status === "vacant"
        );
        if (match) {
          row._positionAction = "match_vacant";
          row._matchedPositionId = match.id;
          // Remove from pool so next row doesn't match same slot
          const idx = vacantPositions.indexOf(match);
          if (idx > -1) vacantPositions.splice(idx, 1);
          return row;
        }
      }

      if (settings.autoCreatePositions) {
        row._positionAction = "create";
      } else {
        row._positionAction = "error";
        row.error = "لا يوجد منصب شاغر مطابق، وإنشاء المناصب التلقائي معطل";
      }

      return row;
    });
  };

  const handleImport = async () => {
    const valid = rows.filter((r) => !r.error && r.name_ar);
    if (valid.length === 0) return;

    setImporting(true);
    setProgress(0);
    let success = 0, failed = 0, positionsCreated = 0, positionsMatched = 0;
    const batchId = `IMP-${Date.now()}`;

    // Build a map of manager names to created employee/position IDs for hierarchy linking
    const managerMap = new Map<string, { employeeId: string; positionId: string }>();

    for (let i = 0; i < valid.length; i++) {
      const row = valid[i];
      try {
        let positionId: string | null = null;

        // STEP 1: Resolve or create position
        if (row._positionAction === "match_vacant" && row._matchedPositionId) {
          // Update vacant position to filled
          await supabase.from("positions").update({ status: "filled" }).eq("id", row._matchedPositionId);
          positionId = row._matchedPositionId;
          positionsMatched++;
        } else if (row._positionAction === "create") {
          // Generate position code
          const { data: codeData } = await supabase.rpc("generate_position_code", { p_company_id: companyId });
          const posCode = (codeData as string) || `POS-IMP-${Date.now()}-${i}`;

          const { data: newPos, error: posErr } = await supabase.from("positions").insert({
            company_id: companyId,
            title_ar: row._positionTitle || `موظف - ${row.name_ar}`,
            title_en: row.name_en ? `Employee - ${row.name_en}` : null,
            department_id: row._departmentId || null,
            branch_id: row._branchId || null,
            status: "filled",
            is_manager: false,
            position_code: posCode,
            created_from: "import",
            import_batch_id: batchId,
          }).select("id").single();

          if (posErr) throw posErr;
          positionId = newPos.id;
          positionsCreated++;
        }

        // STEP 2: Create employee
        const { data: emp, error: empErr } = await supabase.from("employees").insert({
          company_id: companyId,
          name_ar: row.name_ar,
          name_en: row.name_en || null,
          position: row.position || row._positionTitle || null,
          phone: row.phone || null,
          email: row.email || null,
          basic_salary: row.basic_salary || 0,
          hire_date: row.hire_date || null,
          national_id: row.national_id || null,
          gender: row.gender || null,
          department_id: row._departmentId || null,
          branch_id: row._branchId || null,
          employee_code: row.employee_code || null,
          position_id: positionId,
        }).select("id").single();

        if (empErr) throw empErr;

        // Track for manager resolution
        if (positionId) {
          managerMap.set(row.name_ar.trim(), { employeeId: emp.id, positionId });
        }

        success++;
      } catch (err: any) {
        console.error("Import row error:", err);
        failed++;
      }

      setProgress(Math.round(((i + 1) / valid.length) * 100));
    }

    // STEP 3: Resolve manager hierarchy (second pass)
    for (const row of valid) {
      if (!row.manager) continue;
      const mgrName = row.manager.trim();
      const mgrEntry = managerMap.get(mgrName);
      const empEntry = managerMap.get(row.name_ar.trim());

      if (mgrEntry && empEntry && mgrEntry.positionId !== empEntry.positionId) {
        // Set parent_position_id on employee's position
        await supabase.from("positions")
          .update({ parent_position_id: mgrEntry.positionId })
          .eq("id", empEntry.positionId);

        // Also mark manager position as is_manager
        await supabase.from("positions")
          .update({ is_manager: true })
          .eq("id", mgrEntry.positionId);
      }
    }

    setResult({ success, failed, positionsCreated, positionsMatched });
    setPhase("result");
    setImporting(false);

    // Invalidate all relevant queries
    queryClient.invalidateQueries({ queryKey: ["employees"] });
    queryClient.invalidateQueries({ queryKey: ["employee-count"] });
    queryClient.invalidateQueries({ queryKey: ["positions"] });
    queryClient.invalidateQueries({ queryKey: ["org-chart"] });
    queryClient.invalidateQueries({ queryKey: ["org-positions"] });

    toast({ title: "تم الاستيراد", description: `نجح: ${success} | فشل: ${failed} | مناصب جديدة: ${positionsCreated}` });
  };

  const resetDialog = () => {
    setRows([]);
    setPhase("upload");
    setResult(null);
    setProgress(0);
  };

  const errorCount = rows.filter((r) => r.error).length;
  const validCount = rows.filter((r) => !r.error && r.name_ar).length;
  const createCount = rows.filter((r) => r._positionAction === "create").length;
  const matchCount = rows.filter((r) => r._positionAction === "match_vacant").length;

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) resetDialog(); }}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />استيراد الموظفين من Excel
          </DialogTitle>
          <DialogDescription>
            استيراد الموظفين مع إنشاء مناصب تلقائية في الهيكل التنظيمي
          </DialogDescription>
        </DialogHeader>

        {/* ═══ UPLOAD PHASE ═══ */}
        {phase === "upload" && (
          <div className="space-y-4">
            <div className="text-center py-6">
              <div className="border-2 border-dashed border-border rounded-xl p-8">
                <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground mb-4">
                  قم بتحميل ملف Excel يحتوي على أعمدة: الاسم، المنصب، الهاتف، البريد، الراتب، القسم، الفرع، المدير
                </p>
                <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} className="hidden" />
                <Button onClick={() => fileRef.current?.click()} className="gap-2 font-heading">
                  <Upload className="h-4 w-4" />اختر ملف
                </Button>
              </div>
            </div>

            {/* Import Settings */}
            <div className="border rounded-lg p-4 space-y-3">
              <button
                type="button"
                className="flex items-center gap-2 text-sm font-medium w-full"
                onClick={() => setShowSettings(!showSettings)}
              >
                <Settings2 className="h-4 w-4" />
                إعدادات الاستيراد
                <Badge variant="outline" className="text-[10px] mr-auto">{showSettings ? "إخفاء" : "عرض"}</Badge>
              </button>

              {showSettings && (
                <div className="space-y-3 pt-2 border-t">
                  <SettingRow
                    label="إنشاء مناصب تلقائياً"
                    description="إنشاء منصب جديد لكل موظف مستورد"
                    checked={settings.autoCreatePositions}
                    onChange={(v) => setSettings((s) => ({ ...s, autoCreatePositions: v }))}
                  />
                  <SettingRow
                    label="مطابقة المناصب الشاغرة أولاً"
                    description="ربط الموظف بمنصب شاغر مطابق إن وجد"
                    checked={settings.matchVacantFirst}
                    onChange={(v) => setSettings((s) => ({ ...s, matchVacantFirst: v }))}
                  />
                  <SettingRow
                    label="إنشاء أقسام مفقودة"
                    description="إنشاء قسم جديد إذا لم يُطابق"
                    checked={settings.autoCreateDepartments}
                    onChange={(v) => setSettings((s) => ({ ...s, autoCreateDepartments: v }))}
                  />
                  <SettingRow
                    label="إنشاء منصب مدير مؤقت"
                    description="إنشاء منصب مدير مؤقت إذا لم يُطابق المدير المدخل"
                    checked={settings.createPlaceholderManagers}
                    onChange={(v) => setSettings((s) => ({ ...s, createPlaceholderManagers: v }))}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══ PREVIEW PHASE ═══ */}
        {phase === "preview" && (
          <div className="space-y-4">
            {/* Summary badges */}
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="bg-primary/10 text-primary">
                <CheckCircle className="h-3 w-3 ml-1" />{validCount} صالح
              </Badge>
              {errorCount > 0 && (
                <Badge variant="outline" className="bg-destructive/10 text-destructive">
                  <AlertCircle className="h-3 w-3 ml-1" />{errorCount} خطأ
                </Badge>
              )}
              {createCount > 0 && (
                <Badge variant="outline" className="bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  + {createCount} منصب جديد
                </Badge>
              )}
              {matchCount > 0 && (
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  ↔ {matchCount} منصب شاغر مطابق
                </Badge>
              )}
            </div>

            {importing && <Progress value={progress} className="h-2" />}

            {/* Preview table */}
            <div className="max-h-64 overflow-y-auto border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الاسم</TableHead>
                    <TableHead>المنصب</TableHead>
                    <TableHead>القسم</TableHead>
                    <TableHead>المدير</TableHead>
                    <TableHead>إجراء المنصب</TableHead>
                    <TableHead>الحالة</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.slice(0, 100).map((r, i) => (
                    <TableRow key={i} className={r.error ? "bg-destructive/5" : ""}>
                      <TableCell className="font-medium">{r.name_ar || "—"}</TableCell>
                      <TableCell className="text-xs">{r._positionTitle || r.position || "—"}</TableCell>
                      <TableCell className="text-xs">
                        {r._departmentId
                          ? departments.find((d: any) => d.id === r._departmentId)?.name || r.department
                          : r.department
                            ? <span className="text-amber-500">{r.department} ⚠</span>
                            : "—"
                        }
                      </TableCell>
                      <TableCell className="text-xs">{r.manager || "—"}</TableCell>
                      <TableCell>
                        {r._positionAction === "create" && (
                          <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-400">إنشاء</Badge>
                        )}
                        {r._positionAction === "match_vacant" && (
                          <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">مطابقة</Badge>
                        )}
                        {r._positionAction === "error" && (
                          <Badge variant="outline" className="text-[10px] bg-destructive/10 text-destructive">خطأ</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {r.error ? (
                          <Tooltip>
                            <TooltipTrigger>
                              <AlertCircle className="h-4 w-4 text-destructive" />
                            </TooltipTrigger>
                            <TooltipContent>{r.error}</TooltipContent>
                          </Tooltip>
                        ) : (
                          <CheckCircle className="h-4 w-4 text-primary" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {rows.length > 100 && (
              <p className="text-xs text-muted-foreground text-center">
                يتم عرض أول 100 سطر من {rows.length}
              </p>
            )}

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 font-heading" onClick={resetDialog}>إلغاء</Button>
              <Button className="flex-1 font-heading gap-2" onClick={handleImport} disabled={importing || validCount === 0}>
                {importing ? `جاري الاستيراد... ${progress}%` : `استيراد ${validCount} موظف`}
              </Button>
            </div>
          </div>
        )}

        {/* ═══ RESULT PHASE ═══ */}
        {phase === "result" && result && (
          <div className="text-center py-8 space-y-3">
            <CheckCircle className="h-12 w-12 mx-auto text-primary" />
            <p className="font-heading font-bold text-lg">تم الاستيراد بنجاح</p>
            <div className="flex flex-wrap justify-center gap-3">
              <Badge variant="outline" className="bg-primary/10 text-primary">موظفون: {result.success}</Badge>
              <Badge variant="outline" className="bg-blue-500/10 text-blue-600 dark:text-blue-400">مناصب جديدة: {result.positionsCreated}</Badge>
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">مناصب مطابقة: {result.positionsMatched}</Badge>
              {result.failed > 0 && <Badge variant="outline" className="bg-destructive/10 text-destructive">فشل: {result.failed}</Badge>}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              سيظهر الموظفون المستوردون في الهيكل التنظيمي تلقائياً
            </p>
            <Button variant="outline" className="font-heading mt-4" onClick={() => { resetDialog(); onOpenChange(false); }}>إغلاق</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ═══ Setting Row Component ═══ */
function SettingRow({ label, description, checked, onChange }: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (val: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="space-y-0.5">
        <Label className="text-sm">{label}</Label>
        <p className="text-[11px] text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
