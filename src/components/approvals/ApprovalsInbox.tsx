import { useState } from "react";
import { ClipboardCheck, Filter, Clock, AlertTriangle, User, Send, Users, Archive } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useWorkflowInstances, requestTypeLabels } from "@/hooks/useApprovalWorkflow";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { useRole } from "@/hooks/useRole";
import { WorkflowStatusBadge } from "./WorkflowStatusBadge";
import { ApprovalActionButtons } from "./ApprovalActionButtons";
import { ApprovalTimeline } from "./ApprovalTimeline";
import { Badge } from "@/components/ui/badge";
import { RequestDocumentActions } from "@/components/documents/RequestDocumentActions";
import { useMyRequestDocuments } from "@/hooks/useRequestDocuments";
import { CurrentApproverBadge } from "@/components/approvals/CurrentApproverBadge";
import { WorkflowStepsPreview } from "@/components/approvals/WorkflowStepsPreview";

export function ApprovalsInbox() {
  const { user } = useAuth();
  const { companyId } = useCompany();
  const { isAdmin, isHrManager, roles } = useRole();
  const isFinance = roles.includes("finance_manager");
  const isManager = roles.includes("manager");
  const [typeFilter, setTypeFilter] = useState("all");
  const [detailInstance, setDetailInstance] = useState<any>(null);
  const { data: requestDocs = [] } = useMyRequestDocuments();

  const { data: allInstances = [], isLoading } = useWorkflowInstances({ requestType: typeFilter });

  // Fetch requester profiles
  const requesterIds = [...new Set(allInstances.map((i: any) => i.requester_user_id).filter(Boolean))];
  const { data: profiles = [] } = useQuery({
    queryKey: ["inbox-requester-profiles", companyId, requesterIds.join(",")],
    queryFn: async () => {
      if (requesterIds.length === 0) return [];
      const { data } = await supabase.from("profiles").select("user_id, full_name").in("user_id", requesterIds);
      return data || [];
    },
    enabled: requesterIds.length > 0,
  });

  const getRequesterName = (userId: string) => {
    const p = profiles.find((p: any) => p.user_id === userId);
    return p?.full_name || "—";
  };

  // Segmented views
  const pending = allInstances.filter((i: any) => ["submitted", "pending_approval"].includes(i.status));
  const myRequests = allInstances.filter((i: any) => i.requester_user_id === user?.id);
  const completed = allInstances.filter((i: any) => ["approved", "rejected", "locked", "archived"].includes(i.status));
  const returned = allInstances.filter((i: any) => i.status === "returned");
  const overdue = allInstances.filter((i: any) =>
    ["submitted", "pending_approval"].includes(i.status) && i.due_date && new Date(i.due_date) < new Date()
  );

  // HR/Finance specific requests
  const hrFinanceTypes = ["payroll", "salary_change", "final_settlement"];
  const hrFinanceRequests = allInstances.filter((i: any) => hrFinanceTypes.includes(i.request_type));

  const isOverdue = (inst: any) => {
    return ["submitted", "pending_approval"].includes(inst.status) && inst.due_date && new Date(inst.due_date) < new Date();
  };

  const renderTable = (items: any[], showActions = true) => {
    if (items.length === 0) {
      return (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          <ClipboardCheck className="h-12 w-12 mx-auto mb-3 opacity-20" />
          <p className="font-heading font-medium">لا توجد طلبات</p>
        </CardContent></Card>
      );
    }
    return (
      <Card><CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>النوع</TableHead>
              <TableHead>مقدم الطلب</TableHead>
              <TableHead>التاريخ</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead>المعتمد الحالي</TableHead>
              <TableHead>المرحلة</TableHead>
              <TableHead>الاستحقاق</TableHead>
              {showActions && <TableHead>إجراء</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((inst: any) => {
              const isRequester = inst.requester_user_id === user?.id;
              const overdueFlag = isOverdue(inst);
              return (
                <TableRow key={inst.id} className={`cursor-pointer ${overdueFlag ? "bg-destructive/5" : ""}`} onClick={() => setDetailInstance(inst)}>
                  <TableCell>
                    <Badge variant="outline">{requestTypeLabels[inst.request_type] || inst.request_type}</Badge>
                  </TableCell>
                  <TableCell className="text-sm font-medium">
                    {getRequesterName(inst.requester_user_id)}
                  </TableCell>
                  <TableCell dir="ltr" className="text-sm">
                    {new Date(inst.created_at).toLocaleDateString("ar-IQ")}
                  </TableCell>
                  <TableCell><WorkflowStatusBadge status={inst.status} /></TableCell>
                  <TableCell>
                    {companyId && (
                      <CurrentApproverBadge
                        templateId={inst.template_id}
                        currentStepOrder={inst.current_step_order}
                        companyId={companyId}
                        status={inst.status}
                        routingSnapshot={inst.routing_snapshot}
                        compact
                      />
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      {inst.current_step_order}
                      {inst.is_escalated && <Badge className="text-[10px] bg-accent/10 text-accent-foreground border-accent/20 h-4 px-1">مصعّد</Badge>}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {inst.due_date ? (
                      <div className="flex items-center gap-1">
                        {overdueFlag && <AlertTriangle className="h-3.5 w-3.5 text-destructive" />}
                        <span className={overdueFlag ? "text-destructive font-semibold" : "text-muted-foreground"}>
                          {new Date(inst.due_date).toLocaleDateString("ar-IQ")}
                        </span>
                        {overdueFlag && <Badge variant="outline" className="text-[10px] bg-destructive/10 text-destructive h-4 px-1">متأخر</Badge>}
                      </div>
                    ) : "—"}
                  </TableCell>
                  {showActions && (
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <ApprovalActionButtons instanceId={inst.id} status={inst.status} isRequester={isRequester} />
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent></Card>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع الأنواع</SelectItem>
            {Object.entries(requestTypeLabels).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {overdue.length > 0 && (
          <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 gap-1">
            <Clock className="h-3 w-3" />{overdue.length} طلب متأخر
          </Badge>
        )}
      </div>

      <Tabs defaultValue="pending">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="pending" className="font-heading gap-1">
            <Clock className="h-3 w-3" />بانتظار الموافقة ({pending.length})
          </TabsTrigger>
          <TabsTrigger value="mine" className="font-heading gap-1">
            <Send className="h-3 w-3" />طلباتي ({myRequests.length})
          </TabsTrigger>
          {(isAdmin || isHrManager || isFinance) && (
            <TabsTrigger value="hr_finance" className="font-heading gap-1">
              <Users className="h-3 w-3" />HR / مالية ({hrFinanceRequests.length})
            </TabsTrigger>
          )}
          <TabsTrigger value="returned" className="font-heading gap-1">
            مرجعة ({returned.length})
          </TabsTrigger>
          <TabsTrigger value="overdue" className="font-heading gap-1">
            <AlertTriangle className="h-3 w-3" />متأخرة ({overdue.length})
          </TabsTrigger>
          <TabsTrigger value="completed" className="font-heading gap-1">
            <Archive className="h-3 w-3" />مكتملة
          </TabsTrigger>
        </TabsList>
        <TabsContent value="pending">{renderTable(pending)}</TabsContent>
        <TabsContent value="mine">{renderTable(myRequests)}</TabsContent>
        {(isAdmin || isHrManager || isFinance) && (
          <TabsContent value="hr_finance">{renderTable(hrFinanceRequests)}</TabsContent>
        )}
        <TabsContent value="returned">{renderTable(returned)}</TabsContent>
        <TabsContent value="overdue">{renderTable(overdue)}</TabsContent>
        <TabsContent value="completed">{renderTable(completed, false)}</TabsContent>
      </Tabs>

      {/* Detail Dialog */}
      <Dialog open={!!detailInstance} onOpenChange={(o) => !o && setDetailInstance(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading">تفاصيل الطلب</DialogTitle>
          </DialogHeader>
          {detailInstance && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">النوع:</span>{" "}
                  <Badge variant="outline">{requestTypeLabels[detailInstance.request_type] || detailInstance.request_type}</Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">الحالة:</span>{" "}
                  <WorkflowStatusBadge status={detailInstance.status} />
                </div>
                <div>
                  <span className="text-muted-foreground">مقدم الطلب:</span>{" "}
                  <span className="font-medium">{getRequesterName(detailInstance.requester_user_id)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">تاريخ التقديم:</span>{" "}
                  {new Date(detailInstance.submitted_at || detailInstance.created_at).toLocaleString("ar-IQ")}
                </div>
                <div>
                  <span className="text-muted-foreground">المرحلة:</span> {detailInstance.current_step_order}
                  {detailInstance.is_escalated && <Badge className="mr-1 text-[10px] bg-accent/10 text-accent-foreground">مصعّد</Badge>}
                </div>
                {detailInstance.due_date && (
                  <div>
                    <span className="text-muted-foreground">الاستحقاق:</span>{" "}
                    <span className={isOverdue(detailInstance) ? "text-destructive font-bold" : ""}>
                      {new Date(detailInstance.due_date).toLocaleDateString("ar-IQ")}
                      {isOverdue(detailInstance) && " (متأخر)"}
                    </span>
                  </div>
                )}
                {detailInstance.final_comments && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">ملاحظات:</span> {detailInstance.final_comments}
                  </div>
                )}
              </div>

              <div className="gold-line" />

              {/* Current Approver Block */}
              {companyId && ["submitted", "pending_approval"].includes(detailInstance.status) && (
                <div className="p-3 rounded-lg bg-accent/5 border border-accent/20">
                  <p className="text-xs font-heading font-semibold text-accent-foreground mb-1.5 flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    بانتظار الموافقة حالياً
                  </p>
                  <CurrentApproverBadge
                    templateId={detailInstance.template_id}
                    currentStepOrder={detailInstance.current_step_order}
                    companyId={companyId}
                    status={detailInstance.status}
                    routingSnapshot={detailInstance.routing_snapshot}
                  />
                </div>
              )}

              {/* Workflow Steps Preview */}
              {detailInstance.template_id && (
                <WorkflowStepsPreview
                  templateId={detailInstance.template_id}
                  currentStepOrder={detailInstance.current_step_order}
                  status={detailInstance.status}
                  instanceId={detailInstance.id}
                />
              )}

              <ApprovalTimeline instanceId={detailInstance.id} />

              {/* Official Record Actions */}
              {(() => {
                const matchingDoc = requestDocs.find((d: any) => d.workflow_instance_id === detailInstance.id);
                if (matchingDoc) {
                  return (
                    <div className="pt-2 border-t">
                      <h4 className="font-heading font-semibold text-sm mb-2">السجل الرسمي</h4>
                      <RequestDocumentActions doc={matchingDoc} />
                    </div>
                  );
                }
                return null;
              })()}

              <div className="pt-2 border-t">
                <ApprovalActionButtons
                  instanceId={detailInstance.id}
                  status={detailInstance.status}
                  isRequester={detailInstance.requester_user_id === user?.id}
                />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
