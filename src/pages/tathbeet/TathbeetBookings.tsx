import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCompany } from "@/hooks/useCompany";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { CalendarCheck, Plus, Search } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function TathbeetBookings() {
  const { t, lang } = useLanguage();
  const { companyId } = useCompany();
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  const { data: bookings = [] } = useQuery({
    queryKey: ["tathbeet-bookings", companyId, statusFilter],
    queryFn: async () => {
      let q = supabase
        .from("tathbeet_bookings")
        .select("*, tathbeet_services(name, name_en), tathbeet_staff_profiles(display_name, employees(name_ar, name_en))")
        .eq("company_id", companyId!)
        .order("booking_date", { ascending: false })
        .order("time_slot", { ascending: false })
        .limit(100);
      if (statusFilter !== "all") q = q.eq("status", statusFilter);
      const { data } = await q;
      return data || [];
    },
    enabled: !!companyId,
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      await supabase.from("tathbeet_bookings").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
      await supabase.from("tathbeet_booking_history").insert({ booking_id: id, status });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tathbeet-bookings"] }); toast.success(t("تم التحديث", "Updated")); },
  });

  const filtered = bookings.filter((b: any) =>
    !search || b.customer_name?.toLowerCase().includes(search.toLowerCase()) || b.customer_phone?.includes(search)
  );

  const statusColor: Record<string, string> = {
    pending: "bg-warning/10 text-warning border-warning/20",
    confirmed: "bg-info/10 text-info border-info/20",
    completed: "bg-success/10 text-success border-success/20",
    cancelled: "bg-destructive/10 text-destructive border-destructive/20",
    no_show: "bg-muted text-muted-foreground",
  };

  const statusLabel: Record<string, { ar: string; en: string }> = {
    pending: { ar: "معلّق", en: "Pending" },
    confirmed: { ar: "مؤكد", en: "Confirmed" },
    completed: { ar: "مكتمل", en: "Completed" },
    cancelled: { ar: "ملغى", en: "Cancelled" },
    no_show: { ar: "لم يحضر", en: "No Show" },
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-heading font-extrabold text-2xl">{t("الحجوزات", "Bookings")}</h1>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder={t("بحث بالاسم أو الهاتف...", "Search by name or phone...")} value={search} onChange={(e) => setSearch(e.target.value)} className="ps-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("الكل", "All")}</SelectItem>
            <SelectItem value="pending">{t("معلّق", "Pending")}</SelectItem>
            <SelectItem value="confirmed">{t("مؤكد", "Confirmed")}</SelectItem>
            <SelectItem value="completed">{t("مكتمل", "Completed")}</SelectItem>
            <SelectItem value="cancelled">{t("ملغى", "Cancelled")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <Card className="border-border/50"><CardContent className="p-8 text-center text-muted-foreground"><CalendarCheck className="h-10 w-10 mx-auto mb-2 opacity-30" /><p>{t("لا توجد حجوزات", "No bookings found")}</p></CardContent></Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((b: any) => {
            const staff = b.tathbeet_staff_profiles;
            const staffName = staff?.display_name || staff?.employees?.name_ar || staff?.employees?.name_en || "—";
            const serviceName = lang === "ar" ? b.tathbeet_services?.name : (b.tathbeet_services?.name_en || b.tathbeet_services?.name);
            return (
              <Card key={b.id} className="border-border/50">
                <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-4">
                    <div className="text-center min-w-[60px]">
                      <p className="text-xs text-muted-foreground">{b.booking_date}</p>
                      <p className="font-mono font-bold text-sm">{b.time_slot?.slice(0, 5)}</p>
                    </div>
                    <div>
                      <p className="font-medium text-sm">{b.customer_name}</p>
                      <p className="text-xs text-muted-foreground">{serviceName} — {staffName}</p>
                      {b.customer_phone && <p className="text-xs text-muted-foreground">{b.customer_phone}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={statusColor[b.status] || ""}>{t(statusLabel[b.status]?.ar || b.status, statusLabel[b.status]?.en || b.status)}</Badge>
                    {b.status === "pending" && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: b.id, status: "confirmed" })}>{t("تأكيد", "Confirm")}</Button>
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => updateStatus.mutate({ id: b.id, status: "cancelled" })}>{t("إلغاء", "Cancel")}</Button>
                      </>
                    )}
                    {b.status === "confirmed" && (
                      <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: b.id, status: "completed" })}>{t("إتمام", "Complete")}</Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
