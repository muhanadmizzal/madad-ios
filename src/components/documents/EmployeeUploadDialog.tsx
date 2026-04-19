import { useState, useRef } from "react";
import { Upload, FileText, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const DOC_TYPES = [
  { value: "national_id", label: "هوية وطنية" },
  { value: "passport", label: "جواز سفر" },
  { value: "certificate", label: "شهادة دراسية" },
  { value: "degree", label: "شهادة أكاديمية" },
  { value: "contract_attachment", label: "مرفق عقد" },
  { value: "medical_report", label: "تقرير طبي" },
  { value: "leave_evidence", label: "مستند إثبات إجازة" },
  { value: "residency_permit", label: "إقامة / تصريح عمل" },
  { value: "bank_document", label: "مستند بنكي" },
  { value: "training_certificate", label: "شهادة تدريبية" },
  { value: "other", label: "مستند آخر" },
];

interface Props {
  employeeId: string;
  companyId: string;
  userId: string;
  parentDocumentId?: string;
  triggerLabel?: string;
  onSuccess?: () => void;
}

export function EmployeeUploadDialog({ employeeId, companyId, userId, parentDocumentId, triggerLabel, onSuccess }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [docType, setDocType] = useState("other");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const upload = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("اختر ملفاً");
      if (!title.trim()) throw new Error("أدخل عنوان المستند");

      const ext = file.name.split(".").pop() || "bin";
      const path = `${companyId}/${employeeId}/${Date.now()}.${ext}`;

      const { error: storageErr } = await supabase.storage.from("employee-uploads").upload(path, file);
      if (storageErr) throw storageErr;

      let version = 1;
      if (parentDocumentId) {
        const { count } = await (supabase as any)
          .from("employee_uploaded_documents")
          .select("id", { count: "exact", head: true })
          .eq("parent_document_id", parentDocumentId);
        version = (count || 0) + 2;
      }

      const { error } = await (supabase as any).from("employee_uploaded_documents").insert({
        employee_id: employeeId,
        company_id: companyId,
        uploader_user_id: userId,
        document_type: docType,
        title: title.trim(),
        description: description.trim() || null,
        file_path: path,
        file_type: file.type || ext,
        file_size: file.size,
        status: "pending_review",
        version,
        parent_document_id: parentDocumentId || null,
      });
      if (error) throw error;

      // Notify HR
      const { data: hrUsers } = await (supabase as any)
        .from("profiles")
        .select("user_id")
        .eq("company_id", companyId)
        .in("role", ["hr_manager", "tenant_admin", "admin"]);

      if (hrUsers?.length) {
        const notifications = hrUsers.map((u: any) => ({
          company_id: companyId,
          user_id: u.user_id,
          title: "مستند جديد بانتظار المراجعة",
          message: `قام موظف برفع مستند: ${title.trim()}`,
          type: "document_upload",
          is_read: false,
        }));
        await (supabase as any).from("notifications").insert(notifications);
      }
    },
    onSuccess: () => {
      toast({ title: "تم رفع المستند بنجاح", description: "سيتم مراجعته من قبل الموارد البشرية" });
      queryClient.invalidateQueries({ queryKey: ["employee-uploads"] });
      queryClient.invalidateQueries({ queryKey: ["hr-upload-review"] });
      setOpen(false);
      resetForm();
      onSuccess?.();
    },
    onError: (e: any) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });

  const resetForm = () => {
    setTitle("");
    setDocType("other");
    setDescription("");
    setFile(null);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2" size="sm">
          <Upload className="h-4 w-4" />
          {triggerLabel || "رفع مستند"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="font-heading">رفع مستند جديد</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>نوع المستند</Label>
            <Select value={docType} onValueChange={setDocType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DOC_TYPES.map(t => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>عنوان المستند *</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="مثال: هوية وطنية - نسخة محدثة" />
          </div>
          <div>
            <Label>ملاحظات</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="أي تفاصيل إضافية..." rows={2} />
          </div>
          <div>
            <Label>الملف *</Label>
            <div
              className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              <input ref={fileRef} type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={e => setFile(e.target.files?.[0] || null)} />
              {file ? (
                <div className="flex items-center justify-center gap-2 text-sm">
                  <FileText className="h-5 w-5 text-primary" />
                  <span className="font-medium">{file.name}</span>
                  <span className="text-muted-foreground">({(file.size / 1024).toFixed(0)} KB)</span>
                </div>
              ) : (
                <div className="text-muted-foreground text-sm">
                  <Upload className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p>اضغط لاختيار ملف أو اسحبه هنا</p>
                  <p className="text-xs mt-1">PDF, JPG, PNG, DOC - حد أقصى 20MB</p>
                </div>
              )}
            </div>
          </div>
          <Button className="w-full gap-2" disabled={upload.isPending || !file || !title.trim()} onClick={() => upload.mutate()}>
            {upload.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            رفع المستند
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
