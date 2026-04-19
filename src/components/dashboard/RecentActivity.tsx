import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, UserPlus, Edit, Trash2, Clock } from "lucide-react";

const actionLabels: Record<string, string> = {
  INSERT: "إضافة",
  UPDATE: "تعديل",
  DELETE: "حذف",
};
const actionIcons: Record<string, typeof UserPlus> = {
  INSERT: UserPlus,
  UPDATE: Edit,
  DELETE: Trash2,
};
const actionColors: Record<string, string> = {
  INSERT: "bg-success/10 text-success",
  UPDATE: "bg-primary/10 text-primary",
  DELETE: "bg-destructive/10 text-destructive",
};
const tableLabels: Record<string, string> = {
  employees: "الموظفين",
  departments: "الأقسام",
  leave_requests: "الإجازات",
  attendance_records: "الحضور",
  payroll_runs: "الرواتب",
  contracts: "العقود",
  announcements: "الإعلانات",
  training_courses: "التدريب",
  loans: "السلف",
  candidates: "المرشحين",
};

interface Props {
  companyId: string;
}

export default function RecentActivity({ companyId }: Props) {
  const { data: activities = [] } = useQuery({
    queryKey: ["recent-activity", companyId],
    queryFn: async () => {
      const { data } = await supabase
        .from("audit_logs")
        .select("id, action, table_name, created_at")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })
        .limit(8);
      return data || [];
    },
    enabled: !!companyId,
  });

  if (activities.length === 0) return null;

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <CardTitle className="font-heading text-base flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          آخر النشاطات
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {activities.map((a: any) => {
            const Icon = actionIcons[a.action] || Clock;
            const colorClass = actionColors[a.action] || "bg-muted text-muted-foreground";
            return (
              <div key={a.id} className="flex items-center gap-3 text-sm p-2 rounded-lg hover:bg-muted/50 transition-colors">
                <div className={`p-1.5 rounded-lg ${colorClass}`}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-medium">{actionLabels[a.action] || a.action}</span>
                  {" في "}
                  <span className="text-primary font-medium">{tableLabels[a.table_name] || a.table_name}</span>
                </div>
                <Badge variant="outline" className="text-[10px] shrink-0 font-mono">
                  {new Date(a.created_at).toLocaleTimeString("ar-IQ", { hour: "2-digit", minute: "2-digit" })}
                </Badge>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
