import { useState, useEffect } from "react";
import { FileText, Printer, Download, PenTool, Archive, Lock, Send, Plus, Edit3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import ApprovalSignatureDialog from "@/components/signatures/ApprovalSignatureDialog";
import { useCompanyBranding, useSaveGeneratedDocument, useFinalizeDocument, buildOfficialDocumentHtml } from "@/hooks/useOfficialDocument";
import { useCreateWorkflowInstance } from "@/hooks/useApprovalWorkflow";
import { useCompany } from "@/hooks/useCompany";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  templates: any[];
  employees: any[];
  companyName: string;
  company?: any;
}

const DOC_TYPE_OPTIONS = [
  { value: "letter", label: "خطاب رسمي" },
  { value: "certificate_employment", label: "تعريف بالعمل" },
  { value: "certificate_salary", label: "شهادة راتب" },
  { value: "certificate_experience", label: "شهادة خبرة" },
  { value: "contract", label: "عقد عمل" },
  { value: "warning_letter", label: "خطاب إنذار" },
  { value: "general", label: "مستند عام" },
  { value: "hr_letter", label: "خطاب إداري" },
  { value: "offer_letter", label: "عرض عمل" },
  { value: "final_settlement", label: "مخالصة نهائية" },
];

export default function LetterGenerator({ templates, employees, companyName, company: companyProp }: Props) {
  const [mode, setMode] = useState<"template" | "freeform">("template");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [docType, setDocType] = useState("letter");
  const [docTitle, setDocTitle] = useState("");
  const [freeContent, setFreeContent] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [generatedContent, setGeneratedContent] = useState("");
  const [signOpen, setSignOpen] = useState(false);
  const [signed, setSigned] = useState(false);
  const [savedDocId, setSavedDocId] = useState<string | null>(null);
  const { data: brandingCompany } = useCompanyBranding();
  const saveDoc = useSaveGeneratedDocument();
  const finalizeDoc = useFinalizeDocument();
  const createWorkflow = useCreateWorkflowInstance();
  const { companyId } = useCompany();
  const { toast } = useToast();

  const company = brandingCompany || companyProp;
  const c = company as any;

  // When selecting a template, auto-fill docType
  useEffect(() => {
    if (selectedTemplate) {
      const tmpl = templates.find((t: any) => t.id === selectedTemplate);
      if (tmpl?.type) {
        const mapped = DOC_TYPE_OPTIONS.find(o => o.value === tmpl.type);
        if (mapped) setDocType(tmpl.type);
      }
      if (tmpl?.name) setDocTitle(tmpl.name);
    }
  }, [selectedTemplate, templates]);

  const buildReplacements = (employee: any) => {
    const replacements: Record<string, string> = {
      "{{employee_name}}": employee?.name_ar || "",
      "{{employee_code}}": employee?.employee_code || "",
      "{{employee_id}}": employee?.employee_code || employee?.id || "",
      "{{position}}": employee?.position || "",
      "{{job_title}}": employee?.position || "",
      "{{department}}": employee?.departments?.name || "",
      "{{salary}}": (employee?.basic_salary || 0).toLocaleString("ar-IQ"),
      "{{net_salary}}": (employee?.basic_salary || 0).toLocaleString("ar-IQ"),
      "{{hire_date}}": employee?.hire_date || "",
      "{{company_name}}": c?.name_ar || c?.name || companyName,
      "{{company_logo}}": c?.logo_url || "",
      "{{company_stamp}}": c?.stamp_url || "",
      "{{date}}": new Date().toLocaleDateString("ar-IQ"),
      "{{issue_date}}": new Date().toLocaleDateString("ar-IQ"),
      "{{national_id}}": employee?.national_id || "",
      "{{company_address}}": c?.address || "",
      "{{company_phone}}": c?.phone || "",
      "{{company_email}}": c?.email || "",
      "{{tax_number}}": c?.tax_number || "",
      "{{signatory_name}}": c?.signatory_name || "",
      "{{signatory_title}}": c?.signatory_title || "",
    };
    return replacements;
  };

  const generateFromTemplate = () => {
    const template = templates.find((t: any) => t.id === selectedTemplate);
    const employee = employees.find((e: any) => e.id === selectedEmployee);
    if (!template || !employee) return;

    let content = template.content;
    const replacements = buildReplacements(employee);
    Object.entries(replacements).forEach(([key, value]) => {
      content = content.split(key).join(value);
    });

    setGeneratedContent(content);
    setSigned(false);
    setSavedDocId(null);
    setPreviewOpen(true);
  };

  const generateFreeform = () => {
    if (!freeContent.trim()) return;
    const employee = selectedEmployee ? employees.find((e: any) => e.id === selectedEmployee) : null;

    let content = freeContent;
    if (employee) {
      const replacements = buildReplacements(employee);
      Object.entries(replacements).forEach(([key, value]) => {
        content = content.split(key).join(value);
      });
    }

    setGeneratedContent(content);
    setSigned(false);
    setSavedDocId(null);
    setPreviewOpen(true);
  };

  const handlePrint = () => {
    const html = buildOfficialDocumentHtml(c, generatedContent);
    const win = window.open("", "_blank");
    if (win) { win.document.write(html); win.document.close(); win.print(); }
  };

  const handleArchive = async () => {
    try {
      const template = mode === "template" ? templates.find((t: any) => t.id === selectedTemplate) : null;
      const result = await saveDoc.mutateAsync({
        employeeId: selectedEmployee || undefined,
        documentType: docType,
        templateId: mode === "template" ? selectedTemplate : undefined,
        content: generatedContent,
        visibilityScope: "hr",
        metadata: {
          template_name: template?.name || docTitle || "مستند حر",
          title: docTitle,
          creation_mode: mode,
        },
      });
      setSavedDocId((result as any)?.id || null);
      toast({ title: "تم حفظ المستند كمسودة في الأرشيف" });
    } catch {
      toast({ title: "خطأ في الحفظ", variant: "destructive" });
    }
  };

  const handleFinalize = async () => {
    if (!savedDocId) return;
    try {
      await finalizeDoc.mutateAsync(savedDocId);
      toast({ title: "تم إنشاء النسخة النهائية وحفظها في التخزين الآمن" });
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    }
  };

  const handleSendForApproval = async () => {
    if (!savedDocId) return;
    try {
      await createWorkflow.mutateAsync({ requestType: "generated_document", referenceId: savedDocId, companyId: companyId! });
      toast({ title: "تم إرسال المستند للموافقة" });
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    }
  };

  const handleLoadTemplate = () => {
    const template = templates.find((t: any) => t.id === selectedTemplate);
    if (template) {
      setFreeContent(template.content);
      setDocTitle(template.name);
      if (template.type) {
        const mapped = DOC_TYPE_OPTIONS.find(o => o.value === template.type);
        if (mapped) setDocType(template.type);
      }
      toast({ title: "تم تحميل القالب", description: "يمكنك تعديل المحتوى قبل الإنشاء" });
    }
  };

  // Load system templates and merge with tenant templates
  const { data: systemTemplates = [] } = useQuery({
    queryKey: ["system-document-templates-letter"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("system_document_templates").select("*").order("document_type");
      return (data || []).map((t: any) => ({
        id: `sys_${t.id}`,
        name: `${t.name_ar || t.name} (نظام)`,
        content: t.body_template || "",
        type: t.document_type,
        is_active: true,
        source: "system",
      }));
    },
  });

  const activeTemplates = [
    ...templates.filter((t: any) => t.is_active !== false),
    ...systemTemplates.filter((st: any) => !templates.some((t: any) => t.type === st.type && t.is_active !== false)),
  ];


  const mergeFieldHints = [
    "{{employee_name}}", "{{position}}", "{{department}}", "{{salary}}",
    "{{hire_date}}", "{{company_name}}", "{{date}}", "{{national_id}}",
  ];

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="font-heading text-lg flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            إنشاء مستند رسمي
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={mode} onValueChange={(v) => setMode(v as "template" | "freeform")}>
            <TabsList>
              <TabsTrigger value="template" className="font-heading gap-1.5">
                <FileText className="h-3.5 w-3.5" />من قالب جاهز
              </TabsTrigger>
              <TabsTrigger value="freeform" className="font-heading gap-1.5">
                <Edit3 className="h-3.5 w-3.5" />مستند حر
              </TabsTrigger>
            </TabsList>

            {/* ─── Template Mode ─── */}
            <TabsContent value="template" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>القالب</Label>
                  <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                    <SelectTrigger><SelectValue placeholder="اختر القالب" /></SelectTrigger>
                    <SelectContent>
                      {activeTemplates.map((t: any) => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>الموظف</Label>
                  <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                    <SelectTrigger><SelectValue placeholder="اختر الموظف" /></SelectTrigger>
                    <SelectContent>
                      {employees.map((e: any) => (
                        <SelectItem key={e.id} value={e.id}>{e.name_ar} {e.employee_code ? `(${e.employee_code})` : ""}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button className="gap-2 font-heading" onClick={generateFromTemplate} disabled={!selectedTemplate || !selectedEmployee}>
                <FileText className="h-4 w-4" />إنشاء الخطاب
              </Button>
            </TabsContent>

            {/* ─── Freeform Mode ─── */}
            <TabsContent value="freeform" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>نوع المستند</Label>
                  <Select value={docType} onValueChange={setDocType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DOC_TYPE_OPTIONS.map(o => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>عنوان المستند</Label>
                  <Input value={docTitle} onChange={e => setDocTitle(e.target.value)} placeholder="مثال: خطاب توصية" />
                </div>
                <div className="space-y-2">
                  <Label>الموظف (اختياري)</Label>
                  <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                    <SelectTrigger><SelectValue placeholder="بدون ربط بموظف" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">بدون ربط</SelectItem>
                      {employees.map((e: any) => (
                        <SelectItem key={e.id} value={e.id}>{e.name_ar} {e.employee_code ? `(${e.employee_code})` : ""}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Load from template */}
              {activeTemplates.length > 0 && (
                <div className="flex items-end gap-3 p-3 rounded-lg border border-dashed bg-muted/30">
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs text-muted-foreground">تحميل من قالب (للتعديل عليه)</Label>
                    <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                      <SelectTrigger className="h-8"><SelectValue placeholder="اختر قالب للتحميل" /></SelectTrigger>
                      <SelectContent>
                        {activeTemplates.map((t: any) => (
                          <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button variant="outline" size="sm" className="gap-1 font-heading" onClick={handleLoadTemplate} disabled={!selectedTemplate}>
                    <Plus className="h-3.5 w-3.5" />تحميل
                  </Button>
                </div>
              )}

              {/* Merge field hints */}
              <div className="flex flex-wrap gap-1.5">
                <span className="text-[10px] text-muted-foreground ml-1">حقول الدمج:</span>
                {mergeFieldHints.map(f => (
                  <Badge key={f} variant="outline" className="text-[10px] cursor-pointer hover:bg-primary/10 transition-colors"
                    onClick={() => setFreeContent(prev => prev + " " + f)}
                  >{f}</Badge>
                ))}
              </div>

              <div className="space-y-2">
                <Label>محتوى المستند</Label>
                <Textarea
                  value={freeContent}
                  onChange={e => setFreeContent(e.target.value)}
                  placeholder="اكتب محتوى المستند هنا... يمكنك استخدام حقول الدمج مثل {{employee_name}} لإدراج بيانات الموظف تلقائياً"
                  className="min-h-[250px] text-sm leading-7"
                  dir="rtl"
                />
              </div>

              <Button className="gap-2 font-heading" onClick={generateFreeform} disabled={!freeContent.trim()}>
                <FileText className="h-4 w-4" />معاينة وإنشاء
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* ─── Preview Dialog ─── */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading">معاينة المستند الرسمي</DialogTitle>
          </DialogHeader>

          <div className="border rounded-lg p-6 bg-background text-sm leading-8" dir="rtl">
            <div className="text-center mb-4">
              {c?.logo_url && <img src={c.logo_url} alt="شعار" className="h-16 mx-auto mb-2 object-contain" />}
              <h2 className="font-heading font-bold text-lg" style={{ color: c?.primary_color || undefined }}>
                {c?.name_ar || c?.name || companyName}
              </h2>
              {c?.header_template && <p className="text-xs text-muted-foreground">{c.header_template}</p>}
              {(c?.registration_number || c?.tax_number) && (
                <p className="text-[10px] text-muted-foreground">
                  {c.registration_number && `سجل: ${c.registration_number}`}
                  {c.registration_number && c.tax_number && " | "}
                  {c.tax_number && `ضريبي: ${c.tax_number}`}
                </p>
              )}
            </div>
            <Separator className="mb-4" style={{ borderColor: c?.primary_color || undefined }} />

            {docTitle && (
              <h3 className="text-center font-heading font-bold text-base mb-4" style={{ color: c?.primary_color || undefined }}>
                {docTitle}
              </h3>
            )}

            <div className="whitespace-pre-line min-h-[200px]">{generatedContent}</div>

            <div className="mt-8">
              {(c?.signatory_name || c?.signatory_title) && (
                <div className="text-left">
                  {c.signatory_name && <p className="font-heading font-bold text-sm">{c.signatory_name}</p>}
                  {c.signatory_title && <p className="text-xs text-muted-foreground">{c.signatory_title}</p>}
                </div>
              )}
              {c?.stamp_url && (
                <div className="text-center mt-4">
                  <img src={c.stamp_url} alt="ختم" className="h-14 mx-auto object-contain opacity-60" />
                </div>
              )}
            </div>

            {c?.footer_template && (
              <>
                <Separator className="mt-4" style={{ borderColor: c?.primary_color || undefined }} />
                <p className="text-[10px] text-muted-foreground text-center mt-2">{c.footer_template}</p>
              </>
            )}
          </div>

          {signed && <div className="text-center text-sm text-primary font-heading">✅ تم التوقيع رقمياً</div>}

          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" className="flex-1 gap-2 font-heading" onClick={handlePrint}>
              <Printer className="h-4 w-4" />طباعة رسمية
            </Button>
            <Button variant="outline" className="flex-1 gap-2 font-heading" onClick={() => setSignOpen(true)}>
              <PenTool className="h-4 w-4" />توقيع رقمي
            </Button>
            <Button variant="secondary" className="flex-1 gap-2 font-heading" onClick={handleArchive} disabled={saveDoc.isPending || !!savedDocId}>
              <Archive className="h-4 w-4" />{savedDocId ? "تم الحفظ ✓" : "حفظ في الأرشيف"}
            </Button>
          </div>
          {savedDocId && (
            <div className="flex gap-2 flex-wrap">
              <Button className="flex-1 gap-2 font-heading" onClick={handleFinalize} disabled={finalizeDoc.isPending}>
                <Lock className="h-4 w-4" />إنهاء وحفظ نهائي
              </Button>
              <Button variant="outline" className="flex-1 gap-2 font-heading" onClick={handleSendForApproval}>
                <Send className="h-4 w-4" />إرسال للموافقة
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ApprovalSignatureDialog
        open={signOpen}
        onOpenChange={setSignOpen}
        documentId={selectedTemplate || savedDocId || ""}
        documentType={docType}
        onSigned={() => setSigned(true)}
      />
    </>
  );
}
