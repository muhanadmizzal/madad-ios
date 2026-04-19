import { ReactNode, useState } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LucideIcon, Search, AlertCircle, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";

// ─── Semantic class tokens ───────────────────────────────────────────────────

export const bp = {
  // Charts (CSS values for Recharts)
  gridStroke: "hsl(var(--border))",
  tickFill: "hsl(var(--muted-foreground))",
  tooltip: {
    backgroundColor: "hsl(var(--card))",
    border: "1px solid hsl(var(--border))",
    borderRadius: "8px",
    color: "hsl(var(--foreground))",
    fontSize: 12,
    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
  },
  colors: {
    primary: "hsl(var(--primary))",
    success: "hsl(var(--status-success))",
    warning: "hsl(var(--status-warning))",
    danger: "hsl(var(--destructive))",
    info: "hsl(var(--status-info))",
    muted: "hsl(var(--muted-foreground))",
    secondary: "hsl(var(--secondary))",
  },
} as const;

// ─── Status badge ────────────────────────────────────────────────────────────

type StatusType = "success" | "warning" | "danger" | "info" | "neutral";

const statusTypeMap: Record<string, StatusType> = {
  active: "success", paid: "success", approved: "success", resolved: "success",
  trial: "warning", pending: "warning", open: "warning",
  overdue: "danger", suspended: "danger", rejected: "danger",
  in_progress: "info",
  cancelled: "neutral", inactive: "neutral", closed: "neutral",
};

const statusLabels: Record<string, string> = {
  active: "Active", paid: "Paid", approved: "Approved", resolved: "Resolved",
  trial: "Trial", pending: "Pending", open: "Open",
  overdue: "Overdue", suspended: "Suspended", rejected: "Rejected",
  in_progress: "In Progress",
  cancelled: "Cancelled", inactive: "Inactive", closed: "Closed",
};

const statusStyles: Record<StatusType, string> = {
  success: "bg-[hsl(var(--status-success-bg))] text-[hsl(var(--status-success-foreground))] dark:bg-[hsl(var(--status-success)/0.15)] dark:text-[hsl(var(--status-success))]",
  warning: "bg-[hsl(var(--status-warning-bg))] text-[hsl(var(--status-warning-foreground))] dark:bg-[hsl(var(--status-warning)/0.15)] dark:text-[hsl(var(--status-warning))]",
  danger: "bg-[hsl(var(--status-danger-bg))] text-[hsl(var(--status-danger-foreground))] dark:bg-[hsl(var(--status-danger)/0.15)] dark:text-[hsl(var(--status-danger))]",
  info: "bg-[hsl(var(--status-info-bg))] text-[hsl(var(--status-info-foreground))] dark:bg-[hsl(var(--status-info)/0.15)] dark:text-[hsl(var(--status-info))]",
  neutral: "bg-[hsl(var(--status-neutral-bg))] text-[hsl(var(--status-neutral-foreground))] dark:bg-[hsl(var(--status-neutral)/0.15)] dark:text-[hsl(var(--status-neutral))]",
};

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  const type = statusTypeMap[status] || "neutral";
  return (
    <span className={cn("text-[11px] px-2.5 py-1 rounded-full font-medium inline-flex items-center", statusStyles[type])}>
      {label || statusLabels[status] || status}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: string }) {
  const type: StatusType = priority === "high" ? "danger" : priority === "medium" ? "info" : "neutral";
  return (
    <span className={cn("text-[11px] px-2 py-0.5 rounded-full font-medium capitalize", statusStyles[type])}>
      {priority}
    </span>
  );
}

// ─── Page header ─────────────────────────────────────────────────────────────

export function BPPageHeader({ title, subtitle, children }: { title: string; subtitle?: string; children?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h1 className="text-xl font-bold text-foreground tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {children && <div className="flex items-center gap-2 shrink-0">{children}</div>}
    </div>
  );
}

// ─── KPI Card ────────────────────────────────────────────────────────────────

export function KpiCard({ label, value, delta, icon: Icon, trend }: {
  label: string; value: string | number; delta?: string; icon: LucideIcon; trend?: "up" | "down" | "neutral";
}) {
  const trendColor = trend === "down" ? "text-destructive" : trend === "up" ? "text-success" : "text-muted-foreground";
  return (
    <Card className="border border-border shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="h-4 w-4 text-primary" />
          </div>
          {delta && <span className={cn("text-[11px] font-medium", trendColor)}>{delta}</span>}
        </div>
        <p className="text-2xl font-bold text-foreground tracking-tight">{value}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">{label}</p>
      </CardContent>
    </Card>
  );
}

// ─── Section card ────────────────────────────────────────────────────────────

export function BPSection({ title, subtitle, children, actions, noPadding, className }: {
  title?: string; subtitle?: string; children: ReactNode; actions?: ReactNode; noPadding?: boolean; className?: string;
}) {
  return (
    <Card className={cn("border border-border shadow-sm", className)}>
      {title && (
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <div>
            <h3 className="text-sm font-semibold text-foreground">{title}</h3>
            {subtitle && <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
          {actions}
        </div>
      )}
      <CardContent className={cn(noPadding ? "p-0" : "px-5 pb-5", !title && !noPadding && "pt-5")}>
        {children}
      </CardContent>
    </Card>
  );
}

// ─── Filter bar ──────────────────────────────────────────────────────────────

export function BPFilterBar({ children }: { children: ReactNode }) {
  return <div className="flex items-center gap-3 flex-wrap">{children}</div>;
}

export function BPSearchInput({ value, onChange, placeholder = "Search..." }: {
  value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div className="relative flex-1 min-w-[220px]">
      <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} className="pr-10" />
    </div>
  );
}

// ─── Empty state ─────────────────────────────────────────────────────────────

export function EmptyState({ message = "No data available", icon: Icon }: { message?: string; icon?: LucideIcon }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
      {Icon && <Icon className="h-8 w-8 mb-3 opacity-30" />}
      <p className="text-sm">{message}</p>
    </div>
  );
}

// ─── Error state ─────────────────────────────────────────────────────────────

export function BPErrorState({ message = "Failed to load data", onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
      <AlertCircle className="h-8 w-8 opacity-40 text-destructive" />
      <p className="text-sm">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="gap-2 mt-1">
          <RefreshCw className="h-3.5 w-3.5" /> Retry
        </Button>
      )}
    </div>
  );
}

// ─── Loading skeleton ────────────────────────────────────────────────────────

export function BPPageSkeleton({ cards = 4, table = true }: { cards?: number; table?: boolean }) {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-1">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: cards }).map((_, i) => <Skeleton key={i} className="h-[100px] rounded-xl" />)}
      </div>
      {table && <Skeleton className="h-[300px] rounded-xl" />}
    </div>
  );
}

// ─── Data Table ──────────────────────────────────────────────────────────────

export interface BPColumn<T> {
  key: string;
  header: string;
  className?: string;
  render: (row: T) => ReactNode;
}

export function BPDataTable<T extends Record<string, any>>({
  columns,
  data,
  emptyMessage = "No data",
  emptyIcon,
  page,
  pageSize = 20,
  totalCount,
  onPageChange,
}: {
  columns: BPColumn<T>[];
  data: T[];
  emptyMessage?: string;
  emptyIcon?: LucideIcon;
  page?: number;
  pageSize?: number;
  totalCount?: number;
  onPageChange?: (p: number) => void;
}) {
  const hasPagination = page !== undefined && onPageChange && totalCount !== undefined;
  const totalPages = hasPagination ? Math.ceil(totalCount / pageSize) : 1;

  return (
    <BPSection noPadding>
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            {columns.map((col) => (
              <TableHead key={col.key} className={cn("text-xs font-medium text-muted-foreground", col.className)}>
                {col.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row, i) => (
            <TableRow key={(row as any).id || i} className="hover:bg-muted/20 transition-colors">
              {columns.map((col) => (
                <TableCell key={col.key} className={col.className}>
                  {col.render(row)}
                </TableCell>
              ))}
            </TableRow>
          ))}
          {data.length === 0 && (
            <TableRow>
              <TableCell colSpan={columns.length}>
                <EmptyState message={emptyMessage} icon={emptyIcon} />
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      {hasPagination && totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-border">
          <p className="text-xs text-muted-foreground">
            Page {page} of {totalPages} · {totalCount} items
          </p>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </BPSection>
  );
}

// ─── Approve/Reject action buttons ───────────────────────────────────────────

export function BPApproveRejectActions({ onApprove, onReject, isPending }: {
  onApprove: () => void; onReject: () => void; isPending?: boolean;
}) {
  return (
    <div className="flex gap-1">
      <Button size="sm" className="h-7 text-xs gap-1 bg-success hover:bg-success/90 text-success-foreground" onClick={onApprove} disabled={isPending}>
        Approve
      </Button>
      <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-destructive hover:text-destructive" onClick={onReject} disabled={isPending}>
        Reject
      </Button>
    </div>
  );
}

// ─── Live indicator badge ────────────────────────────────────────────────────

export function BPLiveBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full border border-success/30 bg-success/5 text-success">
      <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
      Live
    </span>
  );
}

// ─── Alert stat row (for dashboard quick stats) ──────────────────────────────

export function BPAlertStat({ label, value, icon: Icon, alert }: {
  label: string; value: string | number; icon: LucideIcon; alert?: boolean;
}) {
  return (
    <div className={cn(
      "flex items-center gap-3 p-3 rounded-lg transition-colors",
      alert ? "bg-destructive/5 border border-destructive/10" : "bg-muted/40"
    )}>
      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <Icon className="h-3.5 w-3.5 text-primary" />
      </div>
      <p className="text-xs text-muted-foreground flex-1">{label}</p>
      <span className="text-lg font-bold text-foreground tabular-nums">{value}</span>
    </div>
  );
}

// Re-exports for backwards compatibility
export const BP = bp;
export const SectionHeader = BPPageHeader;
