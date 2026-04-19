import { CheckCircle2, Circle, Calendar, ClipboardCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { useAuth } from "@/contexts/AuthContext";

const typeLabels: Record<string, string> = {
  preboarding: "ما قبل الالتحاق",
  first_day: "اليوم الأول",
  first_week: "الأسبوع الأول",
  probation: "فترة التجربة",
};

export default function EPOnboarding() {
  const { companyId } = useCompany();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Get employee ID for current user
  const { data: employee } = useQuery({
    queryKey: ["my-employee", user?.id, companyId],
    queryFn: async () => {
      const { data } = await supabase
        .from("employees")
        .select("id, name_ar")
        .eq("company_id", companyId!)
        .eq("user_id", user!.id)
        .eq("status", "active")
        .single();
      return data;
    },
    enabled: !!companyId && !!user?.id,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["my-onboarding-tasks", employee?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("onboarding_tasks")
        .select("*")
        .eq("employee_id", employee!.id)
        .order("created_at", { ascending: true });
      return data || [];
    },
    enabled: !!employee?.id,
  });

  const toggleTask = useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      const { error } = await supabase.from("onboarding_tasks").update({
        is_completed: completed,
        completed_at: completed ? new Date().toISOString() : null,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["my-onboarding-tasks"] }),
  });

  const completedCount = tasks.filter((t: any) => t.is_completed).length;
  const progressPercent = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;
  const today = new Date().toISOString().split("T")[0];

  // Group by type
  const tasksByType = Object.keys(typeLabels).map(type => ({
    type,
    label: typeLabels[type],
    tasks: tasks.filter((t: any) => t.task_type === type),
  })).filter(g => g.tasks.length > 0);

  if (tasks.length === 0) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="font-heading font-bold text-2xl text-foreground">التهيئة والتأهيل</h1>
          <p className="text-muted-foreground text-sm mt-1">مهام التهيئة الخاصة بك</p>
        </div>
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <ClipboardCheck className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p className="font-heading font-medium">لا توجد مهام تهيئة حالياً</p>
            <p className="text-sm mt-1">سيتم تعيين مهام التهيئة لك تلقائياً عند الانضمام</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-heading font-bold text-2xl text-foreground">التهيئة والتأهيل</h1>
        <p className="text-muted-foreground text-sm mt-1">{completedCount}/{tasks.length} مهمة مكتملة</p>
      </div>

      {/* Progress */}
      <Card>
        <CardContent className="p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-heading font-medium">تقدمك</span>
            <span className="font-heading font-bold text-primary">{progressPercent}%</span>
          </div>
          <Progress value={progressPercent} className="h-3" />
          {progressPercent === 100 && (
            <p className="text-xs text-primary font-medium text-center mt-2">
              🎉 أحسنت! أكملت جميع مهام التهيئة
            </p>
          )}
        </CardContent>
      </Card>

      {/* Tasks by phase */}
      {tasksByType.map(group => {
        const groupCompleted = group.tasks.filter((t: any) => t.is_completed).length;
        const groupPercent = group.tasks.length > 0 ? Math.round((groupCompleted / group.tasks.length) * 100) : 0;

        return (
          <Card key={group.type}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CardTitle className="font-heading text-base">{group.label}</CardTitle>
                  <Badge variant="outline">{groupCompleted}/{group.tasks.length}</Badge>
                </div>
                <span className="text-xs font-heading text-muted-foreground">{groupPercent}%</span>
              </div>
              <Progress value={groupPercent} className="h-1.5 mt-1" />
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {group.tasks.map((task: any) => (
                  <div
                    key={task.id}
                    className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                      task.is_completed
                        ? "bg-primary/5 border-primary/10 opacity-70"
                        : "bg-background border-border hover:bg-muted/50"
                    }`}
                  >
                    <Checkbox
                      checked={task.is_completed}
                      onCheckedChange={(checked) => toggleTask.mutate({ id: task.id, completed: !!checked })}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${task.is_completed ? "line-through text-muted-foreground" : ""}`}>
                        {task.title}
                      </p>
                      {task.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">{task.description}</p>
                      )}
                      <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                        {task.due_date && (
                          <span className={`flex items-center gap-1 ${!task.is_completed && task.due_date < today ? "text-destructive font-medium" : ""}`}>
                            <Calendar className="h-3 w-3" />
                            {task.due_date}
                            {!task.is_completed && task.due_date < today && " (متأخر)"}
                          </span>
                        )}
                        {task.is_completed && task.completed_at && (
                          <span className="flex items-center gap-1 text-primary">
                            <CheckCircle2 className="h-3 w-3" />
                            تم الإكمال
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
