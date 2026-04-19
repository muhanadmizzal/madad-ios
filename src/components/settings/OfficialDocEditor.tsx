import { useState, useMemo } from "react";
import { Eye, Edit2, Copy, FileText, Palette, Type, AlignCenter, RotateCcw, Save, Printer, Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { useToast } from "@/hooks/use-toast";

const MERGE_FIELDS = [
  { key: "{{company_name}}", label: "اسم الشركة", cat: "company" },
  { key: "{{company_address}}", label: "عنوان الشركة", cat: "company" },
  { key: "{{employee_name}}", label: "اسم الموظف", cat: "employee" },
  { key: "{{employee_position}}", label: "المسمى الوظيفي", cat: "employee" },
  { key: "{{employee_department}}", label: "القسم", cat: "employee" },
  { key: "{{employee_id}}", label: "رقم الموظف", cat: "employee" },
  { key: "{{hire_date}}", label: "تاريخ التعيين", cat: "employee" },
  { key: "{{salary}}", label: "الراتب", cat: "employee" },
  { key: "{{currency}}", label: "العملة", cat: "company" },
  { key: "{{date}}", label: "تاريخ اليوم", cat: "doc" },
  { key: "{{reference_number}}", label: "رقم المرجع", cat: "doc" },
  { key: "{{approval_date}}", label: "تاريخ الموافقة", cat: "doc" },
  { key: "{{signatory_name}}", label: "اسم المفوض", cat: "signatory" },
  { key: "{{signatory_title}}", label: "منصب المفوض", cat: "signatory" },
  { key: "{{leave_type}}", label: "نوع الإجازة", cat: "leave" },
  { key: "{{leave_start}}", label: "بداية الإجازة", cat: "leave" },
  { key: "{{leave_end}}", label: "نهاية الإجازة", cat: "leave" },
  { key: "{{leave_days}}", label: "عدد أيام الإجازة", cat: "leave" },
];

const SAMPLE_DATA: Record<string, string> = {
  "{{company_name}}": "شركة تمكين",
  "{{company_address}}": "بغداد، العراق",
  "{{employee_name}}": "أحمد محمد علي",
  "{{employee_position}}": "مهندس برمجيات",
  "{{employee_department}}": "تقنية المعلومات",
  "{{employee_id}}": "EMP-0042",
  "{{hire_date}}": "2023-01-15",
  "{{salary}}": "1,500,000",
  "{{currency}}": "د.ع",
  "{{date}}": new Date().toLocaleDateString("ar-IQ"),
  "{{reference_number}}": "DOC-2603-0001",
  "{{approval_date}}": new Date().toLocaleDateString("ar-IQ"),
  "{{signatory_name}}": "مدير الموارد البشرية",
  "{{signatory_title}}": "مدير عام HR",
  "{{leave_type}}": "إجازة سنوية",
  "{{leave_start}}": "2024-06-01",
  "{{leave_end}}": "2024-06-15",
  "{{leave_days}}": "15",
};

const DOC_TYPES = [
  { value: "certificate_employment", label: "تعريف بالعمل" },
  { value: "certificate_salary", label: "شهادة راتب" },
  { value: "certificate_experience", label: "شهادة خبرة" },
  { value: "leave_approval", label: "موافقة إجازة" },
  { value: "warning_letter", label: "خطاب إنذار" },
  { value: "offer_letter", label: "عرض عمل" },
  { value: "contract", label: "عقد عمل" },
  { value: "hr_letter", label: "خطاب رسمي" },
  { value: "general", label: "مستند عام" },
  { value: "custom_blank", label: "قالب فارغ (مخصص)" },
];

interface TemplateStyle {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  pageMargin: number;
  headerAlign: "center" | "right" | "left";
  showLogo: boolean;
  showStamp: boolean;
  showSignatoryLine: boolean;
  showRefNumber: boolean;
  showDate: boolean;
  showBorder: boolean;
  borderStyle: "solid" | "double" | "dashed";
  headerColor: string;
  bodyColor: string;
  accentColor: string;
  headerBgColor: string;
  watermark: string;
}

const DEFAULT_STYLE: TemplateStyle = {
  fontFamily: "'Cairo', 'Noto Sans Arabic', sans-serif",
  fontSize: 14,
  lineHeight: 2.0,
  pageMargin: 40,
  headerAlign: "center",
  showLogo: true,
  showStamp: true,
  showSignatoryLine: true,
  showRefNumber: true,
  showDate: true,
  showBorder: true,
  borderStyle: "solid",
  headerColor: "#1E3A5E",
  bodyColor: "#1a1a1a",
  accentColor: "#957662",
  headerBgColor: "transparent",
  watermark: "",
};

export default function OfficialDocEditor() {
  const { companyId } = useCompany();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [selectedType, setSelectedType] = useState("certificate_employment");
  const [editMode, setEditMode] = useState(false);
  const [fullPreview, setFullPreview] = useState(false);
  const [newFormDialog, setNewFormDialog] = useState(false);
  const [newFormName, setNewFormName] = useState("");

  // Template content
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [style, setStyle] = useState<TemplateStyle>(DEFAULT_STYLE);

  const { data: company } = useQuery({
    queryKey: ["company-branding-editor", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("companies").select("*").eq("id", companyId!).single();
      return data;
    },
    enabled: !!companyId,
  });

  const { data: systemTemplates = [] } = useQuery({
    queryKey: ["system-document-templates-editor"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("system_document_templates").select("*").order("document_type");
      return data || [];
    },
  });

  const { data: tenantTemplates = [] } = useQuery({
    queryKey: ["document-templates-editor", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("document_templates").select("*").eq("company_id", companyId!);
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: signatories = [] } = useQuery({
    queryKey: ["signatories-editor", companyId],
    queryFn: async () => {
      const { data } = await (supabase as any).from("company_signatories").select("*").eq("company_id", companyId!).eq("is_active", true).order("sort_order");
      return data || [];
    },
    enabled: !!companyId,
  });

  const loadTemplate = (docType: string) => {
    const tenant = tenantTemplates.find((t: any) => t.type === docType && t.is_active !== false);
    const system = systemTemplates.find((t: any) => t.document_type === docType);

    if (tenant) {
      setTitle(tenant.name);
      setBody(tenant.content);
      try {
        const meta = tenant.merge_fields?.find?.((f: string) => f.startsWith("{style:"));
        if (meta) setStyle({ ...DEFAULT_STYLE, ...JSON.parse(meta.replace("{style:", "").replace("}", "")) });
        else setStyle({ ...DEFAULT_STYLE, headerColor: company?.primary_color || DEFAULT_STYLE.headerColor });
      } catch {
        setStyle({ ...DEFAULT_STYLE, headerColor: company?.primary_color || DEFAULT_STYLE.headerColor });
      }
    } else if (docType === "custom_blank") {
      setTitle("عنوان المستند");
      setBody("بسم الله الرحمن الرحيم\n\nالسيد / {{employee_name}} المحترم\n\nالموضوع: ............\n\nتحية طيبة وبعد،\n\nنود إعلامكم بـ ............\n\n............\n\nمع التقدير،\n{{signatory_name}}\n{{signatory_title}}");
      setStyle({ ...DEFAULT_STYLE, headerColor: company?.primary_color || DEFAULT_STYLE.headerColor });
    } else if (system) {
      setTitle(system.title_template || system.name_ar || system.name);
      setBody(system.body_template || "");
      setStyle({ ...DEFAULT_STYLE, headerColor: company?.primary_color || DEFAULT_STYLE.headerColor });
    } else {
      setTitle(DOC_TYPES.find(d => d.value === docType)?.label || docType);
      setBody("");
      setStyle({ ...DEFAULT_STYLE, headerColor: company?.primary_color || DEFAULT_STYLE.headerColor });
    }
    setSelectedType(docType);
    setEditMode(true);
  };

  const getIsCustomized = (docType: string) => !!tenantTemplates.find((t: any) => t.type === docType && t.is_active !== false);

  // Custom user-created templates (type starts with "custom_")
  const userCustomTemplates = tenantTemplates.filter((t: any) => 
    t.type?.startsWith("custom_user_") && t.is_active !== false
  );

  const createNewForm = useMutation({
    mutationFn: async () => {
      const slug = `custom_user_${Date.now()}`;
      const defaultBody = "بسم الله الرحمن الرحيم\n\nالسيد / {{employee_name}} المحترم\n\nالموضوع: " + newFormName + "\n\nتحية طيبة وبعد،\n\n............\n\nمع التقدير،\n{{signatory_name}}\n{{signatory_title}}";
      const { error } = await supabase.from("document_templates").insert({
        company_id: companyId!, name: newFormName, type: slug, content: defaultBody, is_active: true,
      });
      if (error) throw error;
      return slug;
    },
    onSuccess: (slug) => {
      qc.invalidateQueries({ queryKey: ["document-templates-editor"] });
      qc.invalidateQueries({ queryKey: ["document-templates"] });
      toast({ title: "تم إنشاء القالب الجديد" });
      setNewFormDialog(false);
      setNewFormName("");
      // Open it for editing after a short delay for data refresh
      setTimeout(() => loadTemplate(slug), 500);
    },
    onError: (e: Error) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });

  const deleteCustomForm = useMutation({
    mutationFn: async (templateId: string) => {
      const { error } = await supabase.from("document_templates").delete().eq("id", templateId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["document-templates-editor"] });
      qc.invalidateQueries({ queryKey: ["document-templates"] });
      toast({ title: "تم حذف القالب" });
      setEditMode(false);
    },
  });

  const saveTemplate = useMutation({
    mutationFn: async () => {
      const existing = tenantTemplates.find((t: any) => t.type === selectedType);
      const mergeFields = MERGE_FIELDS.filter(f => body.includes(f.key)).map(f => f.key);
      // Store style as metadata in merge_fields array
      mergeFields.push(`{style:${JSON.stringify(style)}}`);

      if (existing) {
        const { error } = await supabase.from("document_templates")
          .update({ name: title, content: body, merge_fields: mergeFields, updated_at: new Date().toISOString() })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("document_templates").insert({
          company_id: companyId!, name: title, type: selectedType, content: body,
          merge_fields: mergeFields, is_active: true,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["document-templates-editor"] });
      qc.invalidateQueries({ queryKey: ["document-templates"] });
      toast({ title: "تم حفظ القالب الرسمي" });
    },
    onError: (e: Error) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });

  const resetToDefault = useMutation({
    mutationFn: async () => {
      const existing = tenantTemplates.find((t: any) => t.type === selectedType);
      if (existing) {
        const { error } = await supabase.from("document_templates").delete().eq("id", existing.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["document-templates-editor"] });
      qc.invalidateQueries({ queryKey: ["document-templates"] });
      toast({ title: "تم الإرجاع للقالب الافتراضي" });
      loadTemplate(selectedType);
    },
  });

  // Build live preview HTML
  const previewHtml = useMemo(() => {
    let content = body;
    Object.entries(SAMPLE_DATA).forEach(([k, v]) => { content = content.split(k).join(v); });

    const s = style;
    const c = company || {} as any;

    return `
      <div style="font-family:${s.fontFamily};font-size:${s.fontSize}px;line-height:${s.lineHeight};color:${s.bodyColor};padding:${s.pageMargin}px;position:relative;${s.showBorder ? `border:2px ${s.borderStyle} ${s.headerColor};border-radius:4px;` : ""}">
        ${s.watermark ? `<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-30deg);font-size:60px;opacity:0.04;color:${s.headerColor};white-space:nowrap;pointer-events:none">${s.watermark}</div>` : ""}
        <div style="text-align:${s.headerAlign};padding-bottom:12px;border-bottom:3px solid ${s.headerColor};margin-bottom:16px;${s.headerBgColor !== "transparent" ? `background:${s.headerBgColor};padding:16px;border-radius:4px 4px 0 0;` : ""}">
          ${s.showLogo && c.logo_url ? `<img src="${c.logo_url}" style="max-height:70px;margin-bottom:8px" />` : ""}
          <h2 style="color:${s.headerColor};font-size:${s.fontSize + 6}px;margin:4px 0">${c.name_ar || c.name || "اسم الشركة"}</h2>
          ${c.header_template ? `<div style="font-size:11px;color:#888">${c.header_template}</div>` : ""}
          ${c.registration_number ? `<div style="font-size:10px;color:#aaa">سجل: ${c.registration_number}</div>` : ""}
        </div>
        ${s.showRefNumber || s.showDate ? `
          <div style="display:flex;justify-content:space-between;font-size:12px;color:#888;margin-bottom:12px">
            ${s.showRefNumber ? `<span>رقم المرجع: <strong>${SAMPLE_DATA["{{reference_number}}"]}</strong></span>` : "<span></span>"}
            ${s.showDate ? `<span>التاريخ: ${SAMPLE_DATA["{{date}}"]}</span>` : ""}
          </div>
        ` : ""}
        <h3 style="text-align:center;color:${s.headerColor};font-size:${s.fontSize + 2}px;margin:16px 0;text-decoration:underline;text-decoration-color:${s.accentColor}">${title}</h3>
        <div style="min-height:200px;white-space:pre-line;padding:8px 0">${content.replace(/\n/g, "<br/>")}</div>
        ${s.showSignatoryLine ? `
          <div style="margin-top:40px;display:flex;justify-content:space-between;align-items:flex-end">
            <div>
              <div style="border-top:1px solid #ccc;width:200px;margin-bottom:4px"></div>
              <strong>${signatories[0]?.name_ar || signatories[0]?.name || c.signatory_name || SAMPLE_DATA["{{signatory_name}}"]}</strong><br/>
              <span style="font-size:12px;color:#666">${signatories[0]?.role_ar || signatories[0]?.role || c.signatory_title || SAMPLE_DATA["{{signatory_title}}"]}</span>
            </div>
            ${s.showStamp && c.stamp_url ? `<img src="${c.stamp_url}" style="max-height:70px;opacity:0.6" />` : ""}
          </div>
        ` : ""}
        ${c.footer_template ? `<div style="margin-top:24px;border-top:2px solid ${s.headerColor};padding-top:8px;text-align:center;font-size:10px;color:#888">${c.footer_template}</div>` : `
          <div style="margin-top:24px;border-top:2px solid ${s.headerColor};padding-top:8px;text-align:center;font-size:10px;color:#888">
            ${[c.address, c.phone, c.email, c.website].filter(Boolean).join(" | ")}
          </div>
        `}
      </div>
    `;
  }, [body, title, style, company, signatories]);

  const handlePrintPreview = () => {
    const win = window.open("", "_blank");
    if (win) {
      win.document.write(`<html dir="rtl"><head><meta charset="utf-8"><style>* { margin:0;padding:0;box-sizing:border-box } body { padding:0 } @media print { @page { margin:1.5cm } }</style></head><body>${previewHtml}</body></html>`);
      win.document.close();
      win.print();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-heading font-bold text-lg flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          محرر المستندات الرسمية
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          تخصيص كامل لتنسيق وأسلوب المستندات الرسمية التي تُصدر للموظفين بعد الموافقة النهائية.
          هذه المستندات منفصلة عن سجلات الموافقات.
        </p>
      </div>

      {/* Document Type Selector */}
      {!editMode ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {DOC_TYPES.map(dt => {
              const customized = getIsCustomized(dt.value);
              return (
                <Card key={dt.value} className={`cursor-pointer hover:shadow-md transition-shadow ${customized ? "border-primary/30" : ""}`}
                  onClick={() => loadTemplate(dt.value)}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${customized ? "bg-primary/10" : "bg-muted"}`}>
                        <FileText className={`h-4 w-4 ${customized ? "text-primary" : "text-muted-foreground"}`} />
                      </div>
                      <div>
                        <p className="font-heading font-bold text-sm">{dt.label}</p>
                        <p className="text-[10px] text-muted-foreground">{dt.value}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={customized ? "default" : "secondary"} className="text-[10px]">
                        {customized ? "مخصص" : "افتراضي"}
                      </Badge>
                      <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {/* User-created custom templates */}
            {userCustomTemplates.map((ct: any) => (
              <Card key={ct.id} className="cursor-pointer hover:shadow-md transition-shadow border-accent/30"
                onClick={() => loadTemplate(ct.type)}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-accent/10">
                      <FileText className="h-4 w-4 text-accent-foreground" />
                    </div>
                    <div>
                      <p className="font-heading font-bold text-sm">{ct.name}</p>
                      <p className="text-[10px] text-muted-foreground">قالب مخصص</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="default" className="text-[10px]">مخصص</Badge>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => {
                      e.stopPropagation();
                      deleteCustomForm.mutate(ct.id);
                    }}>
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Add New Form Card */}
            <Card className="cursor-pointer hover:shadow-md transition-shadow border-dashed border-2 border-muted-foreground/20 hover:border-primary/40"
              onClick={() => setNewFormDialog(true)}>
              <CardContent className="p-4 flex items-center justify-center gap-2 text-muted-foreground hover:text-primary transition-colors min-h-[72px]">
                <Plus className="h-5 w-5" />
                <span className="font-heading font-bold text-sm">إضافة قالب جديد</span>
              </CardContent>
            </Card>
          </div>

          {/* New Form Dialog */}
          <Dialog open={newFormDialog} onOpenChange={setNewFormDialog}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="font-heading">إنشاء قالب مستند جديد</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>اسم القالب</Label>
                  <Input value={newFormName} onChange={e => setNewFormName(e.target.value)} placeholder="مثال: إشعار ترقية، خطاب تكليف..." dir="rtl" />
                </div>
                <Button className="w-full" onClick={() => createNewForm.mutate()} disabled={!newFormName.trim() || createNewForm.isPending}>
                  {createNewForm.isPending ? "جاري الإنشاء..." : "إنشاء وتحرير القالب"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Toolbar */}
          <div className="flex items-center justify-between flex-wrap gap-2 bg-muted/40 p-3 rounded-lg">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setEditMode(false)} className="gap-1 text-xs">← رجوع</Button>
              <Separator orientation="vertical" className="h-6" />
              <span className="font-heading font-bold text-sm">
                {DOC_TYPES.find(d => d.value === selectedType)?.label || 
                 tenantTemplates.find((t: any) => t.type === selectedType)?.name || 
                 selectedType}
              </span>
              {getIsCustomized(selectedType) && <Badge className="text-[10px]">مخصص</Badge>}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={handlePrintPreview}>
                <Printer className="h-3 w-3" />طباعة تجريبية
              </Button>
              <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => setFullPreview(true)}>
                <Eye className="h-3 w-3" />معاينة كاملة
              </Button>
              {getIsCustomized(selectedType) && !selectedType.startsWith("custom_user_") && (
                <Button variant="outline" size="sm" className="gap-1 text-xs text-destructive" onClick={() => resetToDefault.mutate()}>
                  <RotateCcw className="h-3 w-3" />إرجاع للافتراضي
                </Button>
              )}
              {selectedType.startsWith("custom_user_") && (
                <Button variant="outline" size="sm" className="gap-1 text-xs text-destructive" onClick={() => {
                  const ct = tenantTemplates.find((t: any) => t.type === selectedType);
                  if (ct) deleteCustomForm.mutate(ct.id);
                }}>
                  <Trash2 className="h-3 w-3" />حذف القالب
                </Button>
              )}
              <Button size="sm" className="gap-1 text-xs" onClick={() => saveTemplate.mutate()} disabled={saveTemplate.isPending}>
                <Save className="h-3 w-3" />{saveTemplate.isPending ? "جاري الحفظ..." : "حفظ القالب"}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Left: Editor */}
            <div className="space-y-4">
              <Tabs defaultValue="content">
                <TabsList className="w-full">
                  <TabsTrigger value="content" className="flex-1 gap-1 text-xs"><Type className="h-3 w-3" />المحتوى</TabsTrigger>
                  <TabsTrigger value="style" className="flex-1 gap-1 text-xs"><Palette className="h-3 w-3" />التنسيق</TabsTrigger>
                  <TabsTrigger value="layout" className="flex-1 gap-1 text-xs"><AlignCenter className="h-3 w-3" />التخطيط</TabsTrigger>
                </TabsList>

                <TabsContent value="content" className="space-y-3 mt-3">
                  <div className="space-y-2">
                    <Label className="text-xs">عنوان المستند</Label>
                    <Input value={title} onChange={e => setTitle(e.target.value)} className="font-heading" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">نص المستند</Label>
                    <Textarea value={body} onChange={e => setBody(e.target.value)} rows={14} className="text-sm" dir="rtl" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] text-muted-foreground">المتغيرات — انقر للإدراج:</Label>
                    <div className="space-y-1.5">
                      {["employee", "company", "doc", "signatory", "leave"].map(cat => {
                        const fields = MERGE_FIELDS.filter(f => f.cat === cat);
                        const catLabels: Record<string, string> = { employee: "الموظف", company: "الشركة", doc: "المستند", signatory: "المفوض", leave: "الإجازة" };
                        return (
                          <div key={cat}>
                            <span className="text-[9px] font-heading text-muted-foreground">{catLabels[cat]}</span>
                            <div className="flex flex-wrap gap-1 mt-0.5">
                              {fields.map(f => (
                                <Badge key={f.key} variant="outline" className="cursor-pointer hover:bg-primary/10 text-[10px] transition-colors"
                                  onClick={() => setBody(prev => prev + " " + f.key)}>
                                  <Copy className="h-2 w-2 ml-1" />{f.label}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="style" className="space-y-4 mt-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs">لون الترويسة</Label>
                      <div className="flex gap-2">
                        <Input type="color" value={style.headerColor} onChange={e => setStyle(s => ({ ...s, headerColor: e.target.value }))} className="w-10 h-8 p-0.5" />
                        <Input value={style.headerColor} onChange={e => setStyle(s => ({ ...s, headerColor: e.target.value }))} className="text-xs" dir="ltr" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">لون التمييز</Label>
                      <div className="flex gap-2">
                        <Input type="color" value={style.accentColor} onChange={e => setStyle(s => ({ ...s, accentColor: e.target.value }))} className="w-10 h-8 p-0.5" />
                        <Input value={style.accentColor} onChange={e => setStyle(s => ({ ...s, accentColor: e.target.value }))} className="text-xs" dir="ltr" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">لون النص</Label>
                      <div className="flex gap-2">
                        <Input type="color" value={style.bodyColor} onChange={e => setStyle(s => ({ ...s, bodyColor: e.target.value }))} className="w-10 h-8 p-0.5" />
                        <Input value={style.bodyColor} onChange={e => setStyle(s => ({ ...s, bodyColor: e.target.value }))} className="text-xs" dir="ltr" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">خلفية الترويسة</Label>
                      <div className="flex gap-2">
                        <Input type="color" value={style.headerBgColor === "transparent" ? "#ffffff" : style.headerBgColor}
                          onChange={e => setStyle(s => ({ ...s, headerBgColor: e.target.value }))} className="w-10 h-8 p-0.5" />
                        <Button variant="ghost" size="sm" className="text-[10px] h-8" onClick={() => setStyle(s => ({ ...s, headerBgColor: "transparent" }))}>شفاف</Button>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">حجم الخط: {style.fontSize}px</Label>
                    <Slider value={[style.fontSize]} onValueChange={([v]) => setStyle(s => ({ ...s, fontSize: v }))} min={11} max={20} step={1} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">ارتفاع السطر: {style.lineHeight}</Label>
                    <Slider value={[style.lineHeight * 10]} onValueChange={([v]) => setStyle(s => ({ ...s, lineHeight: v / 10 }))} min={14} max={30} step={1} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">العلامة المائية</Label>
                    <Input value={style.watermark} onChange={e => setStyle(s => ({ ...s, watermark: e.target.value }))} placeholder="مثال: سري، نسخة أصلية..." />
                  </div>
                </TabsContent>

                <TabsContent value="layout" className="space-y-4 mt-3">
                  <div className="space-y-2">
                    <Label className="text-xs">هوامش الصفحة: {style.pageMargin}px</Label>
                    <Slider value={[style.pageMargin]} onValueChange={([v]) => setStyle(s => ({ ...s, pageMargin: v }))} min={20} max={80} step={5} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">محاذاة الترويسة</Label>
                    <Select value={style.headerAlign} onValueChange={(v: any) => setStyle(s => ({ ...s, headerAlign: v }))}>
                      <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="center">وسط</SelectItem>
                        <SelectItem value="right">يمين</SelectItem>
                        <SelectItem value="left">يسار</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-3">
                    <Label className="text-xs font-heading">عناصر المستند</Label>
                    {[
                      { key: "showLogo", label: "شعار الشركة" },
                      { key: "showStamp", label: "ختم الشركة" },
                      { key: "showSignatoryLine", label: "خانة التوقيع" },
                      { key: "showRefNumber", label: "رقم المرجع" },
                      { key: "showDate", label: "التاريخ" },
                      { key: "showBorder", label: "إطار الصفحة" },
                    ].map(item => (
                      <div key={item.key} className="flex items-center justify-between">
                        <span className="text-xs">{item.label}</span>
                        <Switch checked={(style as any)[item.key]} onCheckedChange={v => setStyle(s => ({ ...s, [item.key]: v }))} />
                      </div>
                    ))}
                  </div>
                  {style.showBorder && (
                    <div className="space-y-2">
                      <Label className="text-xs">نمط الإطار</Label>
                      <Select value={style.borderStyle} onValueChange={(v: any) => setStyle(s => ({ ...s, borderStyle: v }))}>
                        <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="solid">خط متصل</SelectItem>
                          <SelectItem value="double">خط مزدوج</SelectItem>
                          <SelectItem value="dashed">خط متقطع</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>

            {/* Right: Live Preview */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">معاينة مباشرة (بيانات تجريبية)</Label>
              <div className="border rounded-lg bg-white overflow-auto max-h-[700px] shadow-sm">
                <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Full Preview Dialog */}
      <Dialog open={fullPreview} onOpenChange={setFullPreview}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-heading">معاينة المستند الرسمي</DialogTitle></DialogHeader>
          <div className="bg-white rounded-lg shadow-sm border" dangerouslySetInnerHTML={{ __html: previewHtml }} />
          <div className="flex gap-2">
            <Button className="flex-1 gap-2" onClick={handlePrintPreview}><Printer className="h-4 w-4" />طباعة</Button>
            <Button variant="outline" className="flex-1 gap-2" onClick={() => setFullPreview(false)}>إغلاق</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
