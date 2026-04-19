import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  StatusBadge, PriorityBadge, EmptyState, KpiCard, BPPageHeader, BPPageSkeleton, BPErrorState,
  BPFilterBar, BPSearchInput, BPDataTable, type BPColumn,
} from "@/components/business-portal/BPDesignSystem";
import {
  AlertCircle, Clock, CheckCircle2, MessageSquare, Send,
  User, Building2, ArrowUpDown,
} from "lucide-react";

const STATUS_OPTIONS = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "waiting_customer", label: "Waiting Customer" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];

const CATEGORY_OPTIONS = [
  { value: "billing", label: "Billing" },
  { value: "technical", label: "Technical" },
  { value: "hr_module", label: "HR Module" },
  { value: "payroll", label: "Payroll" },
  { value: "other", label: "Other" },
];

const PRIORITY_MAP: Record<string, string> = { low: "Low", medium: "Medium", high: "High", urgent: "Urgent" };

export default function BPSupport() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [activeTicket, setActiveTicket] = useState<any>(null);
  const [reply, setReply] = useState("");
  const pageSize = 20;

  const { data: tickets = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["bp-tickets"],
    queryFn: async () => {
      const { data, error } = await supabase.from("support_tickets").select("*").order("updated_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: companies = [] } = useQuery({
    queryKey: ["bp-companies"],
    queryFn: async () => { const { data } = await supabase.from("companies").select("id, name"); return data || []; },
  });

  const { data: messages = [], refetch: refetchMessages } = useQuery({
    queryKey: ["bp-ticket-messages", activeTicket?.id],
    queryFn: async () => {
      const { data } = await supabase.from("support_messages").select("*").eq("ticket_id", activeTicket!.id).order("created_at", { ascending: true });
      return data || [];
    },
    enabled: !!activeTicket?.id,
  });

  const { data: supportNotes = [] } = useQuery({
    queryKey: ["bp-all-support-notes"],
    queryFn: async () => {
      const { data } = await supabase.from("business_support_notes").select("*, companies:company_id(name)").order("created_at", { ascending: false }).limit(50);
      return data || [];
    },
  });

  // Send reply as business
  const sendReply = useMutation({
    mutationFn: async () => {
      if (!reply.trim() || !activeTicket) return;
      const { error } = await supabase.from("support_messages").insert({
        ticket_id: activeTicket.id,
        sender_id: user!.id,
        sender_type: "business",
        message: reply.trim(),
      });
      if (error) throw error;
      // Auto set to waiting_customer
      await supabase.from("support_tickets").update({
        status: "waiting_customer",
        last_message_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("id", activeTicket.id);
    },
    onSuccess: () => {
      setReply("");
      refetchMessages();
      qc.invalidateQueries({ queryKey: ["bp-tickets"] });
      toast({ title: "Reply sent" });
    },
  });

  // Change ticket status
  const changeStatus = useMutation({
    mutationFn: async ({ ticketId, status }: { ticketId: string; status: string }) => {
      const update: any = { status, updated_at: new Date().toISOString() };
      if (status === "resolved") update.resolved_at = new Date().toISOString();
      const { error } = await supabase.from("support_tickets").update(update).eq("id", ticketId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bp-tickets"] });
      toast({ title: "Status updated" });
    },
  });

  // Assign ticket
  const assignTicket = useMutation({
    mutationFn: async (ticketId: string) => {
      const { error } = await supabase.from("support_tickets").update({
        assigned_to: user!.id,
        status: "in_progress",
        updated_at: new Date().toISOString(),
      }).eq("id", ticketId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bp-tickets"] });
      toast({ title: "Ticket assigned to you" });
    },
  });

  if (isLoading) return <BPPageSkeleton />;
  if (isError) return <BPErrorState onRetry={() => refetch()} />;

  const getCompanyName = (id: string) => companies.find((c: any) => c.id === id)?.name || "—";
  const open = tickets.filter((t: any) => t.status === "open").length;
  const inProgress = tickets.filter((t: any) => t.status === "in_progress").length;
  const waiting = tickets.filter((t: any) => t.status === "waiting_customer").length;
  const resolved = tickets.filter((t: any) => t.status === "resolved" || t.status === "closed").length;

  let filteredTickets = tickets;
  if (statusFilter !== "all") filteredTickets = filteredTickets.filter((t: any) => t.status === statusFilter);
  if (categoryFilter !== "all") filteredTickets = filteredTickets.filter((t: any) => t.category === categoryFilter);
  if (search) {
    const s = search.toLowerCase();
    filteredTickets = filteredTickets.filter((t: any) =>
      t.subject?.toLowerCase().includes(s) || getCompanyName(t.company_id).toLowerCase().includes(s)
    );
  }
  const paged = filteredTickets.slice((page - 1) * pageSize, page * pageSize);

  const columns: BPColumn<any>[] = [
    { key: "subject", header: "Subject", render: (t) => (
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{t.subject}</p>
        {t.description && <p className="text-[11px] text-muted-foreground truncate max-w-[200px]">{t.description}</p>}
      </div>
    )},
    { key: "tenant", header: "Tenant", render: (t) => <span className="text-xs text-muted-foreground">{getCompanyName(t.company_id)}</span> },
    { key: "category", header: "Category", render: (t) => <span className="text-xs text-muted-foreground">{t.category || "—"}</span> },
    { key: "priority", header: "Priority", render: (t) => <PriorityBadge priority={t.priority} /> },
    { key: "status", header: "Status", render: (t) => <StatusBadge status={t.status} /> },
    { key: "updated", header: "Updated", render: (t) => <span className="text-xs text-muted-foreground">{new Date(t.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span> },
    { key: "actions", header: "", className: "w-[200px]", render: (t) => (
      <div className="flex gap-1">
        <Button variant="outline" size="sm" className="text-xs h-7 gap-1" onClick={(e) => { e.stopPropagation(); setActiveTicket(t); }}>
          <MessageSquare className="h-3 w-3" />Open
        </Button>
        {!t.assigned_to && (
          <Button variant="ghost" size="sm" className="text-xs h-7" onClick={(e) => { e.stopPropagation(); assignTicket.mutate(t.id); }}>
            Assign Me
          </Button>
        )}
        <Select onValueChange={(v) => changeStatus.mutate({ ticketId: t.id, status: v })}>
          <SelectTrigger className="h-7 w-[80px] text-[10px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.filter(s => s.value !== t.status).map(s => (
              <SelectItem key={s.value} value={s.value} className="text-xs">{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    )},
  ];

  return (
    <div className="space-y-6">
      <BPPageHeader title="مركز الدعم الفني" subtitle="إدارة تذاكر الدعم الفني" />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <KpiCard label="Open" value={open} icon={AlertCircle} trend={open > 0 ? "down" : "neutral"} />
        <KpiCard label="In Progress" value={inProgress} icon={Clock} />
        <KpiCard label="Waiting" value={waiting} icon={MessageSquare} />
        <KpiCard label="Resolved" value={resolved} icon={CheckCircle2} trend="up" />
        <KpiCard label="Total" value={tickets.length} icon={ArrowUpDown} />
      </div>

      <Tabs defaultValue="tickets" className="w-full">
        <TabsList>
          <TabsTrigger value="tickets">Tickets</TabsTrigger>
          <TabsTrigger value="notes">Internal Notes</TabsTrigger>
        </TabsList>

        <TabsContent value="tickets" className="space-y-4 mt-4">
          <BPFilterBar>
            <BPSearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search tickets..." />
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[130px] h-9 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[130px] h-9 text-xs"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {CATEGORY_OPTIONS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </BPFilterBar>
          <BPDataTable columns={columns} data={paged} emptyMessage="No tickets"
            page={page} pageSize={pageSize} totalCount={filteredTickets.length} onPageChange={setPage} />
        </TabsContent>

        <TabsContent value="notes" className="space-y-3 mt-4">
          {supportNotes.map((n: any) => (
            <Card key={n.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium text-primary">{(n as any).companies?.name || "—"}</span>
                  <span className="text-[11px] text-muted-foreground">{new Date(n.created_at).toLocaleString()}</span>
                </div>
                <p className="text-sm text-foreground">{n.note_text}</p>
              </CardContent>
            </Card>
          ))}
          {supportNotes.length === 0 && <EmptyState message="No internal notes" />}
        </TabsContent>
      </Tabs>

      {/* ═══ Ticket Chat Sheet ═══ */}
      <Sheet open={!!activeTicket} onOpenChange={() => setActiveTicket(null)}>
        <SheetContent side="right" className="w-[520px] sm:w-[600px] p-0 flex flex-col">
          <SheetHeader className="p-5 pb-3 border-b border-border space-y-2">
            <SheetTitle className="text-base font-heading truncate">{activeTicket?.subject}</SheetTitle>
            <div className="flex items-center gap-2 flex-wrap">
              {activeTicket && (
                <>
                  <StatusBadge status={activeTicket.status} />
                  <PriorityBadge priority={activeTicket.priority} />
                  <Badge variant="outline" className="text-[10px]">
                    <Building2 className="h-2.5 w-2.5 ml-0.5" />{getCompanyName(activeTicket.company_id)}
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">{activeTicket.category || "other"}</Badge>
                  <span className="text-[10px] text-muted-foreground">
                    Created: {new Date(activeTicket.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                </>
              )}
            </div>
            {activeTicket && (
              <div className="flex gap-2">
                {!activeTicket.assigned_to && (
                  <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => { assignTicket.mutate(activeTicket.id); setActiveTicket({ ...activeTicket, assigned_to: user?.id }); }}>
                    <User className="h-3 w-3 ml-1" />Assign to Me
                  </Button>
                )}
                {activeTicket.assigned_to && (
                  <Badge variant="secondary" className="text-[10px] h-7 flex items-center"><User className="h-3 w-3 ml-1" />Assigned</Badge>
                )}
                <Select onValueChange={(v) => { changeStatus.mutate({ ticketId: activeTicket.id, status: v }); setActiveTicket({ ...activeTicket, status: v }); }}>
                  <SelectTrigger className="h-7 text-[10px] w-[120px]"><SelectValue placeholder="Change status" /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.filter(s => s.value !== activeTicket.status).map(s => (
                      <SelectItem key={s.value} value={s.value} className="text-xs">{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </SheetHeader>

          {/* Ticket description */}
          {activeTicket?.description && (
            <div className="px-5 py-3 border-b border-border/50 bg-muted/20">
              <p className="text-[11px] font-medium text-muted-foreground mb-1">Description</p>
              <p className="text-sm text-foreground whitespace-pre-wrap">{activeTicket.description}</p>
            </div>
          )}

          {/* Chat messages */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-3">
              {messages.length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  No messages yet — start the conversation
                </div>
              )}
              {messages.map((msg: any) => {
                const isBusiness = msg.sender_type === "business";
                return (
                  <div key={msg.id} className={`flex ${isBusiness ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                      isBusiness
                        ? "bg-primary text-primary-foreground rounded-bl-sm"
                        : "bg-muted text-foreground rounded-br-sm"
                    }`}>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.message}</p>
                      <div className={`flex items-center gap-1 mt-1 ${isBusiness ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                        <span className="text-[9px]">{isBusiness ? "Business" : "Tenant"}</span>
                        <span className="text-[9px]">•</span>
                        <span className="text-[9px]">{new Date(msg.created_at).toLocaleString("en-US", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" })}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          {/* Reply */}
          <div className="border-t border-border p-4">
            <div className="flex gap-2">
              <Textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="Type reply..."
                rows={2}
                className="flex-1 resize-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendReply.mutate(); }
                }}
              />
              <Button size="icon" className="h-auto shrink-0" onClick={() => sendReply.mutate()} disabled={!reply.trim() || sendReply.isPending}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
