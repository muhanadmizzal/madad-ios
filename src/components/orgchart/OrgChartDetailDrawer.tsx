import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Building2, Users, Briefcase, Crown, Settings2, Workflow,
  DollarSign, Shield, Hash, Clock, Target, FileText, ExternalLink,
  ArrowRightLeft, GitBranch, MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import type { OrgNodeData, PositionStatus } from "./OrgChartNode";
import DrawerEmployeesTab from "./tabs/DrawerEmployeesTab";
import DrawerOperationsTab from "./tabs/DrawerOperationsTab";
import DrawerCompensationTab from "./tabs/DrawerCompensationTab";
import DrawerHiringTab from "./tabs/DrawerHiringTab";
import DrawerAccessTab from "./tabs/DrawerAccessTab";
import { useCompany } from "@/hooks/useCompany";

interface Props {
  open: boolean;
  onClose: () => void;
  node: OrgNodeData | null;
  onAssignEmployee?: (positionId: string, title: string) => void;
  onUnassignEmployee?: (positionId: string) => void;
  onEdit?: (pos: any) => void;
  onArchive?: (type: "department" | "position", id: string, title: string) => void;
  onClone?: (pos: any) => void;
  onAddChild?: (parentType: "company" | "department" | "position", parentPositionId?: string | null, parentDepartmentId?: string | null) => void;
  onActivate?: (positionId: string, title: string) => void;
  onTransfer?: (employeeId: string, employeeName: string, currentPositionId?: string) => void;
}

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; color: string }> = {
  filled: { label: "مشغول", variant: "default", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
  vacant: { label: "شاغر", variant: "secondary", color: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  hiring: { label: "قيد التوظيف", variant: "outline", color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  optional: { label: "اختياري", variant: "outline", color: "bg-muted text-muted-foreground border-border" },
  inactive: { label: "غير فعال", variant: "destructive", color: "bg-destructive/10 text-destructive border-destructive/20" },
};

export default function OrgChartDetailDrawer({ open, onClose, node, onAssignEmployee, onUnassignEmployee, onEdit, onArchive, onClone, onAddChild, onActivate, onTransfer }: Props) {
  const { companyId } = useCompany();
  const navigate = useNavigate();
  if (!node) return null;

  const st = statusMap[node.status || "filled"] || statusMap.filled;
  const isPosition = node.type === "position" && !!node.positionId;
  const isDepartment = node.type === "department";

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="left" className="w-[560px] sm:w-[640px] lg:w-[700px] overflow-y-auto p-0 border-r-0 shadow-2xl">
        {/* ═══ Premium Header ═══ */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
          <div className="p-5 pb-4">
            <SheetHeader className="pb-0">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center shrink-0 ring-1 ring-primary/10">
                  {node.type === "company" && <Building2 className="h-5.5 w-5.5 text-primary" />}
                  {node.type === "department" && <Users className="h-5.5 w-5.5 text-primary" />}
                  {node.type === "position" && <Briefcase className="h-5.5 w-5.5 text-primary" />}
                </div>
                <div className="min-w-0 flex-1">
                  <SheetTitle className="font-heading text-xl leading-tight truncate text-foreground">
                    {node.label}
                  </SheetTitle>
                  <p className="text-xs text-muted-foreground mt-1">
                    {isPosition ? "مركز التحكم بالمنصب الوظيفي" : isDepartment ? "مركز التحكم بالقسم" : "بيانات الشركة"}
                  </p>
                </div>
              </div>
            </SheetHeader>

            {/* Status badges row */}
            <div className="flex items-center gap-2 mt-4 flex-wrap">
              {isPosition && (
                <>
                  <Badge variant="outline" className={`${st.color} font-heading text-[11px] px-2.5 py-0.5`}>
                    {st.label}
                  </Badge>
                  {node.isManager && (
                    <Badge variant="outline" className="border-accent/40 text-accent-foreground bg-accent/5 text-[11px]">
                      <Crown className="h-3 w-3 ml-1" />إداري
                    </Badge>
                  )}
                  {node.positionCode && (
                    <Badge variant="outline" className="font-mono text-[10px]">
                      <Hash className="h-2.5 w-2.5 ml-0.5" />{node.positionCode}
                    </Badge>
                  )}
                  {node.salaryGrade && (
                    <Badge variant="outline" className="text-[10px]">
                      <DollarSign className="h-3 w-3 ml-0.5" />درجة {node.salaryGrade}
                    </Badge>
                  )}
                  {(node.permissionsCount || 0) > 0 && (
                    <Badge variant="secondary" className="text-[10px]">
                      <Shield className="h-2.5 w-2.5 ml-0.5" />{node.permissionsCount} خدمة
                    </Badge>
                  )}
                  {(node.workflowRoles || 0) > 0 && (
                    <Badge variant="secondary" className="text-[10px]">
                      <Workflow className="h-2.5 w-2.5 ml-0.5" />{node.workflowRoles} سير عمل
                    </Badge>
                  )}
                </>
              )}
              {isDepartment && (
                <>
                  <Badge variant="outline" className="text-[11px]">{node.employeeCount || 0} موظف</Badge>
                  <Badge variant="outline" className="text-[11px]">{node.directReports || 0} منصب</Badge>
                  {(node.vacantCount || 0) > 0 && (
                    <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/20">
                      {node.vacantCount} شاغر
                    </Badge>
                  )}
                </>
              )}
            </div>

            {/* Position Description */}
            {isPosition && (node.description || node.jobDescription) && (
              <div className="mt-3 rounded-xl bg-muted/20 border border-border/50 p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <FileText className="h-3 w-3 text-muted-foreground" />
                  <span className="text-[10px] font-heading font-bold text-muted-foreground">الوصف الوظيفي</span>
                </div>
                <p className="text-xs text-foreground/80 line-clamp-2 leading-relaxed">
                  {node.jobDescription || node.description}
                </p>
              </div>
            )}

            {/* Quick Actions Bar */}
            {isPosition && node.employeeName && node.employeeId && (
              <div className="flex gap-2 mt-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs gap-1.5 h-9 rounded-xl"
                  onClick={() => { navigate(`/employees?id=${node.employeeId}`); onClose(); }}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  ملف الموظف: {node.employeeName}
                </Button>
                {onTransfer && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs gap-1.5 h-9 rounded-xl border-primary/30 text-primary hover:bg-primary/5"
                    onClick={() => { onTransfer(node.employeeId!, node.employeeName!, node.positionId); onClose(); }}
                  >
                    <ArrowRightLeft className="h-3.5 w-3.5" />
                    نقل
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ═══ Tab Content ═══ */}
        <div className="p-5 pt-4">
          {(isPosition || isDepartment) && companyId ? (
            <Tabs defaultValue="overview" className="space-y-4">
              <TabsList className="w-full h-auto flex-wrap gap-1 bg-muted/30 p-1.5 rounded-xl">
                <TabsTrigger value="overview" className="text-[11px] gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg px-3">
                  <GitBranch className="h-3 w-3" />نظرة عامة
                </TabsTrigger>
                {isPosition && (
                  <>
                    <TabsTrigger value="operations" className="text-[11px] gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg px-3">
                      <Clock className="h-3 w-3" />العمليات
                    </TabsTrigger>
                    <TabsTrigger value="compensation" className="text-[11px] gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg px-3">
                      <DollarSign className="h-3 w-3" />الرواتب
                    </TabsTrigger>
                    <TabsTrigger value="hiring" className="text-[11px] gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg px-3">
                      <Target className="h-3 w-3" />التوظيف
                    </TabsTrigger>
                    <TabsTrigger value="access" className="text-[11px] gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg px-3">
                      <Settings2 className="h-3 w-3" />الصلاحيات
                    </TabsTrigger>
                  </>
                )}
              </TabsList>

              {/* Tab: Overview (reporting line + employees + team) */}
              <TabsContent value="overview" className="mt-0">
                <DrawerEmployeesTab node={node} companyId={companyId} onTransfer={onTransfer} />
              </TabsContent>

              {isPosition && (
                <>
                  <TabsContent value="operations" className="mt-0">
                    <DrawerOperationsTab positionId={node.positionId!} companyId={companyId} />
                  </TabsContent>
                  <TabsContent value="compensation" className="mt-0">
                    <DrawerCompensationTab positionId={node.positionId!} companyId={companyId} node={node} />
                  </TabsContent>
                  <TabsContent value="hiring" className="mt-0">
                    <DrawerHiringTab positionId={node.positionId!} companyId={companyId} node={node} onAssignEmployee={onAssignEmployee} />
                  </TabsContent>
                  <TabsContent value="access" className="mt-0">
                    <DrawerAccessTab positionId={node.positionId!} companyId={companyId} node={node} />
                  </TabsContent>
                </>
              )}
            </Tabs>
          ) : (
            /* Company node */
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-muted/30 border border-border/50 p-4 text-center">
                  <p className="text-2xl font-bold text-foreground font-heading">{node.employeeCount || 0}</p>
                  <p className="text-xs text-muted-foreground mt-1">موظف</p>
                </div>
                <div className="rounded-xl bg-muted/30 border border-border/50 p-4 text-center">
                  <p className="text-2xl font-bold text-foreground font-heading">{node.deptCount || 0}</p>
                  <p className="text-xs text-muted-foreground mt-1">قسم</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
