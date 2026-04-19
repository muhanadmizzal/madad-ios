import { useState } from "react";
import { Plus, Edit2, Trash2, Eye, Copy, ToggleLeft, ToggleRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";

const MERGE_FIELDS = [
  { key: "{{employee_name}}", label: "اسم الموظف" },
  { key: "{{employee_code}}", label: "كود الموظف" },
  { key: "{{employee_id}}", label: "رقم الموظف" },
  { key: "{{position}}", label: "المسمى الوظيفي" },
  { key: "{{department}}", label: "القسم" },
  { key: "{{salary}}", label: "الراتب" },
  { key: "{{net_salary}}", label: "صافي الراتب" },
  { key: "{{hire_date}}", label: "تاريخ التعيين" },
  { key: "{{company_name}}", label: "اسم الشركة" },
  { key: "{{company_logo}}", label: "شعار الشركة" },
  { key: "{{company_stamp}}", label: "ختم الشركة" },
  { key: "{{date}}", label: "تاريخ اليوم" },
  { key: "{{issue_date}}", label: "تاريخ الإصدار" },
  { key: "{{national_id}}", label: "رقم الهوية" },
  { key: "{{company_address}}", label: "عنوان الشركة" },
  { key: "{{signatory_name}}", label: "اسم المفوض" },
  { key: "{{signatory_title}}", label: "منصب المفوض" },
];

const TYPE_LABELS: Record<string, string> = {
  letter: "خطاب",
  contract: "عقد",
  certificate: "شهادة",
  form: "نموذج",
  payslip: "كشف راتب",
  warning: "إنذار",
};

interface Props {
  templates: any[];
}

export default function TemplateManager({ templates }: Props) {
  const { companyId } = useCompany();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [editDialog, setEditDialog] = useState(false);
  const [previewDialog, setPreviewDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [previewContent, setPreviewContent] = useState("");

  // Form state
  const [name, setName] = useState("");
  const [type, setType] = useState("letter");
  const [content, setContent] = useState("");
  const [isActive, setIsActive] = useState(true);

  const resetForm = () => {
    setName("");
    setType("letter");
    setContent("");
    setIsActive(true);
    setEditingTemplate(null);
  };

  const openCreate = () => {
    resetForm();
    setEditDialog(true);
  };

  const openEdit = (t: any) => {
    setEditingTemplate(t);
    setName(t.name);
    setType(t.type);
    setContent(t.content);
    setIsActive(t.is_active !== false);
    setEditDialog(true);
  };

  const openPreview = (t: any) => {
    // Replace placeholders with sample values
    let preview = t.content;
    const samples: Record<string, string> = {
      "{{employee_name}}": "أحمد محمد علي",
      "{{employee_code}}": "EMP-0042",
      "{{employee_id}}": "EMP-0042",
      "{{position}}": "مهندس برمجيات",
      "{{department}}": "تقنية المعلومات",
      "{{salary}}": "1,500,000",
      "{{net_salary}}": "1,350,000",
      "{{hire_date}}": "2023-01-15",
      "{{company_name}}": "شركة تمكين",
      "{{date}}": new Date().toLocaleDateString("ar-IQ"),
      "{{issue_date}}": new Date().toLocaleDateString("ar-IQ"),
      "{{national_id}}": "12345678901",
      "{{company_address}}": "بغداد، العراق",
      "{{signatory_name}}": "مدير عام الشركة",
      "{{signatory_title}}": "المدير العام",
    };
    Object.entries(samples).forEach(([k, v]) => {
      preview = preview.replaceAll(k, v);
    });
    setPreviewContent(preview);
    setPreviewDialog(true);
  };

  const saveTemplate = useMutation({
    mutationFn: async () => {
      const mergeFields = MERGE_FIELDS.filter(f => content.includes(f.key)).map(f => f.key);
      if (editingTemplate) {
        const { error } = await supabase
          .from("document_templates")
          .update({ name, type, content, merge_fields: mergeFields, is_active: isActive, updated_at: new Date().toISOString() })
          .eq("id", editingTemplate.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("document_templates")
          .insert({ company_id: companyId!, name, type, content, merge_fields: mergeFields, is_active: isActive });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["document-templates"] });
      toast({ title: editingTemplate ? "تم تحديث القالب" : "تم حفظ القالب" });
      setEditDialog(false);
      resetForm();
    },
    onError: (err: Error) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("document_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["document-templates"] });
      toast({ title: "تم حذف القالب" });
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("document_templates").update({ is_active: active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["document-templates"] });
    },
  });

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-muted-foreground">{templates.length} قالب</p>
        <Button className="gap-2 font-heading" onClick={openCreate}><Plus className="h-4 w-4" />قالب جديد</Button>
      </div>

      {templates.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((t: any) => (
            <Card key={t.id} className={t.is_active === false ? "opacity-60" : ""}>
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-heading font-bold">{t.name}</h3>
                    <Badge variant="outline" className="mt-1">{TYPE_LABELS[t.type] || t.type}</Badge>
                  </div>
                  <Badge variant={t.is_active !== false ? "default" : "secondary"} className="text-[10px]">
                    {t.is_active !== false ? "نشط" : "معطل"}
                  </Badge>
                </div>
                {t.merge_fields?.length > 0 && (
                  <p className="text-xs text-muted-foreground">{t.merge_fields.length} حقل دمج</p>
                )}
                <p className="text-sm text-muted-foreground line-clamp-3">{t.content}</p>
                <div className="flex gap-1 pt-1">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openPreview(t)} title="معاينة"><Eye className="h-3.5 w-3.5" /></Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(t)} title="تعديل"><Edit2 className="h-3.5 w-3.5" /></Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => toggleActive.mutate({ id: t.id, active: t.is_active === false })} title={t.is_active !== false ? "تعطيل" : "تفعيل"}>
                    {t.is_active !== false ? <ToggleRight className="h-3.5 w-3.5 text-primary" /> : <ToggleLeft className="h-3.5 w-3.5" />}
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteTemplate.mutate(t.id)} title="حذف"><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card><CardContent className="py-16 text-center text-muted-foreground font-heading">لا توجد قوالب — أنشئ قالب جديد</CardContent></Card>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading">{editingTemplate ? "تعديل القالب" : "إنشاء قالب جديد"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>اسم القالب</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: شهادة خبرة" />
              </div>
              <div className="space-y-2">
                <Label>النوع</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>المحتوى</Label>
              <Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={12} placeholder="اكتب محتوى القالب..." className="font-mono text-sm" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">حقول الدمج (انقر للإدراج):</Label>
              <div className="flex flex-wrap gap-1.5">
                {MERGE_FIELDS.map(f => (
                  <Badge key={f.key} variant="outline" className="cursor-pointer hover:bg-primary/10 text-[11px] transition-colors"
                    onClick={() => setContent(prev => prev + f.key)}>
                    <Copy className="h-2.5 w-2.5 ml-1" />{f.label}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Label>حالة القالب:</Label>
              <Badge variant={isActive ? "default" : "secondary"} className="cursor-pointer" onClick={() => setIsActive(!isActive)}>
                {isActive ? "نشط" : "معطل"}
              </Badge>
            </div>
            <Button className="w-full font-heading" onClick={() => saveTemplate.mutate()} disabled={!name || !content || saveTemplate.isPending}>
              {saveTemplate.isPending ? "جاري الحفظ..." : editingTemplate ? "تحديث القالب" : "حفظ القالب"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewDialog} onOpenChange={setPreviewDialog}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-heading">معاينة القالب (بيانات تجريبية)</DialogTitle></DialogHeader>
          <div className="p-6 bg-card border rounded-lg whitespace-pre-wrap text-sm leading-relaxed min-h-[200px]" dir="rtl">
            {previewContent}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
