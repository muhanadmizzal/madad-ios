import { useState } from "react";
import { Plus, Clock, Moon, Sun, UserPlus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";

export default function Shifts() {
  const [dialog, setDialog] = useState(false);
  const [assignDialog, setAssignDialog] = useState(false);
  const [isNight, setIsNight] = useState(false);
  const [assignShiftId, setAssignShiftId] = useState("");
  const [assignEmployeeId, setAssignEmployeeId] = useState("");
  const { toast } = useToast();
  const { companyId } = useCompany();
  const queryClient = useQueryClient();

  const { data: shifts = [] } = useQuery({
    queryKey: ["shifts", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("shifts").select("*").eq("company_id", companyId!).order("created_at");
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees-shifts", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("employees").select("id, name_ar, employee_code, shift_id").eq("company_id", companyId!).eq("status", "active").order("name_ar");
      return data || [];
    },
    enabled: !!companyId,
  });

  const addShift = useMutation({
    mutationFn: async (formData: FormData) => {
      const startTime = formData.get("start_time") as string;
      const endTime = formData.get("end_time") as string;
      // Auto-detect spans_midnight: if end_time < start_time it crosses midnight
      const autoSpansMidnight = isNight || (endTime < startTime);
      const { error } = await supabase.from("shifts").insert({
        company_id: companyId!,
        name: formData.get("name") as string,
        start_time: startTime,
        end_time: endTime,
        break_minutes: Number(formData.get("break_minutes")) || 60,
        grace_minutes: Number(formData.get("grace_minutes")) || 15,
        overtime_threshold_hours: Number(formData.get("overtime_threshold")) || 8,
        is_night_shift: isNight,
        spans_midnight: autoSpansMidnight,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
      toast({ title: "تم بنجاح" });
      setDialog(false);
      setIsNight(false);
    },
    onError: (err: Error) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  const assignShift = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("employees").update({ shift_id: assignShiftId || null }).eq("id", assignEmployeeId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees-shifts"] });
      toast({ title: "تم تعيين الوردية" });
      setAssignDialog(false);
      setAssignEmployeeId("");
      setAssignShiftId("");
    },
    onError: (err: Error) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  const getShiftName = (shiftId: string | null) => {
    if (!shiftId) return "غير محدد";
    return shifts.find((s: any) => s.id === shiftId)?.name || "غير محدد";
  };

  const getShiftEmployeeCount = (shiftId: string) =>
    employees.filter((e: any) => e.shift_id === shiftId).length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading font-bold text-2xl text-foreground">المناوبات والورديات</h1>
          <p className="text-muted-foreground text-sm mt-1">{shifts.length} وردية • {employees.filter((e: any) => e.shift_id).length} موظف معيّن</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={assignDialog} onOpenChange={setAssignDialog}>
            <DialogTrigger asChild><Button variant="outline" className="gap-2 font-heading"><UserPlus className="h-4 w-4" />تعيين وردية</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle className="font-heading">تعيين وردية لموظف</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>الموظف</Label>
                  <Select value={assignEmployeeId} onValueChange={setAssignEmployeeId}>
                    <SelectTrigger><SelectValue placeholder="اختر الموظف" /></SelectTrigger>
                    <SelectContent>{employees.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.name_ar} ({e.employee_code})</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>الوردية</Label>
                  <Select value={assignShiftId} onValueChange={setAssignShiftId}>
                    <SelectTrigger><SelectValue placeholder="اختر الوردية" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">بدون وردية</SelectItem>
                      {shifts.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name} ({s.start_time} - {s.end_time})</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Button className="w-full font-heading" onClick={() => assignShift.mutate()} disabled={!assignEmployeeId || assignShift.isPending}>تعيين</Button>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={dialog} onOpenChange={setDialog}>
            <DialogTrigger asChild><Button className="gap-2 font-heading"><Plus className="h-4 w-4" />إضافة وردية</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle className="font-heading">وردية جديدة</DialogTitle></DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); addShift.mutate(new FormData(e.currentTarget)); }} className="space-y-4">
                <div className="space-y-2"><Label>اسم الوردية</Label><Input name="name" required placeholder="الوردية الصباحية" /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>وقت البدء</Label><Input name="start_time" type="time" required dir="ltr" className="text-left" /></div>
                  <div className="space-y-2"><Label>وقت الانتهاء</Label><Input name="end_time" type="time" required dir="ltr" className="text-left" /></div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2"><Label>استراحة (دقيقة)</Label><Input name="break_minutes" type="number" defaultValue={60} /></div>
                  <div className="space-y-2"><Label>سماحية (دقيقة)</Label><Input name="grace_minutes" type="number" defaultValue={15} /></div>
                  <div className="space-y-2"><Label>عتبة الإضافي (ساعة)</Label><Input name="overtime_threshold" type="number" defaultValue={8} /></div>
                </div>
                <div className="flex items-center gap-2"><Switch checked={isNight} onCheckedChange={setIsNight} /><Label>وردية ليلية (تمتد لليوم التالي)</Label></div>
                <p className="text-[10px] text-muted-foreground">سيتم تفعيل وضع "عبور منتصف الليل" تلقائياً عند تحديد وردية ليلية أو إذا كان وقت الانتهاء أقل من البدء</p>
                <Button type="submit" className="w-full font-heading" disabled={addShift.isPending}>حفظ</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="shifts">
        <TabsList>
          <TabsTrigger value="shifts" className="font-heading">الورديات</TabsTrigger>
          <TabsTrigger value="assignments" className="font-heading gap-1"><Users className="h-3.5 w-3.5" />التعيينات</TabsTrigger>
        </TabsList>

        <TabsContent value="shifts">
          <Card>
            <CardContent className="p-0">
              {shifts.length > 0 ? (
                <Table>
                 <TableHeader>
                    <TableRow>
                      <TableHead>الوردية</TableHead>
                      <TableHead>البدء</TableHead>
                      <TableHead>الانتهاء</TableHead>
                      <TableHead>الاستراحة</TableHead>
                      <TableHead>السماحية</TableHead>
                      <TableHead>النوع</TableHead>
                      <TableHead>عبور منتصف الليل</TableHead>
                      <TableHead>الموظفون</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {shifts.map((s: any) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">{s.name}</TableCell>
                        <TableCell dir="ltr">{s.start_time}</TableCell>
                        <TableCell dir="ltr">{s.end_time}</TableCell>
                        <TableCell>{s.break_minutes} دقيقة</TableCell>
                        <TableCell>{s.grace_minutes} دقيقة</TableCell>
                        <TableCell>
                          {s.is_night_shift ? (
                            <Badge variant="outline" className="gap-1"><Moon className="h-3 w-3" />ليلية</Badge>
                          ) : (
                            <Badge variant="outline" className="gap-1"><Sun className="h-3 w-3" />نهارية</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {(s as any).spans_midnight || s.is_night_shift ? (
                            <Badge variant="secondary" className="text-[10px]">يومين</Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px]">يوم واحد</Badge>
                          )}
                        </TableCell>
                        <TableCell><Badge variant="outline">{getShiftEmployeeCount(s.id)}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="py-16 text-center text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p className="font-heading font-medium">لا توجد ورديات</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assignments">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الموظف</TableHead>
                    <TableHead>الكود</TableHead>
                    <TableHead>الوردية المعيّنة</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((e: any) => (
                    <TableRow key={e.id}>
                      <TableCell className="font-medium">{e.name_ar}</TableCell>
                      <TableCell>{e.employee_code}</TableCell>
                      <TableCell>
                        <Badge variant={e.shift_id ? "default" : "outline"} className={!e.shift_id ? "text-muted-foreground" : ""}>
                          {getShiftName(e.shift_id)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
