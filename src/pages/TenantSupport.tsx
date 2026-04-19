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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import {
  HeadphonesIcon, Plus, Clock, MessageSquare, CheckCircle2,
  AlertCircle, Send, ChevronLeft, ArrowUpDown,
} from "lucide-react";

const CATEGORY_MAP: Record<string, string> = {
  billing: "المالية",
  technical: "تقني",
  hr_module: "الموارد البشرية",
  payroll: "الرواتب",
  other: "أخرى",
};

const PRIORITY_MAP: Record<string, { label: string; color: string }> = {
  low: { label: "منخفضة", color: "bg-muted text-muted-foreground" },
  medium: { label: "متوسطة", color: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  high: { label: "عالية", color: "bg-destructive/10 text-destructive border-destructive/20" },
  urgent: { label: "عاجلة", color: "bg-destructive text-destructive-foreground" },
};

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  open: { label: "مفتوحة", color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  in_progress: { label: "قيد المعالجة", color: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  waiting_customer: { label: "بانتظار ردك", color: "bg-primary/10 text-primary border-primary/20" },
  resolved: { label: "تم الحل", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
  closed: { label: "مغلقة", color: "bg-muted text-muted-foreground" },
};

export default function TenantSupport() {
  const { companyId } = useCompany();
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [newDialog, setNewDialog] = useState(false);
  const [activeTicket, setActiveTicket] = useState<any>(null);
  const [reply, setReply] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Tickets
  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ["tenant-support-tickets", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_tickets")
        .select("*")
        .eq("company_id", companyId!)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId,
  });

  // Messages for active ticket
  const { data: messages = [], refetch: refetchMessages } = useQuery({
    queryKey: ["ticket-messages", activeTicket?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("support_messages")
        .select("*")
        .eq("ticket_id", activeTicket!.id)
        .order("created_at", { ascending: true });
      return data || [];
    },
    enabled: !!activeTicket?.id,
  });

  // Realtime subscription for messages
  const channelKey = activeTicket?.id;

  // Create ticket
  const createTicket = useMutation({
    mutationFn: async (form: FormData) => {
      const subject = form.get("subject") as string;
      const description = form.get("description") as string;
      const category = form.get("category") as string;
      const priority = form.get("priority") as string;

      const { data, error } = await supabase.from("support_tickets").insert({
        company_id: companyId!,
        submitted_by: user!.id,
        subject,
        description,
        category: category || "other",
        priority: priority || "medium",
        status: "open",
      }).select().single();
      if (error) throw error;

      // Insert first message
      if (description) {
        await supabase.from("support_messages").insert({
          ticket_id: data.id,
          sender_id: user!.id,
          sender_type: "tenant",
          message: description,
        });
      }
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tenant-support-tickets"] });
      toast({ title: "تم إنشاء التذكرة بنجاح" });
      setNewDialog(false);
    },
    onError: (e: Error) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });

  // Send reply
  const sendReply = useMutation({
    mutationFn: async () => {
      if (!reply.trim() || !activeTicket) return;
      const { error } = await supabase.from("support_messages").insert({
        ticket_id: activeTicket.id,
        sender_id: user!.id,
        sender_type: "tenant",
        message: reply.trim(),
      });
      if (error) throw error;
      // Auto update status to in_progress if was waiting_customer
      if (activeTicket.status === "waiting_customer" || activeTicket.status === "open") {
        await supabase.from("support_tickets").update({
          status: "in_progress",
          last_message_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }).eq("id", activeTicket.id);
      } else {
        await supabase.from("support_tickets").update({
          last_message_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }).eq("id", activeTicket.id);
      }
    },
    onSuccess: () => {
      setReply("");
      refetchMessages();
      qc.invalidateQueries({ queryKey: ["tenant-support-tickets"] });
    },
    onError: (e: Error) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });

  const filtered = statusFilter === "all" ? tickets : tickets.filter((t: any) => t.status === statusFilter);
  const openCount = tickets.filter((t: any) => t.status === "open" || t.status === "in_progress" || t.status === "waiting_customer").length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <HeadphonesIcon className="h-6 w-6 text-primary" />
            الدعم الفني
          </h1>
          <p className="text-sm text-muted-foreground mt-1">تواصل مع فريق الدعم الفني للمنصة</p>
        </div>
        <Button className="gap-2" onClick={() => setNewDialog(true)}>
          <Plus className="h-4 w-4" />تذكرة جديدة
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card><CardContent className="p-4 text-center">
          <MessageSquare className="h-5 w-5 mx-auto text-primary mb-1" />
          <p className="text-2xl font-bold text-foreground">{tickets.length}</p>
          <p className="text-xs text-muted-foreground">إجمالي التذاكر</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <AlertCircle className="h-5 w-5 mx-auto text-amber-500 mb-1" />
          <p className="text-2xl font-bold text-foreground">{openCount}</p>
          <p className="text-xs text-muted-foreground">نشطة</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <Clock className="h-5 w-5 mx-auto text-blue-500 mb-1" />
          <p className="text-2xl font-bold text-foreground">{tickets.filter((t: any) => t.status === "waiting_customer").length}</p>
          <p className="text-xs text-muted-foreground">بانتظار ردك</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <CheckCircle2 className="h-5 w-5 mx-auto text-emerald-500 mb-1" />
          <p className="text-2xl font-bold text-foreground">{tickets.filter((t: any) => t.status === "resolved" || t.status === "closed").length}</p>
          <p className="text-xs text-muted-foreground">تم حلها</p>
        </CardContent></Card>
      </div>

      {/* Filter */}
      <div className="flex flex-wrap gap-2">
        {[{ key: "all", label: "الكل" }, ...Object.entries(STATUS_MAP).map(([k, v]) => ({ key: k, label: v.label }))].map(f => (
          <Button key={f.key} variant={statusFilter === f.key ? "default" : "outline"} size="sm" className="text-xs" onClick={() => setStatusFilter(f.key)}>
            {f.label}
          </Button>
        ))}
      </div>

      {/* Ticket List */}
      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-20 bg-muted/30 animate-pulse rounded-xl" />)}</div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center">
          <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground">لا توجد تذاكر</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((ticket: any) => {
            const st = STATUS_MAP[ticket.status] || STATUS_MAP.open;
            const pr = PRIORITY_MAP[ticket.priority] || PRIORITY_MAP.medium;
            return (
              <Card
                key={ticket.id}
                className="cursor-pointer hover:shadow-md transition-all border-border/60"
                onClick={() => setActiveTicket(ticket)}
              >
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-heading font-bold text-foreground truncate">{ticket.subject}</p>
                      {ticket.status === "waiting_customer" && (
                        <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className={`text-[10px] ${st.color}`}>{st.label}</Badge>
                      <Badge variant="outline" className={`text-[10px] ${pr.color}`}>{pr.label}</Badge>
                      <Badge variant="outline" className="text-[10px]">{CATEGORY_MAP[ticket.category] || ticket.category}</Badge>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(ticket.updated_at).toLocaleDateString("ar-SA")}
                      </span>
                    </div>
                  </div>
                  <ChevronLeft className="h-4 w-4 text-muted-foreground shrink-0" />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ═══ New Ticket Dialog ═══ */}
      <Dialog open={newDialog} onOpenChange={setNewDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>تذكرة دعم جديدة</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); createTicket.mutate(new FormData(e.currentTarget)); }}>
            <div className="space-y-4 py-2">
              <div>
                <Label>الموضوع</Label>
                <Input name="subject" required placeholder="وصف مختصر للمشكلة" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>التصنيف</Label>
                  <Select name="category" defaultValue="other">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(CATEGORY_MAP).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>الأولوية</Label>
                  <Select name="priority" defaultValue="medium">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(PRIORITY_MAP).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>التفاصيل</Label>
                <Textarea name="description" rows={4} placeholder="اشرح المشكلة بالتفصيل..." />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setNewDialog(false)}>إلغاء</Button>
              <Button type="submit" disabled={createTicket.isPending}>
                {createTicket.isPending ? "جاري..." : "إرسال"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ═══ Ticket Chat Sheet ═══ */}
      <Sheet open={!!activeTicket} onOpenChange={() => setActiveTicket(null)}>
        <SheetContent side="left" className="w-[500px] sm:w-[560px] p-0 flex flex-col">
          <SheetHeader className="p-5 pb-3 border-b border-border">
            <SheetTitle className="text-base font-heading truncate">{activeTicket?.subject}</SheetTitle>
            <div className="flex items-center gap-2 mt-1">
              {activeTicket && (
                <>
                  <Badge variant="outline" className={`text-[10px] ${(STATUS_MAP[activeTicket.status] || STATUS_MAP.open).color}`}>
                    {(STATUS_MAP[activeTicket.status] || STATUS_MAP.open).label}
                  </Badge>
                  <Badge variant="outline" className={`text-[10px] ${(PRIORITY_MAP[activeTicket.priority] || PRIORITY_MAP.medium).color}`}>
                    {(PRIORITY_MAP[activeTicket.priority] || PRIORITY_MAP.medium).label}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">
                    {CATEGORY_MAP[activeTicket.category] || activeTicket.category}
                  </span>
                </>
              )}
            </div>
          </SheetHeader>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-3">
              {messages.map((msg: any) => {
                const isTenant = msg.sender_type === "tenant";
                return (
                  <div key={msg.id} className={`flex ${isTenant ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                      isTenant
                        ? "bg-primary text-primary-foreground rounded-bl-sm"
                        : "bg-muted text-foreground rounded-br-sm"
                    }`}>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.message}</p>
                      <p className={`text-[9px] mt-1 ${isTenant ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                        {new Date(msg.created_at).toLocaleString("ar-SA", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" })}
                      </p>
                    </div>
                  </div>
                );
              })}
              {messages.length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  {activeTicket?.description || "لا توجد رسائل بعد"}
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Reply box */}
          {activeTicket && !["resolved", "closed"].includes(activeTicket.status) && (
            <div className="border-t border-border p-4">
              <div className="flex gap-2">
                <Textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="اكتب ردك..."
                  rows={2}
                  className="flex-1 resize-none"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendReply.mutate(); }
                  }}
                />
                <Button
                  size="icon"
                  className="h-auto shrink-0"
                  onClick={() => sendReply.mutate()}
                  disabled={!reply.trim() || sendReply.isPending}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
          {activeTicket && ["resolved", "closed"].includes(activeTicket.status) && (
            <div className="border-t border-border p-4 text-center">
              <Badge variant="outline" className="bg-muted text-muted-foreground">هذه التذكرة مغلقة</Badge>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
