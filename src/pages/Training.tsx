import { useState } from "react";
import { Plus, GraduationCap, BookOpen, Award, Users, CheckCircle, XCircle } from "lucide-react";
import { AiModuleInsights } from "@/components/ai/AiModuleInsights";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";

const statusLabels: Record<string, string> = { planned: "مخطط", active: "نشط", completed: "مكتمل", cancelled: "ملغى" };

export default function Training() {
  const [dialog, setDialog] = useState(false);
  const [enrollDialog, setEnrollDialog] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [isMandatory, setIsMandatory] = useState(false);
  const { toast } = useToast();
  const { companyId } = useCompany();
  const queryClient = useQueryClient();

  const { data: employees = [] } = useQuery({
    queryKey: ["employees", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("employees").select("id, name_ar").eq("company_id", companyId!).eq("status", "active");
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: courses = [] } = useQuery({
    queryKey: ["training-courses", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("training_courses").select("*").eq("company_id", companyId!).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: enrollments = [] } = useQuery({
    queryKey: ["training-enrollments", selectedCourse?.id],
    queryFn: async () => {
      const { data } = await supabase.from("training_enrollments").select("*, employees(name_ar)").eq("course_id", selectedCourse!.id);
      return data || [];
    },
    enabled: !!selectedCourse?.id,
  });

  const addCourse = useMutation({
    mutationFn: async (formData: FormData) => {
      const { error } = await supabase.from("training_courses").insert({
        company_id: companyId!,
        title: formData.get("title") as string,
        description: (formData.get("description") as string) || null,
        trainer: (formData.get("trainer") as string) || null,
        course_type: (formData.get("course_type") as string) || "internal",
        duration_hours: Number(formData.get("duration_hours")) || 0,
        is_mandatory: isMandatory,
        start_date: (formData.get("start_date") as string) || null,
        end_date: (formData.get("end_date") as string) || null,
        max_participants: Number(formData.get("max_participants")) || null,
        cost: Number(formData.get("cost")) || 0,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training-courses"] });
      toast({ title: "تم بنجاح", description: "تم إنشاء الدورة التدريبية" });
      setDialog(false);
      setIsMandatory(false);
    },
    onError: (err: Error) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  const enrollEmployee = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("training_enrollments").insert({
        course_id: selectedCourse!.id,
        employee_id: selectedEmployee,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training-enrollments"] });
      toast({ title: "تم التسجيل" });
      setEnrollDialog(false);
      setSelectedEmployee("");
    },
    onError: (err: Error) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  const markComplete = useMutation({
    mutationFn: async ({ id, score }: { id: string; score?: number }) => {
      const { error } = await supabase.from("training_enrollments").update({
        status: "completed",
        score: score || null,
        completed_at: new Date().toISOString(),
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training-enrollments"] });
      toast({ title: "تم تسجيل الإكمال" });
    },
    onError: (err: Error) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  const updateCourseStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("training_courses").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training-courses"] });
      toast({ title: "تم التحديث" });
    },
  });

  const completedEnrollments = enrollments.filter((e: any) => e.status === "completed").length;
  const completionRate = enrollments.length > 0 ? Math.round((completedEnrollments / enrollments.length) * 100) : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading font-bold text-2xl text-foreground">التدريب والتطوير</h1>
          <p className="text-muted-foreground text-sm mt-1">{courses.length} دورة تدريبية</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <AiModuleInsights
            module="training"
            title="رؤى التدريب"
            description="تحليل البرامج التدريبية واحتياجات التطوير"
            feature="planning"
            compact
            quickActions={[
              { label: "احتياجات التدريب", question: "حلل احتياجات التدريب بناءً على فجوات المهارات وأداء الموظفين" },
              { label: "فعالية البرامج", question: "قيّم فعالية البرامج التدريبية الحالية وقدم توصيات للتحسين" },
              { label: "خطة تدريب مقترحة", question: "اقترح خطة تدريب ربع سنوية بناءً على بيانات الشركة" },
            ]}
          />
        </div>
        <Dialog open={dialog} onOpenChange={setDialog}>
          <DialogTrigger asChild><Button className="gap-2 font-heading"><Plus className="h-4 w-4" />إضافة دورة</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle className="font-heading">دورة تدريبية جديدة</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); addCourse.mutate(new FormData(e.currentTarget)); }} className="space-y-4">
              <div className="space-y-2"><Label>عنوان الدورة</Label><Input name="title" required /></div>
              <div className="space-y-2"><Label>الوصف</Label><Textarea name="description" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>المدرب</Label><Input name="trainer" /></div>
                <div className="space-y-2">
                  <Label>النوع</Label>
                  <Select name="course_type" defaultValue="internal">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="internal">داخلي</SelectItem>
                      <SelectItem value="external">خارجي</SelectItem>
                      <SelectItem value="online">أونلاين</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2"><Label>المدة (ساعات)</Label><Input name="duration_hours" type="number" /></div>
                <div className="space-y-2"><Label>الحد الأقصى</Label><Input name="max_participants" type="number" /></div>
                <div className="space-y-2"><Label>التكلفة</Label><Input name="cost" type="number" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>تاريخ البدء</Label><Input name="start_date" type="date" dir="ltr" className="text-left" /></div>
                <div className="space-y-2"><Label>تاريخ الانتهاء</Label><Input name="end_date" type="date" dir="ltr" className="text-left" /></div>
              </div>
              <div className="flex items-center gap-2"><Switch checked={isMandatory} onCheckedChange={setIsMandatory} /><Label>دورة إلزامية</Label></div>
              <Button type="submit" className="w-full font-heading" disabled={addCourse.isPending}>حفظ</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-muted text-primary"><BookOpen className="h-5 w-5" /></div>
          <div><p className="text-sm text-muted-foreground">الدورات النشطة</p><p className="text-2xl font-heading font-bold">{courses.filter((c: any) => c.status === "active" || c.status === "planned").length}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-muted text-accent"><Award className="h-5 w-5" /></div>
          <div><p className="text-sm text-muted-foreground">دورات إلزامية</p><p className="text-2xl font-heading font-bold">{courses.filter((c: any) => c.is_mandatory).length}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-muted text-primary"><GraduationCap className="h-5 w-5" /></div>
          <div><p className="text-sm text-muted-foreground">المكتملة</p><p className="text-2xl font-heading font-bold">{courses.filter((c: any) => c.status === "completed").length}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-muted text-primary"><Users className="h-5 w-5" /></div>
          <div><p className="text-sm text-muted-foreground">إجمالي التسجيلات</p><p className="text-2xl font-heading font-bold">{selectedCourse ? enrollments.length : "—"}</p></div>
        </CardContent></Card>
      </div>

      {courses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.map((course: any) => (
            <Card key={course.id} className={`cursor-pointer hover:shadow-md transition-shadow ${selectedCourse?.id === course.id ? "ring-2 ring-primary" : ""}`} onClick={() => { setSelectedCourse(course); setEnrollDialog(false); }}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-heading font-bold">{course.title}</h3>
                  <Badge variant="outline" className={course.status === "active" ? "bg-primary/10 text-primary" : course.status === "completed" ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}>
                    {statusLabels[course.status]}
                  </Badge>
                </div>
                {course.description && <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{course.description}</p>}
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  {course.trainer && <span>المدرب: {course.trainer}</span>}
                  {course.duration_hours > 0 && <span>• {course.duration_hours} ساعة</span>}
                  {course.is_mandatory && <Badge variant="outline" className="bg-destructive/10 text-destructive text-xs">إلزامي</Badge>}
                </div>
                {course.status !== "completed" && course.status !== "cancelled" && (
                  <div className="flex gap-1 mt-3">
                    <Button size="sm" variant="ghost" className="h-7 text-xs font-heading text-primary" onClick={(e) => { e.stopPropagation(); updateCourseStatus.mutate({ id: course.id, status: course.status === "planned" ? "active" : "completed" }); }}>
                      {course.status === "planned" ? "تفعيل" : "إكمال"}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card><CardContent className="py-16 text-center text-muted-foreground">
          <GraduationCap className="h-12 w-12 mx-auto mb-3 opacity-20" />
          <p className="font-heading font-medium">لا توجد دورات تدريبية</p>
        </CardContent></Card>
      )}

      {selectedCourse && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="font-heading text-lg">المسجلون في: {selectedCourse.title}</CardTitle>
              {enrollments.length > 0 && (
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-xs text-muted-foreground">نسبة الإكمال</span>
                  <Progress value={completionRate} className="h-2 w-32" />
                  <span className="text-xs font-heading font-bold">{completionRate}%</span>
                </div>
              )}
            </div>
            <Dialog open={enrollDialog} onOpenChange={setEnrollDialog}>
              <DialogTrigger asChild><Button size="sm" className="gap-2 font-heading"><Plus className="h-4 w-4" />تسجيل موظف</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle className="font-heading">تسجيل في الدورة</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>الموظف</Label>
                    <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                      <SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger>
                      <SelectContent>{employees.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.name_ar}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <Button className="w-full font-heading" onClick={() => enrollEmployee.mutate()} disabled={!selectedEmployee || enrollEmployee.isPending}>تسجيل</Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent className="p-0">
            {enrollments.length > 0 ? (
              <Table>
                <TableHeader><TableRow><TableHead>الموظف</TableHead><TableHead>الحالة</TableHead><TableHead>الدرجة</TableHead><TableHead>التاريخ</TableHead><TableHead>إجراء</TableHead></TableRow></TableHeader>
                <TableBody>
                  {enrollments.map((e: any) => (
                    <TableRow key={e.id}>
                      <TableCell className="font-medium">{e.employees?.name_ar}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={e.status === "completed" ? "bg-primary/10 text-primary" : ""}>
                          {e.status === "enrolled" ? "مسجّل" : e.status === "completed" ? "أكمل" : e.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{e.score != null ? `${e.score}%` : "—"}</TableCell>
                      <TableCell dir="ltr">{e.completed_at ? new Date(e.completed_at).toLocaleDateString("ar-IQ") : new Date(e.created_at).toLocaleDateString("ar-IQ")}</TableCell>
                      <TableCell>
                        {e.status !== "completed" && (
                          <Button size="sm" variant="ghost" className="h-7 text-xs font-heading gap-1" onClick={() => {
                            const score = prompt("أدخل الدرجة (اختياري):");
                            markComplete.mutate({ id: e.id, score: score ? Number(score) : undefined });
                          }}>
                            <CheckCircle className="h-3 w-3" />إكمال
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="py-8 text-center text-muted-foreground text-sm">لا يوجد مسجلون بعد</div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
