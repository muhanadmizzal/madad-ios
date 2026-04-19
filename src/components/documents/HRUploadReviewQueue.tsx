import { useState } from "react";
import { CheckCircle, XCircle, RotateCcw, Eye, Download, Search, Filter, FileText, User, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { useAuth } from "@/contexts/AuthContext";

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending_review: { label: "بانتظار المراجعة", variant: "secondary" },
  approved: { label: "معتمد", variant: "default" },
  rejected: { label: "مرفوض", variant: "destructive" },
  returned: { label: "مُرجع للتصحيح", variant: "outline" },
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

export function HRUploadReviewQueue() {
  const { toast } = useToast();
  const { companyId } = useCompany();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("pending_review");
  const [search, setSearch] = useState("");
  const [reviewDoc, setReviewDoc] = useState<any>(null);
  const [action, setAction] = useState<"approve" | "reject" | "return" | null>(null);
  const [reason, setReason] = useState("");

  const { data: uploads = [], isLoading } = useQuery({
    queryKey: ["hr-upload-review", companyId, statusFilter],
    queryFn: async () => {
      let q = (supabase as any)
        .from("employee_uploaded_documents")
        .select("*, employees(name_ar, employee_code)")
        .eq("company_id", companyId!)
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") q = q.eq("status", statusFilter);

      const { data } = await q;
      return (data || []) as any[];
    },
    enabled: !!companyId,
  });

  const filtered = search
    ? uploads.filter((d: any) =>
        d.title?.includes(search) ||
        d.employees?.name_ar?.includes(search) ||
        d.employees?.employee_code?.includes(search) ||
        DOC_TYPE_LABELS[d.document_type]?.includes(search)
      )
    : uploads;

  const reviewMutation = useMutation({
    mutationFn: async ({ docId, newStatus }: { docId: string; newStatus: string }) => {
      const updates: any = {
        status: newStatus,
        reviewed_by: user!.id,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      if (newStatus === "rejected" || newStatus === "returned") {
        updates.rejection_reason = reason;
      }
      const { error } = await (supabase as any)
        .from("employee_uploaded_documents")
        .update(updates)
        .eq("id", docId);
      if (error) throw error;

      // Get employee user_id for notification
      const doc = uploads.find((d: any) => d.id === docId);
      if (doc) {
        const { data: emp } = await supabase.from("employees").select("user_id").eq("id", doc.employee_id).maybeSingle();
        if (emp?.user_id) {
          const statusMsg = newStatus === "approved" ? "تمت الموافقة على" : newStatus === "rejected" ? "تم رفض" : "تم إرجاع";
          await supabase.from("notifications").insert({
            company_id: companyId!,
            user_id: emp.user_id,
            title: `${statusMsg} مستندك`,
            message: `${statusMsg} المستند: ${doc.title}${reason ? ` — السبب: ${reason}` : ""}`,
            type: "document_review",
            is_read: false,
          });
        }
      }
    },
    onSuccess: () => {
      toast({ title: "تمت العملية بنجاح" });
      queryClient.invalidateQueries({ queryKey: ["hr-upload-review"] });
      queryClient.invalidateQueries({ queryKey: ["employee-uploads"] });
      setReviewDoc(null);
      setAction(null);
      setReason("");
    },
    onError: (e: any) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });

  const handleDownload = async (doc: any) => {
    const { data } = await supabase.storage.from("employee-uploads").createSignedUrl(doc.file_path, 300);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading flex items-center gap-2">
          <FileText className="h-5 w-5" />
          مراجعة مستندات الموظفين المرفوعة
        </CardTitle>
        <div className="flex flex-wrap gap-2 mt-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input className="pr-9" placeholder="بحث بالاسم أو العنوان..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الحالات</SelectItem>
              <SelectItem value="pending_review">بانتظار المراجعة</SelectItem>
              <SelectItem value="approved">معتمد</SelectItem>
              <SelectItem value="rejected">مرفوض</SelectItem>
              <SelectItem value="returned">مُرجع</SelectItem>
            </SelectContent>
          </Select>
          <Badge variant="outline">{filtered.length} مستند</Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>الموظف</TableHead>
              <TableHead>العنوان</TableHead>
              <TableHead>النوع</TableHead>
              <TableHead>التاريخ</TableHead>
              <TableHead>النسخة</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead>إجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((d: any) => (
              <TableRow key={d.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                    {d.employees?.name_ar || "—"}
                  </div>
                  <span className="text-xs text-muted-foreground">{d.employees?.employee_code}</span>
                </TableCell>
                <TableCell className="font-medium">{d.title}</TableCell>
                <TableCell>{DOC_TYPE_LABELS[d.document_type] || d.document_type}</TableCell>
                <TableCell dir="ltr" className="text-sm">{new Date(d.created_at).toLocaleDateString("ar-IQ")}</TableCell>
                <TableCell><Badge variant="outline" className="text-xs">v{d.version}</Badge></TableCell>
                <TableCell>
                  <Badge variant={STATUS_MAP[d.status]?.variant || "outline"}>
                    {STATUS_MAP[d.status]?.label || d.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDownload(d)} title="تحميل">
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                    {d.status === "pending_review" && (
                      <>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-green-600" onClick={() => { setReviewDoc(d); setAction("approve"); }} title="اعتماد">
                          <CheckCircle className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => { setReviewDoc(d); setAction("reject"); }} title="رفض">
                          <XCircle className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-amber-600" onClick={() => { setReviewDoc(d); setAction("return"); }} title="إرجاع">
                          <RotateCcw className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  {isLoading ? "جاري التحميل..." : "لا توجد مستندات"}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>

      {/* Review Action Dialog */}
      <Dialog open={!!action && !!reviewDoc} onOpenChange={o => { if (!o) { setAction(null); setReviewDoc(null); setReason(""); } }}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle className="font-heading">
              {action === "approve" ? "اعتماد المستند" : action === "reject" ? "رفض المستند" : "إرجاع المستند للتصحيح"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
              <p><strong>الموظف:</strong> {reviewDoc?.employees?.name_ar}</p>
              <p><strong>المستند:</strong> {reviewDoc?.title}</p>
              <p><strong>النوع:</strong> {DOC_TYPE_LABELS[reviewDoc?.document_type] || reviewDoc?.document_type}</p>
            </div>
            {action !== "approve" && (
              <div>
                <Label>{action === "reject" ? "سبب الرفض *" : "ملاحظات الإرجاع *"}</Label>
                <Textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="أدخل السبب..." rows={3} />
              </div>
            )}
            <div className="flex gap-2">
              <Button
                className="flex-1 gap-2"
                variant={action === "approve" ? "default" : "destructive"}
                disabled={reviewMutation.isPending || (action !== "approve" && !reason.trim())}
                onClick={() => {
                  const statusMap = { approve: "approved", reject: "rejected", return: "returned" };
                  reviewMutation.mutate({ docId: reviewDoc.id, newStatus: statusMap[action!] });
                }}
              >
                {action === "approve" ? <CheckCircle className="h-4 w-4" /> : action === "reject" ? <XCircle className="h-4 w-4" /> : <RotateCcw className="h-4 w-4" />}
                {action === "approve" ? "اعتماد" : action === "reject" ? "رفض" : "إرجاع"}
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => { setAction(null); setReviewDoc(null); setReason(""); }}>
                إلغاء
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
