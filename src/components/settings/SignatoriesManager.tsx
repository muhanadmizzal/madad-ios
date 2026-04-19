import { useState } from "react";
import { Plus, Trash2, Edit2, PenTool } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { useToast } from "@/hooks/use-toast";

const DOC_TYPES = [
  { key: "certificate_employment", label: "شهادة تعريف بالعمل" },
  { key: "certificate_salary", label: "شهادة راتب" },
  { key: "certificate_experience", label: "شهادة خبرة" },
  { key: "leave_approval", label: "خطاب موافقة إجازة" },
  { key: "warning_letter", label: "خطاب إنذار" },
  { key: "offer_letter", label: "عرض عمل" },
  { key: "contract", label: "عقد عمل" },
  { key: "general", label: "مستندات عامة" },
];

export default function SignatoriesManager() {
  const { companyId } = useCompany();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [name, setName] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [role, setRole] = useState("");
  const [roleAr, setRoleAr] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [allowedTypes, setAllowedTypes] = useState<string[]>([]);

  const { data: signatories = [] } = useQuery({
    queryKey: ["company-signatories", companyId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("company_signatories")
        .select("*")
        .eq("company_id", companyId!)
        .order("sort_order");
      return data || [];
    },
    enabled: !!companyId,
  });

  const resetForm = () => {
    setName(""); setNameAr(""); setRole(""); setRoleAr("");
    setIsActive(true); setAllowedTypes([]); setEditing(null);
  };

  const openCreate = () => { resetForm(); setDialog(true); };

  const openEdit = (s: any) => {
    setEditing(s);
    setName(s.name || "");
    setNameAr(s.name_ar || "");
    setRole(s.role || "");
    setRoleAr(s.role_ar || "");
    setIsActive(s.is_active);
    setAllowedTypes(s.allowed_document_types || []);
    setDialog(true);
  };

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        company_id: companyId!,
        name, name_ar: nameAr || null, role, role_ar: roleAr || null,
        is_active: isActive, allowed_document_types: allowedTypes,
      };
      if (editing) {
        const { error } = await (supabase as any).from("company_signatories").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("company_signatories").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["company-signatories"] });
      toast({ title: editing ? "تم تحديث المفوض" : "تم إضافة المفوض" });
      setDialog(false); resetForm();
    },
    onError: (err: Error) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("company_signatories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["company-signatories"] });
      toast({ title: "تم حذف المفوض" });
    },
  });

  const toggleType = (key: string) => {
    setAllowedTypes(prev => prev.includes(key) ? prev.filter(t => t !== key) : [...prev, key]);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-heading font-semibold text-lg flex items-center gap-2">
            <PenTool className="h-5 w-5 text-primary" />
            المفوضون بالتوقيع
          </h3>
          <p className="text-sm text-muted-foreground">تحديد الأشخاص المخولين بتوقيع المستندات الرسمية</p>
        </div>
        <Button className="gap-2 font-heading" onClick={openCreate}>
          <Plus className="h-4 w-4" /> إضافة مفوض
        </Button>
      </div>

      {signatories.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الاسم</TableHead>
                  <TableHead>المنصب</TableHead>
                  <TableHead>المستندات المسموحة</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {signatories.map((s: any) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name_ar || s.name}</TableCell>
                    <TableCell>{s.role_ar || s.role}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(s.allowed_document_types || []).length > 0 ? (
                          (s.allowed_document_types as string[]).slice(0, 3).map((t: string) => (
                            <Badge key={t} variant="outline" className="text-[10px]">
                              {DOC_TYPES.find(d => d.key === t)?.label || t}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground">جميع المستندات</span>
                        )}
                        {(s.allowed_document_types?.length || 0) > 3 && (
                          <Badge variant="secondary" className="text-[10px]">+{s.allowed_document_types.length - 3}</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={s.is_active ? "default" : "secondary"}>
                        {s.is_active ? "نشط" : "معطل"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(s)}>
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => remove.mutate(s.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <PenTool className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p className="font-heading">لا يوجد مفوضون — أضف مفوض بالتوقيع</p>
          </CardContent>
        </Card>
      )}

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading">{editing ? "تعديل مفوض" : "إضافة مفوض بالتوقيع"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>الاسم (عربي)</Label>
                <Input value={nameAr} onChange={e => setNameAr(e.target.value)} placeholder="أحمد محمد" />
              </div>
              <div className="space-y-2">
                <Label>الاسم (إنجليزي)</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ahmed Mohammed" dir="ltr" className="text-left" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>المنصب (عربي)</Label>
                <Input value={roleAr} onChange={e => setRoleAr(e.target.value)} placeholder="مدير الموارد البشرية" />
              </div>
              <div className="space-y-2">
                <Label>المنصب (إنجليزي)</Label>
                <Input value={role} onChange={e => setRole(e.target.value)} placeholder="HR Manager" dir="ltr" className="text-left" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>المستندات المسموح بتوقيعها</Label>
              <div className="grid grid-cols-2 gap-2">
                {DOC_TYPES.map(dt => (
                  <div key={dt.key} className="flex items-center gap-2">
                    <Checkbox checked={allowedTypes.includes(dt.key)} onCheckedChange={() => toggleType(dt.key)} />
                    <span className="text-sm">{dt.label}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">اترك الكل فارغاً للسماح بجميع المستندات</p>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={isActive} onCheckedChange={setIsActive} />
              <Label>مفوض نشط</Label>
            </div>
            <Button className="w-full font-heading" onClick={() => save.mutate()} disabled={!name || !role || save.isPending}>
              {save.isPending ? "جاري الحفظ..." : editing ? "تحديث" : "إضافة"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
