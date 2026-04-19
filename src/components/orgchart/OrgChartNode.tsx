import { memo, useState } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Users, User, Building2, Briefcase, Shield, ChevronDown, ChevronRight,
  AlertCircle, CheckCircle2, Crown, DollarSign, Workflow, FolderOpen,
  MoreHorizontal, UserPlus, UserMinus, Pencil, Power, Copy,
  Plus, Minus, GitBranch,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type OrgNodeType = "company" | "department" | "position";
export type PositionStatus = "filled" | "vacant" | "hiring" | "optional" | "inactive";

export interface OrgNodeData {
  type: OrgNodeType;
  label: string;
  positionId?: string;
  positionCode?: string;
  employeeName?: string;
  employeeCode?: string;
  employeeSalary?: number;
  employeeId?: string;
  department?: string;
  departmentId?: string;
  branch?: string;
  status?: PositionStatus;
  isManager?: boolean;
  salaryGrade?: string;
  minSalary?: number | null;
  maxSalary?: number | null;
  directReports?: number;
  workflowRoles?: number;
  permissionsCount?: number;
  projectLinked?: boolean;
  employeeCount?: number;
  deptCount?: number;
  expanded?: boolean;
  childCount?: number;
  vacantCount?: number;
  capacity?: number;
  positionsFilled?: number;
  positionsVacant?: number;
  positionsTotal?: number;
  managersCount?: number;
  isOutOfSync?: boolean;
  avatarInitial?: string;
  servicePermissions?: any;
  workflowResponsibilities?: any;
  description?: string;
  jobDescription?: string;
  systemRole?: string;
  // Callbacks
  onToggleExpand?: () => void;
  onOpenDetail?: () => void;
  onAddChild?: () => void;
  onAssignEmployee?: () => void;
  onUnassignEmployee?: () => void;
  onOpenVacancy?: () => void;
  onClonePosition?: () => void;
  onArchive?: () => void;
  onEdit?: () => void;
  onActivate?: () => void;
  onEditHierarchy?: () => void;
  [key: string]: unknown;
}

const statusConfig: Record<PositionStatus, { color: string; icon: typeof CheckCircle2; label: string; glow: string }> = {
  filled: { color: "bg-success/15 text-success border-success/30", icon: CheckCircle2, label: "مشغول", glow: "shadow-success/10" },
  vacant: { color: "bg-warning/15 text-warning border-warning/30", icon: AlertCircle, label: "شاغر", glow: "shadow-warning/10" },
  hiring: { color: "bg-info/15 text-info border-info/30", icon: UserPlus, label: "قيد التوظيف", glow: "shadow-info/10" },
  optional: { color: "bg-muted text-muted-foreground border-border", icon: User, label: "اختياري", glow: "" },
  inactive: { color: "bg-destructive/10 text-destructive border-destructive/30", icon: AlertCircle, label: "غير فعال", glow: "" },
};

/* ─── Expand/Collapse Button ─── */
function ExpandButton({ expanded, childCount, onClick }: { expanded: boolean; childCount: number; onClick: () => void }) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className={cn(
        "absolute -bottom-4 left-1/2 -translate-x-1/2 z-10",
        "w-8 h-8 rounded-full border-2 border-card shadow-lg",
        "flex items-center justify-center",
        "bg-primary text-primary-foreground",
        "transition-all duration-300 ease-out",
        "hover:scale-110 hover:shadow-xl hover:shadow-primary/20",
        "active:scale-95",
        "org-node-expand",
      )}
    >
      {expanded ? <Minus className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
      {childCount > 0 && (
        <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 rounded-full bg-accent text-accent-foreground text-[9px] font-bold flex items-center justify-center px-1">
          {childCount}
        </span>
      )}
    </button>
  );
}

/* ─── Company Node ─── */
function CompanyNode({ data }: { data: OrgNodeData }) {
  const hasChildren = (data.deptCount || 0) > 0;
  return (
    <div className="relative group org-node-wrapper">
      <Handle type="source" position={Position.Bottom} className="!bg-primary !w-3 !h-3 !border-2 !border-card !shadow-sm" />
      <div
        className={cn(
          "w-72 rounded-2xl border-2 border-primary/40 bg-card cursor-pointer",
          "shadow-lg shadow-primary/5",
          "transition-all duration-300 ease-out",
          "hover:shadow-xl hover:shadow-primary/15 hover:border-primary/60 hover:-translate-y-0.5",
          "active:scale-[0.98]",
          "org-node org-node-company",
        )}
        onClick={data.onOpenDetail}
      >
        {/* Premium top accent */}
        <div className="h-1.5 rounded-t-2xl bg-gradient-to-l from-accent via-primary to-accent opacity-80" />

        <div className="p-5 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/80 mx-auto mb-3.5 flex items-center justify-center shadow-lg shadow-primary/20 transition-transform duration-300 group-hover:scale-105">
            <Building2 className="h-8 w-8 text-primary-foreground" />
          </div>
          <h3 className="font-heading font-bold text-lg text-foreground leading-tight">{data.label}</h3>
          <div className="flex items-center justify-center gap-4 mt-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5 bg-muted/40 rounded-full px-2.5 py-1">
              <Users className="h-3.5 w-3.5" />{data.employeeCount || 0} موظف
            </span>
            <span className="flex items-center gap-1.5 bg-muted/40 rounded-full px-2.5 py-1">
              <Building2 className="h-3.5 w-3.5" />{data.deptCount || 0} قسم
            </span>
          </div>
        </div>
      </div>
      {hasChildren && data.onToggleExpand && (
        <ExpandButton expanded={!!data.expanded} childCount={data.deptCount || 0} onClick={data.onToggleExpand} />
      )}
    </div>
  );
}

/* ─── Department Node with Metrics ─── */
function DepartmentNode({ data }: { data: OrgNodeData }) {
  const hasChildren = (data.directReports || 0) > 0;
  const posTotal = data.positionsTotal ?? data.capacity ?? 0;
  const posFilled = data.positionsFilled ?? 0;
  const posVacant = data.positionsVacant ?? data.vacantCount ?? 0;
  const isOutOfSync = data.isOutOfSync || ((data.employeeCount || 0) > 0 && posTotal === 0);

  return (
    <div className="relative group org-node-wrapper">
      <Handle type="target" position={Position.Top} className="!bg-accent !w-2.5 !h-2.5 !border-2 !border-card !shadow-sm" />
      <Handle type="source" position={Position.Bottom} className="!bg-accent !w-2.5 !h-2.5 !border-2 !border-card !shadow-sm" />
      <div className={cn(
        "w-68 rounded-2xl border bg-card cursor-pointer",
        "shadow-md shadow-border/10",
        "transition-all duration-300 ease-out",
        "hover:shadow-xl hover:shadow-accent/10 hover:border-accent/50 hover:-translate-y-0.5",
        "active:scale-[0.98]",
        "org-node org-node-department",
        isOutOfSync ? "border-warning/60" : "border-border/60"
      )} onClick={data.onOpenDetail}>
        {/* Status bar */}
        <div className={cn("h-1 rounded-t-2xl", isOutOfSync ? "bg-warning" : "bg-accent/60")} />

        <div className="px-4 py-3 border-b border-border/30 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0 transition-all duration-300 group-hover:bg-accent/20 group-hover:scale-105">
              <Users className="h-5 w-5 text-accent" />
            </div>
            <div className="min-w-0">
              <p className="font-heading font-bold text-sm text-foreground truncate">{data.label}</p>
              {data.branch && <p className="text-[11px] text-muted-foreground truncate">{data.branch}</p>}
            </div>
          </div>
          <NodeMenu data={data} />
        </div>

        {/* Out of sync warning */}
        {isOutOfSync && (
          <div className="mx-3 mt-2.5 flex items-center gap-1.5 rounded-lg bg-warning/10 border border-warning/20 px-2.5 py-1.5">
            <AlertCircle className="h-3.5 w-3.5 text-warning shrink-0" />
            <span className="text-[10px] font-heading font-semibold text-warning">بيانات غير متزامنة — شغّل المزامنة</span>
          </div>
        )}

        {/* Metrics row */}
        <div className="px-3 py-3 grid grid-cols-3 gap-1.5 text-center">
          <div className="rounded-lg bg-muted/20 py-1.5 transition-colors duration-200 hover:bg-muted/40">
            <p className="text-sm font-bold text-foreground">{data.employeeCount || 0}</p>
            <p className="text-[9px] text-muted-foreground font-heading">موظف</p>
          </div>
          <div className="rounded-lg bg-muted/20 py-1.5 transition-colors duration-200 hover:bg-success/10">
            <p className={cn("text-sm font-bold", posFilled > 0 ? "text-success" : "text-foreground")}>{posFilled}</p>
            <p className="text-[9px] text-muted-foreground font-heading">مشغول</p>
          </div>
          <div className="rounded-lg bg-muted/20 py-1.5 transition-colors duration-200 hover:bg-warning/10">
            <p className={cn("text-sm font-bold", posVacant > 0 ? "text-warning" : "text-foreground")}>{posVacant}</p>
            <p className="text-[9px] text-muted-foreground font-heading">شاغر</p>
          </div>
        </div>

        {!data.expanded && hasChildren && (
          <div className="px-3 pb-2.5">
            <p className="text-[10px] text-muted-foreground text-center italic flex items-center justify-center gap-1">
              <GitBranch className="h-3 w-3" />{data.directReports} عنصر مخفي
            </p>
          </div>
        )}
      </div>
      {hasChildren && data.onToggleExpand && (
        <ExpandButton expanded={!!data.expanded} childCount={data.directReports || 0} onClick={data.onToggleExpand} />
      )}
    </div>
  );
}

/* ─── Position Node ─── */
function PositionNode({ data }: { data: OrgNodeData }) {
  const status = data.status || "filled";
  const cfg = statusConfig[status];
  const StatusIcon = cfg.icon;
  const hasChildren = (data.directReports || 0) > 0;

  return (
    <div className="relative group org-node-wrapper">
      <Handle type="target" position={Position.Top} className="!bg-accent !w-2 !h-2 !border-2 !border-card" />
      <Handle type="source" position={Position.Bottom} className="!bg-accent !w-2 !h-2 !border-2 !border-card" />
      <div
        className={cn(
          "w-60 rounded-2xl border bg-card cursor-pointer",
          "shadow-md shadow-border/5",
          "transition-all duration-300 ease-out",
          "hover:shadow-xl hover:-translate-y-0.5",
          "active:scale-[0.98]",
          "org-node org-node-position",
          status === "inactive"
            ? "opacity-50 border-border/40"
            : "border-border/50 hover:border-accent/40",
          status === "filled" && "hover:shadow-success/10",
          status === "vacant" && "hover:shadow-warning/10",
          status === "hiring" && "hover:shadow-info/10",
        )}
        onClick={data.onOpenDetail}
      >
        {/* Status gradient bar */}
        <div className={cn(
          "h-1.5 rounded-t-2xl transition-all duration-300",
          status === "filled" ? "bg-gradient-to-l from-success/80 to-success" :
          status === "vacant" ? "bg-gradient-to-l from-warning/80 to-warning" :
          status === "hiring" ? "bg-gradient-to-l from-info/80 to-info" :
          status === "inactive" ? "bg-destructive/40" : "bg-muted-foreground/20"
        )} />

        <div className="p-3.5">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              {status === "filled" && data.avatarInitial ? (
                <Avatar className="h-10 w-10 flex-shrink-0 ring-2 ring-success/20 transition-all duration-300 group-hover:ring-success/40 group-hover:scale-105">
                  <AvatarFallback className="bg-primary/10 text-primary text-sm font-heading font-bold">{data.avatarInitial}</AvatarFallback>
                </Avatar>
              ) : (
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border",
                  "transition-all duration-300 group-hover:scale-105",
                  cfg.color
                )}>
                  <StatusIcon className="h-4 w-4" />
                </div>
              )}
              <div className="min-w-0">
                <p className="font-heading font-bold text-[13px] text-foreground truncate leading-tight">{data.label}</p>
                {data.employeeName ? (
                  <p className="text-[11px] text-muted-foreground truncate mt-0.5">{data.employeeName}</p>
                ) : (
                  <p className="text-[11px] text-warning italic mt-0.5">{cfg.label}</p>
                )}
              </div>
            </div>
            <NodeMenu data={data} />
          </div>

          {/* Badges */}
          <div className="flex flex-wrap gap-1.5 mt-2">
            {data.positionCode && (
              <Badge variant="outline" className="text-[9px] px-1.5 py-0.5 font-mono rounded-md bg-muted/20">{data.positionCode}</Badge>
            )}
            {data.isManager && (
              <Badge variant="outline" className="text-[9px] px-1.5 py-0.5 border-accent/40 text-accent bg-accent/5 rounded-md">
                <Crown className="h-2.5 w-2.5 ml-0.5" />إداري
              </Badge>
            )}
            {data.salaryGrade && (
              <Badge variant="outline" className="text-[9px] px-1.5 py-0.5 rounded-md bg-muted/20">
                <DollarSign className="h-2.5 w-2.5 ml-0.5" />{data.salaryGrade}
              </Badge>
            )}
            {(data.workflowRoles || 0) > 0 && (
              <Badge variant="outline" className="text-[9px] px-1.5 py-0.5 rounded-md bg-muted/20">
                <Workflow className="h-2.5 w-2.5 ml-0.5" />{data.workflowRoles}
              </Badge>
            )}
            {(data.permissionsCount || 0) > 0 && (
              <Badge variant="outline" className="text-[9px] px-1.5 py-0.5 rounded-md bg-muted/20">
                <Shield className="h-2.5 w-2.5 ml-0.5" />{data.permissionsCount}
              </Badge>
            )}
            {data.projectLinked && (
              <Badge variant="outline" className="text-[9px] px-1.5 py-0.5 rounded-md bg-muted/20">
                <FolderOpen className="h-2.5 w-2.5 ml-0.5" />مشروع
              </Badge>
            )}
          </div>

          {/* Team info */}
          {hasChildren && (
            <div className="mt-2.5 pt-2 border-t border-border/30 flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                <Users className="h-3 w-3" />{data.directReports} تابع
              </span>
              {!data.expanded && (
                <span className="text-[9px] text-accent font-heading font-medium bg-accent/5 rounded px-1.5 py-0.5">مطوي</span>
              )}
            </div>
          )}

          {/* Department context for filled positions */}
          {data.department && status === "filled" && (
            <div className="mt-2 pt-1.5 border-t border-border/20">
              <p className="text-[10px] text-muted-foreground/70 truncate flex items-center gap-1">
                <Building2 className="h-2.5 w-2.5 shrink-0" />{data.department}
              </p>
            </div>
          )}
        </div>
      </div>
      {hasChildren && data.onToggleExpand && (
        <ExpandButton expanded={!!data.expanded} childCount={data.directReports || 0} onClick={data.onToggleExpand} />
      )}
    </div>
  );
}

/* ─── Node Context Menu ─── */
function NodeMenu({ data }: { data: OrgNodeData }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "p-1.5 rounded-lg transition-all duration-200",
            "hover:bg-muted/60 active:scale-90",
            "opacity-0 group-hover:opacity-100",
          )}
        >
          <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={() => data.onOpenDetail?.()}>
          <Briefcase className="h-3.5 w-3.5 ml-2" />تفاصيل
        </DropdownMenuItem>
        {data.onEdit && (
          <DropdownMenuItem onClick={() => data.onEdit?.()}>
            <Pencil className="h-3.5 w-3.5 ml-2" />تعديل
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        {data.type !== "company" && (
          <>
            <DropdownMenuItem onClick={() => data.onAddChild?.()}>
              <Plus className="h-3.5 w-3.5 ml-2" />إضافة فرعي
            </DropdownMenuItem>
            {data.type === "position" && data.onEditHierarchy && (
              <DropdownMenuItem onClick={() => data.onEditHierarchy?.()}>
                <Users className="h-3.5 w-3.5 ml-2" />تعديل التبعية
              </DropdownMenuItem>
            )}
          </>
        )}
        {data.type === "position" && data.status !== "filled" && data.status !== "inactive" && (
          <DropdownMenuItem onClick={() => data.onAssignEmployee?.()}>
            <UserPlus className="h-3.5 w-3.5 ml-2" />تعيين موظف
          </DropdownMenuItem>
        )}
        {data.type === "position" && data.status === "filled" && data.onUnassignEmployee && (
          <DropdownMenuItem onClick={() => data.onUnassignEmployee?.()}>
            <UserMinus className="h-3.5 w-3.5 ml-2" />إزالة الموظف
          </DropdownMenuItem>
        )}
        {data.type === "position" && (
          <DropdownMenuItem onClick={() => data.onClonePosition?.()}>
            <Copy className="h-3.5 w-3.5 ml-2" />نسخ
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        {data.type !== "company" && (
          <>
            {data.status === "inactive" && data.onActivate ? (
              <DropdownMenuItem onClick={() => data.onActivate?.()}>
                <Power className="h-3.5 w-3.5 ml-2 text-primary" />تفعيل
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={() => data.onArchive?.()} className="text-destructive">
                <AlertCircle className="h-3.5 w-3.5 ml-2" />أرشفة
              </DropdownMenuItem>
            )}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function OrgChartNodeComponent({ data }: NodeProps) {
  const d = data as unknown as OrgNodeData;
  if (d.type === "company") return <CompanyNode data={d} />;
  if (d.type === "department") return <DepartmentNode data={d} />;
  return <PositionNode data={d} />;
}

export default memo(OrgChartNodeComponent);
