import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import {
  FolderKanban, Plus, Users, DollarSign, Calendar, ArrowUpRight, UserPlus, Trash2,
} from "lucide-react";

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  planned: { label: "مخطط", variant: "outline" },
  active: { label: "نشط", variant: "default" },
  completed: { label: "مكتمل", variant: "secondary" },
  archived: { label: "مؤرشف", variant: "secondary" },
};

export default function ProjectHub() {
  const { companyId } = useCompany();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [createDialog, setCreateDialog] = useState(false);
  const [detailProject, setDetailProject] = useState<any>(null);
  const [assignDialog, setAssignDialog] = useState<string | null>(null);

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["projects", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from("projects")
        .select("*, project_assignments(id, employee_id, allocation_percentage, project_role, is_active, employees(name_ar, name_en, employee_code))")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["project-employees", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data } = await supabase
        .from("employees")
        .select("id, name_ar, name_en, employee_code, position_id, basic_salary, positions(title)")
        .eq("company_id", companyId)
        .eq("status", "active");
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: positions = [] } = useQuery({
    queryKey: ["project-positions-list", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data } = await supabase
        .from("positions")
        .select("id, title, title_ar")
        .eq("company_id", companyId)
        .eq("status", "active");
      return data || [];
    },
    enabled: !!companyId,
  });

  const createProject = useMutation({
    mutationFn: async (form: any) => {
      const { error } = await supabase.from("projects").insert({
        company_id: companyId,
        ...form,
        created_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast({ title: "تم إنشاء المشروع" });
      setCreateDialog(false);
    },
    onError: (e: Error) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });

  const assignEmployee = useMutation({
    mutationFn: async (form: any) => {
      const emp = employees.find((e: any) => e.id === form.employee_id);
      const { error } = await supabase.from("project_assignments").insert({
        project_id: form.project_id,
        employee_id: form.employee_id,
        position_id: emp?.position_id || null,
        project_role: form.project_role,
        allocation_percentage: form.allocation_percentage,
        start_date: form.start_date || new Date().toISOString().split("T")[0],
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast({ title: "تم تعيين الموظف في المشروع" });
      setAssignDialog(null);
    },
    onError: (e: Error) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });

  const removeAssignment = useMutation({
    mutationFn: async (assignmentId: string) => {
      const { error } = await supabase
        .from("project_assignments")
        .update({ is_active: false, end_date: new Date().toISOString().split("T")[0] })
        .eq("id", assignmentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast({ title: "تم إزالة التعيين" });
    },
  });

  const activeProjects = projects.filter((p: any) => p.status === "active");
  const totalBudget = projects.reduce((s: number, p: any) => s + Number(p.budget || 0), 0);
  const totalMembers = projects.reduce((s: number, p: any) =>
    s + (p.project_assignments?.filter((a: any) => a.is_active)?.length || 0), 0);

  const empName = (e: any) => e?.name_ar || e?.name_en || "—";

  return (
    <div className="space-y-6 animate-fade-in" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">مركز المشاريع</h1>
          <p className="text-sm text-muted-foreground mt-1">إدارة المشاريع والتعيينات وتوزيع التكاليف</p>
        </div>
        <Button onClick={() => setCreateDialog(true)} className="gap-2">
          <Plus className="h-4 w-4" />مشروع جديد
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "إجمالي المشاريع", value: projects.length, icon: FolderKanban },
          { label: "المشاريع النشطة", value: activeProjects.length, icon: ArrowUpRight },
          { label: "إجمالي الأعضاء", value: totalMembers, icon: Users },
          { label: "الميزانية الكلية", value: `$${totalBudget.toLocaleString()}`, icon: DollarSign },
        ].map((kpi, i) => (
          <Card key={i}>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <kpi.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">{kpi.value}</p>
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {projects.map((project: any) => {
          const members = project.project_assignments?.filter((a: any) => a.is_active) || [];
          const budgetTotal = Number(project.budget || 1);
          const budgetUsed = Number(project.spent || 0);
          const budgetPct = Math.min((budgetUsed / budgetTotal) * 100, 100);
          const st = STATUS_MAP[project.status] || STATUS_MAP.planned;
          return (
            <Card key={project.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setDetailProject(project)}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-bold text-foreground">{project.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">{project.code}</p>
                  </div>
                  <Badge variant={st.variant}>{st.label}</Badge>
                </div>
                {project.description && <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{project.description}</p>}
                <div className="space-y-2 text-xs text-muted-foreground mb-3">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1"><Users className="h-3 w-3" />{members.length} عضو</span>
                    <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" />${Number(project.budget || 0).toLocaleString()}</span>
                  </div>
                  {project.start_date && (
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(project.start_date).toLocaleDateString("ar-IQ")}
                      {project.end_date && ` — ${new Date(project.end_date).toLocaleDateString("ar-IQ")}`}
                    </div>
                  )}
                </div>
                <Progress value={budgetPct} className="h-1.5" />
                <p className="text-[10px] text-muted-foreground mt-1">{budgetPct.toFixed(0)}% من الميزانية</p>
              </CardContent>
            </Card>
          );
        })}
        {projects.length === 0 && !isLoading && (
          <Card className="col-span-full">
            <CardContent className="py-12 text-center">
              <FolderKanban className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">لا توجد مشاريع بعد</p>
              <Button variant="outline" className="mt-3" onClick={() => setCreateDialog(true)}>إنشاء مشروع</Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create Project Dialog */}
      <CreateProjectDialog open={createDialog} onClose={() => setCreateDialog(false)} positions={positions}
        onSubmit={(form: any) => createProject.mutate(form)} isPending={createProject.isPending} />

      {/* Project Detail */}
      {detailProject && (
        <ProjectDetailDialog project={detailProject} open={!!detailProject} onClose={() => setDetailProject(null)}
          onAssign={() => setAssignDialog(detailProject.id)} onRemove={(id: string) => removeAssignment.mutate(id)}
          employees={employees} empName={empName} />
      )}

      {/* Assign Employee */}
      {assignDialog && (
        <AssignEmployeeDialog open={!!assignDialog} onClose={() => setAssignDialog(null)} projectId={assignDialog}
          employees={employees} empName={empName}
          onSubmit={(form: any) => assignEmployee.mutate(form)} isPending={assignEmployee.isPending} />
      )}
    </div>
  );
}

function CreateProjectDialog({ open, onClose, positions, onSubmit, isPending }: any) {
  const [form, setForm] = useState({ name: "", name_ar: "", code: "", description: "", budget: "", cost_center: "", start_date: "", end_date: "", project_manager_position_id: "" });
  const set = (k: string, v: string) => setForm((p: any) => ({ ...p, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg" dir="rtl">
        <DialogHeader><DialogTitle>مشروع جديد</DialogTitle></DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs">اسم المشروع</Label><Input value={form.name} onChange={(e) => set("name", e.target.value)} /></div>
            <div><Label className="text-xs">الاسم بالعربية</Label><Input value={form.name_ar} onChange={(e) => set("name_ar", e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs">رمز المشروع</Label><Input value={form.code} onChange={(e) => set("code", e.target.value)} placeholder="PRJ-001" /></div>
            <div><Label className="text-xs">مركز التكلفة</Label><Input value={form.cost_center} onChange={(e) => set("cost_center", e.target.value)} /></div>
          </div>
          <div><Label className="text-xs">الوصف</Label><Textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={2} /></div>
          <div className="grid grid-cols-3 gap-3">
            <div><Label className="text-xs">الميزانية</Label><Input type="number" value={form.budget} onChange={(e) => set("budget", e.target.value)} /></div>
            <div><Label className="text-xs">تاريخ البداية</Label><Input type="date" value={form.start_date} onChange={(e) => set("start_date", e.target.value)} /></div>
            <div><Label className="text-xs">تاريخ النهاية</Label><Input type="date" value={form.end_date} onChange={(e) => set("end_date", e.target.value)} /></div>
          </div>
          <div>
            <Label className="text-xs">مدير المشروع (منصب)</Label>
            <Select value={form.project_manager_position_id} onValueChange={(v) => set("project_manager_position_id", v)}>
              <SelectTrigger><SelectValue placeholder="اختر المنصب" /></SelectTrigger>
              <SelectContent>
                {positions.map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>{p.title_ar || p.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>إلغاء</Button>
          <Button onClick={() => onSubmit({
            name: form.name, name_ar: form.name_ar || null, code: form.code,
            description: form.description || null, budget: Number(form.budget) || 0,
            cost_center: form.cost_center || null,
            start_date: form.start_date || null, end_date: form.end_date || null,
            project_manager_position_id: form.project_manager_position_id || null,
          })} disabled={isPending || !form.name || !form.code}>
            إنشاء
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ProjectDetailDialog({ project, open, onClose, onAssign, onRemove, employees, empName }: any) {
  const members = project.project_assignments?.filter((a: any) => a.is_active) || [];
  const totalCost = members.reduce((s: number, m: any) => {
    const emp = employees.find((e: any) => e.id === m.employee_id);
    return s + (Number(emp?.basic_salary || 0) * m.allocation_percentage / 100);
  }, 0);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderKanban className="h-5 w-5 text-primary" />
            {project.name}
            <Badge variant={STATUS_MAP[project.status]?.variant || "outline"} className="mr-2">
              {STATUS_MAP[project.status]?.label || project.status}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="members" className="mt-2">
          <TabsList>
            <TabsTrigger value="members">الأعضاء ({members.length})</TabsTrigger>
            <TabsTrigger value="costs">التكاليف</TabsTrigger>
            <TabsTrigger value="info">المعلومات</TabsTrigger>
          </TabsList>

          <TabsContent value="members" className="space-y-3 mt-3">
            <Button size="sm" variant="outline" className="gap-1" onClick={onAssign}>
              <UserPlus className="h-3.5 w-3.5" />تعيين موظف
            </Button>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الموظف</TableHead>
                  <TableHead>الدور</TableHead>
                  <TableHead>التخصيص %</TableHead>
                  <TableHead>التكلفة الشهرية</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((m: any) => {
                  const emp = employees.find((e: any) => e.id === m.employee_id);
                  const cost = Number(emp?.basic_salary || 0) * m.allocation_percentage / 100;
                  return (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">{empName(m.employees)}</TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px]">{m.project_role}</Badge></TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={m.allocation_percentage} className="h-1.5 w-16" />
                          <span className="text-xs">{m.allocation_percentage}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm font-medium">${cost.toLocaleString()}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onRemove(m.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {members.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">لا يوجد أعضاء معيّنون</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="costs" className="space-y-4 mt-3">
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "الميزانية", value: `$${Number(project.budget || 0).toLocaleString()}` },
                { label: "التكلفة الشهرية", value: `$${totalCost.toLocaleString()}` },
                { label: "المنصرف", value: `$${Number(project.spent || 0).toLocaleString()}` },
              ].map((c) => (
                <Card key={c.label}>
                  <CardContent className="p-4 text-center">
                    <p className="text-xs text-muted-foreground">{c.label}</p>
                    <p className="text-xl font-bold text-foreground">{c.value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">توزيع التكاليف حسب الأعضاء</p>
              {members.map((m: any) => {
                const emp = employees.find((e: any) => e.id === m.employee_id);
                const cost = Number(emp?.basic_salary || 0) * m.allocation_percentage / 100;
                const pct = totalCost > 0 ? (cost / totalCost) * 100 : 0;
                return (
                  <div key={m.id} className="flex items-center gap-3">
                    <span className="text-sm text-foreground w-32 truncate">{empName(m.employees)}</span>
                    <Progress value={pct} className="h-2 flex-1" />
                    <span className="text-xs text-muted-foreground w-20 text-left">${cost.toLocaleString()}</span>
                  </div>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="info" className="space-y-3 mt-3">
            {[
              { label: "رمز المشروع", value: project.code },
              { label: "مركز التكلفة", value: project.cost_center || "—" },
              { label: "تاريخ البداية", value: project.start_date ? new Date(project.start_date).toLocaleDateString("ar-IQ") : "—" },
              { label: "تاريخ النهاية", value: project.end_date ? new Date(project.end_date).toLocaleDateString("ar-IQ") : "—" },
              { label: "الوصف", value: project.description || "—" },
            ].map((item) => (
              <div key={item.label} className="flex justify-between text-sm border-b border-border pb-2">
                <span className="text-muted-foreground">{item.label}</span>
                <span className="font-medium text-foreground">{item.value}</span>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function AssignEmployeeDialog({ open, onClose, projectId, employees, empName, onSubmit, isPending }: any) {
  const [form, setForm] = useState({ employee_id: "", project_role: "member", allocation_percentage: "100", start_date: new Date().toISOString().split("T")[0] });
  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent dir="rtl">
        <DialogHeader><DialogTitle>تعيين موظف في المشروع</DialogTitle></DialogHeader>
        <div className="grid gap-3 py-2">
          <div>
            <Label className="text-xs">الموظف</Label>
            <Select value={form.employee_id} onValueChange={(v) => set("employee_id", v)}>
              <SelectTrigger><SelectValue placeholder="اختر الموظف" /></SelectTrigger>
              <SelectContent>
                {employees.map((e: any) => (
                  <SelectItem key={e.id} value={e.id}>
                    {empName(e)} — {(e as any).positions?.title || ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">الدور في المشروع</Label>
              <Select value={form.project_role} onValueChange={(v) => set("project_role", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="manager">مدير</SelectItem>
                  <SelectItem value="lead">قائد فريق</SelectItem>
                  <SelectItem value="member">عضو</SelectItem>
                  <SelectItem value="consultant">مستشار</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">نسبة التخصيص %</Label>
              <Input type="number" min="0" max="100" value={form.allocation_percentage} onChange={(e) => set("allocation_percentage", e.target.value)} />
            </div>
          </div>
          <div>
            <Label className="text-xs">تاريخ البداية</Label>
            <Input type="date" value={form.start_date} onChange={(e) => set("start_date", e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>إلغاء</Button>
          <Button onClick={() => onSubmit({
            project_id: projectId, employee_id: form.employee_id,
            project_role: form.project_role, allocation_percentage: Number(form.allocation_percentage),
            start_date: form.start_date,
          })} disabled={isPending || !form.employee_id}>
            تعيين
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
