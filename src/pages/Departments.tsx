import { useState } from "react";
import { Plus, Building2, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import ManagerPositionPicker from "@/components/orgchart/ManagerPositionPicker";

export default function Departments() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialog, setEditDialog] = useState(false);
  const [editDept, setEditDept] = useState<any>(null);
  const { toast } = useToast();
  const { companyId } = useCompany();
  const queryClient = useQueryClient();

  const [selectedBranch, setSelectedBranch] = useState("");
  const [editBranch, setEditBranch] = useState("");
  const [managerPositionId, setManagerPositionId] = useState<string | null>(null);
  const [editManagerPositionId, setEditManagerPositionId] = useState<string | null>(null);

  const { data: departments = [], isLoading } = useQuery({
    queryKey: ["departments", companyId],
    queryFn: async () => {
      const { data } = await supabase
        .from("departments")
        .select("*, branches(name)")
        .eq("company_id", companyId!)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: branches = [] } = useQuery({
    queryKey: ["branches-for-dept", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("branches").select("id, name").eq("company_id", companyId!);
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: employeeCounts = {} } = useQuery({
    queryKey: ["dept-emp-counts", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("employees").select("department_id").eq("company_id", companyId!).eq("status", "active");
      const counts: Record<string, number> = {};
      data?.forEach((e: any) => { if (e.department_id) counts[e.department_id] = (counts[e.department_id] || 0) + 1; });
      return counts;
    },
    enabled: !!companyId,
  });

  // Resolve manager position → employee name for display
  const { data: managerMap = {} } = useQuery({
    queryKey: ["dept-manager-positions", companyId],
    queryFn: async () => {
      const deptIds = departments.filter((d: any) => d.manager_position_id).map((d: any) => d.manager_position_id);
      if (deptIds.length === 0) return {};
      const { data: posData } = await supabase
        .from("positions")
        .select("id, title_ar, status")
        .in("id", deptIds);
      const posIds = posData?.map((p) => p.id) || [];
      const { data: empData } = posIds.length > 0
        ? await supabase.from("employees").select("name_ar, position_id").in("position_id", posIds).eq("status", "active")
        : { data: [] };
      const map: Record<string, { title: string; empName?: string }> = {};
      posData?.forEach((p) => {
        const emp = empData?.find((e: any) => e.position_id === p.id);
        map[p.id] = { title: p.title_ar || "", empName: emp?.name_ar };
      });
      return map;
    },
    enabled: !!companyId && departments.length > 0,
  });

  const addDept = useMutation({
    mutationFn: async (formData: FormData) => {
      const { error } = await supabase.from("departments").insert({
        company_id: companyId!,
        name: formData.get("name") as string,
        manager_name: null, // deprecated, kept for compat
        manager_position_id: managerPositionId,
        description: (formData.get("description") as string) || null,
        branch_id: selectedBranch && selectedBranch !== "__none__" ? selectedBranch : null,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      queryClient.invalidateQueries({ queryKey: ["department-count"] });
      queryClient.invalidateQueries({ queryKey: ["org-positions"] });
      toast({ title: "تم بنجاح", description: "تمت إضافة القسم" });
      setDialogOpen(false);
      setSelectedBranch("");
      setManagerPositionId(null);
    },
    onError: (err: Error) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  const updateDept = useMutation({
    mutationFn: async (formData: FormData) => {
      const { error } = await supabase.from("departments").update({
        name: formData.get("name") as string,
        manager_name: null,
        manager_position_id: editManagerPositionId,
        description: (formData.get("description") as string) || null,
        branch_id: editBranch && editBranch !== "__none__" ? editBranch : null,
      } as any).eq("id", editDept.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      queryClient.invalidateQueries({ queryKey: ["org-positions"] });
      toast({ title: "تم التحديث" });
      setEditDialog(false);
      setEditDept(null);
      setEditManagerPositionId(null);
    },
    onError: (err: Error) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  const deleteDept = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("departments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      queryClient.invalidateQueries({ queryKey: ["department-count"] });
      toast({ title: "تم الحذف" });
    },
    onError: (err: Error) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  const openEdit = (dept: any) => {
    setEditDept(dept);
    setEditBranch(dept.branch_id || "");
    setEditManagerPositionId(dept.manager_position_id || null);
    setEditDialog(true);
  };

  const getManagerDisplay = (dept: any) => {
    if (dept.manager_position_id && (managerMap as any)[dept.manager_position_id]) {
      const info = (managerMap as any)[dept.manager_position_id];
      return info.empName || `${info.title} (شاغر)`;
    }
    if (dept.manager_name) return <span className="text-amber-600 dark:text-amber-400">{dept.manager_name} ⚠</span>;
    return "—";
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading font-bold text-2xl text-foreground">الأقسام والهيكل التنظيمي</h1>
          <p className="text-muted-foreground text-sm mt-1">{departments.length} قسم</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <Button className="gap-2 font-heading" onClick={() => { setManagerPositionId(null); setSelectedBranch(""); setDialogOpen(true); }}>
            <Plus className="h-4 w-4" />إضافة تشكيل
          </Button>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-heading">إضافة تشكيل جديد</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); addDept.mutate(new FormData(e.currentTarget)); }} className="space-y-4">
              <div className="space-y-2"><Label>اسم القسم</Label><Input name="name" placeholder="الموارد البشرية" required /></div>
              {companyId && (
                <ManagerPositionPicker companyId={companyId} value={managerPositionId} onChange={setManagerPositionId} />
              )}
              {branches.length > 0 && (
                <div className="space-y-2">
                  <Label>الفرع</Label>
                  <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                    <SelectTrigger><SelectValue placeholder="اختر الفرع (اختياري)" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">بدون فرع</SelectItem>
                      {branches.map((b: any) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2"><Label>الوصف</Label><Input name="description" placeholder="وصف مختصر للقسم" /></div>
              <Button type="submit" className="w-full font-heading" disabled={addDept.isPending}>
                {addDept.isPending ? "جاري الحفظ..." : "حفظ القسم"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : departments.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>اسم القسم</TableHead>
                  <TableHead>المدير</TableHead>
                  <TableHead>الفرع</TableHead>
                  <TableHead>الموظفون</TableHead>
                  <TableHead>الوصف</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {departments.map((d: any) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.name}</TableCell>
                    <TableCell>{getManagerDisplay(d)}</TableCell>
                    <TableCell>{d.branches?.name || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{(employeeCounts as Record<string, number>)[d.id] || 0}</Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">{d.description || "—"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(d)}><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => { if (confirm("هل تريد حذف هذا القسم؟")) deleteDept.mutate(d.id); }}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-20 text-muted-foreground">
              <Building2 className="h-16 w-16 mx-auto mb-4 opacity-20" />
              <p className="font-heading font-medium text-lg">لا توجد أقسام</p>
              <p className="text-sm mt-1">ابدأ بإنشاء أول قسم في شركتك</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-heading">تعديل القسم</DialogTitle></DialogHeader>
          {editDept && (
            <form onSubmit={(e) => { e.preventDefault(); updateDept.mutate(new FormData(e.currentTarget)); }} className="space-y-4">
              <div className="space-y-2"><Label>اسم القسم</Label><Input name="name" required defaultValue={editDept.name || ""} /></div>
              {companyId && (
                <ManagerPositionPicker
                  companyId={companyId}
                  value={editManagerPositionId}
                  onChange={setEditManagerPositionId}
                  departmentId={editDept.id}
                  legacyManagerName={editDept.manager_name}
                />
              )}
              {branches.length > 0 && (
                <div className="space-y-2">
                  <Label>الفرع</Label>
                  <Select value={editBranch} onValueChange={setEditBranch}>
                    <SelectTrigger><SelectValue placeholder="اختر الفرع (اختياري)" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">بدون فرع</SelectItem>
                      {branches.map((b: any) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2"><Label>الوصف</Label><Input name="description" placeholder="وصف مختصر" defaultValue={editDept.description || ""} /></div>
              <Button type="submit" className="w-full font-heading" disabled={updateDept.isPending}>
                {updateDept.isPending ? "جاري..." : "تحديث"}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
