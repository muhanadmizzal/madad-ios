import { useState } from "react";
import { FileText, Filter, Archive, Eye, Printer, Download, RefreshCw, FilePlus2, Send } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCompanyRequestDocuments } from "@/hooks/useRequestDocuments";
import { requestTypeLabels } from "@/hooks/useApprovalWorkflow";
import { WorkflowStatusBadge } from "@/components/approvals/WorkflowStatusBadge";
import { RequestDocumentActions } from "@/components/documents/RequestDocumentActions";
import { PageHeader } from "@/components/layout/PageHeader";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { useCompanyBranding, useGetDocumentSignedUrl, useFinalizeDocument, buildOfficialDocumentHtml } from "@/hooks/useOfficialDocument";
import { useToast } from "@/hooks/use-toast";
import GenerateFromRequestDialog from "@/components/documents/GenerateFromRequestDialog";

const DOC_TYPE_LABELS: Record<string, string> = {
  certificate_employment: "تعريف بالعمل",
  certificate_salary: "شهادة راتب",
  certificate_experience: "شهادة خبرة",
  certificate: "شهادة",
  leave: "موافقة إجازة",
  leave_approval: "موافقة إجازة",
  contract: "عقد عمل",
  warning_letter: "خطاب إنذار",
  offer_letter: "عرض عمل",
  general: "مستند عام",
};

export default function RequestArchive() {
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [tab, setTab] = useState("requests");
  const { companyId } = useCompany();
  const { data: company } = useCompanyBranding();
  const getSignedUrl = useGetDocumentSignedUrl();
  const finalizeDoc = useFinalizeDocument();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [previewDoc, setPreviewDoc] = useState<any>(null);
  const [generateRequest, setGenerateRequest] = useState<any>(null);

  // Request documents (from request_documents table)
  const { data: requestDocs = [], isLoading } = useCompanyRequestDocuments(typeFilter, statusFilter);

  // Generated official documents (from generated_documents table)
  const { data: generatedDocs = [] } = useQuery({
    queryKey: ["hr-generated-docs", companyId],
    queryFn: async () => {
      const { data } = await supabase
        .from("generated_documents")
        .select("*, employees(name_ar, employee_code)")
        .eq("company_id", companyId!)
        .order("created_at", { ascending: false });
      return (data || []) as any[];
    },
    enabled: !!companyId,
  });

  const formatDate = (d: string) => {
    try { return new Date(d).toLocaleDateString("ar-IQ"); } catch { return d; }
  };

  const handlePreviewGenerated = (doc: any) => setPreviewDoc(doc);

  const handlePrintGenerated = (doc: any) => {
    const html = buildOfficialDocumentHtml(company, doc.content || "");
    const win = window.open("", "_blank");
    if (win) { win.document.write(html); win.document.close(); win.print(); }
  };

  const handleDownloadGenerated = async (doc: any) => {
    if (doc.file_path) {
      try {
        const result = await getSignedUrl.mutateAsync(doc.id);
        window.open(result.url, "_blank");
      } catch { handlePrintGenerated(doc); }
    } else {
      handlePrintGenerated(doc);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="أرشيف المستندات والطلبات" description="سجل رسمي شامل لجميع طلبات الموظفين والمستندات المُنشأة" icon={<Archive className="h-5 w-5" />} />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="requests" className="font-heading">سجل الطلبات ({requestDocs.length})</TabsTrigger>
          <TabsTrigger value="generated" className="font-heading">المستندات الرسمية ({generatedDocs.length})</TabsTrigger>
          <TabsTrigger value="unified" className="font-heading">عرض موحد</TabsTrigger>
        </TabsList>

        {/* Request Documents Tab */}
        <TabsContent value="requests">
          <div className="flex items-center gap-3 flex-wrap mb-4">
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
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الحالات</SelectItem>
                <SelectItem value="submitted">مقدم</SelectItem>
                <SelectItem value="pending_approval">بانتظار الموافقة</SelectItem>
                <SelectItem value="approved">موافق عليه</SelectItem>
                <SelectItem value="rejected">مرفوض</SelectItem>
                <SelectItem value="returned">مرجع</SelectItem>
              </SelectContent>
            </Select>
            <Badge variant="outline" className="text-xs">{requestDocs.length} سجل</Badge>
          </div>

          <Card>
            <CardContent className="p-0">
              {requestDocs.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>رقم المرجع</TableHead>
                      <TableHead>النوع</TableHead>
                      <TableHead>الموظف</TableHead>
                      <TableHead>القسم</TableHead>
                      <TableHead>التاريخ</TableHead>
                      <TableHead>الحالة</TableHead>
                      <TableHead>المستند الرسمي</TableHead>
                      <TableHead>إجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requestDocs.map((d: any) => {
                      const linkedDoc = generatedDocs.find((g: any) => g.workflow_instance_id === d.workflow_instance_id);
                      return (
                        <TableRow key={d.id}>
                          <TableCell className="font-mono text-sm font-medium">{d.reference_number}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{requestTypeLabels[d.request_type] || d.request_type}</Badge>
                          </TableCell>
                          <TableCell className="text-sm">{d.employee_snapshot?.name_ar || "—"}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{d.employee_snapshot?.department || "—"}</TableCell>
                          <TableCell dir="ltr" className="text-sm">{formatDate(d.created_at)}</TableCell>
                          <TableCell><WorkflowStatusBadge status={d.status} /></TableCell>
                          <TableCell>
                            {linkedDoc ? (
                              <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20 cursor-pointer"
                                onClick={() => { setTab("generated"); handlePreviewGenerated(linkedDoc); }}>
                                <FileText className="h-2.5 w-2.5 ml-1" />{linkedDoc.reference_number || "مستند"}
                              </Badge>
                            ) : d.status === "approved" ? (
                              <Button size="sm" variant="ghost" className="h-6 px-2 gap-1 text-primary text-[10px]"
                                onClick={() => setGenerateRequest(d)}>
                                <FilePlus2 className="h-3 w-3" />إنشاء مستند
                              </Button>
                            ) : "—"}
                          </TableCell>
                          <TableCell>
                            <RequestDocumentActions doc={d} compact />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="py-16 text-center text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p className="font-heading">لا توجد سجلات</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Generated Documents Tab */}
        <TabsContent value="generated">
          <Card>
            <CardContent className="p-0">
              {generatedDocs.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>رقم المرجع</TableHead>
                      <TableHead>النوع</TableHead>
                      <TableHead>الموظف</TableHead>
                      <TableHead>التاريخ</TableHead>
                      <TableHead>المصدر</TableHead>
                      <TableHead>المفوض</TableHead>
                      <TableHead>الحالة</TableHead>
                      <TableHead>إجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {generatedDocs.map((d: any) => (
                      <TableRow key={d.id}>
                        <TableCell className="font-mono text-sm font-medium">{d.reference_number || "—"}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{DOC_TYPE_LABELS[d.document_type] || d.document_type}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">{d.employees?.name_ar || "—"}</TableCell>
                        <TableCell dir="ltr" className="text-sm">{formatDate(d.created_at)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px]">
                            {d.template_source === "tenant" ? "مخصص" : d.metadata?.auto_generated ? "تلقائي" : "يدوي"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{d.signatory_name_snapshot || "—"}</TableCell>
                        <TableCell>
                          <Badge variant={d.status === "approved" || d.status === "final" ? "default" : "secondary"}>
                            {d.status === "approved" ? "معتمد" : d.status === "final" ? "نهائي" : d.status === "released" ? "صادر" : d.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handlePreviewGenerated(d)} title="عرض">
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handlePrintGenerated(d)} title="طباعة">
                              <Printer className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDownloadGenerated(d)} title="تحميل">
                              <Download className="h-3.5 w-3.5" />
                            </Button>
                            {!d.file_path && (d.status === "approved" || d.status === "draft") && (
                              <Button size="icon" variant="ghost" className="h-7 w-7" title="إنشاء PDF"
                                disabled={finalizeDoc.isPending}
                                onClick={async () => {
                                  try {
                                    await finalizeDoc.mutateAsync(d.id);
                                    queryClient.invalidateQueries({ queryKey: ["hr-generated-docs"] });
                                    toast({ title: "تم إنشاء ملف PDF بنجاح" });
                                  } catch (e: any) {
                                    toast({ title: "فشل إنشاء PDF", description: e.message, variant: "destructive" });
                                  }
                                }}
                              >
                                <RefreshCw className={`h-3.5 w-3.5 ${finalizeDoc.isPending ? "animate-spin" : ""}`} />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="py-16 text-center text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p className="font-heading">لا توجد مستندات مُنشأة</p>
                  <p className="text-xs mt-1">يتم إنشاء المستندات تلقائياً عند اعتماد الطلبات ذات خاصية الإنشاء التلقائي</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Unified View Tab */}
        <TabsContent value="unified">
          <Card>
            <CardContent className="p-0">
              {requestDocs.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>رقم المرجع</TableHead>
                      <TableHead>النوع</TableHead>
                      <TableHead>الموظف</TableHead>
                      <TableHead>حالة الطلب</TableHead>
                      <TableHead>المستند الرسمي</TableHead>
                      <TableHead>حالة المستند</TableHead>
                      <TableHead>المفوض</TableHead>
                      <TableHead>إجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requestDocs.map((d: any) => {
                      const linkedDoc = generatedDocs.find((g: any) => g.workflow_instance_id === d.workflow_instance_id);
                      return (
                        <TableRow key={d.id}>
                          <TableCell className="font-mono text-sm font-medium">{d.reference_number}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{requestTypeLabels[d.request_type] || d.request_type}</Badge>
                          </TableCell>
                          <TableCell className="text-sm">{d.employee_snapshot?.name_ar || "—"}</TableCell>
                          <TableCell><WorkflowStatusBadge status={d.status} /></TableCell>
                          <TableCell>
                            {linkedDoc ? (
                              <span className="font-mono text-xs text-primary">{linkedDoc.reference_number}</span>
                            ) : d.status === "approved" ? (
                              <Button size="sm" variant="ghost" className="h-6 px-2 gap-1 text-primary text-[10px]"
                                onClick={() => setGenerateRequest(d)}>
                                <FilePlus2 className="h-3 w-3" />إنشاء
                              </Button>
                            ) : "—"}
                          </TableCell>
                          <TableCell>
                            {linkedDoc ? (
                              <Badge variant={linkedDoc.status === "approved" ? "default" : "secondary"} className="text-[10px]">
                                {linkedDoc.status === "approved" ? "معتمد" : linkedDoc.status}
                              </Badge>
                            ) : d.status === "approved" ? (
                              <span className="text-[10px] text-muted-foreground">بانتظار</span>
                            ) : "—"}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {linkedDoc?.signatory_name_snapshot || "—"}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <RequestDocumentActions doc={d} compact />
                              {linkedDoc && (
                                <>
                                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handlePreviewGenerated(linkedDoc)} title="عرض المستند">
                                    <Eye className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handlePrintGenerated(linkedDoc)} title="طباعة">
                                    <Printer className="h-3.5 w-3.5" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="py-16 text-center text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p className="font-heading">لا توجد سجلات</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Preview Dialog for Generated Documents */}
      <Dialog open={!!previewDoc} onOpenChange={(o) => !o && setPreviewDoc(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading">
              {previewDoc && (DOC_TYPE_LABELS[previewDoc.document_type] || previewDoc.document_type)}
              {previewDoc?.reference_number && ` — ${previewDoc.reference_number}`}
            </DialogTitle>
          </DialogHeader>
          {previewDoc && company && (
            <div className="border rounded-lg p-6 text-sm leading-8" dir="rtl"
              dangerouslySetInnerHTML={{
                __html: (() => {
                  const c = company as any;
                  let html = "";
                  if (c.logo_url) html += `<div style="text-align:center;margin-bottom:8px"><img src="${c.logo_url}" style="max-height:60px" /></div>`;
                  html += `<h2 style="text-align:center;color:${c.primary_color || "#1E3A8A"};font-size:18px">${c.name_ar || c.name || ""}</h2>`;
                  if (c.header_template) html += `<p style="text-align:center;font-size:11px;color:#666">${c.header_template}</p>`;
                  html += `<hr style="margin:12px 0;border-color:${c.primary_color || "#1E3A8A"}" />`;
                  if (previewDoc.reference_number) html += `<div style="text-align:center;font-size:12px;color:#666;margin-bottom:12px">رقم المرجع: <strong>${previewDoc.reference_number}</strong></div>`;
                  html += (previewDoc.content || "").replace(/\n/g, "<br/>");
                  const sigName = previewDoc.signatory_name_snapshot || c.signatory_name;
                  const sigRole = previewDoc.signatory_role_snapshot || c.signatory_title;
                  if (sigName) html += `<div style="margin-top:30px"><strong>${sigName}</strong><br/><span style="color:#666;font-size:12px">${sigRole || ""}</span></div>`;
                  if (c.stamp_url) html += `<div style="text-align:center;margin-top:16px"><img src="${c.stamp_url}" style="max-height:60px;opacity:0.6" /></div>`;
                  if (c.footer_template) html += `<div style="margin-top:20px;border-top:2px solid ${c.primary_color || "#1E3A8A"};padding-top:8px;text-align:center;font-size:10px;color:#888">${c.footer_template}</div>`;
                  return html;
                })(),
              }}
            />
          )}
          <div className="flex gap-2">
            <Button className="flex-1 gap-2 font-heading" onClick={() => previewDoc && handlePrintGenerated(previewDoc)}>
              <Printer className="h-4 w-4" />طباعة
            </Button>
            <Button variant="outline" className="flex-1 gap-2 font-heading" onClick={() => previewDoc && handleDownloadGenerated(previewDoc)}>
              <Download className="h-4 w-4" />تحميل PDF
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Generate Document from Request Dialog */}
      <GenerateFromRequestDialog
        open={!!generateRequest}
        onOpenChange={(o) => !o && setGenerateRequest(null)}
        requestDoc={generateRequest}
        onGenerated={() => {
          queryClient.invalidateQueries({ queryKey: ["hr-generated-docs"] });
        }}
      />
    </div>
  );
}
