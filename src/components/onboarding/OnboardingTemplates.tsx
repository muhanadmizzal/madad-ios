import { useState } from "react";
import { Plus, Trash2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const typeLabels: Record<string, string> = {
  preboarding: "ما قبل الالتحاق",
  first_day: "اليوم الأول",
  first_week: "الأسبوع الأول",
  probation: "فترة التجربة",
};

interface Props {
  companyId: string;
  employees: any[];
}

export default function OnboardingTemplates({ companyId, employees }: Props) {
  const [dialog, setDialog] = useState(false);
  const [taskType, setTaskType] = useState("preboarding");
  const [assignDialog, setAssignDialog] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: templates = [] } = useQuery({
    queryKey: ["onboarding-templates", companyId],
    queryFn: async () => {
      const { data } = await supabase
        .from("onboarding_templates")
        .select("*")
        .eq("company_id", companyId)
        .eq("is_active", true)
        .order("sort_order");
      return data || [];
    },
    enabled: !!companyId,
  });

  const addTemplate = useMutation({
    mutationFn: async (formData: FormData) => {
      const { error } = await supabase.from("onboarding_templates").insert({
        company_id: companyId,
        title: formData.get("title") as string,
        description: (formData.get("description") as string) || null,
        task_type: taskType,
        sort_order: templates.length,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["onboarding-templates"] });
      toast({ title: "تم الحفظ" });
      setDialog(false);
    },
    onError: (err: Error) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("onboarding_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["onboarding-templates"] });
      toast({ title: "تم الحذف" });
    },
  });

  const assignToEmployee = useMutation({
    mutationFn: async () => {
      if (!selectedEmployee) throw new Error("اختر موظف");
      const tasks = templates.map((t: any) => ({
        company_id: companyId,
        employee_id: selectedEmployee,
        title: t.title,
        description: t.description,
        task_type: t.task_type,
      }));
      const { error } = await supabase.from("onboarding_tasks").insert(tasks);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["onboarding-tasks"] });
      toast({ title: "تم تعيين المهام للموظف" });
      setAssignDialog(false);
      setSelectedEmployee("");
    },
    onError: (err: Error) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="font-heading text-lg">قوالب التهيئة</CardTitle>
        <div className="flex gap-2">
          <Dialog open={assignDialog} onOpenChange={setAssignDialog}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="font-heading gap-2" disabled={templates.length === 0}>
                <Copy className="h-4 w-4" />تعيين لموظف
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle className="font-heading">تعيين قوالب التهيئة لموظف</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>الموظف</Label>
                  <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                    <SelectTrigger><SelectValue placeholder="اختر الموظف" /></SelectTrigger>
                    <SelectContent>
                      {employees.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.name_ar}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-sm text-muted-foreground">سيتم إنشاء {templates.length} مهمة تهيئة للموظف المحدد.</p>
                <Button className="w-full font-heading" onClick={() => assignToEmployee.mutate()} disabled={assignToEmployee.isPending || !selectedEmployee}>
                  {assignToEmployee.isPending ? "جاري التعيين..." : "تعيين"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={dialog} onOpenChange={setDialog}>
            <DialogTrigger asChild>
              <Button size="sm" className="font-heading gap-2"><Plus className="h-4 w-4" />إضافة قالب</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle className="font-heading">إضافة مهمة قالب</DialogTitle></DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); addTemplate.mutate(new FormData(e.currentTarget)); }} className="space-y-4">
                <div className="space-y-2"><Label>العنوان</Label><Input name="title" required /></div>
                <div className="space-y-2"><Label>الوصف</Label><Textarea name="description" rows={2} /></div>
                <div className="space-y-2">
                  <Label>المرحلة</Label>
                  <Select value={taskType} onValueChange={setTaskType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(typeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full font-heading" disabled={addTemplate.isPending}>حفظ</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {templates.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>المهمة</TableHead>
                <TableHead>المرحلة</TableHead>
                <TableHead>إجراء</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((t: any) => (
                <TableRow key={t.id}>
                  <TableCell>
                    <p className="font-medium text-sm">{t.title}</p>
                    {t.description && <p className="text-xs text-muted-foreground">{t.description}</p>}
                  </TableCell>
                  <TableCell><Badge variant="outline">{typeLabels[t.task_type] || t.task_type}</Badge></TableCell>
                  <TableCell>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => deleteTemplate.mutate(t.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-8 text-muted-foreground text-sm">لا توجد قوالب. أضف قوالب مهام التهيئة ليتم تعيينها للموظفين الجدد تلقائياً.</div>
        )}
      </CardContent>
    </Card>
  );
}
