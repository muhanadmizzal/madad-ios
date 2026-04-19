import { useState } from "react";
import { FileText, Plus, Search, Download, AlertTriangle, Send } from "lucide-react";
import { AiModuleInsights } from "@/components/ai/AiModuleInsights";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { useCreateWorkflowInstance } from "@/hooks/useApprovalWorkflow";
import * as XLSX from "xlsx";

const statusLabels: Record<string, string> = { active: "نشط", expired: "منتهي", terminated: "ملغى" };
const statusColors: Record<string, string> = {
  active: "bg-primary/10 text-primary border-primary/20",
  expired: "bg-accent/10 text-accent-foreground border-accent/20",
  terminated: "bg-destructive/10 text-destructive border-destructive/20",
};
const typeLabels: Record<string, string> = { permanent: "دائم", temporary: "مؤقت", contract: "عقد", internship: "تدريب" };

export default function Contracts() {
  const { toast } = useToast();
  const { companyId } = useCompany();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [contractType, setContractType] = useState("permanent");
  const [selectedEmployee, setSelectedEmployee] = useState("");

  const { data: employees = [] } = useQuery({
    queryKey: ["employees-list", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("employees").select("id, name_ar, employee_code").eq("company_id", companyId!);
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: contracts = [], isLoading } = useQuery({
    queryKey: ["all-contracts", companyId],
    queryFn: async () => {
      const { data } = await supabase
        .from("contracts")
        .select("*, employees(name_ar, employee_code)")
        .eq("company_id", companyId!)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!companyId,
  });

  const createWorkflow = useCreateWorkflowInstance();

  const addContract = useMutation({
    mutationFn: async (formData: FormData) => {
      const { data: contract, error } = await supabase.from("contracts").insert({
        company_id: companyId!,
        employee_id: selectedEmployee,
        contract_type: contractType,
        start_date: formData.get("start_date") as string,
        end_date: (formData.get("end_date") as string) || null,
        salary: Number(formData.get("salary")) || 0,
        probation_end_date: (formData.get("probation_end_date") as string) || null,
        notes: (formData.get("notes") as string) || null,
      }).select().single();
      if (error) throw error;
      // Submit for approval
      await createWorkflow.mutateAsync({ requestType: "contract", referenceId: contract.id, companyId: companyId! });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-contracts"] });
      toast({ title: "تم الحفظ", description: "تم إضافة العقد وإرساله للموافقة" });
      setDialogOpen(false);
      setSelectedEmployee("");
      setContractType("permanent");
    },
    onError: (err: Error) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  const updateContractStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("contracts").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-contracts"] });
      toast({ title: "تم التحديث" });
    },
  });

  const renewContract = useMutation({
    mutationFn: async (contract: any) => {
      const startDate = contract.end_date || new Date().toISOString().split("T")[0];
      const endDate = new Date(new Date(startDate).getTime() + 365 * 86400000).toISOString().split("T")[0];
      // Expire old contract
      await supabase.from("contracts").update({ status: "expired" }).eq("id", contract.id);
      // Create new contract
      const { error } = await supabase.from("contracts").insert({
        company_id: companyId!,
        employee_id: contract.employee_id,
        contract_type: contract.contract_type,
        start_date: startDate,
        end_date: endDate,
        salary: contract.salary,
        notes: `تجديد من العقد السابق`,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-contracts"] });
      toast({ title: "تم التجديد", description: "تم تجديد العقد بنجاح لسنة إضافية" });
    },
    onError: (err: Error) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  // Expiring contracts (within 30 days)
  const today = new Date();
  const thirtyDays = new Date(Date.now() + 30 * 86400000);
  const expiringContracts = contracts.filter((c: any) => {
    if (c.status !== "active" || !c.end_date) return false;
    const end = new Date(c.end_date);
    return end >= today && end <= thirtyDays;
  });

  const filtered = contracts.filter((c: any) => {
    const matchSearch = (c.employees?.name_ar || "").includes(search) || (c.employees?.employee_code || "").includes(search);
    const matchStatus = statusFilter === "all" || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const exportContracts = () => {
    const data = filtered.map((c: any) => ({
      "الموظف": c.employees?.name_ar || "—",
      "الكود": c.employees?.employee_code || "—",
      "النوع": typeLabels[c.contract_type] || c.contract_type,
      "البداية": c.start_date,
      "النهاية": c.end_date || "مفتوح",
      "الراتب": c.salary || 0,
      "الحالة": statusLabels[c.status] || c.status,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "العقود");
    XLSX.writeFile(wb, `عقود_${new Date().toLocaleDateString("ar-IQ")}.xlsx`);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading font-bold text-2xl text-foreground">إدارة العقود</h1>
          <p className="text-muted-foreground text-sm mt-1">{contracts.length} عقد مسجّل</p>
        </div>
        <div className="flex gap-2">
          <AiModuleInsights
            module="contracts"
            title="رؤى العقود"
            description="تحليل حالة العقود والمخاطر"
            feature="hr_operational"
            compact
            quickActions={[
              { label: "عقود قريبة الانتهاء", question: "أي موظفين تقترب عقودهم من الانتهاء؟ ما التوصيات لكل حالة؟" },
              { label: "تحليل أنواع العقود", question: "حلل توزيع أنواع العقود وقدم توصيات لتحسين سياسة التعاقد" },
              { label: "مخاطر قانونية", question: "هل توجد مخاطر قانونية في العقود الحالية بناءً على قانون العمل العراقي؟" },
            ]}
          />
          <Button variant="outline" className="gap-2 font-heading" onClick={exportContracts}>
            <Download className="h-4 w-4" />تصدير
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 font-heading"><Plus className="h-4 w-4" />إضافة عقد</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle className="font-heading">إضافة عقد جديد</DialogTitle></DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); addContract.mutate(new FormData(e.currentTarget)); }} className="space-y-4">
                <div className="space-y-2">
                  <Label>الموظف *</Label>
                  <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                    <SelectTrigger><SelectValue placeholder="اختر الموظف" /></SelectTrigger>
                    <SelectContent>
                      {employees.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.name_ar} ({e.employee_code})</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>نوع العقد</Label>
                    <Select value={contractType} onValueChange={setContractType}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="permanent">دائم</SelectItem>
                        <SelectItem value="temporary">مؤقت</SelectItem>
                        <SelectItem value="contract">عقد</SelectItem>
                        <SelectItem value="internship">تدريب</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label>الراتب</Label><Input name="salary" type="number" dir="ltr" className="text-left" /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>تاريخ البداية *</Label><Input name="start_date" type="date" required dir="ltr" className="text-left" /></div>
                  <div className="space-y-2"><Label>تاريخ النهاية</Label><Input name="end_date" type="date" dir="ltr" className="text-left" /></div>
                </div>
                <div className="space-y-2"><Label>نهاية فترة التجربة</Label><Input name="probation_end_date" type="date" dir="ltr" className="text-left" /></div>
                <div className="space-y-2"><Label>ملاحظات</Label><Textarea name="notes" rows={2} /></div>
                <Button type="submit" className="w-full font-heading" disabled={addContract.isPending || !selectedEmployee}>
                  {addContract.isPending ? "جاري الحفظ..." : "حفظ العقد"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Expiring Alert */}
      {expiringContracts.length > 0 && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <p className="font-heading font-bold text-sm text-destructive">{expiringContracts.length} عقد ينتهي خلال 30 يوم</p>
            </div>
            <div className="space-y-1">
              {expiringContracts.map((c: any) => (
                <div key={c.id} className="flex items-center justify-between text-sm">
                  <span>{c.employees?.name_ar}</span>
                  <Badge variant="outline" className="text-xs bg-destructive/10 text-destructive" dir="ltr">{c.end_date}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="بحث بالاسم أو الكود..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-10" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع الحالات</SelectItem>
            <SelectItem value="active">نشط</SelectItem>
            <SelectItem value="expired">منتهي</SelectItem>
            <SelectItem value="terminated">ملغى</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 text-center text-muted-foreground">جاري التحميل...</div>
          ) : filtered.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الموظف</TableHead>
                  <TableHead>النوع</TableHead>
                  <TableHead>البداية</TableHead>
                  <TableHead>النهاية</TableHead>
                  <TableHead>الراتب</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c: any) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{c.employees?.name_ar || "—"}</p>
                        <p className="text-xs text-muted-foreground">{c.employees?.employee_code}</p>
                      </div>
                    </TableCell>
                    <TableCell>{typeLabels[c.contract_type] || c.contract_type}</TableCell>
                    <TableCell dir="ltr" className="text-left">{c.start_date}</TableCell>
                    <TableCell dir="ltr" className="text-left">{c.end_date || "مفتوح"}</TableCell>
                    <TableCell>{(c.salary || 0).toLocaleString("ar-IQ")} د.ع</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusColors[c.status]}>{statusLabels[c.status] || c.status}</Badge>
                    </TableCell>
                    <TableCell>
                      {c.status === "active" && (
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" className="text-primary text-xs font-heading" onClick={() => renewContract.mutate(c)} disabled={renewContract.isPending}>
                            تجديد
                          </Button>
                          <Button size="sm" variant="ghost" className="text-destructive text-xs" onClick={() => updateContractStatus.mutate({ id: c.id, status: "terminated" })}>
                            إلغاء
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-16 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-heading font-medium">لا توجد عقود</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
