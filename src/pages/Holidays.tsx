import { useState } from "react";
import { Plus, Calendar, Trash2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HolidayCalendar, IRAQI_HOLIDAYS_2026 } from "@/components/holidays/HolidayCalendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";

export default function Holidays() {
  const [dialog, setDialog] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [region, setRegion] = useState("all");
  const [viewMode, setViewMode] = useState<"table" | "calendar">("calendar");
  const { toast } = useToast();
  const { companyId } = useCompany();
  const queryClient = useQueryClient();

  const { data: holidays = [] } = useQuery({
    queryKey: ["holidays", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("public_holidays").select("*").eq("company_id", companyId!).order("date");
      return data || [];
    },
    enabled: !!companyId,
  });

  const addHoliday = useMutation({
    mutationFn: async (formData: FormData) => {
      const { error } = await supabase.from("public_holidays").insert({
        company_id: companyId!,
        name: formData.get("name") as string,
        date: formData.get("date") as string,
        is_recurring: isRecurring,
        region,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["holidays"] });
      toast({ title: "تم بنجاح" });
      setDialog(false);
      setIsRecurring(false);
      setRegion("all");
    },
    onError: (err: Error) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  const deleteHoliday = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("public_holidays").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["holidays"] });
      toast({ title: "تم الحذف" });
    },
  });

  const regionLabels: Record<string, string> = { all: "جميع الفروع", baghdad: "بغداد", kurdistan: "كردستان", basra: "البصرة" };

  const addIraqiHolidays = useMutation({
    mutationFn: async () => {
      const existingDates = holidays.map((h: any) => h.date);
      const newHolidays = IRAQI_HOLIDAYS_2026
        .filter(h => !existingDates.includes(h.date))
        .map(h => ({ company_id: companyId!, name: h.name, date: h.date, is_recurring: false, region: "all" }));
      if (newHolidays.length === 0) throw new Error("جميع العطل مضافة مسبقاً");
      const { error } = await supabase.from("public_holidays").insert(newHolidays);
      if (error) throw error;
      return newHolidays.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["holidays"] });
      toast({ title: "تم بنجاح", description: `تم إضافة ${count} عطلة عراقية` });
    },
    onError: (err: Error) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading font-bold text-2xl text-foreground">العطل الرسمية</h1>
          <p className="text-muted-foreground text-sm mt-1">{holidays.length} عطلة</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2 font-heading" onClick={() => setViewMode(viewMode === "table" ? "calendar" : "table")}>
            <Calendar className="h-4 w-4" />{viewMode === "table" ? "عرض التقويم" : "عرض الجدول"}
          </Button>
          <Button variant="outline" className="gap-2 font-heading" onClick={() => addIraqiHolidays.mutate()} disabled={addIraqiHolidays.isPending}>
            <Sparkles className="h-4 w-4" />إضافة العطل العراقية 2026
          </Button>
          <Dialog open={dialog} onOpenChange={setDialog}>
            <DialogTrigger asChild><Button className="gap-2 font-heading"><Plus className="h-4 w-4" />إضافة عطلة</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle className="font-heading">عطلة رسمية جديدة</DialogTitle></DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); addHoliday.mutate(new FormData(e.currentTarget)); }} className="space-y-4">
                <div className="space-y-2"><Label>اسم العطلة</Label><Input name="name" required placeholder="مثال: عيد الفطر" /></div>
                <div className="space-y-2"><Label>التاريخ</Label><Input name="date" type="date" required dir="ltr" className="text-left" /></div>
                <div className="space-y-2">
                  <Label>المنطقة</Label>
                  <Select value={region} onValueChange={setRegion}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">جميع الفروع</SelectItem>
                      <SelectItem value="baghdad">بغداد</SelectItem>
                      <SelectItem value="kurdistan">كردستان</SelectItem>
                      <SelectItem value="basra">البصرة</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2"><Switch checked={isRecurring} onCheckedChange={setIsRecurring} /><Label>تتكرر سنوياً</Label></div>
                <Button type="submit" className="w-full font-heading" disabled={addHoliday.isPending}>حفظ</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {viewMode === "calendar" && <HolidayCalendar holidays={holidays} />}

      <Card>
        <CardContent className="p-0">
          {holidays.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>العطلة</TableHead>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>المنطقة</TableHead>
                  <TableHead>متكررة</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {holidays.map((h: any) => (
                  <TableRow key={h.id}>
                    <TableCell className="font-medium">{h.name}</TableCell>
                    <TableCell dir="ltr">{h.date}</TableCell>
                    <TableCell><Badge variant="outline">{regionLabels[h.region] || h.region}</Badge></TableCell>
                    <TableCell>{h.is_recurring ? "✅" : "—"}</TableCell>
                    <TableCell>
                      <Button size="icon" variant="ghost" className="text-destructive h-8 w-8" onClick={() => deleteHoliday.mutate(h.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="py-16 text-center text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p className="font-heading font-medium">لا توجد عطل مسجّلة</p>
              <p className="text-sm mt-1">أضف العطل الرسمية العراقية</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
