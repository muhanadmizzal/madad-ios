import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { UserCog, Plus, Search, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface ManagerPositionPickerProps {
  companyId: string;
  value: string | null; // manager_position_id
  onChange: (positionId: string | null) => void;
  departmentId?: string | null;
  branchId?: string | null;
  /** For display: legacy manager_name text */
  legacyManagerName?: string | null;
}

export default function ManagerPositionPicker({
  companyId,
  value,
  onChange,
  departmentId,
  branchId,
  legacyManagerName,
}: ManagerPositionPickerProps) {
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch manager-eligible positions in this company
  const { data: positions = [] } = useQuery({
    queryKey: ["manager-positions", companyId],
    queryFn: async () => {
      const { data } = await supabase
        .from("positions")
        .select("id, title_ar, title_en, position_code, status, is_manager, department_id")
        .eq("company_id", companyId)
        .in("status", ["active", "filled", "vacant"])
        .order("title_ar");
      return data || [];
    },
    enabled: !!companyId,
  });

  // Get employee assigned to selected position
  const { data: assignedEmployee } = useQuery({
    queryKey: ["position-employee", value],
    queryFn: async () => {
      const { data } = await supabase
        .from("employees")
        .select("id, name_ar, employee_code")
        .eq("position_id", value!)
        .eq("status", "active")
        .maybeSingle();
      return data;
    },
    enabled: !!value,
  });

  const selectedPos = positions.find((p) => p.id === value);
  const filtered = positions.filter((p) => {
    if (!searchTerm) return true;
    const s = searchTerm.toLowerCase();
    return (
      p.title_ar?.toLowerCase().includes(s) ||
      p.title_en?.toLowerCase().includes(s) ||
      p.position_code?.toLowerCase().includes(s)
    );
  });

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-1.5">
        <UserCog className="h-4 w-4" />
        المدير (منصب هيكلي)
      </Label>

      {/* Show current selection */}
      {value && selectedPos ? (
        <div className="flex items-center gap-2 p-2.5 rounded-md border bg-muted/30">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{selectedPos.title_ar}</p>
            <p className="text-xs text-muted-foreground">
              {selectedPos.position_code}
              {assignedEmployee ? ` — ${assignedEmployee.name_ar}` : " — شاغر"}
            </p>
          </div>
          <Badge variant={assignedEmployee ? "default" : "outline"} className="text-[10px]">
            {assignedEmployee ? "مشغول" : "شاغر"}
          </Badge>
          <Button type="button" size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => onChange(null)}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      ) : (
        <>
          {legacyManagerName && !value && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              ⚠ مدير نصي قديم: "{legacyManagerName}" — يرجى ربطه بمنصب حقيقي
            </p>
          )}
          {/* Position selector */}
          <Select value={value || "__none__"} onValueChange={(v) => onChange(v === "__none__" ? null : v)}>
            <SelectTrigger>
              <SelectValue placeholder="اختر منصب المدير" />
            </SelectTrigger>
            <SelectContent>
              <div className="p-2">
                <div className="flex items-center gap-1.5 px-2 pb-2 border-b mb-1">
                  <Search className="h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="بحث عن منصب..."
                    className="h-7 text-xs border-0 p-0 focus-visible:ring-0"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              </div>
              <SelectItem value="__none__">بدون مدير</SelectItem>
              {filtered.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  <span className="flex items-center gap-2">
                    {p.is_manager && <Badge variant="outline" className="text-[9px] px-1">إداري</Badge>}
                    {p.title_ar} ({p.position_code})
                    <span className="text-muted-foreground text-[10px]">
                      {p.status === "filled" ? "مشغول" : "شاغر"}
                    </span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </>
      )}

      {/* Create new manager position */}
      {!value && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full gap-1.5 text-xs"
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="h-3.5 w-3.5" />
          إنشاء منصب مدير جديد
        </Button>
      )}

      <CreateManagerPositionDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        companyId={companyId}
        departmentId={departmentId}
        branchId={branchId}
        onCreated={(posId) => {
          onChange(posId);
          qc.invalidateQueries({ queryKey: ["manager-positions"] });
        }}
      />
    </div>
  );
}

/* ═══════ Inline Create Manager Position Dialog ═══════ */
interface CreateManagerDialogProps {
  open: boolean;
  onClose: () => void;
  companyId: string;
  departmentId?: string | null;
  branchId?: string | null;
  onCreated: (positionId: string) => void;
}

function CreateManagerPositionDialog({ open, onClose, companyId, departmentId, branchId, onCreated }: CreateManagerDialogProps) {
  const [titleAr, setTitleAr] = useState("");
  const [titleEn, setTitleEn] = useState("");
  const [selectedDeptId, setSelectedDeptId] = useState(departmentId || "");

  const { data: departments = [] } = useQuery({
    queryKey: ["mgr-create-depts", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("departments").select("id, name").eq("company_id", companyId).order("name");
      return data || [];
    },
    enabled: open && !!companyId,
  });

  const createPos = useMutation({
    mutationFn: async () => {
      // Generate code
      const { data: code } = await supabase.rpc("generate_position_code", { p_company_id: companyId });
      const { data, error } = await supabase
        .from("positions")
        .insert({
          company_id: companyId,
          title_ar: titleAr,
          title_en: titleEn || null,
          department_id: selectedDeptId || departmentId || null,
          is_manager: true,
          status: "vacant",
          position_code: (code as string) || `POS-MGR-${Date.now()}`,
        })
        .select("id")
        .single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: (posId) => {
      toast({ title: "تم إنشاء منصب المدير بنجاح" });
      onCreated(posId);
      setTitleAr("");
      setTitleEn("");
      setSelectedDeptId("");
      onClose();
    },
    onError: (e: any) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>إنشاء منصب مدير جديد</DialogTitle>
          <DialogDescription>سيظهر هذا المنصب في الهيكل التنظيمي والموافقات</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>المسمى بالعربية *</Label>
            <Input value={titleAr} onChange={(e) => setTitleAr(e.target.value)} placeholder="مثال: مدير قسم الموارد البشرية" />
          </div>
          <div className="space-y-1.5">
            <Label>المسمى بالإنجليزية</Label>
            <Input value={titleEn} onChange={(e) => setTitleEn(e.target.value)} placeholder="e.g. HR Department Manager" dir="ltr" />
          </div>
          {departments.length > 0 && (
            <div className="space-y-1.5">
              <Label>القسم</Label>
              <Select value={selectedDeptId} onValueChange={setSelectedDeptId}>
                <SelectTrigger><SelectValue placeholder="اختر القسم" /></SelectTrigger>
                <SelectContent>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>إلغاء</Button>
          <Button onClick={() => createPos.mutate()} disabled={!titleAr.trim() || createPos.isPending}>
            {createPos.isPending ? "جاري..." : "إنشاء"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
