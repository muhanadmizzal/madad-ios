import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  HeadphonesIcon, Plus, Clock, MessageSquare, Send, CheckCircle2, AlertCircle,
} from "lucide-react";

const CATEGORIES: Record<string, string> = {
  hr_module: "الموارد البشرية",
  payroll: "الرواتب",
  leave: "الإجازات",
  technical: "تقني",
  other: "أخرى",
};

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  open: { label: "مفتوحة", color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  in_progress: { label: "قيد المعالجة", color: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  waiting_customer: { label: "بانتظار ردك", color: "bg-primary/10 text-primary border-primary/20" },
  resolved: { label: "تم الحل", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
  closed: { label: "مغلقة", color: "bg-muted text-muted-foreground" },
};

export default function EPSupport() {
  const { companyId } = useCompany();
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  // My tickets (employee only sees own)
  const { data: tickets = [] } = useQuery({
    queryKey: ["ep-support-tickets", user?.id, companyId],
    queryFn: async () => {
      const { data } = await supabase
        .from("support_tickets")
        .select("*")
        .eq("company_id", companyId!)
        .eq("submitted_by", user!.id)
        .order("updated_at", { ascending: false });
      return data || [];
    },
    enabled: !!user && !!companyId,
  });

  const activeTicket = tickets.find((t: any) => t.id === activeTicketId);

  // Messages for active ticket
  const { data: messages = [] } = useQuery({
    queryKey: ["ep-support-messages", activeTicketId],
    queryFn: async () => {
      const { data } = await supabase
        .from("support_messages")
        .select("*")
        .eq("ticket_id", activeTicketId!)
        .order("created_at", { ascending: true });
      return data || [];
    },
    enabled: !!activeTicketId,
  });

  // Create ticket
  const createTicket = useMutation({
    mutationFn: async (form: FormData) => {
      const subject = form.get("subject") as string;
      const description = form.get("description") as string;
      const category = form.get("category") as string;

      const { error } = await supabase.from("support_tickets").insert({
        company_id: companyId!,
        submitted_by: user!.id,
        subject,
        description,
        category,
        priority: "medium",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ep-support-tickets"] });
      toast({ title: "تم إرسال طلب الدعم بنجاح" });
      setCreateOpen(false);
    },
    onError: (err: Error) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  // Send reply
  const sendReply = useMutation({
    mutationFn: async () => {
      if (!replyText.trim() || !activeTicketId) return;
      const { error } = await supabase.from("support_messages").insert({
        ticket_id: activeTicketId,
        sender_id: user!.id,
        message: replyText.trim(),
        sender_type: "employee",
      } as any);
      if (error) throw error;

      // Update ticket status
      if (activeTicket?.status === "waiting_customer" || activeTicket?.status === "open") {
        await supabase.from("support_tickets").update({
          status: "in_progress",
          last_message_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }).eq("id", activeTicketId);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ep-support-messages"] });
      qc.invalidateQueries({ queryKey: ["ep-support-tickets"] });
      setReplyText("");
    },
    onError: (err: Error) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="font-heading font-bold text-2xl flex items-center gap-2">
          <HeadphonesIcon className="h-6 w-6 text-primary" />
          طلب دعم
        </h1>
        <Button onClick={() => setCreateOpen(true)} className="gap-2 font-heading">
          <Plus className="h-4 w-4" />
          طلب جديد
        </Button>
      </div>

      {/* Tickets list */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* List */}
        <div className="lg:col-span-1 space-y-2">
          {tickets.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <HeadphonesIcon className="h-10 w-10 mx-auto mb-3 opacity-20" />
                <p className="text-sm">لا توجد طلبات دعم</p>
              </CardContent>
            </Card>
          ) : (
            <ScrollArea className="max-h-[calc(100vh-220px)]">
              <div className="space-y-2 pr-1">
                {tickets.map((t: any) => {
                  const st = STATUS_MAP[t.status] || STATUS_MAP.open;
                  return (
                    <Card
                      key={t.id}
                      className={`cursor-pointer transition-all hover:shadow-md ${activeTicketId === t.id ? "ring-2 ring-primary/30 border-primary/40" : ""}`}
                      onClick={() => setActiveTicketId(t.id)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-heading font-semibold truncate">{t.subject}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {CATEGORIES[t.category] || t.category || "عام"} • {new Date(t.created_at).toLocaleDateString("ar-IQ")}
                            </p>
                          </div>
                          <Badge variant="outline" className={`text-[9px] shrink-0 ${st.color}`}>{st.label}</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </div>

        {/* Chat / Detail */}
        <div className="lg:col-span-2">
          {activeTicket ? (
            <Card className="flex flex-col h-[calc(100vh-220px)]">
              <CardHeader className="pb-2 border-b">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-heading">{activeTicket.subject}</CardTitle>
                  <Badge variant="outline" className={`text-[10px] ${(STATUS_MAP[activeTicket.status] || STATUS_MAP.open).color}`}>
                    {(STATUS_MAP[activeTicket.status] || STATUS_MAP.open).label}
                  </Badge>
                </div>
                {activeTicket.description && (
                  <p className="text-xs text-muted-foreground mt-1">{activeTicket.description}</p>
                )}
              </CardHeader>
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-3">
                  {messages.map((m: any) => {
                    const isMe = m.sender_id === user?.id;
                    return (
                      <div key={m.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                          isMe
                            ? "bg-primary text-primary-foreground rounded-bl-md"
                            : "bg-muted text-foreground rounded-br-md"
                        }`}>
                          <p>{m.message}</p>
                          <p className={`text-[9px] mt-1 ${isMe ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                            {new Date(m.created_at).toLocaleTimeString("ar-IQ", { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  {messages.length === 0 && (
                    <div className="text-center text-muted-foreground text-xs py-8">لا توجد رسائل بعد</div>
                  )}
                </div>
              </ScrollArea>
              {activeTicket.status !== "closed" && activeTicket.status !== "resolved" && (
                <div className="p-3 border-t flex gap-2">
                  <Textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="اكتب ردك..."
                    className="min-h-[40px] max-h-20 text-sm resize-none"
                  />
                  <Button
                    size="icon"
                    onClick={() => sendReply.mutate()}
                    disabled={!replyText.trim() || sendReply.isPending}
                    className="shrink-0"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </Card>
          ) : (
            <Card className="h-[calc(100vh-220px)] flex items-center justify-center">
              <CardContent className="text-center text-muted-foreground">
                <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-20" />
                <p className="text-sm">اختر طلب دعم لعرض المحادثة</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading">طلب دعم جديد</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); createTicket.mutate(new FormData(e.currentTarget)); }} className="space-y-4">
            <div>
              <Label>التصنيف</Label>
              <Select name="category" defaultValue="other">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORIES).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>الموضوع</Label>
              <Input name="subject" required placeholder="عنوان مختصر للمشكلة" />
            </div>
            <div>
              <Label>التفاصيل</Label>
              <Textarea name="description" rows={4} placeholder="اشرح مشكلتك بالتفصيل..." />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={createTicket.isPending} className="w-full font-heading gap-2">
                <Send className="h-4 w-4" />
                {createTicket.isPending ? "جاري الإرسال..." : "إرسال"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
