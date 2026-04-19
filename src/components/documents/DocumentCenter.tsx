import { useState } from "react";
import { FileText, Download, Eye, Printer, Archive, Search, Filter, Lock, Send, CheckCircle, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useGeneratedDocuments, useLogDocumentAccess, useCompanyBranding, useFinalizeDocument, useGetDocumentSignedUrl, useReleaseDocument, buildOfficialDocumentHtml } from "@/hooks/useOfficialDocument";
import { useCreateWorkflowInstance } from "@/hooks/useApprovalWorkflow";
import { useCompany } from "@/hooks/useCompany";
import { useToast } from "@/hooks/use-toast";

const DOC_TYPE_LABELS: Record<string, string> = {
  payslip: "كشف راتب",
  salary_certificate: "شهادة راتب",
  certificate_salary: "شهادة راتب",
  experience_certificate: "شهادة خبرة",
  certificate_experience: "شهادة خبرة",
  certificate_employment: "تعريف بالعمل",
  certificate: "شهادة",
  contract: "عقد عمل",
  warning: "إنذار",
  warning_letter: "خطاب إنذار",
  letter: "خطاب رسمي",
  hr_letter: "خطاب رسمي",
  final_settlement: "مخالصة نهائية",
  leave: "موافقة إجازة",
  leave_approval: "موافقة إجازة",
  offer_letter: "عرض عمل",
  general: "مستند عام",
};

const STATUS_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft: { label: "مسودة", variant: "secondary" },
  pending_approval: { label: "بانتظار الموافقة", variant: "outline" },
  approved: { label: "معتمد", variant: "default" },
  signed: { label: "موقّع", variant: "default" },
  final: { label: "نهائي", variant: "default" },
  released: { label: "صدر للموظف", variant: "default" },
  archived: { label: "مؤرشف", variant: "secondary" },
};

export default function DocumentCenter() {
  const { companyId } = useCompany();
  const { data: documents = [], isLoading } = useGeneratedDocuments();
  const { data: company } = useCompanyBranding();
  const logAccess = useLogDocumentAccess();
  const finalizeDoc = useFinalizeDocument();
  const getSignedUrl = useGetDocumentSignedUrl();
  const releaseDoc = useReleaseDocument();
  const createWorkflow = useCreateWorkflowInstance();
  const { toast } = useToast();
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [previewDoc, setPreviewDoc] = useState<any>(null);

  const filtered = documents.filter((d: any) => {
    if (typeFilter !== "all" && d.document_type !== typeFilter) return false;
    if (statusFilter !== "all" && d.status !== statusFilter) return false;
    if (searchTerm && !d.content?.includes(searchTerm) && !d.employees?.name_ar?.includes(searchTerm)) return false;
    return true;
  });

  const handleView = (doc: any) => {
    setPreviewDoc(doc);
    logAccess.mutate({ documentId: doc.id, action: "view" });
  };

  const handlePrint = (doc: any) => {
    logAccess.mutate({ documentId: doc.id, action: "print" });
    const html = buildOfficialDocumentHtml(company, doc.content || "");
    const win = window.open("", "_blank");
    if (win) { win.document.write(html); win.document.close(); win.print(); }
  };

  const handleFinalize = async (doc: any) => {
    try {
      await finalizeDoc.mutateAsync(doc.id);
      toast({ title: "تم إنشاء النسخة النهائية وحفظها" });
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    }
  };

  const handleDownloadFile = async (doc: any) => {
    try {
      logAccess.mutate({ documentId: doc.id, action: "download" });
      if (doc.file_path) {
        const result = await getSignedUrl.mutateAsync(doc.id);
        window.open(result.url, "_blank");
      } else {
        // Fallback: download HTML from content
        const html = buildOfficialDocumentHtml(company, doc.content || "");
        const blob = new Blob([html], { type: "text/html" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${DOC_TYPE_LABELS[doc.document_type] || doc.document_type}_v${doc.version}.html`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err: any) {
      toast({ title: "خطأ في التنزيل", description: err.message, variant: "destructive" });
    }
  };

  const handleSendForApproval = async (doc: any) => {
    try {
      await createWorkflow.mutateAsync({ requestType: "generated_document", referenceId: doc.id, companyId: companyId! });
      toast({ title: "تم إرسال المستند للموافقة" });
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    }
  };

  const handleRelease = async (doc: any) => {
    try {
      await releaseDoc.mutateAsync(doc.id);
      toast({ title: "تم إصدار المستند للموظف" });
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="font-heading text-lg flex items-center gap-2">
            <Archive className="h-5 w-5 text-primary" />
            أرشيف المستندات المُنشأة
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input placeholder="بحث..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="h-9" />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[140px] h-9"><Filter className="h-3.5 w-3.5 ml-1" /><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الأنواع</SelectItem>
                {Object.entries(DOC_TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px] h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الحالات</SelectItem>
                {Object.entries(STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {filtered.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>النوع</TableHead>
                  <TableHead>الموظف</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>النسخة</TableHead>
                  <TableHead>ملف</TableHead>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((doc: any) => {
                  const st = STATUS_LABELS[doc.status] || { label: doc.status, variant: "outline" as const };
                  const hasFile = !!doc.file_path;
                  const isDraft = doc.status === "draft";
                  const isApproved = doc.status === "approved";
                  const isImmutable = doc.is_immutable;
                  return (
                    <TableRow key={doc.id}>
                      <TableCell className="font-medium flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        {DOC_TYPE_LABELS[doc.document_type] || doc.document_type}
                      </TableCell>
                      <TableCell>{doc.employees?.name_ar || "—"}</TableCell>
                      <TableCell>
                        <Badge variant={st.variant} className="gap-1">
                          {isImmutable && <Lock className="h-3 w-3" />}
                          {st.label}
                        </Badge>
                      </TableCell>
                      <TableCell>v{doc.version}</TableCell>
                      <TableCell>{hasFile ? <CheckCircle className="h-4 w-4 text-primary" /> : <span className="text-muted-foreground text-xs">—</span>}</TableCell>
                      <TableCell dir="ltr" className="text-xs">{new Date(doc.created_at).toLocaleDateString("ar-IQ")}</TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleView(doc)} title="معاينة"><Eye className="h-3.5 w-3.5" /></Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handlePrint(doc)} title="طباعة"><Printer className="h-3.5 w-3.5" /></Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDownloadFile(doc)} title="تنزيل"><Download className="h-3.5 w-3.5" /></Button>
                          {isDraft && !hasFile && (
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-primary" onClick={() => handleFinalize(doc)} title="إنهاء وحفظ" disabled={finalizeDoc.isPending}>
                              <Lock className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {isDraft && (
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-accent-foreground" onClick={() => handleSendForApproval(doc)} title="إرسال للموافقة">
                              <Send className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {isApproved && (
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-primary" onClick={() => handleRelease(doc)} title="إصدار للموظف" disabled={releaseDoc.isPending}>
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Archive className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p className="font-heading">{isLoading ? "جاري التحميل..." : "لا توجد مستندات منشأة"}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={!!previewDoc} onOpenChange={(o) => !o && setPreviewDoc(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading flex items-center gap-2">
              {previewDoc && (DOC_TYPE_LABELS[previewDoc.document_type] || previewDoc.document_type)}
              {previewDoc && <Badge variant="secondary" className="text-xs">v{previewDoc.version}</Badge>}
              {previewDoc?.is_immutable && <Lock className="h-4 w-4 text-muted-foreground" />}
            </DialogTitle>
          </DialogHeader>
          {previewDoc && company && (
            <div className="border rounded-lg overflow-hidden">
              <div className="p-6 text-sm leading-8" dir="rtl"
                dangerouslySetInnerHTML={{
                  __html: (() => {
                    const c = company as any;
                    let html = "";
                    if (c.logo_url) html += `<div style="text-align:center;margin-bottom:8px"><img src="${c.logo_url}" style="max-height:60px" /></div>`;
                    html += `<h2 style="text-align:center;color:${c.primary_color || "#1E3A8A"};font-size:18px;margin:4px 0">${c.name_ar || c.name || ""}</h2>`;
                    if (c.header_template) html += `<p style="text-align:center;font-size:11px;color:#666">${c.header_template}</p>`;
                    html += `<hr style="margin:12px 0;border-color:${c.primary_color || "#1E3A8A"}" />`;
                    html += (previewDoc.content || "").replace(/\n/g, "<br/>");
                    if (c.signatory_name || c.signatory_title) {
                      html += `<div style="margin-top:30px;text-align:left">`;
                      if (c.signatory_name) html += `<div style="font-weight:bold">${c.signatory_name}</div>`;
                      if (c.signatory_title) html += `<div style="font-size:12px;color:#666">${c.signatory_title}</div>`;
                      html += `</div>`;
                    }
                    if (c.stamp_url) html += `<div style="text-align:center;margin-top:16px"><img src="${c.stamp_url}" style="max-height:60px;opacity:0.6" /></div>`;
                    if (c.footer_template) html += `<div style="margin-top:20px;padding-top:8px;border-top:2px solid ${c.primary_color || "#1E3A8A"};text-align:center;font-size:10px;color:#888">${c.footer_template}</div>`;
                    return html;
                  })(),
                }}
              />
            </div>
          )}
          {previewDoc && (
            <div className="text-xs text-muted-foreground space-y-1">
              <p>النسخة: v{previewDoc.version} • {previewDoc.file_path ? "ملف محفوظ ✓" : "بدون ملف"} • {previewDoc.is_immutable ? "🔒 غير قابل للتعديل" : "قابل للتعديل"}</p>
              {previewDoc.approved_at && <p>تاريخ الاعتماد: {new Date(previewDoc.approved_at).toLocaleDateString("ar-IQ")}</p>}
              {previewDoc.released_at && <p>تاريخ الإصدار: {new Date(previewDoc.released_at).toLocaleDateString("ar-IQ")}</p>}
            </div>
          )}
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 gap-2 font-heading" onClick={() => previewDoc && handlePrint(previewDoc)}>
              <Printer className="h-4 w-4" />طباعة
            </Button>
            <Button className="flex-1 gap-2 font-heading" onClick={() => previewDoc && handleDownloadFile(previewDoc)}>
              <Download className="h-4 w-4" />تحميل
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
