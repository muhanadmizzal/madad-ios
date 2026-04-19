import { useLanguage } from "@/contexts/LanguageContext";
import { useCompany } from "@/hooks/useCompany";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CreditCard } from "lucide-react";

export default function TahseelPayments() {
  const { t } = useLanguage();
  const { companyId } = useCompany();

  const { data: payments } = useQuery({
    queryKey: ["tahseel-payments", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data } = await supabase.from("tahseel_payment_records").select("*").eq("company_id", companyId).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!companyId,
  });

  const methodLabels: Record<string, string> = { cash: t("نقدي", "Cash"), bank_transfer: t("تحويل بنكي", "Bank Transfer"), card: t("بطاقة", "Card"), wallet: t("محفظة", "Wallet") };

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h1 className="font-heading font-bold text-2xl flex items-center gap-2">
          <CreditCard className="h-6 w-6" style={{ color: "#0FA968" }} />
          {t("المدفوعات", "Payments")}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">{t("سجل المدفوعات والتحصيلات", "Payment and collection records")}</p>
      </div>

      <Card className="border-border/50">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("المبلغ", "Amount")}</TableHead>
                <TableHead>{t("طريقة الدفع", "Method")}</TableHead>
                <TableHead>{t("التاريخ", "Date")}</TableHead>
                <TableHead>{t("المرجع", "Reference")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments?.map(p => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{Number(p.amount).toLocaleString()} IQD</TableCell>
                  <TableCell><Badge variant="outline">{methodLabels[p.payment_method] || p.payment_method}</Badge></TableCell>
                  <TableCell>{p.payment_date}</TableCell>
                  <TableCell className="font-mono text-xs">{p.reference_number || "—"}</TableCell>
                </TableRow>
              ))}
              {!payments?.length && (
                <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">{t("لا توجد مدفوعات", "No payments")}</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
