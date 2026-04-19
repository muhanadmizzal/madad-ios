import { useState } from "react";
import { FileText, Filter } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMyRequestDocuments } from "@/hooks/useRequestDocuments";
import { requestTypeLabels, workflowStatusLabels } from "@/hooks/useApprovalWorkflow";
import { WorkflowStatusBadge } from "@/components/approvals/WorkflowStatusBadge";
import { RequestDocumentActions } from "@/components/documents/RequestDocumentActions";

export default function EPMyRequests() {
  const [typeFilter, setTypeFilter] = useState("all");
  const { data: docs = [], isLoading } = useMyRequestDocuments(typeFilter);

  const pending = docs.filter((d: any) => ["submitted", "pending_approval", "pending"].includes(d.status));
  const completed = docs.filter((d: any) => ["approved", "rejected", "locked", "archived"].includes(d.status));
  const returned = docs.filter((d: any) => d.status === "returned");

  const formatDate = (d: string) => {
    try { return new Date(d).toLocaleDateString("ar-IQ"); } catch { return d; }
  };

  const renderTable = (items: any[]) => {
    if (items.length === 0) {
      return (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p className="font-heading">لا توجد طلبات</p>
          </CardContent>
        </Card>
      );
    }
    return (
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>رقم المرجع</TableHead>
                <TableHead>النوع</TableHead>
                <TableHead>التاريخ</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((d: any) => (
                <TableRow key={d.id}>
                  <TableCell className="font-mono text-sm font-medium">{d.reference_number}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{requestTypeLabels[d.request_type] || d.request_type}</Badge>
                  </TableCell>
                  <TableCell dir="ltr" className="text-sm">{formatDate(d.created_at)}</TableCell>
                  <TableCell><WorkflowStatusBadge status={d.status} /></TableCell>
                  <TableCell>
                    <RequestDocumentActions doc={d} compact />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-heading font-bold text-2xl">طلباتي</h1>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الأنواع</SelectItem>
              {Object.entries(requestTypeLabels).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all" className="font-heading">الكل ({docs.length})</TabsTrigger>
          <TabsTrigger value="pending" className="font-heading">قيد المعالجة ({pending.length})</TabsTrigger>
          <TabsTrigger value="completed" className="font-heading">مكتملة ({completed.length})</TabsTrigger>
          <TabsTrigger value="returned" className="font-heading">مرجعة ({returned.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="all">{renderTable(docs)}</TabsContent>
        <TabsContent value="pending">{renderTable(pending)}</TabsContent>
        <TabsContent value="completed">{renderTable(completed)}</TabsContent>
        <TabsContent value="returned">{renderTable(returned)}</TabsContent>
      </Tabs>
    </div>
  );
}
