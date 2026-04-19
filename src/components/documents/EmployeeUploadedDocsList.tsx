import { Download, FileText, Search, Upload, Clock, CheckCircle, XCircle, RotateCcw, FolderOpen } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { EmployeeUploadDialog } from "./EmployeeUploadDialog";
import { useState } from "react";

const STATUS_CONFIG: Record<string, { label: string; icon: any; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending_review: { label: "قيد المراجعة", icon: Clock, variant: "secondary" },
  approved: { label: "معتمد", icon: CheckCircle, variant: "default" },
  rejected: { label: "مرفوض", icon: XCircle, variant: "destructive" },
  returned: { label: "مُرجع", icon: RotateCcw, variant: "outline" },
};

const DOC_TYPE_LABELS: Record<string, string> = {
  national_id: "هوية وطنية",
  passport: "جواز سفر",
  certificate: "شهادة دراسية",
  degree: "شهادة أكاديمية",
  contract_attachment: "مرفق عقد",
  medical_report: "تقرير طبي",
  leave_evidence: "إثبات إجازة",
  residency_permit: "إقامة / تصريح عمل",
  bank_document: "مستند بنكي",
  training_certificate: "شهادة تدريبية",
  other: "مستند آخر",
};

interface Props {
  employeeId: string;
  companyId: string;
  userId: string;
  /** If true, hides upload button (HR view of employee profile) */
  readOnly?: boolean;
}

export function EmployeeUploadedDocsList({ employeeId, companyId, userId, readOnly }: Props) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: uploads = [] } = useQuery({
    queryKey: ["employee-uploads", employeeId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("employee_uploaded_documents")
        .select("*")
        .eq("employee_id", employeeId)
        .order("created_at", { ascending: false });
      return (data || []) as any[];
    },
    enabled: !!employeeId,
  });

  const filtered = uploads.filter((d: any) => {
    if (statusFilter !== "all" && d.status !== statusFilter) return false;
    if (search && !d.title?.includes(search) && !DOC_TYPE_LABELS[d.document_type]?.includes(search)) return false;
    return true;
  });

  const handleDownload = async (doc: any) => {
    const { data } = await supabase.storage.from("employee-uploads").createSignedUrl(doc.file_path, 300);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  // Get latest version per parent chain
  const latestVersionIds = new Set<string>();
  const parentMap = new Map<string, any[]>();
  uploads.forEach((d: any) => {
    const parentId = d.parent_document_id || d.id;
    if (!parentMap.has(parentId)) parentMap.set(parentId, []);
    parentMap.get(parentId)!.push(d);
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="font-heading text-lg flex items-center gap-2">
            <Upload className="h-5 w-5" />
            المستندات المرفوعة
          </CardTitle>
          {!readOnly && (
            <EmployeeUploadDialog employeeId={employeeId} companyId={companyId} userId={userId} />
          )}
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input className="pr-9" placeholder="بحث..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">الكل</SelectItem>
              <SelectItem value="pending_review">قيد المراجعة</SelectItem>
              <SelectItem value="approved">معتمد</SelectItem>
              <SelectItem value="rejected">مرفوض</SelectItem>
              <SelectItem value="returned">مُرجع</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {filtered.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>العنوان</TableHead>
                <TableHead>النوع</TableHead>
                <TableHead>التاريخ</TableHead>
                <TableHead>النسخة</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>ملاحظات</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((d: any) => {
                const sc = STATUS_CONFIG[d.status];
                const Icon = sc?.icon || Clock;
                return (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" />
                      {d.title}
                    </TableCell>
                    <TableCell className="text-sm">{DOC_TYPE_LABELS[d.document_type] || d.document_type}</TableCell>
                    <TableCell dir="ltr" className="text-sm">{new Date(d.created_at).toLocaleDateString("ar-IQ")}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">v{d.version}</Badge></TableCell>
                    <TableCell>
                      <Badge variant={sc?.variant || "outline"} className="gap-1">
                        <Icon className="h-3 w-3" />
                        {sc?.label || d.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                      {d.rejection_reason || "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDownload(d)}>
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                        {!readOnly && d.status === "returned" && (
                          <EmployeeUploadDialog
                            employeeId={employeeId}
                            companyId={companyId}
                            userId={userId}
                            parentDocumentId={d.parent_document_id || d.id}
                            triggerLabel="إعادة رفع"
                          />
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-10 text-muted-foreground">
            <FolderOpen className="h-10 w-10 mx-auto mb-2 opacity-20" />
            <p className="text-sm">لا توجد مستندات مرفوعة</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
