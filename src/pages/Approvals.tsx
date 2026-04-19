import { useState } from "react";
import { CheckCircle, XCircle, Clock, ClipboardCheck, Settings, Wrench } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useWorkflowInstances, useRepairStuckWorkflows } from "@/hooks/useApprovalWorkflow";
import { ApprovalsInbox } from "@/components/approvals/ApprovalsInbox";
import { WorkflowTemplateManager } from "@/components/approvals/WorkflowTemplateManager";
import { useRole } from "@/hooks/useRole";

export default function Approvals() {
  const { data: allInstances = [] } = useWorkflowInstances();
  const { isAdmin, isHrManager } = useRole();
  const repairMutation = useRepairStuckWorkflows();

  const pendingCount = allInstances.filter((i: any) => ["submitted", "pending_approval"].includes(i.status)).length;
  const approvedCount = allInstances.filter((i: any) => i.status === "approved").length;
  const rejectedCount = allInstances.filter((i: any) => i.status === "rejected").length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-bold text-2xl text-foreground">الموافقات</h1>
          <p className="text-muted-foreground text-sm mt-1">محرك سير العمل والموافقات الموحد</p>
        </div>
        {(isAdmin || isHrManager) && (
          <Button
            variant="outline"
            size="sm"
            className="gap-2 font-heading"
            onClick={() => repairMutation.mutate()}
            disabled={repairMutation.isPending}
          >
            <Wrench className="h-4 w-4" />
            {repairMutation.isPending ? "جاري الإصلاح..." : "إصلاح الطلبات المعلقة"}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-muted text-accent-foreground"><Clock className="h-5 w-5" /></div>
          <div><p className="text-sm text-muted-foreground">بانتظار الموافقة</p><p className="text-2xl font-heading font-bold">{pendingCount}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-muted text-primary"><CheckCircle className="h-5 w-5" /></div>
          <div><p className="text-sm text-muted-foreground">موافق عليها</p><p className="text-2xl font-heading font-bold">{approvedCount}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-muted text-destructive"><XCircle className="h-5 w-5" /></div>
          <div><p className="text-sm text-muted-foreground">مرفوضة</p><p className="text-2xl font-heading font-bold">{rejectedCount}</p></div>
        </CardContent></Card>
      </div>

      <Tabs defaultValue="inbox">
        <TabsList>
          <TabsTrigger value="inbox" className="font-heading gap-1.5">
            <ClipboardCheck className="h-4 w-4" /> صندوق الموافقات
          </TabsTrigger>
          <TabsTrigger value="templates" className="font-heading gap-1.5">
            <Settings className="h-4 w-4" /> قوالب سير العمل
          </TabsTrigger>
        </TabsList>
        <TabsContent value="inbox"><ApprovalsInbox /></TabsContent>
        <TabsContent value="templates"><WorkflowTemplateManager /></TabsContent>
      </Tabs>
    </div>
  );
}
