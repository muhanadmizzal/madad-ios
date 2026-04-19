import { Shield, Search, Filter, Calendar } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";

const actionLabels: Record<string, string> = { INSERT: "إضافة", UPDATE: "تعديل", DELETE: "حذف" };
const tableLabels: Record<string, string> = {
  employees: "الموظفون", departments: "الأقسام", branches: "الفروع",
  leave_requests: "الإجازات", attendance_records: "الحضور", payroll_runs: "الرواتب",
  contracts: "العقود", documents: "المستندات", recruitment_jobs: "التوظيف",
  candidates: "المرشحون", goals: "الأهداف", appraisals: "التقييمات",
  loans: "السلف", announcements: "الإعلانات", onboarding_tasks: "التهيئة",
  exit_clearance: "إنهاء الخدمة", training_courses: "التدريب",
};

export default function AuditLog() {
  const { companyId } = useCompany();
  const [search, setSearch] = useState("");
  const [tableFilter, setTableFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [startDate, setStartDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["audit-logs", companyId],
    queryFn: async () => {
      const { data } = await supabase
        .from("audit_logs")
        .select("*")
        .eq("company_id", companyId!)
        .order("created_at", { ascending: false })
        .limit(500);
      return data || [];
    },
    enabled: !!companyId,
  });

  // Get unique tables from logs
  const uniqueTables = [...new Set(logs.map((l: any) => l.table_name))].sort();

  const filtered = logs.filter((l: any) => {
    const matchesSearch = !search || l.action?.includes(search) || l.table_name?.includes(search) || l.record_id?.includes(search);
    const matchesTable = tableFilter === "all" || l.table_name === tableFilter;
    const matchesAction = actionFilter === "all" || l.action === actionFilter;
    const logDate = l.created_at?.split("T")[0];
    const matchesDate = logDate >= startDate && logDate <= endDate;
    return matchesSearch && matchesTable && matchesAction && matchesDate;
  });

  const insertCount = filtered.filter((l: any) => l.action === "INSERT").length;
  const updateCount = filtered.filter((l: any) => l.action === "UPDATE").length;
  const deleteCount = filtered.filter((l: any) => l.action === "DELETE").length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-heading font-bold text-2xl text-foreground">سجل المراجعة</h1>
        <p className="text-muted-foreground text-sm mt-1">تتبع جميع التغييرات في النظام • {filtered.length} سجل</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 text-primary"><Shield className="h-5 w-5" /></div>
          <div><p className="text-sm text-muted-foreground">إضافة</p><p className="text-2xl font-heading font-bold text-primary">{insertCount}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-accent/10 text-accent-foreground"><Filter className="h-5 w-5" /></div>
          <div><p className="text-sm text-muted-foreground">تعديل</p><p className="text-2xl font-heading font-bold">{updateCount}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-destructive/10 text-destructive"><Shield className="h-5 w-5" /></div>
          <div><p className="text-sm text-muted-foreground">حذف</p><p className="text-2xl font-heading font-bold text-destructive">{deleteCount}</p></div>
        </CardContent></Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-[200px] space-y-2">
              <Label>بحث</Label>
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="بحث في السجل..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-10" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>الجدول</Label>
              <Select value={tableFilter} onValueChange={setTableFilter}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  {uniqueTables.map(t => <SelectItem key={t} value={t}>{tableLabels[t] || t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>الإجراء</Label>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  <SelectItem value="INSERT">إضافة</SelectItem>
                  <SelectItem value="UPDATE">تعديل</SelectItem>
                  <SelectItem value="DELETE">حذف</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>من</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} dir="ltr" className="text-left w-36" />
            </div>
            <div className="space-y-2">
              <Label>إلى</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} dir="ltr" className="text-left w-36" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : filtered.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الإجراء</TableHead>
                  <TableHead>الجدول</TableHead>
                  <TableHead>المعرّف</TableHead>
                  <TableHead>التاريخ والوقت</TableHead>
                  <TableHead>التفاصيل</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((log: any) => {
                  const changes = log.new_values ? Object.keys(log.new_values).slice(0, 3).join("، ") : null;
                  return (
                    <TableRow key={log.id}>
                      <TableCell>
                        <Badge variant="outline" className={
                          log.action === "INSERT" ? "bg-primary/10 text-primary" :
                          log.action === "UPDATE" ? "bg-accent/10 text-accent-foreground" :
                          "bg-destructive/10 text-destructive"
                        }>{actionLabels[log.action] || log.action}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">{tableLabels[log.table_name] || log.table_name}</TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground max-w-[100px] truncate">{log.record_id?.slice(0, 8) || "—"}</TableCell>
                      <TableCell dir="ltr" className="text-sm">{new Date(log.created_at).toLocaleString("ar-IQ")}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                        {changes || "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="py-16 text-center text-muted-foreground">
              <Shield className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p className="font-heading font-medium">لا توجد سجلات مراجعة</p>
              <p className="text-sm mt-1">ستظهر هنا جميع التغييرات التي تتم في النظام</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
