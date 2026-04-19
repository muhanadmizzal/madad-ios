import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Clock, CalendarDays, FileSignature, FileText, Target, Briefcase } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Props {
  employeeId: string;
  companyId: string;
}

interface TimelineEvent {
  date: string;
  type: string;
  icon: any;
  title: string;
  detail?: string;
  color: string;
}

export function EmployeeTimeline({ employeeId, companyId }: Props) {
  const { data: attendance = [] } = useQuery({
    queryKey: ["timeline-attendance", employeeId],
    queryFn: async () => {
      const { data } = await supabase.from("attendance_records").select("date, check_in, check_out, hours_worked").eq("employee_id", employeeId).order("date", { ascending: false }).limit(10);
      return data || [];
    },
  });

  const { data: leaves = [] } = useQuery({
    queryKey: ["timeline-leaves", employeeId],
    queryFn: async () => {
      const { data } = await supabase.from("leave_requests").select("start_date, end_date, status, leave_types(name)").eq("employee_id", employeeId).order("created_at", { ascending: false }).limit(10);
      return data || [];
    },
  });

  const { data: contracts = [] } = useQuery({
    queryKey: ["timeline-contracts", employeeId],
    queryFn: async () => {
      const { data } = await supabase.from("contracts").select("start_date, end_date, contract_type, status").eq("employee_id", employeeId).order("start_date", { ascending: false }).limit(5);
      return data || [];
    },
  });

  const { data: notes = [] } = useQuery({
    queryKey: ["timeline-notes", employeeId],
    queryFn: async () => {
      const { data } = await supabase.from("employee_notes").select("created_at, note, note_type").eq("employee_id", employeeId).order("created_at", { ascending: false }).limit(10);
      return data || [];
    },
  });

  const { data: goals = [] } = useQuery({
    queryKey: ["timeline-goals", employeeId],
    queryFn: async () => {
      const { data } = await supabase.from("goals").select("created_at, title, status, progress").eq("employee_id", employeeId).order("created_at", { ascending: false }).limit(5);
      return data || [];
    },
  });

  const events: TimelineEvent[] = [];

  attendance.forEach((a: any) => {
    events.push({
      date: a.date,
      type: "حضور",
      icon: Clock,
      title: `حضور - ${a.hours_worked ? a.hours_worked + " ساعة" : "بدون خروج"}`,
      detail: a.check_in ? new Date(a.check_in).toLocaleTimeString("ar-IQ", { hour: "2-digit", minute: "2-digit" }) : undefined,
      color: "text-primary",
    });
  });

  leaves.forEach((l: any) => {
    const statusLabel = l.status === "approved" ? "مقبول" : l.status === "pending" ? "معلق" : "مرفوض";
    events.push({
      date: l.start_date,
      type: "إجازة",
      icon: CalendarDays,
      title: `${(l as any).leave_types?.name || "إجازة"} (${statusLabel})`,
      detail: `${l.start_date} → ${l.end_date}`,
      color: l.status === "approved" ? "text-primary" : l.status === "pending" ? "text-accent" : "text-destructive",
    });
  });

  contracts.forEach((c: any) => {
    events.push({
      date: c.start_date,
      type: "عقد",
      icon: FileSignature,
      title: `عقد ${c.contract_type === "permanent" ? "دائم" : "مؤقت"} - ${c.status === "active" ? "نشط" : c.status}`,
      detail: `${c.start_date} → ${c.end_date || "مفتوح"}`,
      color: "text-primary",
    });
  });

  notes.forEach((n: any) => {
    events.push({
      date: n.created_at?.split("T")[0] || "",
      type: "ملاحظة",
      icon: FileText,
      title: n.note.slice(0, 60) + (n.note.length > 60 ? "..." : ""),
      color: "text-muted-foreground",
    });
  });

  goals.forEach((g: any) => {
    events.push({
      date: g.created_at?.split("T")[0] || "",
      type: "هدف",
      icon: Target,
      title: `${g.title} (${g.progress || 0}%)`,
      detail: g.status === "completed" ? "مكتمل" : "قيد التنفيذ",
      color: g.status === "completed" ? "text-primary" : "text-accent",
    });
  });

  events.sort((a, b) => b.date.localeCompare(a.date));

  if (events.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground text-sm">
        <Briefcase className="h-8 w-8 mx-auto mb-2 opacity-20" />
        <p>لا توجد سجلات بعد</p>
      </div>
    );
  }

  return (
    <div className="relative pr-6">
      <div className="absolute right-2 top-0 bottom-0 w-px bg-border" />
      {events.slice(0, 20).map((event, i) => (
        <div key={i} className="relative flex gap-3 pb-4">
          <div className={`absolute right-0 top-1 w-4 h-4 rounded-full bg-card border-2 border-current ${event.color} z-10`} />
          <div className="flex-1 mr-4">
            <div className="flex items-center gap-2 mb-0.5">
              <event.icon className={`h-3.5 w-3.5 ${event.color}`} />
              <Badge variant="outline" className="text-[10px] h-5">{event.type}</Badge>
              <span className="text-[10px] text-muted-foreground" dir="ltr">{event.date}</span>
            </div>
            <p className="text-sm font-medium">{event.title}</p>
            {event.detail && <p className="text-xs text-muted-foreground">{event.detail}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}
