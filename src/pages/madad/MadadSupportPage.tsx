import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCompany } from "@/hooks/useCompany";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { HeadphonesIcon, Plus, MessageSquare, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";

const CATEGORIES = [
  { value: "billing", labelAr: "الفواتير والمالية", labelEn: "Billing" },
  { value: "technical", labelAr: "مشكلة تقنية", labelEn: "Technical Issue" },
  { value: "modules", labelAr: "الوحدات والخدمات", labelEn: "Modules & Services" },
  { value: "other", labelAr: "أخرى", labelEn: "Other" },
];

export default function MadadSupportPage() {
  const { t, lang } = useLanguage();
  const { companyId } = useCompany();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("technical");
  const [message, setMessage] = useState("");

  const { data: tickets = [] } = useQuery({
    queryKey: ["madad-support-tickets", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data } = await supabase
        .from("support_tickets")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })
        .limit(50);
      return data || [];
    },
    enabled: !!companyId,
  });

  const createTicket = useMutation({
    mutationFn: async () => {
      if (!companyId || !user) throw new Error("Missing context");
      const { error } = await supabase.from("support_tickets").insert({
        company_id: companyId,
        submitted_by: user.id,
        subject,
        category,
        description: message,
        status: "open",
        priority: "normal",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("تم إرسال التذكرة بنجاح", "Ticket submitted successfully"));
      setOpen(false);
      setSubject("");
      setMessage("");
      qc.invalidateQueries({ queryKey: ["madad-support-tickets"] });
    },
    onError: () => toast.error(t("حدث خطأ", "Error submitting ticket")),
  });

  const statusMeta: Record<string, { color: string; labelAr: string; labelEn: string; icon: React.ReactNode }> = {
    open: { color: "bg-info/10 text-info", labelAr: "مفتوح", labelEn: "Open", icon: <AlertCircle className="h-3 w-3" /> },
    in_progress: { color: "bg-warning/10 text-warning", labelAr: "قيد المعالجة", labelEn: "In Progress", icon: <Clock className="h-3 w-3" /> },
    waiting_customer: { color: "bg-muted text-muted-foreground", labelAr: "بانتظار الرد", labelEn: "Waiting", icon: <MessageSquare className="h-3 w-3" /> },
    resolved: { color: "bg-success/10 text-success", labelAr: "تم الحل", labelEn: "Resolved", icon: <CheckCircle2 className="h-3 w-3" /> },
    closed: { color: "bg-muted text-muted-foreground", labelAr: "مغلق", labelEn: "Closed", icon: <CheckCircle2 className="h-3 w-3" /> },
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-extrabold text-2xl">{t("الدعم الفني", "Support")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("تواصل معنا لحل أي مشكلة أو استفسار", "Contact us for any issue or question")}</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-1.5" style={{ background: "hsl(var(--gold))", color: "hsl(var(--gold-foreground, 0 0% 0%))" }}>
              <Plus className="h-4 w-4" />
              {t("تذكرة جديدة", "New Ticket")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-heading">{t("إنشاء تذكرة دعم", "Create Support Ticket")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <label className="text-sm font-medium mb-1.5 block">{t("الموضوع", "Subject")}</label>
                <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder={t("وصف مختصر للمشكلة", "Brief description")} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">{t("التصنيف", "Category")}</label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{t(c.labelAr, c.labelEn)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">{t("التفاصيل", "Details")}</label>
                <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder={t("اشرح المشكلة بالتفصيل...", "Describe the issue in detail...")} rows={4} />
              </div>
              <Button
                className="w-full"
                disabled={!subject.trim() || !message.trim() || createTicket.isPending}
                onClick={() => createTicket.mutate()}
                style={{ background: "hsl(var(--gold))", color: "hsl(var(--gold-foreground, 0 0% 0%))" }}
              >
                {createTicket.isPending ? t("جاري الإرسال...", "Submitting...") : t("إرسال التذكرة", "Submit Ticket")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* System status */}
      <Card className="border-border/50 bg-success/5">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-success animate-pulse" />
          <span className="text-sm font-medium">{t("جميع الأنظمة تعمل بشكل طبيعي", "All systems operational")}</span>
        </CardContent>
      </Card>

      {/* Tickets list */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="font-heading text-lg flex items-center gap-2">
            <HeadphonesIcon className="h-5 w-5" style={{ color: "hsl(var(--gold))" }} />
            {t("تذاكر الدعم", "Support Tickets")}
            <Badge variant="secondary" className="ms-2">{tickets.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tickets.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <HeadphonesIcon className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p>{t("لا توجد تذاكر دعم", "No support tickets yet")}</p>
              <p className="text-xs mt-1">{t("أنشئ تذكرة جديدة إذا كنت بحاجة للمساعدة", "Create a new ticket if you need help")}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {tickets.map((ticket: any) => {
                const meta = statusMeta[ticket.status] || statusMeta.open;
                return (
                  <div key={ticket.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <MessageSquare className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{ticket.subject}</p>
                        <p className="text-xs text-muted-foreground">
                          {CATEGORIES.find(c => c.value === ticket.category) ? t(CATEGORIES.find(c => c.value === ticket.category)!.labelAr, CATEGORIES.find(c => c.value === ticket.category)!.labelEn) : ticket.category}
                          {" • "}
                          {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true, locale: lang === "ar" ? ar : undefined })}
                        </p>
                      </div>
                    </div>
                    <Badge className={`gap-1 text-xs shrink-0 ${meta.color}`}>
                      {meta.icon}
                      {t(meta.labelAr, meta.labelEn)}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
