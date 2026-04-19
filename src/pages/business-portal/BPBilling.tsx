import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  bp, StatusBadge, EmptyState, KpiCard, BPPageHeader, BPSection, BPPageSkeleton, BPErrorState,
  BPDataTable, type BPColumn,
} from "@/components/business-portal/BPDesignSystem";
import { Clock, CheckCircle2, AlertTriangle, TrendingUp, Eye, DollarSign, BarChart3, ArrowUpDown } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { toast } from "@/hooks/use-toast";

export default function BPBilling() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [detailInvoice, setDetailInvoice] = useState<any>(null);
  const [statusDialog, setStatusDialog] = useState<{ sub: any; newStatus: string } | null>(null);
  const [page, setPage] = useState(1);
  const [subsPage, setSubsPage] = useState(1);
  const [tab, setTab] = useState<"invoices" | "subscriptions">("invoices");
  const pageSize = 20;

  const { data: invoices = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["bp-invoices"],
    queryFn: async () => {
      const { data, error } = await supabase.from("billing_invoices").select("*, invoice_items(*)").order("created_at", { ascending: false }).limit(500);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: companies = [] } = useQuery({
    queryKey: ["bp-companies"],
    queryFn: async () => { const { data } = await supabase.from("companies").select("id, name"); return data || []; },
  });

  const { data: metrics } = useQuery({
    queryKey: ["bp-revenue-metrics"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_platform_revenue_metrics");
      if (error) throw error;
      return data as any;
    },
  });

  const { data: subscriptions = [] } = useQuery({
    queryKey: ["bp-billing-subs"],
    queryFn: async () => {
      // Fetch from both subscription systems and merge
      const [tenantSubs, madadSubs] = await Promise.all([
        supabase
          .from("tenant_subscriptions")
          .select("*, subscription_plans(name, price_monthly), companies(name)")
          .order("created_at", { ascending: false }),
        supabase
          .from("madad_tenant_subscriptions")
          .select("*, madad_packages(key, name_en, name_ar, monthly_price, yearly_price, currency), companies(name)")
          .order("created_at", { ascending: false }),
      ]);

      const tenantRows = (tenantSubs.data || []).map((s: any) => ({
        ...s,
        _source: "tenant_subscriptions" as const,
        _plan_name: s.subscription_plans?.name || "—",
        _monthly_price: s.subscription_plans?.price_monthly || s.custom_monthly_price || 0,
        _package_key: null,
      }));

      const madadRows = (madadSubs.data || []).map((s: any) => ({
        ...s,
        _source: "madad_tenant_subscriptions" as const,
        _plan_name: s.madad_packages?.name_en || s.madad_packages?.name_ar || "—",
        _monthly_price: s.madad_packages?.monthly_price || s.custom_price || 0,
        _package_key: s.madad_packages?.key || null,
        companies: s.companies,
      }));

      // Deduplicate: if a company has both, prefer madad_tenant_subscriptions for active ones
      const activeCompanies = new Set(
        madadRows.filter((r: any) => r.status === "active").map((r: any) => r.company_id)
      );
      const filtered = tenantRows.filter(
        (r: any) => !(r.status === "active" && activeCompanies.has(r.company_id))
      );

      return [...madadRows, ...filtered].sort(
        (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    },
  });

  const transitionStatus = useMutation({
    mutationFn: async ({ subId, newStatus, source }: { subId: string; newStatus: string; source?: string }) => {
      if (source === "madad_tenant_subscriptions") {
        // Direct update for madad subscriptions
        const { error } = await supabase
          .from("madad_tenant_subscriptions")
          .update({ status: newStatus, updated_at: new Date().toISOString() })
          .eq("id", subId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.rpc("transition_subscription_status", {
          p_subscription_id: subId,
          p_new_status: newStatus,
        });
        if (error) throw error;
        if (!(data as any)?.success) throw new Error((data as any)?.error || "Failed");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bp-billing-subs"] });
      queryClient.invalidateQueries({ queryKey: ["bp-revenue-metrics"] });
      toast({ title: "Status updated" });
      setStatusDialog(null);
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  if (isLoading) return <BPPageSkeleton />;
  if (isError) return <BPErrorState onRetry={() => refetch()} />;

  const getCompanyName = (id: string) => companies.find((c: any) => c.id === id)?.name || "—";
  const paid = invoices.filter((i: any) => i.status === "paid");
  const pending = invoices.filter((i: any) => i.status === "pending");
  const overdue = invoices.filter((i: any) => i.status === "overdue");
  const totalPaid = paid.reduce((s: number, i: any) => s + Number(i.amount), 0);
  const totalPending = pending.reduce((s: number, i: any) => s + Number(i.amount), 0);
  const totalOverdue = overdue.reduce((s: number, i: any) => s + Number(i.amount), 0);

  const mrr = metrics?.mrr || 0;
  const arr = metrics?.arr || 0;

  const revenueByMonth = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(); d.setMonth(d.getMonth() - (5 - i));
    const month = d.toLocaleDateString("en-US", { month: "short" });
    const monthPaid = paid.filter((inv: any) => {
      const invDate = new Date(inv.paid_at || inv.created_at);
      return invDate.getMonth() === d.getMonth() && invDate.getFullYear() === d.getFullYear();
    }).reduce((s: number, inv: any) => s + Number(inv.amount), 0);
    return { month, revenue: monthPaid };
  });

  const paged = invoices.slice((page - 1) * pageSize, page * pageSize);
  const pagedSubs = subscriptions.slice((subsPage - 1) * pageSize, subsPage * pageSize);

  // Approve/reject payment
  const handlePayment = async (invId: string, action: "confirmed" | "rejected") => {
    const update: any = { payment_status: action };
    if (action === "confirmed") {
      update.status = "paid";
      update.paid_at = new Date().toISOString();
      update.verified_by = user?.id;
      update.verified_at = new Date().toISOString();
    }
    await supabase.from("billing_invoices").update(update).eq("id", invId);
    queryClient.invalidateQueries({ queryKey: ["bp-invoices"] });
    toast({ title: action === "confirmed" ? "Payment approved" : "Payment rejected" });
  };

  const invoiceColumns: BPColumn<any>[] = [
    { key: "number", header: "Invoice #", render: (inv) => <span className="font-mono text-xs text-primary font-medium">{inv.invoice_number}</span> },
    { key: "tenant", header: "Tenant", render: (inv) => <span className="text-sm text-muted-foreground">{getCompanyName(inv.company_id)}</span> },
    { key: "amount", header: "Amount", render: (inv) => <span className="text-sm font-semibold text-foreground tabular-nums">${Number(inv.amount).toLocaleString()}</span> },
    { key: "status", header: "Status", render: (inv) => <StatusBadge status={inv.status} /> },
    { key: "payment", header: "Payment", render: (inv) => {
      const ps = inv.payment_status || "unpaid";
      return <StatusBadge status={ps === "submitted" ? "pending" : ps === "confirmed" ? "paid" : ps} />;
    }},
    { key: "due", header: "Due Date", render: (inv) => <span className="text-xs text-muted-foreground">{new Date(inv.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span> },
    { key: "actions", header: "", className: "w-[160px]", render: (inv) => {
      const ps = inv.payment_status || "unpaid";
      return (
        <div className="flex gap-1">
          {ps === "submitted" && (
            <>
              <Button variant="default" size="sm" className="text-[10px] h-7" onClick={() => handlePayment(inv.id, "confirmed")}>Approve</Button>
              <Button variant="destructive" size="sm" className="text-[10px] h-7" onClick={() => handlePayment(inv.id, "rejected")}>Reject</Button>
            </>
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => setDetailInvoice(inv)}>
            <Eye className="h-3.5 w-3.5" />
          </Button>
        </div>
      );
    }},
  ];

  const subColumns: BPColumn<any>[] = [
    { key: "tenant", header: "Tenant", render: (s) => <span className="font-medium text-sm">{s.companies?.name || "—"}</span> },
    { key: "plan", header: "Package / Plan", render: (s) => (
      <div className="flex items-center gap-1.5">
        <span className="text-xs font-medium text-primary">{s._plan_name || s.subscription_plans?.name || "—"}</span>
        {s._package_key && <Badge variant="outline" className="text-[9px] uppercase">{s._package_key}</Badge>}
      </div>
    )},
    { key: "price", header: "Monthly", render: (s) => (
      <span className="text-xs tabular-nums font-medium">{s._monthly_price ? `${Number(s._monthly_price).toLocaleString()}` : "—"}</span>
    )},
    { key: "cycle", header: "Cycle", render: (s) => <span className="text-xs text-muted-foreground">{s.billing_cycle === "yearly" ? "Yearly" : "Monthly"}</span> },
    { key: "status", header: "Status", render: (s) => <StatusBadge status={s.status} /> },
    { key: "next", header: "End Date", render: (s) => {
      const endDate = s.end_date || s.next_billing_date;
      return <span className="text-xs text-muted-foreground">{endDate ? new Date(endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}</span>;
    }},
    { key: "actions", header: "", className: "w-[120px]", render: (s) => (
      <Select onValueChange={(v) => setStatusDialog({ sub: s, newStatus: v })}>
        <SelectTrigger className="h-7 text-xs w-[100px]">
          <SelectValue placeholder="Change..." />
        </SelectTrigger>
        <SelectContent>
          {["active", "overdue", "suspended", "cancelled"].filter(st => st !== s.status).map(st => (
            <SelectItem key={st} value={st} className="text-xs">{st}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    )},
  ];

  return (
    <div className="space-y-6">
      <BPPageHeader title="الفواتير والمالية" subtitle="الفواتير والإيرادات" />

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <KpiCard label="MRR" value={`$${Math.round(mrr).toLocaleString()}`} icon={DollarSign} trend="up" />
        <KpiCard label="ARR" value={`$${Math.round(arr).toLocaleString()}`} icon={BarChart3} />
        <KpiCard label="Collected" value={`$${totalPaid.toLocaleString()}`} icon={CheckCircle2} trend="up" />
        <KpiCard label="Pending" value={`$${totalPending.toLocaleString()}`} icon={Clock} />
        <KpiCard label="Overdue" value={`$${totalOverdue.toLocaleString()}`} icon={AlertTriangle} trend={totalOverdue > 0 ? "down" : "neutral"} />
        <KpiCard label="Active Subs" value={String(metrics?.active_subscriptions || 0)} icon={TrendingUp} />
      </div>

      <BPSection title="Revenue Trend (6 months)">
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={revenueByMonth}>
            <defs>
              <linearGradient id="bp-rev" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={bp.colors.success} stopOpacity={0.15} />
                <stop offset="95%" stopColor={bp.colors.success} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={bp.gridStroke} />
            <XAxis dataKey="month" fontSize={11} tick={{ fill: bp.tickFill }} axisLine={false} tickLine={false} />
            <YAxis fontSize={11} tick={{ fill: bp.tickFill }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={bp.tooltip} />
            <Area type="monotone" dataKey="revenue" stroke={bp.colors.success} fill="url(#bp-rev)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </BPSection>

      <div className="flex gap-2 border-b border-border pb-2">
        <Button variant={tab === "invoices" ? "default" : "ghost"} size="sm" className="text-xs" onClick={() => setTab("invoices")}>Invoices</Button>
        <Button variant={tab === "subscriptions" ? "default" : "ghost"} size="sm" className="text-xs gap-1" onClick={() => setTab("subscriptions")}>
          <ArrowUpDown className="h-3 w-3" />Subscriptions
        </Button>
      </div>

      {tab === "invoices" && (
        <BPDataTable columns={invoiceColumns} data={paged} emptyMessage="No invoices"
          page={page} pageSize={pageSize} totalCount={invoices.length} onPageChange={setPage} />
      )}

      {tab === "subscriptions" && (
        <BPDataTable columns={subColumns} data={pagedSubs} emptyMessage="No subscriptions"
          page={subsPage} pageSize={pageSize} totalCount={subscriptions.length} onPageChange={setSubsPage} />
      )}

      {/* Invoice Detail Sheet */}
      <Sheet open={!!detailInvoice} onOpenChange={() => setDetailInvoice(null)}>
        <SheetContent className="w-[420px] sm:w-[500px]">
          <SheetHeader><SheetTitle>Invoice {detailInvoice?.invoice_number}</SheetTitle></SheetHeader>
          {detailInvoice && (
            <div className="mt-6 space-y-4">
              {[
                { label: "Tenant", value: getCompanyName(detailInvoice.company_id) },
                { label: "Due Date", value: new Date(detailInvoice.due_date).toLocaleDateString("en-US") },
              ].map(d => (
                <div key={d.label} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{d.label}</span>
                  <span className="font-medium text-foreground">{d.value}</span>
                </div>
              ))}
              <div className="flex justify-between text-sm items-center">
                <span className="text-muted-foreground">Status</span>
                <StatusBadge status={detailInvoice.status} />
              </div>
              <div className="border-t border-border pt-4">
                <p className="text-xs font-medium text-muted-foreground mb-3">Line Items</p>
                {(detailInvoice.invoice_items || []).map((item: any, i: number) => (
                  <div key={i} className="flex justify-between py-2.5 border-b border-border/30">
                    <div>
                      <span className="text-sm text-foreground">{item.description}</span>
                      <span className="text-[11px] text-muted-foreground ml-2">{item.item_type}</span>
                    </div>
                    <span className="text-sm font-medium text-foreground tabular-nums">${Number(item.amount).toLocaleString()}</span>
                  </div>
                ))}
                {(!detailInvoice.invoice_items || detailInvoice.invoice_items.length === 0) && (
                  <p className="text-sm text-muted-foreground text-center py-4">No line items</p>
                )}
              </div>
              <div className="flex justify-between pt-3 border-t border-border">
                <span className="text-sm font-bold text-foreground">Total</span>
                <span className="text-lg font-bold text-primary tabular-nums">${Number(detailInvoice.amount).toLocaleString()}</span>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Status Transition Dialog */}
      <Dialog open={!!statusDialog} onOpenChange={() => setStatusDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Subscription Status</DialogTitle>
          </DialogHeader>
          {statusDialog && (
            <div className="space-y-3 py-2">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{statusDialog.sub.companies?.name}</span>
              </p>
              <div className="flex items-center gap-2 text-sm">
                <StatusBadge status={statusDialog.sub.status} />
                <span className="text-muted-foreground">→</span>
                <StatusBadge status={statusDialog.newStatus} />
              </div>
              {statusDialog.newStatus === "suspended" && (
                <p className="text-xs text-destructive">⚠ Suspending will restrict tenant access to premium features.</p>
              )}
              {statusDialog.newStatus === "cancelled" && (
                <p className="text-xs text-destructive">⚠ Cancelling will lock the tenant out of most features.</p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setStatusDialog(null)}>Cancel</Button>
            <Button
              variant={["suspended", "cancelled"].includes(statusDialog?.newStatus || "") ? "destructive" : "default"}
              onClick={() => statusDialog && transitionStatus.mutate({ subId: statusDialog.sub.id, newStatus: statusDialog.newStatus, source: statusDialog.sub._source })}
              disabled={transitionStatus.isPending}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
