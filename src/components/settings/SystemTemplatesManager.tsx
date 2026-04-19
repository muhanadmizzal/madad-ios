import { useState } from "react";
import { Eye, Edit2, Copy, FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { useToast } from "@/hooks/use-toast";

const MERGE_FIELDS = [
  { key: "{{company_name}}", label: "اسم الشركة" },
  { key: "{{company_address}}", label: "عنوان الشركة" },
  { key: "{{employee_name}}", label: "اسم الموظف" },
  { key: "{{employee_position}}", label: "المسمى الوظيفي" },
  { key: "{{employee_department}}", label: "القسم" },
  { key: "{{employee_id}}", label: "رقم الموظف" },
  { key: "{{hire_date}}", label: "تاريخ التعيين" },
  { key: "{{salary}}", label: "الراتب" },
  { key: "{{currency}}", label: "العملة" },
  { key: "{{date}}", label: "تاريخ اليوم" },
  { key: "{{end_date}}", label: "تاريخ الانتهاء" },
  { key: "{{leave_type}}", label: "نوع الإجازة" },
  { key: "{{leave_start}}", label: "بداية الإجازة" },
  { key: "{{leave_end}}", label: "نهاية الإجازة" },
  { key: "{{leave_days}}", label: "عدد أيام الإجازة" },
  { key: "{{approval_date}}", label: "تاريخ الموافقة" },
  { key: "{{signatory_name}}", label: "اسم المفوض" },
  { key: "{{signatory_title}}", label: "منصب المفوض" },
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
  "{{end_date}}": new Date().toLocaleDateString("ar-IQ"),
  "{{leave_type}}": "إجازة سنوية",
  "{{leave_start}}": "2024-06-01",
  "{{leave_end}}": "2024-06-15",
  "{{leave_days}}": "15",
  "{{approval_date}}": new Date().toLocaleDateString("ar-IQ"),
  "{{signatory_name}}": "مدير الموارد البشرية",
  "{{signatory_title}}": "مدير عام HR",
};

export default function SystemTemplatesManager() {
  const { companyId } = useCompany();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [editDialog, setEditDialog] = useState(false);
  const [previewDialog, setPreviewDialog] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [footer, setFooter] = useState("");
  const [previewContent, setPreviewContent] = useState("");

  // System templates (defaults)
  const { data: systemTemplates = [] } = useQuery({
    queryKey: ["system-document-templates"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("system_document_templates").select("*").order("document_type");
      return data || [];
    },
  });

  // Tenant overrides via document_templates
  const { data: tenantTemplates = [] } = useQuery({
    queryKey: ["document-templates", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("document_templates").select("*").eq("company_id", companyId!);
      return data || [];
    },
    enabled: !!companyId,
  });

  const getEffectiveTemplate = (docType: string) => {
    const tenant = tenantTemplates.find((t: any) => t.type === docType && t.is_active !== false);
    const system = systemTemplates.find((t: any) => t.document_type === docType);
    return { tenant, system, isCustomized: !!tenant };
  };

  const openEdit = (docType: string) => {
    const { tenant, system } = getEffectiveTemplate(docType);
    setEditing({ docType, tenantId: tenant?.id, systemName: system?.name_ar || system?.name });
    setTitle(tenant?.name || system?.title_template || "");
    setBody(tenant?.content || system?.body_template || "");
    setFooter("");
    setEditDialog(true);
  };

  const openPreview = (docType: string) => {
    const { tenant, system } = getEffectiveTemplate(docType);
    let content = tenant?.content || system?.body_template || "";
    Object.entries(SAMPLE_DATA).forEach(([k, v]) => { content = content.replaceAll(k, v); });
    setPreviewContent(content);
    setPreviewDialog(true);
  };

  const saveOverride = useMutation({
    mutationFn: async () => {
      if (editing.tenantId) {
        const { error } = await supabase.from("document_templates")
          .update({ name: title, content: body, updated_at: new Date().toISOString() })
          .eq("id", editing.tenantId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("document_templates").insert({
          company_id: companyId!, name: title, type: editing.docType, content: body, is_active: true,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["document-templates"] });
      toast({ title: "تم حفظ القالب المخصص" });
      setEditDialog(false);
    },
    onError: (err: Error) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  const resetToDefault = useMutation({
    mutationFn: async (tenantId: string) => {
      const { error } = await supabase.from("document_templates").delete().eq("id", tenantId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["document-templates"] });
      toast({ title: "تم إعادة التعيين للقالب الافتراضي" });
    },
  });

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-heading font-semibold text-lg flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          قوالب المستندات الرسمية
        </h3>
        <p className="text-sm text-muted-foreground">تخصيص نصوص الشهادات والخطابات الرسمية. يستخدم النظام القالب المخصص إذا وُجد، وإلا القالب الافتراضي.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {systemTemplates.map((st: any) => {
          const { isCustomized, tenant } = getEffectiveTemplate(st.document_type);
          return (
            <Card key={st.id} className={isCustomized ? "border-primary/30" : ""}>
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-heading font-bold text-sm">{st.name_ar || st.name}</h4>
                    <p className="text-xs text-muted-foreground mt-1">{st.name}</p>
                  </div>
                  <Badge variant={isCustomized ? "default" : "secondary"} className="text-[10px]">
                    {isCustomized ? "مخصص" : "افتراضي"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-3">
                  {(isCustomized ? tenant.content : st.body_template || "").substring(0, 120)}...
                </p>
                <div className="flex gap-1 pt-1">
                  <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs" onClick={() => openPreview(st.document_type)}>
                    <Eye className="h-3 w-3" /> معاينة
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs" onClick={() => openEdit(st.document_type)}>
                    <Edit2 className="h-3 w-3" /> تخصيص
                  </Button>
                  {isCustomized && (
                    <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs text-destructive"
                      onClick={() => resetToDefault.mutate(tenant.id)}>
                      إعادة تعيين
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading">تخصيص قالب: {editing?.systemName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>عنوان المستند</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>نص المستند</Label>
              <Textarea value={body} onChange={e => setBody(e.target.value)} rows={10} className="font-mono text-sm" dir="rtl" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">المتغيرات المتاحة (انقر للإدراج):</Label>
              <div className="flex flex-wrap gap-1.5">
                {MERGE_FIELDS.map(f => (
                  <Badge key={f.key} variant="outline" className="cursor-pointer hover:bg-primary/10 text-[10px] transition-colors"
                    onClick={() => setBody(prev => prev + " " + f.key)}>
                    <Copy className="h-2.5 w-2.5 ml-1" />{f.label}
                  </Badge>
                ))}
              </div>
            </div>
            <Button className="w-full font-heading" onClick={() => saveOverride.mutate()} disabled={!title || !body || saveOverride.isPending}>
              {saveOverride.isPending ? "جاري الحفظ..." : "حفظ القالب المخصص"}
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
    </div>
  );
}
