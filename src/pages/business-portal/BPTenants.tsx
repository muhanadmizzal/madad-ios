import { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import {
  StatusBadge, EmptyState, BPPageHeader, BPPageSkeleton, BPFilterBar, BPSearchInput, BPErrorState,
  KpiCard, BPDataTable, type BPColumn,
} from "@/components/business-portal/BPDesignSystem";
import { logBusinessAction } from "@/hooks/useBusinessAudit";
import { Building2, Ban, CheckCircle, Eye, Plus, Send, Users, CreditCard, AlertTriangle } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function BPTenants() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedTenant, setSelectedTenant] = useState<any>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [form, setForm] = useState({ name: "", email: "", phone: "", sector: "private", default_currency: "IQD" });
  const queryClient = useQueryClient();

  const { data: companies = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["bp-companies"],
    queryFn: async () => {
      const { data, error } = await supabase.from("companies").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
  const { data: allEmployees = [] } = useQuery({
    queryKey: ["bp-employees-count"],
    queryFn: async () => { const { data } = await supabase.from("employees").select("id, company_id, status"); return data || []; },
  });
  const { data: subscriptions = [] } = useQuery({
    queryKey: ["bp-subscriptions"],
    queryFn: async () => { const { data } = await supabase.from("tenant_subscriptions").select("*, subscription_plans(name, price_monthly)"); return data || []; },
  });
  const { data: profiles = [] } = useQuery({
    queryKey: ["bp-profiles"],
    queryFn: async () => { const { data } = await supabase.from("profiles").select("user_id, company_id"); return data || []; },
  });
  const { data: supportNotes = [] } = useQuery({
    queryKey: ["bp-support-notes", selectedTenant?.id],
    queryFn: async () => {
      if (!selectedTenant) return [];
      const { data } = await supabase.from("business_support_notes").select("*").eq("company_id", selectedTenant.id).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!selectedTenant,
  });
  const { data: aiQuotas = [] } = useQuery({
    queryKey: ["bp-ai-quotas"],
    queryFn: async () => { const { data } = await supabase.from("tenant_ai_quotas").select("*"); return data || []; },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.from("companies").insert({
        name: form.name, email: form.email || null, phone: form.phone || null,
        sector: form.sector || null, default_currency: form.default_currency,
      }).select().single();
      if (error) throw error;
      await logBusinessAction("tenant_created", "company", data.id, data.id, null, data);
    },
    onSuccess: () => {
      toast({ title: "Tenant Created" });
      queryClient.invalidateQueries({ queryKey: ["bp-companies"] });
      setCreateOpen(false);
      setForm({ name: "", email: "", phone: "", sector: "private", default_currency: "IQD" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const addNoteMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !selectedTenant) throw new Error("Missing context");
      const { error } = await supabase.from("business_support_notes").insert({
        company_id: selectedTenant.id, author_user_id: user.id, note_text: noteText, note_type: "general",
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bp-support-notes"] });
      setNoteText("");
      toast({ title: "Note added" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const toggleStatus = async (company: any) => {
    const newStatus = company.status === "active" ? "suspended" : "active";
    const { error } = await supabase.from("companies").update({ status: newStatus } as any).eq("id", company.id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    await logBusinessAction(newStatus === "active" ? "tenant_reactivated" : "tenant_suspended", "company", company.id, company.id, { status: company.status }, { status: newStatus });
    toast({ title: `Tenant ${newStatus === "active" ? "activated" : "suspended"}` });
    queryClient.invalidateQueries({ queryKey: ["bp-companies"] });
  };

  if (isLoading) return <BPPageSkeleton />;
  if (isError) return <BPErrorState onRetry={() => refetch()} />;

  const filtered = companies.filter((c: any) => {
    const matchSearch = c.name?.toLowerCase().includes(search.toLowerCase()) || c.email?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  const getStats = (id: string) => ({
    employees: allEmployees.filter((e: any) => e.company_id === id).length,
    users: profiles.filter((p: any) => p.company_id === id).length,
    subscription: subscriptions.find((s: any) => s.company_id === id),
    aiQuota: aiQuotas.find((q: any) => q.company_id === id),
  });

  const active = companies.filter((c: any) => c.status === "active").length;
  const trial = companies.filter((c: any) => c.status === "trial").length;
  const suspended = companies.filter((c: any) => c.status === "suspended").length;

  const columns: BPColumn<any>[] = [
    { key: "tenant", header: "Tenant", render: (c) => (
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">{c.name?.charAt(0)}</div>
        <div>
          <span className="font-medium text-sm text-foreground">{c.name}</span>
          <p className="text-[11px] text-muted-foreground">{c.sector || "—"}</p>
        </div>
      </div>
    )},
    { key: "status", header: "Status", render: (c) => <StatusBadge status={c.status} /> },
    { key: "plan", header: "Plan", render: (c) => <span className="text-xs font-medium text-primary">{getStats(c.id).subscription?.subscription_plans?.name || "Free"}</span> },
    { key: "users", header: "Users", className: "tabular-nums", render: (c) => <span className="text-sm text-muted-foreground">{getStats(c.id).users}</span> },
    { key: "employees", header: "Employees", className: "tabular-nums", render: (c) => <span className="text-sm text-muted-foreground">{getStats(c.id).employees}</span> },
    { key: "created", header: "Created", render: (c) => <span className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" })}</span> },
    { key: "actions", header: "", className: "w-[80px]", render: (c) => (
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => setSelectedTenant(c)}><Eye className="h-3.5 w-3.5" /></Button>
        <Button variant="ghost" size="icon" className={`h-7 w-7 ${c.status === "active" ? "text-destructive hover:text-destructive" : "text-success hover:text-success"}`} onClick={() => toggleStatus(c)}>
          {c.status === "active" ? <Ban className="h-3.5 w-3.5" /> : <CheckCircle className="h-3.5 w-3.5" />}
        </Button>
      </div>
    )},
  ];

  return (
    <div className="space-y-6">
      <BPPageHeader title="إدارة المستأجرين" subtitle={`إدارة المستأجرين — ${companies.length} شركة`}>
        <Button onClick={() => setCreateOpen(true)} className="gap-2 shadow-sm"><Plus className="h-4 w-4" /> New Tenant</Button>
      </BPPageHeader>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Total Tenants" value={companies.length} icon={Building2} />
        <KpiCard label="Active" value={active} icon={CheckCircle} trend="up" />
        <KpiCard label="Trial" value={trial} icon={CreditCard} />
        <KpiCard label="Suspended" value={suspended} icon={AlertTriangle} trend={suspended > 0 ? "down" : "neutral"} />
      </div>

      <BPFilterBar>
        <BPSearchInput value={search} onChange={setSearch} placeholder="Search tenants..." />
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="trial">Trial</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
          </SelectContent>
        </Select>
      </BPFilterBar>

      <BPDataTable columns={columns} data={paged} emptyMessage="No tenants found" emptyIcon={Building2}
        page={page} pageSize={pageSize} totalCount={filtered.length} onPageChange={setPage} />

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Register New Tenant</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label className="text-xs text-muted-foreground">Company Name *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1" />
              </div>
              <div><Label className="text-xs text-muted-foreground">Email</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1" /></div>
              <div><Label className="text-xs text-muted-foreground">Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="mt-1" /></div>
              <div>
                <Label className="text-xs text-muted-foreground">Sector</Label>
                <Select value={form.sector} onValueChange={(v) => setForm({ ...form, sector: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="private">Private</SelectItem><SelectItem value="public">Public</SelectItem><SelectItem value="ngo">NGO</SelectItem></SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Currency</Label>
                <Select value={form.default_currency} onValueChange={(v) => setForm({ ...form, default_currency: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{["IQD", "USD", "EUR", "SAR", "AED"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate()} disabled={!form.name.trim() || createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Create Tenant"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tenant Detail Sheet */}
      <Sheet open={!!selectedTenant} onOpenChange={() => setSelectedTenant(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto" side="left">
          {selectedTenant && (() => {
            const s = getStats(selectedTenant.id);
            return (
              <>
                <SheetHeader><SheetTitle>{selectedTenant.name}</SheetTitle></SheetHeader>
                <Tabs defaultValue="overview" className="mt-6">
                  <TabsList className="w-full">
                    <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
                    <TabsTrigger value="notes" className="text-xs">Notes</TabsTrigger>
                  </TabsList>
                  <TabsContent value="overview" className="space-y-5 mt-4">
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: "Users", value: s.users },
                        { label: "Employees", value: s.employees },
                        { label: "Plan", value: s.subscription?.subscription_plans?.name || "Free" },
                      ].map((d) => (
                        <Card key={d.label}><CardContent className="p-3 text-center">
                          <p className="text-lg font-bold text-foreground">{d.value}</p>
                          <p className="text-[11px] text-muted-foreground">{d.label}</p>
                        </CardContent></Card>
                      ))}
                    </div>
                    <div className="space-y-0">
                      {[
                        { label: "Status", value: selectedTenant.status },
                        { label: "Email", value: selectedTenant.email || "—" },
                        { label: "Phone", value: selectedTenant.phone || "—" },
                        { label: "Sector", value: selectedTenant.sector || "—" },
                        { label: "AI Package", value: (s.aiQuota as any)?.package || "—" },
                        { label: "Created", value: new Date(selectedTenant.created_at).toLocaleDateString() },
                      ].map((d) => (
                        <div key={d.label} className="flex justify-between items-center py-2.5 border-b border-border/50">
                          <span className="text-xs text-muted-foreground">{d.label}</span>
                          <span className="text-sm text-foreground">{d.value}</span>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                  <TabsContent value="notes" className="space-y-4 mt-4">
                    <div className="flex gap-2">
                      <Input value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Add internal note..." className="text-sm" />
                      <Button size="icon" disabled={!noteText.trim() || addNoteMutation.isPending} onClick={() => addNoteMutation.mutate()}>
                        <Send className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    {supportNotes.map((n: any) => (
                      <div key={n.id} className="p-3 rounded-lg bg-muted/40 border border-border/50">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[11px] text-muted-foreground">{n.note_type}</span>
                          <span className="text-[11px] text-muted-foreground">{new Date(n.created_at).toLocaleString()}</span>
                        </div>
                        <p className="text-sm text-foreground">{n.note_text}</p>
                      </div>
                    ))}
                    {supportNotes.length === 0 && <EmptyState message="No notes yet" />}
                  </TabsContent>
                </Tabs>
              </>
            );
          })()}
        </SheetContent>
      </Sheet>
    </div>
  );
}
