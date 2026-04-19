import { useState, useEffect } from "react";
import { FileText, Send, Archive, Printer, Download, ExternalLink } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { useCompanyBranding, useSaveGeneratedDocument, useFinalizeDocument, useReleaseDocument, buildOfficialDocumentHtml } from "@/hooks/useOfficialDocument";
import { useToast } from "@/hooks/use-toast";

const DOC_TYPE_OPTIONS = [
  { value: "certificate_employment", label: "تعريف بالعمل" },
  { value: "certificate_salary", label: "شهادة راتب" },
  { value: "certificate_experience", label: "شهادة خبرة" },
  { value: "leave_approval", label: "موافقة إجازة" },
  { value: "warning_letter", label: "خطاب إنذار" },
  { value: "contract", label: "عقد عمل" },
  { value: "hr_letter", label: "خطاب رسمي" },
  { value: "general", label: "مستند عام" },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requestDoc: any; // The request_documents row with employee_snapshot
  onGenerated?: () => void;
}

export default function GenerateFromRequestDialog({ open, onOpenChange, requestDoc, onGenerated }: Props) {
  const { companyId } = useCompany();
  const { data: company } = useCompanyBranding();
  const saveDoc = useSaveGeneratedDocument();
  const finalizeDoc = useFinalizeDocument();
  const releaseDoc = useReleaseDocument();
  const { toast } = useToast();

  const [docType, setDocType] = useState("certificate_employment");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [content, setContent] = useState("");
  const [step, setStep] = useState<"configure" | "preview" | "done">("configure");
  const [savedDocId, setSavedDocId] = useState<string | null>(null);

  // Load both tenant templates and system templates
  const { data: tenantTemplates = [] } = useQuery({
    queryKey: ["document-templates", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("document_templates").select("*").eq("company_id", companyId!).order("name");
      return data || [];
    },
    enabled: !!companyId && open,
  });

  const { data: systemTemplates = [] } = useQuery({
    queryKey: ["system-document-templates"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("system_document_templates").select("*").order("document_type");
      return data || [];
    },
    enabled: open,
  });

  // Get employee data - prefer employee_id from request_documents, then snapshot
  const employeeId = requestDoc?.employee_id || requestDoc?.employee_snapshot?.id || requestDoc?.requester_employee_id;
  const { data: employee } = useQuery({
    queryKey: ["employee-for-gen", employeeId],
    queryFn: async () => {
      const { data } = await supabase.from("employees").select("*, departments(name)").eq("id", employeeId!).single();
      return data;
    },
    enabled: !!employeeId && open,
  });

  // Auto-detect doc type from request type
  useEffect(() => {
    if (!requestDoc) return;
    const typeMap: Record<string, string> = {
      certificate_employment: "certificate_employment",
      certificate_salary: "certificate_salary",
      certificate_experience: "certificate_experience",
      leave: "leave_approval",
      leave_request: "leave_approval",
      attendance_correction: "hr_letter",
      contract: "contract",
    };
    const mapped = typeMap[requestDoc.request_type];
    if (mapped) setDocType(mapped);
  }, [requestDoc]);

  // Combine all available templates for the selected doc type
  const availableTemplates = [
    ...tenantTemplates.filter((t: any) => t.type === docType && t.is_active !== false).map((t: any) => ({ ...t, source: "tenant" })),
    ...systemTemplates.filter((t: any) => t.document_type === docType).map((t: any) => ({ id: `sys_${t.id}`, name: t.name_ar || t.name, content: t.body_template, type: t.document_type, source: "system" })),
  ];

  const buildReplacements = () => {
    const emp = employee || requestDoc?.employee_snapshot || {};
    const c = company as any || {};
    const reqData = requestDoc?.request_data || requestDoc?.metadata || {};
    const approvalHistory = Array.isArray(requestDoc?.approval_history) ? requestDoc.approval_history : [];
    const lastApproval = approvalHistory.length > 0 ? approvalHistory[approvalHistory.length - 1] : {};
    return {
      "{{employee_name}}": emp.name_ar || emp.name || "",
      "{{employee_code}}": emp.employee_code || "",
      "{{employee_id}}": emp.employee_code || "",
      "{{position}}": emp.position || emp.job_title || "",
      "{{employee_position}}": emp.position || emp.job_title || "",
      "{{employee_department}}": emp.department || emp.departments?.name || "",
      "{{department}}": emp.department || emp.departments?.name || "",
      "{{salary}}": (emp.basic_salary || emp.salary || 0).toLocaleString("ar-IQ"),
      "{{hire_date}}": emp.hire_date || "",
      "{{national_id}}": emp.national_id || "",
      "{{company_name}}": c.name_ar || c.name || "",
      "{{company_address}}": c.address || "",
      "{{date}}": new Date().toLocaleDateString("ar-IQ"),
      "{{issue_date}}": new Date().toLocaleDateString("ar-IQ"),
      "{{reference_number}}": requestDoc?.reference_number || "",
      "{{approval_date}}": lastApproval?.acted_at
        ? new Date(lastApproval.acted_at).toLocaleDateString("ar-IQ")
        : requestDoc?.finalized_at
        ? new Date(requestDoc.finalized_at).toLocaleDateString("ar-IQ")
        : new Date().toLocaleDateString("ar-IQ"),
      "{{signatory_name}}": c.signatory_name || "",
      "{{signatory_title}}": c.signatory_title || "",
      "{{currency}}": c.default_currency || "د.ع",
      // Leave-specific (from request_data or metadata)
      "{{leave_type}}": reqData.leave_type || "",
      "{{leave_start}}": reqData.start_date || "",
      "{{leave_end}}": reqData.end_date || "",
      "{{leave_days}}": reqData.days || reqData.leave_days || "",
      // Approval workflow data
      "{{approved_by}}": lastApproval?.actor_name || lastApproval?.approver_name || "",
      "{{approved_by_title}}": lastApproval?.actor_title || lastApproval?.approver_title || "",
      "{{request_type}}": requestDoc?.request_type || "",
      "{{request_notes}}": reqData.notes || reqData.reason || "",
    };
  };

  const handleLoadTemplate = () => {
    const tmpl = availableTemplates.find((t: any) => t.id === selectedTemplate);
    if (tmpl?.content) {
      let body = tmpl.content;
      const replacements = buildReplacements();
      Object.entries(replacements).forEach(([k, v]) => {
        body = body.split(k).join(v);
      });
      setContent(body);
    }
  };

  const handleGenerate = () => {
    if (!content.trim()) {
      // If no content, try to auto-generate from template
      if (selectedTemplate) {
        handleLoadTemplate();
      }
      return;
    }
    setStep("preview");
  };

  const handleSaveAndArchive = async () => {
    if (!employeeId) {
      toast({ title: "خطأ", description: "لم يتم تحديد الموظف المرتبط بهذا الطلب", variant: "destructive" });
      return;
    }
    try {
      const result = await saveDoc.mutateAsync({
        employeeId,
        documentType: docType,
        templateId: selectedTemplate?.startsWith("sys_") ? undefined : selectedTemplate || undefined,
        content,
        status: "approved",
        visibilityScope: "hr",
        metadata: {
          source_request_id: requestDoc?.id,
          source_request_type: requestDoc?.request_type,
          source_reference_number: requestDoc?.reference_number,
          auto_generated_from_request: true,
        },
      });
      const docId = (result as any)?.id;
      setSavedDocId(docId);
      toast({ title: "تم حفظ المستند في الأرشيف" });
      setStep("done");
      onGenerated?.();
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    }
  };

  const handleFinalizeAndRelease = async () => {
    if (!savedDocId) return;
    try {
      await finalizeDoc.mutateAsync(savedDocId);
      await releaseDoc.mutateAsync(savedDocId);
      toast({ title: "تم إنشاء PDF وإصداره للموظف" });
      onGenerated?.();
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    }
  };

  const handlePrint = () => {
    const html = buildOfficialDocumentHtml(company, content);
    const win = window.open("", "_blank");
    if (win) { win.document.write(html); win.document.close(); win.print(); }
  };

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setStep("configure");
      setContent("");
      setSelectedTemplate("");
      setSavedDocId(null);
    }
  }, [open]);

  const c = company as any;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            إنشاء مستند رسمي من الطلب
          </DialogTitle>
        </DialogHeader>

        {/* Request Info */}
        <div className="flex gap-2 flex-wrap text-sm bg-muted/50 rounded-lg p-3">
          <Badge variant="outline">{requestDoc?.reference_number}</Badge>
          <span className="text-muted-foreground">•</span>
          <span>{requestDoc?.employee_snapshot?.name_ar || "—"}</span>
          <span className="text-muted-foreground">•</span>
          <Badge variant="secondary" className="text-[10px]">{requestDoc?.request_type}</Badge>
        </div>

        {step === "configure" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                <Label>قالب ({availableTemplates.length} متاح)</Label>
                <div className="flex gap-2">
                  <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                    <SelectTrigger className="flex-1"><SelectValue placeholder="اختر قالب" /></SelectTrigger>
                    <SelectContent>
                      {availableTemplates.map((t: any) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name} {t.source === "system" ? "(نظام)" : "(مخصص)"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" onClick={handleLoadTemplate} disabled={!selectedTemplate}>
                    تحميل
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>محتوى المستند</Label>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="حمّل قالب أو اكتب المحتوى مباشرة... يتم استبدال حقول الدمج تلقائياً"
                className="min-h-[200px] text-sm leading-7"
                dir="rtl"
              />
            </div>

            <div className="flex gap-2">
              <Button className="flex-1 gap-2 font-heading" onClick={handleGenerate} disabled={!content.trim()}>
                <FileText className="h-4 w-4" />معاينة المستند
              </Button>
            </div>
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-4">
            <div className="border rounded-lg p-6 bg-background text-sm leading-8" dir="rtl"
              dangerouslySetInnerHTML={{
                __html: (() => {
                  let html = "";
                  if (c?.logo_url) html += `<div style="text-align:center;margin-bottom:8px"><img src="${c.logo_url}" style="max-height:60px" /></div>`;
                  html += `<h2 style="text-align:center;color:${c?.primary_color || "#1E3A8A"};font-size:18px">${c?.name_ar || c?.name || ""}</h2>`;
                  if (c?.header_template) html += `<p style="text-align:center;font-size:11px;color:#666">${c.header_template}</p>`;
                  html += `<hr style="margin:12px 0;border-color:${c?.primary_color || "#1E3A8A"}" />`;
                  html += content.replace(/\n/g, "<br/>");
                  if (c?.signatory_name) html += `<div style="margin-top:30px"><strong>${c.signatory_name}</strong><br/><span style="color:#666;font-size:12px">${c.signatory_title || ""}</span></div>`;
                  if (c?.stamp_url) html += `<div style="text-align:center;margin-top:16px"><img src="${c.stamp_url}" style="max-height:60px;opacity:0.6" /></div>`;
                  if (c?.footer_template) html += `<div style="margin-top:20px;border-top:2px solid ${c?.primary_color || "#1E3A8A"};padding-top:8px;text-align:center;font-size:10px;color:#888">${c.footer_template}</div>`;
                  return html;
                })(),
              }}
            />

            <Separator />

            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" className="gap-2 font-heading" onClick={() => setStep("configure")}>
                تعديل
              </Button>
              <Button variant="outline" className="gap-2 font-heading" onClick={handlePrint}>
                <Printer className="h-4 w-4" />طباعة
              </Button>
              <Button className="flex-1 gap-2 font-heading" onClick={handleSaveAndArchive} disabled={saveDoc.isPending}>
                <Archive className="h-4 w-4" />{saveDoc.isPending ? "جاري الحفظ..." : "حفظ في الأرشيف"}
              </Button>
            </div>
          </div>
        )}

        {step === "done" && (
          <div className="space-y-4 text-center py-4">
            <div className="text-primary text-4xl">✅</div>
            <p className="font-heading font-bold">تم حفظ المستند بنجاح</p>
            <p className="text-sm text-muted-foreground">يمكنك الآن إنشاء PDF نهائي وإرساله للموظف</p>

            <div className="flex gap-2 flex-wrap justify-center">
              <Button variant="outline" className="gap-2 font-heading" onClick={handlePrint}>
                <Printer className="h-4 w-4" />طباعة
              </Button>
              <Button className="gap-2 font-heading" onClick={handleFinalizeAndRelease}
                disabled={finalizeDoc.isPending || releaseDoc.isPending}>
                <ExternalLink className="h-4 w-4" />
                {finalizeDoc.isPending || releaseDoc.isPending ? "جاري المعالجة..." : "إنشاء PDF وإصدار للموظف"}
              </Button>
              <Button variant="ghost" className="font-heading" onClick={() => onOpenChange(false)}>
                إغلاق
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
