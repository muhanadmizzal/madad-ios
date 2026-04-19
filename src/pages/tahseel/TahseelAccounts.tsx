import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCompany } from "@/hooks/useCompany";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, BookOpen } from "lucide-react";
import { toast } from "sonner";

export default function TahseelAccounts() {
  const { t } = useLanguage();
  const { companyId } = useCompany();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ account_code: "", name: "", name_ar: "", account_type: "expense" });

  const { data: accounts } = useQuery({
    queryKey: ["tahseel-accounts", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data } = await supabase.from("tahseel_accounts").select("*").eq("company_id", companyId).order("account_code");
      return data || [];
    },
    enabled: !!companyId,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error("No company");
      const { error } = await supabase.from("tahseel_accounts").insert({
        company_id: companyId,
        account_code: form.account_code,
        name: form.name,
        name_ar: form.name_ar || null,
        account_type: form.account_type,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tahseel-accounts"] });
      toast.success(t("تم إنشاء الحساب", "Account created"));
      setOpen(false);
      setForm({ account_code: "", name: "", name_ar: "", account_type: "expense" });
    },
    onError: () => toast.error(t("خطأ", "Error")),
  });

  const typeColors: Record<string, string> = { asset: "default", liability: "destructive", revenue: "default", expense: "secondary", equity: "outline" };
  const typeLabels: Record<string, string> = { asset: t("أصول", "Asset"), liability: t("التزامات", "Liability"), revenue: t("إيرادات", "Revenue"), expense: t("مصروفات", "Expense"), equity: t("حقوق ملكية", "Equity") };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-bold text-2xl">{t("دليل الحسابات", "Chart of Accounts")}</h1>
          <p className="text-muted-foreground text-sm mt-1">{t("هيكل الحسابات المالية", "Financial accounts structure")}</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button style={{ background: "#0FA968" }}><Plus className="h-4 w-4 me-1" />{t("حساب جديد", "New Account")}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{t("إنشاء حساب", "Create Account")}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>{t("رمز الحساب", "Account Code")}</Label><Input value={form.account_code} onChange={e => setForm(f => ({ ...f, account_code: e.target.value }))} placeholder="1001" /></div>
              <div><Label>{t("الاسم (EN)", "Name (EN)")}</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
              <div><Label>{t("الاسم (AR)", "Name (AR)")}</Label><Input value={form.name_ar} onChange={e => setForm(f => ({ ...f, name_ar: e.target.value }))} /></div>
              <div>
                <Label>{t("النوع", "Type")}</Label>
                <Select value={form.account_type} onValueChange={v => setForm(f => ({ ...f, account_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asset">{t("أصول", "Asset")}</SelectItem>
                    <SelectItem value="liability">{t("التزامات", "Liability")}</SelectItem>
                    <SelectItem value="revenue">{t("إيرادات", "Revenue")}</SelectItem>
                    <SelectItem value="expense">{t("مصروفات", "Expense")}</SelectItem>
                    <SelectItem value="equity">{t("حقوق ملكية", "Equity")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full" onClick={() => createMutation.mutate()} disabled={!form.account_code || !form.name} style={{ background: "#0FA968" }}>
                {t("إنشاء", "Create")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-border/50">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("الرمز", "Code")}</TableHead>
                <TableHead>{t("الاسم", "Name")}</TableHead>
                <TableHead>{t("النوع", "Type")}</TableHead>
                <TableHead>{t("الحالة", "Status")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts?.map(acc => (
                <TableRow key={acc.id}>
                  <TableCell className="font-mono">{acc.account_code}</TableCell>
                  <TableCell>{acc.name_ar || acc.name}</TableCell>
                  <TableCell><Badge variant={typeColors[acc.account_type] as any || "secondary"}>{typeLabels[acc.account_type] || acc.account_type}</Badge></TableCell>
                  <TableCell><Badge variant={acc.is_active ? "default" : "secondary"}>{acc.is_active ? t("نشط", "Active") : t("معطل", "Inactive")}</Badge></TableCell>
                </TableRow>
              ))}
              {!accounts?.length && (
                <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">{t("لا توجد حسابات", "No accounts")}</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
