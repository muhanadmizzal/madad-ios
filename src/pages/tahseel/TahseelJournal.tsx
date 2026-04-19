import { useLanguage } from "@/contexts/LanguageContext";
import { useCompany } from "@/hooks/useCompany";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BookOpen } from "lucide-react";

export default function TahseelJournal() {
  const { t } = useLanguage();
  const { companyId } = useCompany();

  const { data: entries } = useQuery({
    queryKey: ["tahseel-journal", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data } = await supabase.from("tahseel_journal_entries").select("*").eq("company_id", companyId).order("entry_date", { ascending: false });
      return data || [];
    },
    enabled: !!companyId,
  });

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h1 className="font-heading font-bold text-2xl flex items-center gap-2">
          <BookOpen className="h-6 w-6" style={{ color: "#0FA968" }} />
          {t("دفتر اليومية", "Journal Ledger")}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">{t("قيود محاسبية مزدوجة القيد", "Double-entry journal entries")}</p>
      </div>

      <Card className="border-border/50">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("رقم القيد", "Entry #")}</TableHead>
                <TableHead>{t("التاريخ", "Date")}</TableHead>
                <TableHead>{t("الوصف", "Description")}</TableHead>
                <TableHead>{t("المصدر", "Source")}</TableHead>
                <TableHead>{t("الحالة", "Status")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries?.map(e => (
                <TableRow key={e.id}>
                  <TableCell className="font-mono text-xs">{e.entry_number}</TableCell>
                  <TableCell>{e.entry_date}</TableCell>
                  <TableCell>{e.description || "—"}</TableCell>
                  <TableCell><Badge variant="outline">{e.source_module || t("يدوي", "Manual")}</Badge></TableCell>
                  <TableCell><Badge variant={e.status === "posted" ? "default" : "secondary"}>{e.status}</Badge></TableCell>
                </TableRow>
              ))}
              {!entries?.length && (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">{t("لا توجد قيود", "No entries")}</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
