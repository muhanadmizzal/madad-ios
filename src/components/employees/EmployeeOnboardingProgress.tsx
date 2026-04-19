import { CheckCircle2, Circle, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const typeLabels: Record<string, string> = {
  preboarding: "ما قبل الالتحاق",
  first_day: "اليوم الأول",
  first_week: "الأسبوع الأول",
  probation: "فترة التجربة",
};

interface Props {
  employeeId: string;
  companyId: string;
}

export default function EmployeeOnboardingProgress({ employeeId, companyId }: Props) {
  const queryClient = useQueryClient();

  const { data: tasks = [] } = useQuery({
    queryKey: ["onboarding-tasks-emp", employeeId],
    queryFn: async () => {
      const { data } = await supabase
        .from("onboarding_tasks")
        .select("*")
        .eq("employee_id", employeeId)
        .eq("company_id", companyId)
        .order("created_at", { ascending: true });
      return data || [];
    },
    enabled: !!employeeId,
  });

  const toggleTask = useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      const { error } = await supabase.from("onboarding_tasks").update({
        is_completed: completed,
        completed_at: completed ? new Date().toISOString() : null,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["onboarding-tasks-emp", employeeId] }),
  });

  if (tasks.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        لا توجد مهام تهيئة لهذا الموظف
      </div>
    );
  }

  const completedCount = tasks.filter((t: any) => t.is_completed).length;
  const percent = Math.round((completedCount / tasks.length) * 100);
  const today = new Date().toISOString().split("T")[0];

  const tasksByType = Object.keys(typeLabels)
    .map((type) => ({
      type,
      label: typeLabels[type],
      tasks: tasks.filter((t: any) => t.task_type === type),
    }))
    .filter((g) => g.tasks.length > 0);

  return (
    <div className="space-y-4">
      {/* Overall progress */}
      <div className="flex items-center gap-3">
        <Progress value={percent} className="h-2 flex-1" />
        <span className="text-sm font-heading font-bold text-primary">{percent}%</span>
        <Badge variant="outline">{completedCount}/{tasks.length}</Badge>
      </div>
      {percent === 100 && (
        <p className="text-xs text-primary font-medium text-center">🎉 أكمل جميع مهام التهيئة</p>
      )}

      {/* Tasks grouped by phase */}
      {tasksByType.map((group) => (
        <div key={group.type} className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-heading font-medium text-muted-foreground">{group.label}</span>
            <Badge variant="outline" className="text-[10px] h-5">
              {group.tasks.filter((t: any) => t.is_completed).length}/{group.tasks.length}
            </Badge>
          </div>
          {group.tasks.map((task: any) => (
            <div
              key={task.id}
              className={`flex items-start gap-3 p-2.5 rounded-lg border text-sm transition-colors ${
                task.is_completed
                  ? "bg-primary/5 border-primary/10 opacity-70"
                  : "bg-background border-border"
              }`}
            >
              <Checkbox
                checked={task.is_completed}
                onCheckedChange={(checked) => toggleTask.mutate({ id: task.id, completed: !!checked })}
                className="mt-0.5"
              />
              <div className="flex-1 min-w-0">
                <p className={`font-medium ${task.is_completed ? "line-through text-muted-foreground" : ""}`}>
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
                    </span>
                  )}
                  {task.is_completed && (
                    <span className="flex items-center gap-1 text-primary">
                      <CheckCircle2 className="h-3 w-3" />تم
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
