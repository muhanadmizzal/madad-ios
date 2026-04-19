import { useState, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Settings2, Workflow, Shield, Info } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import PositionServiceToggles from "../PositionServiceToggles";
import PositionWorkflowTab from "./PositionWorkflowTab";
import type { OrgNodeData } from "../OrgChartNode";

interface Props {
  positionId: string;
  companyId: string;
  node: OrgNodeData;
}

const TENANT_ROLES = [
  { value: "tenant_admin", label: "مدير الشركة", desc: "صلاحيات كاملة" },
  { value: "admin", label: "مسؤول", desc: "إدارة شاملة بدون فوترة" },
  { value: "hr_manager", label: "مدير الموارد البشرية", desc: "إدارة عمليات HR" },
  { value: "hr_officer", label: "موظف موارد بشرية", desc: "سجلات وتوظيف" },
  { value: "manager", label: "مدير قسم", desc: "اعتماد طلبات الفريق" },
  { value: "employee", label: "موظف", desc: "خدمة ذاتية فقط" },
];

export default function DrawerAccessTab({ positionId, companyId, node }: Props) {
  const queryClient = useQueryClient();
  const [selectedRole, setSelectedRole] = useState<string>(
    (node as any).systemRole || "employee"
  );

  const saveRoleMutation = useMutation({
    mutationFn: async (role: string) => {
      const { error } = await supabase
        .from("positions")
        .update({ system_role: role } as any)
        .eq("id", positionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org-positions"] });
      toast({ title: "تم تحديث دور المنصب", description: "سيتم تحديث أدوار الموظفين المعينين تلقائياً" });
    },
    onError: () => toast({ title: "خطأ", description: "فشل تحديث الدور", variant: "destructive" }),
  });

  const handleRoleChange = useCallback((role: string) => {
    setSelectedRole(role);
    saveRoleMutation.mutate(role);
  }, [saveRoleMutation]);

  const currentRoleMeta = TENANT_ROLES.find(r => r.value === selectedRole);

  return (
    <div className="space-y-4">
      {/* System Role Assignment */}
      <div>
        <div className="flex items-center gap-1.5 mb-3">
          <Shield className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-semibold text-foreground">دور النظام</span>
        </div>

        <div className="p-3 rounded-lg border border-border bg-card space-y-3">
          <div className="flex items-start gap-2">
            <Info className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              يحدد دور النظام الصلاحيات الأساسية لهذا المنصب. عند تعيين موظف لهذا المنصب، يتم تحديث دوره تلقائياً. يمكن تخصيص الصلاحيات بدقة أكبر عبر مفاتيح الخدمات أدناه.
            </p>
          </div>

          <Select value={selectedRole} onValueChange={handleRoleChange}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TENANT_ROLES.map(role => (
                <SelectItem key={role.value} value={role.value}>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{role.label}</span>
                    <span className="text-muted-foreground text-[10px]">— {role.desc}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {currentRoleMeta && (
            <Badge variant="outline" className="text-[10px]">
              {currentRoleMeta.label}: {currentRoleMeta.desc}
            </Badge>
          )}
        </div>
      </div>

      <Separator />

      {/* Service Permissions (Fine-grained toggles) */}
      <div>
        <div className="flex items-center gap-1.5 mb-3">
          <Settings2 className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-semibold text-foreground">صلاحيات الخدمات</span>
          <span className="text-[10px] text-muted-foreground">(تخصيص دقيق)</span>
        </div>
        <PositionServiceToggles
          positionId={positionId}
          companyId={companyId}
          servicePermissions={node.servicePermissions || null}
        />
      </div>

      <Separator />

      {/* Workflow Responsibilities */}
      <div>
        <div className="flex items-center gap-1.5 mb-3">
          <Workflow className="h-3.5 w-3.5 text-accent" />
          <span className="text-xs font-semibold text-foreground">صلاحيات الموافقة</span>
        </div>
        <PositionWorkflowTab
          positionId={positionId}
          companyId={companyId}
          workflowResponsibilities={node.workflowResponsibilities || null}
        />
      </div>
    </div>
  );
}
