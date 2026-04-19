import { useState, useRef } from "react";
import { Upload, FolderOpen, FileText, Sparkles, AlertTriangle, Download, Trash2, Filter, Archive, Eye, Printer, RefreshCw, ClipboardCheck, FilePlus2 } from "lucide-react";
import { FeatureGate } from "@/components/subscription/FeatureGate";
import { AiActionButton } from "@/components/ai/AiActionButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { useAuth } from "@/contexts/AuthContext";
import { useCreateWorkflowInstance, requestTypeLabels } from "@/hooks/useApprovalWorkflow";
import { useCompanyRequestDocuments } from "@/hooks/useRequestDocuments";
import { WorkflowStatusBadge } from "@/components/approvals/WorkflowStatusBadge";
import { RequestDocumentActions } from "@/components/documents/RequestDocumentActions";
import { useCompanyBranding, useGetDocumentSignedUrl, useFinalizeDocument, buildOfficialDocumentHtml } from "@/hooks/useOfficialDocument";
import LetterGenerator from "@/components/documents/LetterGenerator";
import { HRUploadReviewQueue } from "@/components/documents/HRUploadReviewQueue";
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

export default function Documents() {
  const { toast } = useToast();
  const { companyId } = useCompany();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [expiryFilter, setExpiryFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [previewDoc, setPreviewDoc] = useState<any>(null);
  const [generateRequest, setGenerateRequest] = useState<any>(null);

  const { data: company } = useCompanyBranding();
  const getSignedUrl = useGetDocumentSignedUrl();
  const finalizeDoc = useFinalizeDocument();

  const { data: documents = [] } = useQuery({
    queryKey: ["documents", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("documents").select("*, employees(name_ar)").eq("company_id", companyId!).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees-for-docs", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("employees").select("*, departments(name)").eq("company_id", companyId!).eq("status", "active");
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: companyData } = useQuery({
    queryKey: ["company-for-docs", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("companies").select("name").eq("id", companyId!).single();
      return data;
    },
    enabled: !!companyId,
  });

  const { data: templates = [] } = useQuery({
    queryKey: ["document-templates", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("document_templates").select("*").eq("company_id", companyId!).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!companyId,
  });

  // Request documents (from request_documents table)
  const { data: requestDocs = [] } = useCompanyRequestDocuments(typeFilter, statusFilter);

  // Generated official documents
  const { data: generatedDocs = [] } = useQuery({
    queryKey: ["hr-generated-docs", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("generated_documents").select("*, employees(name_ar, employee_code)").eq("company_id", companyId!).order("created_at", { ascending: false });
      return (data || []) as any[];
    },
    enabled: !!companyId,
  });

  const createWorkflow = useCreateWorkflowInstance();

  const uploadDoc = useMutation({
    mutationFn: async (file: File) => {
      const path = `${companyId}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage.from("documents").upload(path, file);
      if (uploadError) throw uploadError;
      const { data: doc, error: dbError } = await supabase.from("documents").insert({
        company_id: companyId!, name: file.name, file_path: path, file_type: file.type, file_size: file.size, uploaded_by: user!.id,
      }).select().single();
      if (dbError) throw dbError;
      await createWorkflow.mutateAsync({ requestType: "document", referenceId: doc.id, companyId: companyId! });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["documents"] }); toast({ title: "تم الرفع وإرساله للموافقة" }); },
    onError: (err: Error) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  const deleteDoc = useMutation({
    mutationFn: async (doc: any) => {
      await supabase.storage.from("documents").remove([doc.file_path]);
      const { error } = await supabase.from("documents").delete().eq("id", doc.id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["documents"] }); toast({ title: "تم الحذف" }); },
    onError: (err: Error) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  const downloadDoc = async (doc: any) => {
    const { data } = await supabase.storage.from("documents").createSignedUrl(doc.file_path, 300);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
    else toast({ title: "خطأ في التنزيل", variant: "destructive" });
  };

  const formatSize = (bytes: number | null) => {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  const formatDate = (d: string) => {
    try { return new Date(d).toLocaleDateString("ar-IQ"); } catch { return d; }
  };

  const getExpiryStatus = (expiresAt: string | null) => {
    if (!expiresAt) return null;
    const diff = (new Date(expiresAt).getTime() - Date.now()) / 86400000;
    if (diff < 0) return { label: "منتهي", class: "bg-destructive/10 text-destructive" };
    if (diff <= 30) return { label: `ينتهي خلال ${Math.ceil(diff)} يوم`, class: "bg-accent/10 text-accent-foreground" };
    return null;
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

  const now = new Date();
  const expiringDocs = documents.filter((d: any) => {
    if (!d.expires_at) return false;
    const diff = (new Date(d.expires_at).getTime() - now.getTime()) / 86400000;
    return diff <= 30;
  });
  const filteredDocs = expiryFilter === "expiring" ? expiringDocs : documents;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading font-bold text-2xl text-foreground flex items-center gap-2">
            <Archive className="h-6 w-6 text-primary" />
            مركز المستندات والأرشيف
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {documents.length} مستند مرفوع • {requestDocs.length} طلب • {generatedDocs.length} مستند رسمي
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <FeatureGate featureKey="hr_operational" compact>
            <AiActionButton action="generate_document" context={`المستندات: ${documents.length}`} label="إنشاء AI" icon={<Sparkles className="h-3.5 w-3.5" />} dialogTitle="إنشاء مستند بالذكاء الاصطناعي" />
          </FeatureGate>
          <input type="file" ref={fileInputRef} onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadDoc.mutate(f); }} className="hidden" />
          <Button variant="outline" className="gap-2 font-heading" onClick={() => fileInputRef.current?.click()} disabled={uploadDoc.isPending}>
            <Upload className="h-4 w-4" />{uploadDoc.isPending ? "جاري الرفع..." : "رفع مستند"}
          </Button>
        </div>
      </div>

      {/* Expiry Alert */}
      {expiringDocs.length > 0 && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
            <div>
              <p className="font-heading font-bold text-sm text-destructive">{expiringDocs.length} مستند قريب من الانتهاء أو منتهي</p>
              <p className="text-xs text-muted-foreground">راجع المستندات المشار إليها وقم بتجديدها</p>
            </div>
            <Button size="sm" variant="outline" className="mr-auto font-heading" onClick={() => setExpiryFilter("expiring")}>عرض</Button>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="uploaded">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="uploaded" className="font-heading">المستندات المرفوعة ({documents.length})</TabsTrigger>
          <TabsTrigger value="requests" className="font-heading">سجل الطلبات ({requestDocs.length})</TabsTrigger>
          <TabsTrigger value="generated" className="font-heading">المستندات الرسمية ({generatedDocs.length})</TabsTrigger>
          <TabsTrigger value="create" className="font-heading">إنشاء مستند</TabsTrigger>
          <TabsTrigger value="emp-uploads" className="font-heading flex items-center gap-1">
            <ClipboardCheck className="h-3.5 w-3.5" />
            مراجعة مستندات الموظفين
          </TabsTrigger>
        </TabsList>

        {/* Uploaded Documents Tab */}
        <TabsContent value="uploaded">
          <div className="flex gap-2 mb-4">
            <Button size="sm" variant={expiryFilter === "all" ? "default" : "outline"} className="font-heading" onClick={() => setExpiryFilter("all")}>الكل ({documents.length})</Button>
            <Button size="sm" variant={expiryFilter === "expiring" ? "destructive" : "outline"} className="font-heading" onClick={() => setExpiryFilter("expiring")}>
              <AlertTriangle className="h-3 w-3 ml-1" />قريب الانتهاء ({expiringDocs.length})
            </Button>
          </div>
          <Card>
            <CardContent className="p-0">
              {filteredDocs.length > 0 ? (
                <Table>
                  <TableHeader><TableRow><TableHead>المستند</TableHead><TableHead>الموظف</TableHead><TableHead>الحالة</TableHead><TableHead>الحجم</TableHead><TableHead>تاريخ الانتهاء</TableHead><TableHead>التاريخ</TableHead><TableHead>إجراءات</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {filteredDocs.map((doc: any) => {
                      const expiry = getExpiryStatus(doc.expires_at);
                      const docStatus = doc.status || "active";
                      const statusMap: Record<string, { label: string; cls: string }> = {
                        active: { label: "نشط", cls: "bg-primary/10 text-primary" },
                        pending: { label: "بانتظار الموافقة", cls: "bg-accent/10 text-accent-foreground" },
                        approved: { label: "معتمد", cls: "bg-primary/10 text-primary" },
                        rejected: { label: "مرفوض", cls: "bg-destructive/10 text-destructive" },
                      };
                      const st = statusMap[docStatus] || { label: docStatus, cls: "" };
                      return (
                        <TableRow key={doc.id}>
                          <TableCell className="font-medium flex items-center gap-2"><FileText className="h-4 w-4 text-muted-foreground" />{doc.name}</TableCell>
                          <TableCell>{doc.employees?.name_ar || "—"}</TableCell>
                          <TableCell><Badge variant="outline" className={st.cls}>{st.label}</Badge></TableCell>
                          <TableCell>{formatSize(doc.file_size)}</TableCell>
                          <TableCell>
                            {doc.expires_at ? (
                              <div className="flex items-center gap-1">
                                <span dir="ltr" className="text-sm">{doc.expires_at}</span>
                                {expiry && <Badge variant="outline" className={`text-[10px] ${expiry.class}`}>{expiry.label}</Badge>}
                              </div>
                            ) : "—"}
                          </TableCell>
                          <TableCell dir="ltr">{formatDate(doc.created_at)}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => downloadDoc(doc)}><Download className="h-3.5 w-3.5" /></Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteDoc.mutate(doc)}><Trash2 className="h-3.5 w-3.5" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="py-20 text-center text-muted-foreground">
                  <FolderOpen className="h-16 w-16 mx-auto mb-4 opacity-20" />
                  <p className="font-heading font-medium text-lg">لا توجد مستندات</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

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
                          <TableCell><Badge variant="outline">{requestTypeLabels[d.request_type] || d.request_type}</Badge></TableCell>
                          <TableCell className="text-sm">{d.employee_snapshot?.name_ar || "—"}</TableCell>
                          <TableCell dir="ltr" className="text-sm">{formatDate(d.created_at)}</TableCell>
                          <TableCell><WorkflowStatusBadge status={d.status} /></TableCell>
                          <TableCell>
                            {linkedDoc ? (
                              <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20 cursor-pointer"
                                onClick={() => handlePreviewGenerated(linkedDoc)}>
                                <FileText className="h-2.5 w-2.5 ml-1" />{linkedDoc.reference_number || "مستند"}
                              </Badge>
                            ) : d.status === "approved" ? (
                              <Button size="sm" variant="ghost" className="h-6 px-2 gap-1 text-primary text-[10px]"
                                onClick={() => setGenerateRequest(d)}>
                                <FilePlus2 className="h-3 w-3" />إنشاء مستند
                              </Button>
                            ) : "—"}
                          </TableCell>
                          <TableCell><RequestDocumentActions doc={d} compact /></TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="py-16 text-center text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p className="font-heading">لا توجد سجلات طلبات</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Generated Official Documents Tab */}
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
                      <TableHead>المفوض</TableHead>
                      <TableHead>الحالة</TableHead>
                      <TableHead>إجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {generatedDocs.map((d: any) => (
                      <TableRow key={d.id}>
                        <TableCell className="font-mono text-sm font-medium">{d.reference_number || "—"}</TableCell>
                        <TableCell><Badge variant="outline">{DOC_TYPE_LABELS[d.document_type] || d.document_type}</Badge></TableCell>
                        <TableCell className="text-sm">{d.employees?.name_ar || "—"}</TableCell>
                        <TableCell dir="ltr" className="text-sm">{formatDate(d.created_at)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{d.signatory_name_snapshot || "—"}</TableCell>
                        <TableCell>
                          <Badge variant={d.status === "approved" || d.status === "final" ? "default" : "secondary"}>
                            {d.status === "approved" ? "معتمد" : d.status === "final" ? "نهائي" : d.status === "released" ? "صادر" : d.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handlePreviewGenerated(d)} title="عرض"><Eye className="h-3.5 w-3.5" /></Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handlePrintGenerated(d)} title="طباعة"><Printer className="h-3.5 w-3.5" /></Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDownloadGenerated(d)} title="تحميل"><Download className="h-3.5 w-3.5" /></Button>
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
                  <p className="font-heading">لا توجد مستندات رسمية</p>
                  <p className="text-xs mt-1">يتم إنشاء المستندات تلقائياً عند اعتماد الطلبات</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Create Document Tab */}
        <TabsContent value="create">
          <LetterGenerator
            templates={templates.filter((t: any) => t.is_active !== false)}
            employees={employees}
            companyName={companyData?.name || ""}
          />
        </TabsContent>

        {/* Employee Uploads Review Tab */}
        <TabsContent value="emp-uploads">
          <HRUploadReviewQueue />
        </TabsContent>
      </Tabs>

      {/* Preview Dialog */}
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