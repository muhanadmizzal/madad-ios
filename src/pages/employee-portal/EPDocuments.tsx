import { useState } from "react";
import { FileText, Download, Eye, Printer, Filter, FolderOpen, Award } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { useAuth } from "@/contexts/AuthContext";
import { useCompanyBranding, useLogDocumentAccess, useGetDocumentSignedUrl, buildOfficialDocumentHtml } from "@/hooks/useOfficialDocument";
import { EmployeeUploadedDocsList } from "@/components/documents/EmployeeUploadedDocsList";
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

const DOC_CATEGORIES: Record<string, { label: string; icon: string; types: string[] }> = {
  certificates: { label: "الشهادات", icon: "🏅", types: ["certificate", "certificate_salary", "certificate_experience", "certificate_employment", "salary_certificate", "experience_certificate"] },
  contracts: { label: "العقود", icon: "📋", types: ["contract", "offer_letter"] },
  letters: { label: "الخطابات الرسمية", icon: "✉️", types: ["letter", "hr_letter", "warning", "warning_letter", "leave", "leave_approval", "general"] },
  payroll: { label: "الرواتب والمالية", icon: "💰", types: ["payslip", "final_settlement"] },
};

const STATUS_LABELS: Record<string, string> = {
  draft: "مسودة",
  approved: "معتمد",
  final: "نهائي",
  signed: "موقّع",
  released: "صادر",
};

export default function EPDocuments() {
  const { companyId } = useCompany();
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: company } = useCompanyBranding();
  const logAccess = useLogDocumentAccess();
  const getSignedUrl = useGetDocumentSignedUrl();
  const [previewDoc, setPreviewDoc] = useState<any>(null);
  const [categoryFilter, setCategoryFilter] = useState("all");

  const { data: myEmployee } = useQuery({
    queryKey: ["my-employee", user?.id, companyId],
    queryFn: async () => {
      const { data } = await supabase.from("employees").select("id").eq("company_id", companyId!).eq("user_id", user!.id).maybeSingle();
      return data;
    },
    enabled: !!user && !!companyId,
  });

  // Uploaded documents
  const { data: uploadedDocs = [] } = useQuery({
    queryKey: ["ep-documents", myEmployee?.id],
    queryFn: async () => {
      const { data } = await supabase.from("documents").select("*").eq("employee_id", myEmployee!.id).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!myEmployee?.id,
  });

  // Generated/official documents - includes auto-generated from approvals
  const { data: generatedDocs = [] } = useQuery({
    queryKey: ["ep-generated-docs", myEmployee?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("generated_documents")
        .select("*")
        .eq("employee_id", myEmployee!.id)
        .in("visibility_scope", ["employee", "all"])
        .in("status", ["approved", "final", "signed", "released"])
        .order("created_at", { ascending: false });
      return (data || []) as any[];
    },
    enabled: !!myEmployee?.id,
  });

  // Filter by category
  const filteredDocs = categoryFilter === "all"
    ? generatedDocs
    : generatedDocs.filter((d: any) => {
        const cat = DOC_CATEGORIES[categoryFilter];
        return cat?.types.includes(d.document_type);
      });

  const handleViewGenerated = (doc: any) => {
    setPreviewDoc(doc);
    logAccess.mutate({ documentId: doc.id, action: "view" });
  };

  const handlePrintGenerated = (doc: any) => {
    logAccess.mutate({ documentId: doc.id, action: "print" });
    const html = buildOfficialDocumentHtml(company, doc.content || "", {
      showSignatory: true,
      showStamp: true,
    });
    const win = window.open("", "_blank");
    if (win) { win.document.write(html); win.document.close(); win.print(); }
  };

  const handleDownloadUploaded = async (doc: any) => {
    const { data } = await supabase.storage.from("documents").createSignedUrl(doc.file_path, 300);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  const handleDownloadGenerated = async (doc: any) => {
    try {
      logAccess.mutate({ documentId: doc.id, action: "download" });
      if (doc.file_path) {
        const result = await getSignedUrl.mutateAsync(doc.id);
        window.open(result.url, "_blank");
      } else {
        // Fallback: print to PDF
        handlePrintGenerated(doc);
      }
    } catch { /* silent */ }
  };

  if (!myEmployee) return <div className="text-center py-16 text-muted-foreground">لم يتم ربط حسابك بسجل موظف</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-heading font-bold text-2xl">مستنداتي</h1>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الفئات</SelectItem>
              {Object.entries(DOC_CATEGORIES).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Badge variant="outline" className="text-xs">{filteredDocs.length + uploadedDocs.length} مستند</Badge>
        </div>
      </div>

      <Tabs defaultValue="official">
        <TabsList className="flex-wrap">
          <TabsTrigger value="official" className="font-heading">المستندات الرسمية ({filteredDocs.length})</TabsTrigger>
          <TabsTrigger value="certificates" className="font-heading gap-1"><Award className="h-3.5 w-3.5" />طلب شهادة</TabsTrigger>
          <TabsTrigger value="uploaded" className="font-heading">المستندات المرفوعة ({uploadedDocs.length})</TabsTrigger>
          <TabsTrigger value="my-uploads" className="font-heading">مستنداتي المرفوعة</TabsTrigger>
        </TabsList>

        <TabsContent value="official">
          <Card>
            <CardContent className="p-0">
              {filteredDocs.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>رقم المرجع</TableHead>
                      <TableHead>النوع</TableHead>
                      <TableHead>التاريخ</TableHead>
                      <TableHead>المصدر</TableHead>
                      <TableHead>الحالة</TableHead>
                      <TableHead>المفوض</TableHead>
                      <TableHead>إجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDocs.map((d: any) => (
                      <TableRow key={d.id}>
                        <TableCell className="font-mono text-sm font-medium">
                          {d.reference_number || "—"}
                        </TableCell>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-primary" />
                            {DOC_TYPE_LABELS[d.document_type] || d.document_type}
                          </div>
                        </TableCell>
                        <TableCell dir="ltr" className="text-sm">{new Date(d.created_at).toLocaleDateString("ar-IQ")}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px]">
                            {d.template_source === "tenant" ? "مخصص" : "نظام"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="default">{STATUS_LABELS[d.status] || d.status}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {d.signatory_name_snapshot || "—"}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleViewGenerated(d)} title="عرض">
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handlePrintGenerated(d)} title="طباعة">
                              <Printer className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDownloadGenerated(d)} title="تحميل">
                              <Download className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12 text-muted-foreground text-sm">
                  <FolderOpen className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p className="font-heading">لا توجد مستندات رسمية</p>
                  <p className="text-xs mt-1">يتم إنشاء المستندات تلقائياً عند اعتماد طلباتك</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Certificate Request Tab */}
        <TabsContent value="certificates">
          <Card>
            <CardContent className="p-6 space-y-4">
              <h3 className="font-heading font-bold text-lg">طلب شهادة رسمية</h3>
              <p className="text-sm text-muted-foreground">اختر نوع الشهادة المطلوبة وسيتم إرسال الطلب للموافقة وإنشاء المستند تلقائياً</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { type: "experience", label: "شهادة خبرة", desc: "تثبت فترة عملك ومسماك الوظيفي" },
                  { type: "salary", label: "شهادة راتب", desc: "تثبت راتبك الحالي للجهات الرسمية" },
                  { type: "employment", label: "تعريف بالراتب", desc: "خطاب تعريف موجه لجهة محددة" },
                ].map((cert) => (
                  <Card key={cert.type} className="hover:shadow-md transition-shadow cursor-pointer border-2 hover:border-primary/30" onClick={async () => {
                    if (!myEmployee) return;
                    try {
                      const { data: arData, error: arErr } = await supabase.from("approval_requests").insert({
                        company_id: companyId!,
                        requester_id: user!.id,
                        request_type: `certificate_${cert.type}`,
                        record_id: myEmployee.id,
                        comments: `طلب ${cert.label}`,
                      }).select().single();
                      if (arErr) throw arErr;

                      const { error: wfErr } = await supabase.rpc("create_workflow_instance", {
                        p_request_type: `certificate_${cert.type}`,
                        p_reference_id: arData.id,
                        p_company_id: companyId!,
                      });
                      if (wfErr) {
                        toast({ title: "تم حفظ الطلب لكن فشل إنشاء سير العمل", description: wfErr.message, variant: "destructive" });
                      } else {
                        toast({ title: "تم الإرسال", description: `تم تقديم طلب ${cert.label} وإرساله للموافقة` });
                      }
                    } catch (err: any) {
                      toast({ title: "خطأ", description: err.message, variant: "destructive" });
                    }
                  }}>
                    <CardContent className="p-4 text-center">
                      <Award className="h-8 w-8 mx-auto mb-2 text-primary" />
                      <p className="font-heading font-bold text-sm">{cert.label}</p>
                      <p className="text-xs text-muted-foreground mt-1">{cert.desc}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="uploaded">
          <Card>
            <CardContent className="p-0">
              {uploadedDocs.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>الاسم</TableHead>
                      <TableHead>النوع</TableHead>
                      <TableHead>تاريخ الرفع</TableHead>
                      <TableHead>الانتهاء</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {uploadedDocs.map((d: any) => {
                      const isExpired = d.expires_at && new Date(d.expires_at) < new Date();
                      return (
                        <TableRow key={d.id}>
                          <TableCell className="font-medium flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />{d.name}
                          </TableCell>
                          <TableCell>{d.file_type || "—"}</TableCell>
                          <TableCell dir="ltr">{new Date(d.created_at).toLocaleDateString("ar-IQ")}</TableCell>
                          <TableCell>
                            {d.expires_at ? (
                              <Badge variant="outline" className={isExpired ? "bg-destructive/10 text-destructive" : ""}>
                                {new Date(d.expires_at).toLocaleDateString("ar-IQ")}{isExpired && " (منتهي)"}
                              </Badge>
                            ) : "—"}
                          </TableCell>
                          <TableCell>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDownloadUploaded(d)}>
                              <Download className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12 text-muted-foreground text-sm">لا توجد مستندات</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="my-uploads">
          <EmployeeUploadedDocsList
            employeeId={myEmployee.id}
            companyId={companyId!}
            userId={user!.id}
          />
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
            <div className="border rounded-lg overflow-hidden bg-white shadow-sm">
              <div
                className="p-6 text-sm leading-8"
                dir="rtl"
                dangerouslySetInnerHTML={{
                  __html: (() => {
                    const c = company as any;
                    const primaryColor = c.primary_color || "#1E3A8A";
                    let html = "";
                    // Branded header
                    html += `<div style="text-align:center;padding-bottom:12px;border-bottom:3px solid ${primaryColor};margin-bottom:16px">`;
                    if (c.logo_url) html += `<img src="${c.logo_url}" style="max-height:70px;margin-bottom:8px" />`;
                    html += `<h2 style="color:${primaryColor};font-size:20px;margin:4px 0">${c.name_ar || c.name || ""}</h2>`;
                    if (c.header_template) html += `<div style="font-size:11px;color:#888">${c.header_template}</div>`;
                    if (c.registration_number) html += `<div style="font-size:10px;color:#aaa">سجل: ${c.registration_number}</div>`;
                    html += `</div>`;
                    // Reference and date
                    html += `<div style="display:flex;justify-content:space-between;font-size:12px;color:#888;margin-bottom:12px">`;
                    if (previewDoc.reference_number) html += `<span>رقم المرجع: <strong>${previewDoc.reference_number}</strong></span>`;
                    html += `<span>التاريخ: ${new Date(previewDoc.created_at).toLocaleDateString("ar-IQ")}</span></div>`;
                    // Content
                    html += `<div style="min-height:200px;white-space:pre-line;padding:8px 0">${(previewDoc.content || "").replace(/\n/g, "<br/>")}</div>`;
                    // Signatory
                    const sigName = previewDoc.signatory_name_snapshot || c.signatory_name;
                    const sigRole = previewDoc.signatory_role_snapshot || c.signatory_title;
                    if (sigName) {
                      html += `<div style="margin-top:40px;display:flex;justify-content:space-between;align-items:flex-end">`;
                      html += `<div><div style="border-top:1px solid #ccc;width:200px;margin-bottom:4px"></div>`;
                      html += `<strong>${sigName}</strong><br/><span style="font-size:12px;color:#666">${sigRole || ""}</span></div>`;
                      if (c.stamp_url) html += `<img src="${c.stamp_url}" style="max-height:70px;opacity:0.6" />`;
                      html += `</div>`;
                    }
                    // Footer
                    if (c.footer_template) {
                      html += `<div style="margin-top:24px;border-top:2px solid ${primaryColor};padding-top:8px;text-align:center;font-size:10px;color:#888">${c.footer_template}</div>`;
                    } else {
                      html += `<div style="margin-top:24px;border-top:2px solid ${primaryColor};padding-top:8px;text-align:center;font-size:10px;color:#888">${[c.address, c.phone, c.email, c.website].filter(Boolean).join(" | ")}</div>`;
                    }
                    return html;
                  })(),
                }}
              />
            </div>
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
    </div>
  );
}
