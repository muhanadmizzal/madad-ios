import { useState } from "react";
import { Plus, Target, Star, TrendingUp, ClipboardList, Sparkles, BarChart3, Gauge, AlertTriangle, UserCheck } from "lucide-react";
import { AiModuleInsights } from "@/components/ai/AiModuleInsights";
import { FeatureGate } from "@/components/subscription/FeatureGate";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";

const statusLabels: Record<string, string> = { in_progress: "قيد التنفيذ", completed: "مكتمل", cancelled: "ملغى" };
const appraisalStatus: Record<string, string> = { draft: "مسودة", submitted: "مقدّم", reviewed: "تمت المراجعة" };

export default function Performance() {
  const [goalDialog, setGoalDialog] = useState(false);
  const [appraisalDialog, setAppraisalDialog] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [appraisalDetailDialog, setAppraisalDetailDialog] = useState<any>(null);
  const { toast } = useToast();
  const { companyId } = useCompany();
  const queryClient = useQueryClient();

  const { data: employees = [] } = useQuery({
    queryKey: ["employees", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("employees").select("id, name_ar, position, department_id, departments(name), hire_date, contract_type").eq("company_id", companyId!).eq("status", "active");
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: goals = [] } = useQuery({
    queryKey: ["goals", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("goals").select("*, employees(name_ar)").eq("company_id", companyId!).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: appraisals = [] } = useQuery({
    queryKey: ["appraisals", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("appraisals").select("*, employees(name_ar)").eq("company_id", companyId!).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!companyId,
  });

  const addGoal = useMutation({
    mutationFn: async (formData: FormData) => {
      const { error } = await supabase.from("goals").insert({
        company_id: companyId!,
        employee_id: selectedEmployee,
        title: formData.get("title") as string,
        description: (formData.get("description") as string) || null,
        target_date: (formData.get("target_date") as string) || null,
        weight: Number(formData.get("weight")) || 100,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      toast({ title: "تم بنجاح", description: "تم إضافة الهدف" });
      setGoalDialog(false);
      setSelectedEmployee("");
    },
    onError: (err: Error) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  const addAppraisal = useMutation({
    mutationFn: async (formData: FormData) => {
      const { error } = await supabase.from("appraisals").insert({
        company_id: companyId!,
        employee_id: selectedEmployee,
        cycle: formData.get("cycle") as string,
        appraisal_type: (formData.get("appraisal_type") as string) || "annual",
        overall_rating: Number(formData.get("overall_rating")) || null,
        strengths: (formData.get("strengths") as string) || null,
        improvements: (formData.get("improvements") as string) || null,
        comments: (formData.get("comments") as string) || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appraisals"] });
      toast({ title: "تم بنجاح", description: "تم إنشاء التقييم" });
      setAppraisalDialog(false);
      setSelectedEmployee("");
    },
    onError: (err: Error) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  const updateProgress = useMutation({
    mutationFn: async ({ id, progress }: { id: string; progress: number }) => {
      const status = progress >= 100 ? "completed" : "in_progress";
      const { error } = await supabase.from("goals").update({ progress, status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["goals"] }),
  });

  const updateAppraisalStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updates: any = { status };
      if (status === "submitted") updates.submitted_at = new Date().toISOString();
      const { error } = await supabase.from("appraisals").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appraisals"] });
      toast({ title: "تم التحديث" });
    },
  });

  const avgRating = appraisals.length > 0
    ? (appraisals.reduce((s: number, a: any) => s + (a.overall_rating || 0), 0) / appraisals.filter((a: any) => a.overall_rating).length).toFixed(1)
    : "—";

  const completedGoals = goals.filter((g: any) => g.status === "completed").length;
  const avgGoalProgress = goals.length > 0 ? Math.round(goals.reduce((s: number, g: any) => s + (g.progress || 0), 0) / goals.length) : 0;

  // KPI Dashboard data
  const employeeKPIs = employees.map((emp: any) => {
    const empGoals = goals.filter((g: any) => g.employee_id === emp.id);
    const empAppraisals = appraisals.filter((a: any) => a.employee_id === emp.id);
    const goalCompletion = empGoals.length > 0 ? Math.round(empGoals.reduce((s: number, g: any) => s + (g.progress || 0), 0) / empGoals.length) : 0;
    const latestRating = empAppraisals.length > 0 ? empAppraisals[0].overall_rating : null;
    return { ...emp, goalCount: empGoals.length, goalCompletion, latestRating, appraisalCount: empAppraisals.length };
  }).filter(e => e.goalCount > 0 || e.appraisalCount > 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading font-bold text-2xl text-foreground">الأداء والتطوير</h1>
          <p className="text-muted-foreground text-sm mt-1">الأهداف والتقييمات الدورية ومؤشرات الأداء</p>
        </div>
        <div className="flex gap-2 flex-wrap">
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-muted text-primary"><Target className="h-5 w-5" /></div>
          <div><p className="text-sm text-muted-foreground">الأهداف النشطة</p><p className="text-2xl font-heading font-bold">{goals.filter((g: any) => g.status === "in_progress").length}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-muted text-primary"><TrendingUp className="h-5 w-5" /></div>
          <div><p className="text-sm text-muted-foreground">متوسط التقدم</p><p className="text-2xl font-heading font-bold">{avgGoalProgress}%</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-muted text-accent"><Star className="h-5 w-5" /></div>
          <div><p className="text-sm text-muted-foreground">متوسط التقييم</p><p className="text-2xl font-heading font-bold">{avgRating}/5</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-muted text-primary"><ClipboardList className="h-5 w-5" /></div>
          <div><p className="text-sm text-muted-foreground">أهداف مكتملة</p><p className="text-2xl font-heading font-bold">{completedGoals}</p></div>
        </CardContent></Card>
      </div>

      <Tabs defaultValue="goals">
        <TabsList>
          <TabsTrigger value="goals" className="font-heading">الأهداف</TabsTrigger>
          <TabsTrigger value="appraisals" className="font-heading">التقييمات</TabsTrigger>
          <TabsTrigger value="kpi" className="font-heading gap-1"><Gauge className="h-3.5 w-3.5" />مؤشرات الأداء</TabsTrigger>
        </TabsList>

        <TabsContent value="goals">
          <div className="flex justify-end mb-4">
            <Dialog open={goalDialog} onOpenChange={setGoalDialog}>
              <DialogTrigger asChild><Button className="gap-2 font-heading"><Plus className="h-4 w-4" />إضافة هدف</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle className="font-heading">هدف جديد</DialogTitle></DialogHeader>
                <form onSubmit={(e) => { e.preventDefault(); addGoal.mutate(new FormData(e.currentTarget)); }} className="space-y-4">
                  <div className="space-y-2">
                    <Label>الموظف</Label>
                    <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                      <SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger>
                      <SelectContent>{employees.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.name_ar}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label>عنوان الهدف</Label><Input name="title" required /></div>
                  <div className="space-y-2"><Label>الوصف</Label><Textarea name="description" /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>الموعد المستهدف</Label><Input name="target_date" type="date" dir="ltr" className="text-left" /></div>
                    <div className="space-y-2"><Label>الوزن (%)</Label><Input name="weight" type="number" defaultValue={100} /></div>
                  </div>
                  <Button type="submit" className="w-full font-heading" disabled={!selectedEmployee || addGoal.isPending}>حفظ</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          {goals.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {goals.map((g: any) => (
                <Card key={g.id}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-heading font-bold">{g.title}</h3>
                        <p className="text-sm text-muted-foreground">{g.employees?.name_ar}</p>
                      </div>
                      <Badge variant="outline" className={g.status === "completed" ? "bg-primary/10 text-primary" : "bg-accent/10 text-accent-foreground"}>
                        {statusLabels[g.status]}
                      </Badge>
                    </div>
                    {g.description && <p className="text-sm text-muted-foreground mb-3">{g.description}</p>}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>التقدم</span>
                        <span className="font-heading font-bold">{g.progress}%</span>
                      </div>
                      <Progress value={g.progress} className="h-2" />
                      <div className="flex gap-2 mt-2">
                        {[25, 50, 75, 100].map(v => (
                          <Button key={v} size="sm" variant={g.progress >= v ? "default" : "outline"} className="h-7 text-xs"
                            onClick={() => updateProgress.mutate({ id: g.id, progress: v })}>{v}%</Button>
                        ))}
                      </div>
                      {g.target_date && (
                        <p className="text-xs text-muted-foreground mt-1">الموعد: {new Date(g.target_date).toLocaleDateString("ar-IQ")}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card><CardContent className="py-12 text-center text-muted-foreground">
              <Target className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p className="font-heading font-medium">لا توجد أهداف</p>
            </CardContent></Card>
          )}
        </TabsContent>

        <TabsContent value="appraisals">
          <div className="flex justify-end mb-4">
            <Dialog open={appraisalDialog} onOpenChange={setAppraisalDialog}>
              <DialogTrigger asChild><Button className="gap-2 font-heading"><Plus className="h-4 w-4" />تقييم جديد</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle className="font-heading">تقييم أداء</DialogTitle></DialogHeader>
                <form onSubmit={(e) => { e.preventDefault(); addAppraisal.mutate(new FormData(e.currentTarget)); }} className="space-y-4">
                  <div className="space-y-2">
                    <Label>الموظف</Label>
                    <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                      <SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger>
                      <SelectContent>{employees.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.name_ar}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>الدورة</Label><Input name="cycle" defaultValue="2026" required /></div>
                    <div className="space-y-2">
                      <Label>النوع</Label>
                      <Select name="appraisal_type" defaultValue="annual">
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="annual">سنوي</SelectItem>
                          <SelectItem value="mid_year">نصف سنوي</SelectItem>
                          <SelectItem value="probation">فترة تجربة</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2"><Label>التقييم العام (1-5)</Label><Input name="overall_rating" type="number" min={1} max={5} /></div>
                  <div className="space-y-2"><Label>نقاط القوة</Label><Textarea name="strengths" /></div>
                  <div className="space-y-2"><Label>مجالات التحسين</Label><Textarea name="improvements" /></div>
                  <div className="space-y-2"><Label>ملاحظات</Label><Textarea name="comments" /></div>
                  <Button type="submit" className="w-full font-heading" disabled={!selectedEmployee || addAppraisal.isPending}>حفظ</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          {appraisals.length > 0 ? (
            <Card><CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الموظف</TableHead>
                    <TableHead>الدورة</TableHead>
                    <TableHead>النوع</TableHead>
                    <TableHead>التقييم</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>إجراء</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {appraisals.map((a: any) => (
                    <TableRow key={a.id} className="cursor-pointer" onClick={() => setAppraisalDetailDialog(a)}>
                      <TableCell className="font-medium">{a.employees?.name_ar}</TableCell>
                      <TableCell>{a.cycle}</TableCell>
                      <TableCell>{a.appraisal_type === "annual" ? "سنوي" : a.appraisal_type === "mid_year" ? "نصف سنوي" : "تجربة"}</TableCell>
                      <TableCell>
                        <div className="flex gap-0.5">{[1,2,3,4,5].map(s => <Star key={s} className={`h-3 w-3 ${s <= (a.overall_rating || 0) ? "fill-accent text-accent" : "text-muted"}`} />)}</div>
                      </TableCell>
                      <TableCell><Badge variant="outline">{appraisalStatus[a.status]}</Badge></TableCell>
                      <TableCell>
                        {a.status === "draft" && (
                          <Button size="sm" variant="ghost" className="h-7 text-xs font-heading" onClick={(e) => { e.stopPropagation(); updateAppraisalStatus.mutate({ id: a.id, status: "submitted" }); }}>تقديم</Button>
                        )}
                        {a.status === "submitted" && (
                          <Button size="sm" variant="ghost" className="h-7 text-xs font-heading text-primary" onClick={(e) => { e.stopPropagation(); updateAppraisalStatus.mutate({ id: a.id, status: "reviewed" }); }}>مراجعة</Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent></Card>
          ) : (
            <Card><CardContent className="py-12 text-center text-muted-foreground">
              <ClipboardList className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p className="font-heading font-medium">لا توجد تقييمات</p>
            </CardContent></Card>
          )}
        </TabsContent>

        <TabsContent value="kpi">
          <Card>
            <CardHeader><CardTitle className="font-heading text-lg flex items-center gap-2"><Gauge className="h-5 w-5 text-primary" />لوحة مؤشرات الأداء الرئيسية</CardTitle></CardHeader>
            <CardContent className="p-0">
              {employeeKPIs.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>الموظف</TableHead>
                      <TableHead>عدد الأهداف</TableHead>
                      <TableHead>نسبة الإنجاز</TableHead>
                      <TableHead>آخر تقييم</TableHead>
                      <TableHead>الأداء العام</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employeeKPIs.sort((a, b) => b.goalCompletion - a.goalCompletion).map((emp) => {
                      const overallScore = emp.latestRating
                        ? Math.round((emp.goalCompletion * 0.6 + (emp.latestRating / 5) * 100 * 0.4))
                        : emp.goalCompletion;
                      const level = overallScore >= 80 ? { label: "ممتاز", class: "bg-primary/10 text-primary" }
                        : overallScore >= 60 ? { label: "جيد", class: "bg-accent/10 text-accent-foreground" }
                        : overallScore >= 40 ? { label: "مقبول", class: "bg-muted text-muted-foreground" }
                        : { label: "يحتاج تحسين", class: "bg-destructive/10 text-destructive" };
                      return (
                        <TableRow key={emp.id}>
                          <TableCell className="font-medium">{emp.name_ar}</TableCell>
                          <TableCell>{emp.goalCount}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Progress value={emp.goalCompletion} className="h-2 w-20" />
                              <span className="text-sm font-heading">{emp.goalCompletion}%</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {emp.latestRating ? (
                              <div className="flex gap-0.5">{[1,2,3,4,5].map(s => <Star key={s} className={`h-3 w-3 ${s <= emp.latestRating ? "fill-accent text-accent" : "text-muted"}`} />)}</div>
                            ) : "—"}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={level.class}>{level.label} ({overallScore}%)</Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="py-12 text-center text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p className="font-heading font-medium">لا توجد بيانات أداء بعد</p>
                  <p className="text-sm mt-1">أضف أهداف وتقييمات للموظفين لعرض مؤشرات الأداء</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Appraisal Detail Dialog */}
      <Dialog open={!!appraisalDetailDialog} onOpenChange={() => setAppraisalDetailDialog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="font-heading">تفاصيل التقييم</DialogTitle></DialogHeader>
          {appraisalDetailDialog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-muted rounded-lg"><p className="text-xs text-muted-foreground">الموظف</p><p className="font-heading font-bold">{appraisalDetailDialog.employees?.name_ar}</p></div>
                <div className="p-3 bg-muted rounded-lg"><p className="text-xs text-muted-foreground">الدورة</p><p className="font-heading font-bold">{appraisalDetailDialog.cycle}</p></div>
              </div>
              <div className="p-3 bg-muted rounded-lg text-center">
                <p className="text-xs text-muted-foreground mb-1">التقييم العام</p>
                <div className="flex gap-1 justify-center">{[1,2,3,4,5].map(s => <Star key={s} className={`h-5 w-5 ${s <= (appraisalDetailDialog.overall_rating || 0) ? "fill-accent text-accent" : "text-muted"}`} />)}</div>
              </div>
              {appraisalDetailDialog.strengths && (
                <div><p className="text-sm font-heading font-bold text-primary mb-1">نقاط القوة</p><p className="text-sm text-muted-foreground">{appraisalDetailDialog.strengths}</p></div>
              )}
              {appraisalDetailDialog.improvements && (
                <div><p className="text-sm font-heading font-bold text-destructive mb-1">مجالات التحسين</p><p className="text-sm text-muted-foreground">{appraisalDetailDialog.improvements}</p></div>
              )}
              {appraisalDetailDialog.comments && (
                <div><p className="text-sm font-heading font-bold mb-1">ملاحظات</p><p className="text-sm text-muted-foreground">{appraisalDetailDialog.comments}</p></div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* AI Performance Insights */}
      <AiModuleInsights
        module="performance"
        title="رؤى الأداء الذكية"
        description="تحليل الأداء والتوصيات"
        feature="gap_analysis"
        compact
        quickActions={[
          { label: "جاهزية الترقية", question: "حدد الموظفين الجاهزين للترقية بناءً على أدائهم وأهدافهم مع شرح عوامل القرار.", icon: <UserCheck className="h-3 w-3" /> },
          { label: "فجوات الأداء", question: "حلل فجوات الأداء بين الأقسام والموظفين وقدم خطة تحسين.", icon: <AlertTriangle className="h-3 w-3" /> },
          { label: "خطط تطوير", question: "اقترح خطط تطوير مخصصة للموظفين بناءً على تقييماتهم وأهدافهم.", icon: <TrendingUp className="h-3 w-3" /> },
        ]}
        contextData={`الأهداف: ${goals.length} (مكتمل: ${completedGoals})\nمتوسط التقدم: ${avgGoalProgress}%\nالتقييمات: ${appraisals.length}\nمتوسط التقييم: ${avgRating}/5\n\nتفاصيل:\n${employeeKPIs.slice(0, 20).map((e: any) => `- ${e.name_ar}: أهداف=${e.goalCount} تقدم=${e.goalCompletion}% تقييم=${e.latestRating || "?"}/5`).join("\n")}`}
      />
    </div>
  );
}
