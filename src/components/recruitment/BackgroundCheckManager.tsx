import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Shield, Plus, CheckCircle, XCircle, Clock, FileText, Send, Copy, Link2 } from "lucide-react";

interface Props {
  candidateId: string;
  candidateName: string;
  candidateEmail?: string;
  candidatePhone?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const typeLabels: Record<string, string> = {
  identity: "هوية", education: "شهادات", employment: "خبرة سابقة",
  criminal: "سجل جنائي", reference: "مراجع", medical: "فحص طبي",
};
const statusLabels: Record<string, string> = {
  pending: "معلّق", in_progress: "قيد التحقق", verified: "موثّق", failed: "فشل",
};

export default function BackgroundCheckManager({ candidateId, candidateName, candidateEmail, candidatePhone, open, onOpenChange }: Props) {
  const { companyId } = useCompany();
  const queryClient = useQueryClient();
  const [addForm, setAddForm] = useState(false);
  const [sendRequestDialog, setSendRequestDialog] = useState<string | null>(null);

  const { data: checks = [] } = useQuery({
    queryKey: ["bg-checks", candidateId],
    queryFn: async () => {
      const { data } = await supabase
        .from("background_checks" as any)
        .select("*")
        .eq("candidate_id", candidateId)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: open && !!candidateId,
  });

  const addCheck = useMutation({
    mutationFn: async (fd: FormData) => {
      const { error } = await supabase.from("background_checks" as any).insert({
        company_id: companyId!,
        candidate_id: candidateId,
        check_type: fd.get("type") as string,
        notes: (fd.get("notes") as string) || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bg-checks", candidateId] });
      toast({ title: "تم إضافة التحقق" });
      setAddForm(false);
    },
    onError: (e: any) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });

  const updateCheck = useMutation({
    mutationFn: async ({ id, status, result, verifiedBy }: { id: string; status: string; result?: string; verifiedBy?: string }) => {
      const updates: any = { status };
      if (result) updates.result = result;
      if (verifiedBy) updates.verified_by = verifiedBy;
      if (status === "verified" || status === "failed") updates.verified_at = new Date().toISOString();
      const { error } = await supabase.from("background_checks" as any).update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bg-checks", candidateId] });
      toast({ title: "تم التحديث" });
    },
  });

  const generateUploadLink = useMutation({
    mutationFn: async ({ checkId, deliveryMethod }: { checkId: string; deliveryMethod: string }) => {
      const token = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

      const { error } = await supabase.from("background_checks" as any).update({
        upload_token: token,
        upload_token_expires_at: expiresAt,
        delivery_method: deliveryMethod,
      }).eq("id", checkId);
      if (error) throw error;

      const baseUrl = window.location.origin;
      return `${baseUrl}/bg-upload?token=${token}`;
    },
    onSuccess: (link, { deliveryMethod }) => {
      queryClient.invalidateQueries({ queryKey: ["bg-checks", candidateId] });
      
      if (deliveryMethod === "copy") {
        navigator.clipboard.writeText(link);
        toast({ title: "تم نسخ الرابط ✅", description: "يمكنك إرسال الرابط للمرشح عبر أي وسيلة" });
      } else if (deliveryMethod === "email" && candidateEmail) {
        // Open mailto
        const subject = encodeURIComponent("طلب رفع مستندات التحقق");
        const body = encodeURIComponent(`مرحباً ${candidateName}،\n\nيرجى رفع المستندات المطلوبة عبر الرابط التالي:\n${link}\n\nالرابط صالح لمدة 7 أيام.\n\nشكراً لتعاونكم.`);
        window.open(`mailto:${candidateEmail}?subject=${subject}&body=${body}`, "_blank");
        toast({ title: "تم فتح البريد الإلكتروني" });
      } else if (deliveryMethod === "sms" && candidatePhone) {
        // Open SMS/WhatsApp
        const msg = encodeURIComponent(`مرحباً ${candidateName}، يرجى رفع المستندات المطلوبة عبر الرابط: ${link}`);
        window.open(`https://wa.me/${candidatePhone?.replace(/\D/g, "")}?text=${msg}`, "_blank");
        toast({ title: "تم فتح واتساب" });
      } else {
        navigator.clipboard.writeText(link);
        toast({ title: "تم نسخ الرابط ✅" });
      }
      setSendRequestDialog(null);
    },
    onError: (e: any) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });

  const allVerified = checks.length > 0 && checks.every((c: any) => c.status === "verified");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading flex items-center gap-2">
            <Shield className="h-5 w-5" />
            التحقق من الخلفية: {candidateName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            {allVerified ? (
              <Badge className="bg-primary/10 text-primary gap-1"><CheckCircle className="h-3 w-3" />جميع التحققات مكتملة</Badge>
            ) : (
              <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" />{checks.filter((c: any) => c.status === "pending" || c.status === "in_progress").length} معلّق</Badge>
            )}
            <Button size="sm" variant="outline" className="gap-1 text-xs" onClick={() => setAddForm(true)}>
              <Plus className="h-3 w-3" />إضافة تحقق
            </Button>
          </div>

          {checks.length > 0 ? (
            <div className="space-y-2">
              {checks.map((c: any) => (
                <Card key={c.id}>
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{typeLabels[c.check_type] || c.check_type}</span>
                          <Badge variant={c.status === "verified" ? "default" : c.status === "failed" ? "destructive" : "secondary"} className="text-[10px]">
                            {statusLabels[c.status] || c.status}
                          </Badge>
                        </div>
                        {c.document_path && (
                          <div className="flex items-center gap-1">
                            <p className="text-[10px] text-primary flex items-center gap-1">
                              <FileText className="h-3 w-3" />مستند مرفق
                            </p>
                            <Button variant="ghost" size="sm" className="h-5 text-[10px] text-primary px-1" onClick={async () => {
                              const { data } = await supabase.storage.from("resumes").createSignedUrl(c.document_path, 300);
                              if (data?.signedUrl) window.open(data.signedUrl, "_blank");
                              else toast({ title: "خطأ", description: "تعذر فتح المستند" });
                            }}>
                              عرض
                            </Button>
                          </div>
                        )}
                        {c.upload_token && !c.document_path && (
                          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Link2 className="h-3 w-3" />رابط رفع مُرسَل - بانتظار المرشح
                          </p>
                        )}
                        {c.result && <p className="text-xs text-muted-foreground">{c.result}</p>}
                        {c.verified_by && <p className="text-[10px] text-muted-foreground">بواسطة: {c.verified_by}</p>}
                      </div>
                      <div className="flex gap-1 flex-wrap justify-end">
                        {/* Send upload request button */}
                        {!c.document_path && (c.status === "pending" || c.status === "in_progress") && (
                          <Button size="sm" variant="outline" className="text-xs h-7 gap-1"
                            onClick={() => setSendRequestDialog(c.id)}>
                            <Send className="h-3 w-3" />طلب رفع
                          </Button>
                        )}
                        {c.status === "pending" && (
                          <Button size="sm" variant="ghost" className="text-xs h-7"
                            onClick={() => updateCheck.mutate({ id: c.id, status: "in_progress" })}>بدء</Button>
                        )}
                        {(c.status === "pending" || c.status === "in_progress") && (
                          <>
                            <Button size="sm" variant="ghost" className="text-xs h-7 text-primary"
                              onClick={() => updateCheck.mutate({ id: c.id, status: "verified", result: "تم التحقق بنجاح" })}>
                              <CheckCircle className="h-3 w-3" />
                            </Button>
                            <Button size="sm" variant="ghost" className="text-xs h-7 text-destructive"
                              onClick={() => updateCheck.mutate({ id: c.id, status: "failed", result: "فشل التحقق" })}>
                              <XCircle className="h-3 w-3" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">لا توجد تحققات بعد</p>
          )}
        </div>

        {/* Add Check Dialog */}
        <Dialog open={addForm} onOpenChange={setAddForm}>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-heading">إضافة تحقق جديد</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); addCheck.mutate(new FormData(e.currentTarget)); }} className="space-y-4">
              <div className="space-y-2">
                <Label>نوع التحقق</Label>
                <Select name="type" defaultValue="identity">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(typeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>ملاحظات</Label>
                <Textarea name="notes" rows={2} />
              </div>
              <Button type="submit" className="w-full" disabled={addCheck.isPending}>
                {addCheck.isPending ? "جاري الحفظ..." : "إضافة"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Send Upload Request Dialog */}
        <Dialog open={!!sendRequestDialog} onOpenChange={() => setSendRequestDialog(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-heading">إرسال طلب رفع مستند</DialogTitle></DialogHeader>
            <p className="text-sm text-muted-foreground">اختر طريقة إرسال الرابط للمرشح "{candidateName}":</p>
            <div className="space-y-2 mt-4">
              {candidateEmail && (
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                  onClick={() => generateUploadLink.mutate({ checkId: sendRequestDialog!, deliveryMethod: "email" })}
                  disabled={generateUploadLink.isPending}
                >
                  📧 إرسال عبر البريد الإلكتروني ({candidateEmail})
                </Button>
              )}
              {candidatePhone && (
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                  onClick={() => generateUploadLink.mutate({ checkId: sendRequestDialog!, deliveryMethod: "sms" })}
                  disabled={generateUploadLink.isPending}
                >
                  💬 إرسال عبر واتساب ({candidatePhone})
                </Button>
              )}
              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={() => generateUploadLink.mutate({ checkId: sendRequestDialog!, deliveryMethod: "copy" })}
                disabled={generateUploadLink.isPending}
              >
                <Copy className="h-4 w-4" /> نسخ الرابط (إرسال يدوي)
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">الرابط صالح لمدة 7 أيام. المستند المرفوع سيُحفظ مع ملفات المرشح.</p>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}
