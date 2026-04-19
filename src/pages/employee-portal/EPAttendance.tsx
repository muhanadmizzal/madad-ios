import { Clock, LogIn, LogOut, Fingerprint, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface AttendanceMethods {
  web_clock_enabled: boolean;
  require_gps: boolean;
  biometric_enabled: boolean;
  api_key: string;
}

export default function EPAttendance() {
  const { companyId } = useCompany();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: myEmployee } = useQuery({
    queryKey: ["my-employee", user?.id, companyId],
    queryFn: async () => {
      const { data } = await supabase
        .from("employees")
        .select("id, name_ar")
        .eq("company_id", companyId!)
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user && !!companyId,
  });

  // Fetch attendance method settings
  const { data: attendanceSettings } = useQuery({
    queryKey: ["attendance-settings", companyId],
    queryFn: async () => {
      const { data } = await supabase
        .from("tenant_settings")
        .select("value")
        .eq("company_id", companyId!)
        .eq("key", "attendance_methods")
        .maybeSingle();
      return (data?.value as unknown as AttendanceMethods) || { web_clock_enabled: true, require_gps: false, biometric_enabled: false, api_key: "" };
    },
    enabled: !!companyId,
  });

  const webClockEnabled = attendanceSettings?.web_clock_enabled ?? true;

  const today = new Date().toISOString().split("T")[0];

  const { data: todayRecord, refetch } = useQuery({
    queryKey: ["ep-today-attendance", myEmployee?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("attendance_records")
        .select("*")
        .eq("employee_id", myEmployee!.id)
        .eq("date", today)
        .maybeSingle();
      return data;
    },
    enabled: !!myEmployee?.id,
  });

  const { data: records = [] } = useQuery({
    queryKey: ["ep-attendance-history", myEmployee?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("attendance_records")
        .select("*")
        .eq("employee_id", myEmployee!.id)
        .order("date", { ascending: false })
        .limit(30);
      return data || [];
    },
    enabled: !!myEmployee?.id,
  });

  const getLocation = (): Promise<string | null> =>
    new Promise((resolve) => {
      if (!navigator.geolocation) { resolve(null); return; }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve(`${pos.coords.latitude.toFixed(6)},${pos.coords.longitude.toFixed(6)}`),
        () => resolve(null), { timeout: 5000 }
      );
    });

  const checkIn = useMutation({
    mutationFn: async () => {
      const now = new Date();
      const location = attendanceSettings?.require_gps ? await getLocation() : null;
      const { error } = await supabase.from("attendance_records").insert({
        company_id: companyId!, employee_id: myEmployee!.id, date: today,
        check_in: now.toISOString(), location,
      });
      if (error) throw error;
    },
    onSuccess: () => { refetch(); toast({ title: "تم تسجيل الحضور" }); },
    onError: (err: Error) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  const checkOut = useMutation({
    mutationFn: async () => {
      const now = new Date();
      const checkInTime = new Date(todayRecord!.check_in!);
      const hoursWorked = Math.round(((now.getTime() - checkInTime.getTime()) / 3600000) * 100) / 100;
      const { error } = await supabase.from("attendance_records").update({
        check_out: now.toISOString(), hours_worked: hoursWorked,
        overtime_hours: Math.max(0, hoursWorked - 8),
      }).eq("id", todayRecord!.id);
      if (error) throw error;
    },
    onSuccess: () => { refetch(); toast({ title: "تم تسجيل الانصراف" }); },
    onError: (err: Error) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  if (!myEmployee) {
    return <div className="text-center py-16 text-muted-foreground">لم يتم ربط حسابك بسجل موظف</div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="font-heading font-bold text-2xl">حضوري</h1>

      {/* Today's status */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="font-heading text-lg flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            اليوم — {new Date().toLocaleDateString("ar-IQ", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!webClockEnabled ? (
            <Alert className="border-primary/20 bg-primary/5">
              <Fingerprint className="h-5 w-5 text-primary" />
              <AlertTitle className="font-heading text-sm">طريقة تسجيل الحضور: أجهزة البصمة</AlertTitle>
              <AlertDescription className="text-xs text-muted-foreground mt-1">
                يتم تسجيل الحضور آلياً عبر أجهزة البصمة في مقرات الشركة. لا يمكن التسجيل يدوياً من البوابة.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="flex items-center gap-4">
              {!todayRecord ? (
                <Button className="font-heading gap-2" onClick={() => checkIn.mutate()} disabled={checkIn.isPending}>
                  <LogIn className="h-4 w-4" />{checkIn.isPending ? "جاري..." : "تسجيل حضور"}
                </Button>
              ) : !todayRecord.check_out ? (
                <div className="flex items-center gap-4">
                  <Badge className="bg-primary/10 text-primary border-primary/20 px-3 py-1">
                    دخول: {new Date(todayRecord.check_in!).toLocaleTimeString("ar-IQ", { hour: "2-digit", minute: "2-digit" })}
                  </Badge>
                  <Button variant="outline" className="font-heading gap-2" onClick={() => checkOut.mutate()} disabled={checkOut.isPending}>
                    <LogOut className="h-4 w-4" />{checkOut.isPending ? "جاري..." : "تسجيل انصراف"}
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <Badge className="bg-primary/10 text-primary border-primary/20 px-3 py-1">
                    دخول: {new Date(todayRecord.check_in!).toLocaleTimeString("ar-IQ", { hour: "2-digit", minute: "2-digit" })}
                  </Badge>
                  <Badge className="bg-destructive/10 text-destructive border-destructive/20 px-3 py-1">
                    خروج: {new Date(todayRecord.check_out!).toLocaleTimeString("ar-IQ", { hour: "2-digit", minute: "2-digit" })}
                  </Badge>
                  <Badge variant="outline">{todayRecord.hours_worked?.toFixed(1)} ساعة</Badge>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* History — always visible */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="font-heading text-lg">سجل الحضور (آخر 30 يوم)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>التاريخ</TableHead>
                <TableHead>الدخول</TableHead>
                <TableHead>الخروج</TableHead>
                <TableHead>الساعات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell dir="ltr" className="text-left">{r.date}</TableCell>
                  <TableCell dir="ltr">{r.check_in ? new Date(r.check_in).toLocaleTimeString("ar-IQ", { hour: "2-digit", minute: "2-digit" }) : "—"}</TableCell>
                  <TableCell dir="ltr">{r.check_out ? new Date(r.check_out).toLocaleTimeString("ar-IQ", { hour: "2-digit", minute: "2-digit" }) : "—"}</TableCell>
                  <TableCell>{r.hours_worked ? `${r.hours_worked.toFixed(1)} ساعة` : "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
