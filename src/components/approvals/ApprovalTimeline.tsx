import { CheckCircle, XCircle, RotateCcw, ArrowUpCircle, Send, Lock, Archive, FileSignature, AlertTriangle, ShieldCheck } from "lucide-react";
import { useApprovalActions } from "@/hooks/useApprovalWorkflow";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const actionIcons: Record<string, any> = {
  submit: Send,
  approve: CheckCircle,
  reject: XCircle,
  return: RotateCcw,
  escalate: ArrowUpCircle,
  lock: Lock,
  archive: Archive,
};

const actionLabels: Record<string, string> = {
  submit: "تقديم",
  approve: "موافقة",
  reject: "رفض",
  return: "إرجاع",
  escalate: "تصعيد",
  lock: "قفل",
  archive: "أرشفة",
};

const actionColors: Record<string, string> = {
  submit: "text-accent-foreground",
  approve: "text-primary",
  reject: "text-destructive",
  return: "text-warning",
  escalate: "text-accent-foreground",
  lock: "text-muted-foreground",
  archive: "text-muted-foreground",
};

const roleLabels: Record<string, string> = {
  admin: "مدير",
  hr_manager: "مدير HR",
  hr_officer: "مسؤول HR",
  manager: "مدير قسم",
  tenant_admin: "مدير المنشأة",
  super_admin: "مدير النظام",
  employee: "موظف",
};

interface Props {
  instanceId: string;
}

export function ApprovalTimeline({ instanceId }: Props) {
  const { data: actions = [], isLoading } = useApprovalActions(instanceId);

  // Fetch actor profiles and roles
  const actorIds = [...new Set(actions.map((a: any) => a.actor_user_id).filter(Boolean))];
  const { data: profiles = [] } = useQuery({
    queryKey: ["approval-actor-profiles", actorIds.join(",")],
    queryFn: async () => {
      if (actorIds.length === 0) return [];
      const { data } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", actorIds);
      return data || [];
    },
    enabled: actorIds.length > 0,
  });

  const { data: actorRoles = [] } = useQuery({
    queryKey: ["approval-actor-roles", actorIds.join(",")],
    queryFn: async () => {
      if (actorIds.length === 0) return [];
      const { data } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", actorIds);
      return data || [];
    },
    enabled: actorIds.length > 0,
  });

  const getActorName = (userId: string) => {
    const p = profiles.find((p: any) => p.user_id === userId);
    return p?.full_name || "مستخدم";
  };

  const getActorRole = (userId: string) => {
    const r = actorRoles.find((r: any) => r.user_id === userId);
    return r ? (roleLabels[r.role] || r.role) : "";
  };

  if (isLoading) return <div className="text-sm text-muted-foreground py-2">جاري التحميل...</div>;
  if (actions.length === 0) return null;

  return (
    <div className="space-y-3">
      <h4 className="font-heading font-semibold text-sm">سجل الإجراءات</h4>
      <div className="relative border-r-2 border-muted pr-4 space-y-4">
        {actions.map((a: any) => {
          const Icon = actionIcons[a.action] || Send;
          const color = actionColors[a.action] || "text-muted-foreground";
          const isEscalation = a.action === "escalate";
          const isRejection = a.action === "reject";
          const isReturn = a.action === "return";
          const actorRole = getActorRole(a.actor_user_id);
          return (
            <div key={a.id} className="relative flex gap-3">
              <div className={`absolute -right-[1.35rem] top-0.5 bg-background rounded-full p-0.5 ${color}`}>
                <Icon className="h-3.5 w-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-xs flex-wrap">
                  <span className={`font-heading font-semibold ${color}`}>{actionLabels[a.action] || a.action}</span>
                  <span className="text-foreground font-medium">{getActorName(a.actor_user_id)}</span>
                  {actorRole && (
                    <Badge variant="outline" className="text-[10px] h-4 px-1 gap-0.5 bg-muted/50">
                      <ShieldCheck className="h-2.5 w-2.5" />{actorRole}
                    </Badge>
                  )}
                  {a.step_order && (
                    <Badge variant="outline" className="text-[10px] h-4 px-1">مرحلة {a.step_order}</Badge>
                  )}
                </div>
                {/* Status transition */}
                <div className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                  <span>{a.from_status}</span>
                  <span>←</span>
                  <span className="font-medium">{a.to_status}</span>
                  <span className="mx-1">•</span>
                  <span>
                    {new Date(a.created_at).toLocaleString("ar-IQ", { dateStyle: "short", timeStyle: "short" })}
                  </span>
                </div>

                {/* Comments */}
                {a.comments && (
                  <div className={`text-xs mt-1 p-2 rounded-md ${
                    isRejection ? "bg-destructive/5 text-destructive border border-destructive/10" :
                    isReturn ? "bg-warning/5 text-warning border border-warning/10" :
                    "bg-muted text-muted-foreground"
                  }`}>
                    {(isRejection || isReturn) && <AlertTriangle className="h-3 w-3 inline ml-1" />}
                    {a.comments}
                  </div>
                )}

                {/* Escalation marker */}
                {isEscalation && (
                  <Badge variant="outline" className="mt-1 text-[10px] bg-accent/10 text-accent-foreground border-accent/20">
                    <ArrowUpCircle className="h-3 w-3 ml-1" />تم التصعيد
                  </Badge>
                )}

                {/* Signature presence */}
                {a.signature_data && (
                  <div className="mt-1.5 flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] bg-primary/5 text-primary border-primary/20 gap-1">
                      <FileSignature className="h-3 w-3" />موقّع رقمياً
                    </Badge>
                    <img src={a.signature_data} alt="التوقيع" className="h-8 opacity-60" />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
