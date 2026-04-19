import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Building2, Users, User, Crown, AlertCircle, UserPlus, UserMinus,
  Pencil, Copy, Plus, Power, Hash, DollarSign, Workflow, Shield,
  FolderOpen, Briefcase,
} from "lucide-react";
import type { OrgNodeData } from "../OrgChartNode";

interface Props {
  node: OrgNodeData;
  onAssignEmployee?: (positionId: string, title: string) => void;
  onUnassignEmployee?: (positionId: string) => void;
  onEdit?: (pos: any) => void;
  onArchive?: (type: "department" | "position", id: string, title: string) => void;
  onClone?: (pos: any) => void;
  onAddChild?: (parentType: "company" | "department" | "position", parentPositionId?: string | null, parentDepartmentId?: string | null) => void;
  onActivate?: (positionId: string, title: string) => void;
}

export default function PositionBasicInfoTab({ node, onAssignEmployee, onUnassignEmployee, onEdit, onArchive, onClone, onAddChild, onActivate }: Props) {
  return (
    <div className="space-y-4">
      {/* Assigned Employee */}
      {node.employeeName && (
        <div className="rounded-xl border border-border bg-muted/20 p-4">
          <h4 className="font-heading font-semibold text-xs mb-3 text-muted-foreground uppercase tracking-wide">الموظف المعيّن</h4>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-11 w-11">
                <AvatarFallback className="bg-primary/10 text-primary font-heading text-base">{node.avatarInitial}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-heading font-semibold text-sm">{node.employeeName}</p>
                {node.employeeCode && <p className="text-xs text-muted-foreground">{node.employeeCode}</p>}
              </div>
            </div>
            {node.positionId && onUnassignEmployee && (
              <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => onUnassignEmployee(node.positionId!)}>
                <UserMinus className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
          {/* Position inheritance badge */}
          <div className="mt-3 flex items-center gap-1.5 rounded-lg bg-primary/5 border border-primary/10 px-3 py-2">
            <Briefcase className="h-3.5 w-3.5 text-primary" />
            <span className="text-[11px] text-primary font-medium">
              الصلاحيات وسير العمل موروثة من المنصب: {node.label}
            </span>
          </div>
        </div>
      )}

      {/* Vacant notice */}
      {node.status === "vacant" && node.positionId && (
        <div className="rounded-xl border border-warning/30 bg-warning/5 p-4 text-center">
          <AlertCircle className="h-7 w-7 text-warning mx-auto mb-2" />
          <p className="text-sm font-heading font-semibold text-warning">هذا المنصب شاغر</p>
          {onAssignEmployee && (
            <Button size="sm" className="mt-3" onClick={() => onAssignEmployee(node.positionId!, node.label)}>
              <UserPlus className="h-4 w-4 ml-1" />تعيين موظف
            </Button>
          )}
        </div>
      )}

      {/* Position details grid */}
      <div className="grid grid-cols-2 gap-2">
        {node.department && <InfoCard icon={Users} label="القسم" value={node.department} />}
        {node.branch && <InfoCard icon={Building2} label="الفرع" value={node.branch} />}
        {node.positionCode && <InfoCard icon={Hash} label="رمز المنصب" value={node.positionCode} />}
        {node.salaryGrade && <InfoCard icon={DollarSign} label="الدرجة الوظيفية" value={`درجة ${node.salaryGrade}`} />}
        {(node.directReports || 0) > 0 && <InfoCard icon={Users} label="المرؤوسين المباشرين" value={String(node.directReports)} />}
        {(node.workflowRoles || 0) > 0 && <InfoCard icon={Workflow} label="مسؤوليات سير العمل" value={String(node.workflowRoles)} />}
        {(node.permissionsCount || 0) > 0 && <InfoCard icon={Shield} label="خدمات مفعّلة" value={String(node.permissionsCount)} />}
        {node.projectLinked && <InfoCard icon={FolderOpen} label="مشروع" value="مرتبط" />}
        {(node.minSalary || node.maxSalary) && (
          <InfoCard icon={DollarSign} label="نطاق الراتب" value={`${node.minSalary || '—'} - ${node.maxSalary || '—'}`} />
        )}
      </div>

      {/* Quick Actions */}
      <Separator />
      <div className="space-y-2">
        <h4 className="font-heading font-semibold text-xs text-muted-foreground uppercase tracking-wide">إجراءات</h4>
        <div className="grid grid-cols-2 gap-2">
          {onEdit && (
            <Button variant="outline" size="sm" onClick={() => onEdit(node)} className="text-xs justify-start">
              <Pencil className="h-3.5 w-3.5 ml-1" />تعديل المنصب
            </Button>
          )}
          {onAddChild && (
            <Button variant="outline" size="sm" onClick={() => onAddChild(node.type as any, node.positionId, undefined)} className="text-xs justify-start">
              <Plus className="h-3.5 w-3.5 ml-1" />إضافة فرعي
            </Button>
          )}
          {node.status !== "filled" && node.status !== "inactive" && onAssignEmployee && node.positionId && (
            <Button variant="outline" size="sm" onClick={() => onAssignEmployee(node.positionId!, node.label)} className="text-xs justify-start">
              <UserPlus className="h-3.5 w-3.5 ml-1" />تعيين موظف
            </Button>
          )}
          {onClone && (
            <Button variant="outline" size="sm" onClick={() => onClone(node)} className="text-xs justify-start">
              <Copy className="h-3.5 w-3.5 ml-1" />نسخ المنصب
            </Button>
          )}
          {node.status === "inactive" && onActivate && node.positionId ? (
            <Button variant="outline" size="sm" onClick={() => onActivate(node.positionId!, node.label)} className="text-xs justify-start text-primary">
              <Power className="h-3.5 w-3.5 ml-1" />تفعيل
            </Button>
          ) : (
            onArchive && (
              <Button variant="outline" size="sm" onClick={() => onArchive(node.type as any, node.positionId || "", node.label)} className="text-xs justify-start text-destructive hover:text-destructive">
                <AlertCircle className="h-3.5 w-3.5 ml-1" />أرشفة
              </Button>
            )
          )}
        </div>
      </div>
    </div>
  );
}

function InfoCard({ icon: Icon, label, value }: { icon: typeof Building2; label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/20 border border-border/50 p-2.5">
      <div className="flex items-center gap-1.5 mb-0.5">
        <Icon className="h-3 w-3 text-muted-foreground" />
        <span className="text-[10px] text-muted-foreground">{label}</span>
      </div>
      <p className="text-sm font-heading font-semibold text-foreground">{value}</p>
    </div>
  );
}
