import { useState } from "react";
import { Plus, ClipboardCheck, CheckCircle2, Circle, Users, Calendar, Trash2, Sparkles, FileText } from "lucide-react";
import OnboardingTemplates from "@/components/onboarding/OnboardingTemplates";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { AiActionButton } from "@/components/ai/AiActionButton";
import { FeatureGate } from "@/components/subscription/FeatureGate";
import { useCreateWorkflowInstance } from "@/hooks/useApprovalWorkflow";

const typeLabels: Record<string, string> = { preboarding: "ما قبل الالتحاق", first_day: "اليوم الأول", first_week: "الأسبوع الأول", probation: "فترة التجربة" };
const typeColors: Record<string, string> = { preboarding: "bg-muted text-muted-foreground", first_day: "bg-primary/10 text-primary", first_week: "bg-accent/10 text-accent-foreground", probation: "bg-destructive/10 text-destructive" };

export default function Onboarding() {
  const [dialog, setDialog] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [filterEmployee, setFilterEmployee] = useState("all");
  const [taskType, setTaskType] = useState("preboarding");
  const { toast } = useToast();
  const { companyId } = useCompany();
  const queryClient = useQueryClient();

  const { data: employees = [] } = useQuery({
    queryKey: ["employees-onboard", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("employees").select("id, name_ar, hire_date, position, departments(name)").eq("company_id", companyId!);
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["onboarding-tasks", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("onboarding_tasks").select("*, employees(name_ar)").eq("company_id", companyId!).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!companyId,
  });

  const createWorkflow = useCreateWorkflowInstance();

  const addTask = useMutation({
    mutationFn: async (formData: FormData) => {
      const { data: task, error } = await supabase.from("onboarding_tasks").insert({
        company_id: companyId!,
        employee_id: selectedEmployee || null,
        title: formData.get("title") as string,
        description: (formData.get("description") as string) || null,
        task_type: taskType,
        due_date: (formData.get("due_date") as string) || null,
      }).select().single();
      if (error) throw error;
      // Create workflow for onboarding approval
      if (task) {
        await createWorkflow.mutateAsync({ requestType: "onboarding", referenceId: task.id, companyId: companyId! });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["onboarding-tasks"] });
      toast({ title: "تم بنجاح وإرساله للموافقة" });
      setDialog(false);
      setSelectedEmployee("");
    },
    onError: (err: Error) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  const toggleTask = useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      const { error } = await supabase.from("onboarding_tasks").update({
        is_completed: completed,
        completed_at: completed ? new Date().toISOString() : null,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["onboarding-tasks"] }),
  });

  const deleteTask = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("onboarding_tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["onboarding-tasks"] });
      toast({ title: "تم الحذف" });
    },
  });

  const filteredTasks = filterEmployee === "all" ? tasks : tasks.filter((t: any) => t.employee_id === filterEmployee);
  const completedCount = filteredTasks.filter((t: any) => t.is_completed).length;
  const progressPercent = filteredTasks.length > 0 ? Math.round((completedCount / filteredTasks.length) * 100) : 0;

  // Group tasks by type
  const tasksByType = Object.keys(typeLabels).map(type => ({
    type,
    label: typeLabels[type],
    tasks: filteredTasks.filter((t: any) => t.task_type === type),
  }));

  // Employees with onboarding tasks
  const employeesWithTasks = [...new Set(tasks.map((t: any) => t.employee_id).filter(Boolean))];
  const employeeProgress = employeesWithTasks.map(empId => {
    const empTasks = tasks.filter((t: any) => t.employee_id === empId);
    const completed = empTasks.filter((t: any) => t.is_completed).length;
    const emp = employees.find((e: any) => e.id === empId);
    return { id: empId, name: emp?.name_ar || "—", total: empTasks.length, completed, percent: empTasks.length > 0 ? Math.round((completed / empTasks.length) * 100) : 0 };
  });

  // Overdue tasks
  const today = new Date().toISOString().split("T")[0];
  const overdueTasks = filteredTasks.filter((t: any) => !t.is_completed && t.due_date && t.due_date < today);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading font-bold text-2xl text-foreground">التهيئة والتأهيل</h1>
          <p className="text-muted-foreground text-sm mt-1">{completedCount}/{filteredTasks.length} مهمة مكتملة</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <FeatureGate featureKey="hr_operational" compact>
            <AiActionButton
              action="generate_onboarding"
              context={`الموظفون الجدد:\n${employees.filter((e: any) => {
                const hired = e.hire_date ? new Date(e.hire_date) : null;
                const threeMonthsAgo = new Date(); threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
                return hired && hired > threeMonthsAgo;
              }).map((e: any) => `- ${e.name_ar} | المنصب: ${e.position || "غير محدد"} | القسم: ${e.departments?.name || "غير محدد"} | تاريخ التعيين: ${e.hire_date}`).join("\n") || "لا يوجد موظفون جدد"}\n\nالمهام الحالية:\n${tasks.slice(0, 20).map((t: any) => `- ${t.title} (${typeLabels[t.task_type] || t.task_type})`).join("\n") || "لا توجد مهام"}\n\nتعليمات: أنشئ قائمة مهام تهيئة مخصصة لكل موظف بناءً على منصبه وقسمه.`}
              label="إنشاء قائمة تهيئة AI"
              icon={<Sparkles className="h-3.5 w-3.5" />}
              dialogTitle="قائمة تهيئة مقترحة بالذكاء الاصطناعي"
            />
          </FeatureGate>
          <Dialog open={dialog} onOpenChange={setDialog}>
            <DialogTrigger asChild><Button className="gap-2 font-heading"><Plus className="h-4 w-4" />مهمة جديدة</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle className="font-heading">مهمة تهيئة جديدة</DialogTitle></DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); addTask.mutate(new FormData(e.currentTarget)); }} className="space-y-4">
                <div className="space-y-2"><Label>العنوان</Label><Input name="title" required /></div>
                <div className="space-y-2"><Label>الوصف</Label><Textarea name="description" rows={3} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>الموظف</Label><Select value={selectedEmployee} onValueChange={setSelectedEmployee}><SelectTrigger><SelectValue placeholder="اختر (اختياري)" /></SelectTrigger><SelectContent>{employees.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.name_ar}</SelectItem>)}</SelectContent></Select></div>
                  <div className="space-y-2"><Label>المرحلة</Label><Select value={taskType} onValueChange={setTaskType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(typeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></div>
                </div>
                <div className="space-y-2"><Label>تاريخ الاستحقاق</Label><Input name="due_date" type="date" dir="ltr" className="text-left" /></div>
                <Button type="submit" className="w-full font-heading" disabled={addTask.isPending}>حفظ</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-muted text-primary"><ClipboardCheck className="h-5 w-5" /></div>
          <div><p className="text-sm text-muted-foreground">إجمالي المهام</p><p className="text-2xl font-heading font-bold">{filteredTasks.length}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-muted text-primary"><CheckCircle2 className="h-5 w-5" /></div>
          <div><p className="text-sm text-muted-foreground">المكتملة</p><p className="text-2xl font-heading font-bold">{completedCount}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-muted text-destructive"><Calendar className="h-5 w-5" /></div>
          <div><p className="text-sm text-muted-foreground">متأخرة</p><p className="text-2xl font-heading font-bold text-destructive">{overdueTasks.length}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-muted text-primary"><Users className="h-5 w-5" /></div>
          <div><p className="text-sm text-muted-foreground">موظفون في التهيئة</p><p className="text-2xl font-heading font-bold">{employeesWithTasks.length}</p></div>
        </CardContent></Card>
      </div>

      {/* Overall progress */}
      <Card>
        <CardContent className="p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-heading font-medium">التقدم العام</span>
            <span className="font-heading font-bold text-primary">{progressPercent}%</span>
          </div>
          <Progress value={progressPercent} className="h-3" />
        </CardContent>
      </Card>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <Select value={filterEmployee} onValueChange={setFilterEmployee}>
          <SelectTrigger className="w-52"><SelectValue placeholder="فلتر حسب الموظف" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع الموظفين</SelectItem>
            {employees.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.name_ar}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="phases">
        <TabsList>
          <TabsTrigger value="phases" className="font-heading">حسب المرحلة</TabsTrigger>
          <TabsTrigger value="employees" className="font-heading">حسب الموظف</TabsTrigger>
          <TabsTrigger value="templates" className="font-heading gap-1"><FileText className="h-3.5 w-3.5" />القوالب</TabsTrigger>
        </TabsList>

        <TabsContent value="phases" className="space-y-4">
          {tasksByType.map(group => {
            const groupCompleted = group.tasks.filter((t: any) => t.is_completed).length;
            const groupPercent = group.tasks.length > 0 ? Math.round((groupCompleted / group.tasks.length) * 100) : 0;

            return (
              <Card key={group.type}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CardTitle className="font-heading text-base">{group.label}</CardTitle>
                      <Badge variant="outline" className={typeColors[group.type]}>{groupCompleted}/{group.tasks.length}</Badge>
                    </div>
                    <span className="text-xs font-heading text-muted-foreground">{groupPercent}%</span>
                  </div>
                  <Progress value={groupPercent} className="h-1.5 mt-1" />
                </CardHeader>
                <CardContent className="pt-0">
                  {group.tasks.length > 0 ? (
                    <div className="space-y-2">
                      {group.tasks.map((task: any) => (
                        <div key={task.id} className={`flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors ${task.is_completed ? "opacity-50" : ""}`}>
                          <Checkbox
                            checked={task.is_completed}
                            onCheckedChange={(checked) => toggleTask.mutate({ id: task.id, completed: !!checked })}
                            className="mt-0.5"
                          />
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium ${task.is_completed ? "line-through" : ""}`}>{task.title}</p>
                            <div className="flex gap-3 mt-0.5 text-xs text-muted-foreground">
                              {task.employees?.name_ar && <span>{task.employees.name_ar}</span>}
                              {task.due_date && (
                                <span className={!task.is_completed && task.due_date < today ? "text-destructive font-medium" : ""}>
                                  {task.due_date}
                                  {!task.is_completed && task.due_date < today && " (متأخر)"}
                                </span>
                              )}
                            </div>
                          </div>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => deleteTask.mutate(task.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-3">لا توجد مهام في هذه المرحلة</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="employees" className="space-y-4">
          {employeeProgress.length > 0 ? (
            employeeProgress.map(ep => (
              <Card key={ep.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-heading font-bold text-sm">{ep.name}</h3>
                    <Badge variant="outline" className={ep.percent === 100 ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}>
                      {ep.completed}/{ep.total} ({ep.percent}%)
                    </Badge>
                  </div>
                  <Progress value={ep.percent} className="h-2" />
                </CardContent>
              </Card>
            ))
          ) : (
            <Card><CardContent className="py-12 text-center text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p className="font-heading font-medium">لا يوجد موظفون في عملية التهيئة</p>
            </CardContent></Card>
          )}
        </TabsContent>
        <TabsContent value="templates">
          {companyId && <OnboardingTemplates companyId={companyId} employees={employees} />}
        </TabsContent>
      </Tabs>
    </div>
  );
}
