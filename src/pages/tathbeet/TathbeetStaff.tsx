import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCompany } from "@/hooks/useCompany";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Users, Plus, UserPlus } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function TathbeetStaff() {
  const { t } = useLanguage();
  const { companyId } = useCompany();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [displayName, setDisplayName] = useState("");

  // Fetch Tamkeen employees
  const { data: employees = [] } = useQuery({
    queryKey: ["tamkeen-employees", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("employees").select("id, name_ar, name_en, status").eq("company_id", companyId!).eq("status", "active").order("name_ar");
      return data || [];
    },
    enabled: !!companyId,
  });

  // Fetch existing staff profiles
  const { data: staffProfiles = [] } = useQuery({
    queryKey: ["tathbeet-staff", companyId],
    queryFn: async () => {
      const { data } = await supabase
        .from("tathbeet_staff_profiles")
        .select("*, employees(name_ar, name_en, status)")
        .eq("company_id", companyId!);
      return data || [];
    },
    enabled: !!companyId,
  });

  const existingEmployeeIds = staffProfiles.map((sp: any) => sp.employee_id);
  const availableEmployees = employees.filter((e: any) => !existingEmployeeIds.includes(e.id));

  const addStaff = useMutation({
    mutationFn: async () => {
      const emp = employees.find((e: any) => e.id === selectedEmployee);
      await supabase.from("tathbeet_staff_profiles").insert({
        company_id: companyId!,
        employee_id: selectedEmployee,
        display_name: displayName || emp?.name_ar || "",
      });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tathbeet-staff"] }); setOpen(false); setSelectedEmployee(""); setDisplayName(""); toast.success(t("تمت الإضافة", "Added")); },
  });

  const toggleBooking = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      await supabase.from("tathbeet_staff_profiles").update({ booking_enabled: enabled, updated_at: new Date().toISOString() }).eq("id", id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tathbeet-staff"] }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-heading font-extrabold text-2xl">{t("موظفي تثبيت", "Tathbeet Staff")}</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><UserPlus className="h-4 w-4 me-1" />{t("إضافة موظف", "Add Staff")}</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{t("إضافة موظف من الموارد البشرية", "Add Staff from HR")}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>{t("اختر موظف", "Select Employee")}</Label>
                <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                  <SelectTrigger><SelectValue placeholder={t("اختر من قائمة الموظفين", "Select from employee list")} /></SelectTrigger>
                  <SelectContent>
                    {availableEmployees.map((e: any) => (
                      <SelectItem key={e.id} value={e.id}>{e.name_ar || e.name_en || e.id}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t("اسم العرض (اختياري)", "Display Name (optional)")}</Label>
                <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder={t("يُستخدم في صفحة الحجز", "Used on booking page")} />
              </div>
              <Button onClick={() => addStaff.mutate()} disabled={!selectedEmployee}>{t("إضافة", "Add")}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <p className="text-sm text-muted-foreground">{t("الموظفون يتم استيرادهم من وحدة الموارد البشرية. اختر من يمكنه استقبال الحجوزات.", "Staff are imported from HR module. Select who can accept bookings.")}</p>

      {staffProfiles.length === 0 ? (
        <Card className="border-border/50"><CardContent className="p-8 text-center text-muted-foreground"><Users className="h-10 w-10 mx-auto mb-2 opacity-30" /><p>{t("لم تتم إضافة موظفين بعد", "No staff added yet")}</p></CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {staffProfiles.map((sp: any) => (
            <Card key={sp.id} className="border-border/50">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-heading font-bold text-sm">{sp.display_name || sp.employees?.name_ar || sp.employees?.name_en || "—"}</h3>
                    <p className="text-xs text-muted-foreground">{t("من الموارد البشرية", "From HR")}</p>
                  </div>
                  <Badge className={sp.booking_enabled ? "bg-success/10 text-success border-success/20" : "bg-muted text-muted-foreground"}>
                    {sp.booking_enabled ? t("نشط", "Active") : t("معطّل", "Disabled")}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{t("استقبال الحجوزات", "Accept Bookings")}</span>
                  <Switch checked={sp.booking_enabled} onCheckedChange={(v) => toggleBooking.mutate({ id: sp.id, enabled: v })} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
