import { useState } from "react";
import { User, CalendarDays, Wallet, Clock, FileText, Plus, Download, Bell, Pencil, LogIn, LogOut, Printer, Megaphone, Send, MessageSquare, Upload, Camera, Briefcase } from "lucide-react";
import { EmployeeServiceInfo } from "@/components/employees/EmployeeServiceInfo";
import MyPlaceInCompany from "@/components/employees/MyPlaceInCompany";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { useAuth } from "@/contexts/AuthContext";
import { useCreateWorkflowInstance } from "@/hooks/useApprovalWorkflow";

const statusLabels: Record<string, string> = { pending: "معلقة", approved: "موافق عليها", rejected: "مرفوضة" };
const statusColors: Record<string, string> = {
  pending: "bg-accent/10 text-accent-foreground border-accent/20",
  approved: "bg-primary/10 text-primary border-primary/20",
  rejected: "bg-destructive/10 text-destructive border-destructive/20",
};

export default function SelfService() {
  const { toast } = useToast();
  const { companyId, profile } = useCompany();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [leaveDialog, setLeaveDialog] = useState(false);
  const [loanDialog, setLoanDialog] = useState(false);
  const [profileDialog, setProfileDialog] = useState(false);
  const [hrRequestDialog, setHrRequestDialog] = useState(false);
  const [hrRequestType, setHrRequestType] = useState("general");
  const [payslipDialog, setPayslipDialog] = useState<any>(null);
  const [selectedLeaveType, setSelectedLeaveType] = useState("");

  // Get employee record linked to this user
  const { data: myEmployee } = useQuery({
    queryKey: ["my-employee", user?.id, companyId],
    queryFn: async () => {
      const { data } = await supabase
        .from("employees")
        .select("*, departments(name), branches(name)")
        .eq("company_id", companyId!)
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user && !!companyId,
  });

  // Today's attendance
  const { data: todayAttendance, refetch: refetchToday } = useQuery({
    queryKey: ["my-today-attendance-ss", myEmployee?.id],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
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

  // Get geolocation
  const getLocation = (): Promise<string | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) { resolve(null); return; }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve(`${pos.coords.latitude.toFixed(6)},${pos.coords.longitude.toFixed(6)}`),
        () => resolve(null),
        { timeout: 5000, enableHighAccuracy: true }
      );
    });
  };

  // Check in
  const checkIn = useMutation({
    mutationFn: async () => {
      const now = new Date();
      const today = now.toISOString().split("T")[0];
      const location = await getLocation();
      const { error } = await supabase.from("attendance_records").insert({
        company_id: companyId!,
        employee_id: myEmployee!.id,
        date: today,
        check_in: now.toISOString(),
        location: location,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      refetchToday();
      queryClient.invalidateQueries({ queryKey: ["my-attendance"] });
      toast({ title: "تم تسجيل الدخول", description: `تم تسجيل حضورك الساعة ${new Date().toLocaleTimeString("ar-IQ")}` });
    },
    onError: (err: Error) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  // Check out
  const checkOut = useMutation({
    mutationFn: async () => {
      const now = new Date();
      const checkInTime = new Date(todayAttendance!.check_in!);
      const hoursWorked = Math.round(((now.getTime() - checkInTime.getTime()) / 3600000) * 100) / 100;
      const overtime = Math.max(0, hoursWorked - 8);
      const location = await getLocation();
      const notes = todayAttendance?.location ? `دخول: ${todayAttendance.location} | خروج: ${location || "—"}` : undefined;
      const { error } = await supabase.from("attendance_records").update({
        check_out: now.toISOString(),
        hours_worked: hoursWorked,
        overtime_hours: overtime,
        ...(location && { location: `${todayAttendance?.location || ""}|${location}` }),
        ...(notes && { notes }),
      }).eq("id", todayAttendance!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      refetchToday();
      queryClient.invalidateQueries({ queryKey: ["my-attendance"] });
      toast({ title: "تم تسجيل الخروج", description: `تم تسجيل انصرافك الساعة ${new Date().toLocaleTimeString("ar-IQ")}` });
    },
    onError: (err: Error) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  // Upload avatar
  const uploadAvatar = useMutation({
    mutationFn: async (file: File) => {
      const ext = file.name.split('.').pop();
      const path = `${myEmployee!.id}/avatar.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (uploadErr) throw uploadErr;
      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
      const { error } = await supabase.from("employees").update({ avatar_url: publicUrl }).eq("id", myEmployee!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-employee"] });
      toast({ title: "تم تحديث الصورة الشخصية" });
    },
    onError: (err: Error) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  // Update profile
  const updateProfile = useMutation({
    mutationFn: async (formData: FormData) => {
      const { error } = await supabase.from("employees").update({
        phone: (formData.get("phone") as string) || null,
        address: (formData.get("address") as string) || null,
        email: (formData.get("email") as string) || null,
      }).eq("id", myEmployee!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-employee"] });
      toast({ title: "تم التحديث", description: "تم تحديث بياناتك الشخصية" });
      setProfileDialog(false);
    },
    onError: (err: Error) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  // My leave requests
  const { data: myLeaves = [] } = useQuery({
    queryKey: ["my-leaves", myEmployee?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("leave_requests")
        .select("*, leave_types(name, days_allowed)")
        .eq("employee_id", myEmployee!.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!myEmployee?.id,
  });

  const { data: leaveTypes = [] } = useQuery({
    queryKey: ["leave-types", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("leave_types").select("*").eq("company_id", companyId!);
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: myAttendance = [] } = useQuery({
    queryKey: ["my-attendance", myEmployee?.id],
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

  const { data: myPayslips = [] } = useQuery({
    queryKey: ["my-payslips", myEmployee?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("payroll_items")
        .select("*, payroll_runs(month, year, status, currency)")
        .eq("employee_id", myEmployee!.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!myEmployee?.id,
  });

  const { data: myLoans = [] } = useQuery({
    queryKey: ["my-loans", myEmployee?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("loans")
        .select("*")
        .eq("employee_id", myEmployee!.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!myEmployee?.id,
  });

  // Announcements
  const { data: announcements = [] } = useQuery({
    queryKey: ["my-announcements", companyId],
    queryFn: async () => {
      const { data } = await supabase
        .from("announcements")
        .select("*")
        .eq("company_id", companyId!)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(10);
      return data || [];
    },
    enabled: !!companyId,
  });

  // HR Requests (using approval_requests table)
  const { data: myHrRequests = [] } = useQuery({
    queryKey: ["my-hr-requests", user?.id, companyId],
    queryFn: async () => {
      const { data } = await supabase
        .from("approval_requests")
        .select("*")
        .eq("company_id", companyId!)
        .eq("requester_id", user!.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user && !!companyId,
  });

  // My documents
  const { data: myDocuments = [] } = useQuery({
    queryKey: ["my-documents", myEmployee?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("documents")
        .select("*")
        .eq("employee_id", myEmployee!.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!myEmployee?.id,
  });

  const createWorkflow = useCreateWorkflowInstance();

  const submitHrRequest = useMutation({
    mutationFn: async (formData: FormData) => {
      if (!myEmployee) throw new Error("لم يتم ربط حسابك بموظف");
      const subject = formData.get("subject") as string;
      const description = (formData.get("description") as string) || null;
      
      // Insert into approval_requests
      const { data: arData, error } = await supabase.from("approval_requests").insert({
        company_id: companyId!,
        requester_id: user!.id,
        request_type: hrRequestType,
        record_id: myEmployee.id,
        comments: `${subject}${description ? ' - ' + description : ''}`,
      }).select().single();
      if (error) throw error;

      // Create workflow instance
      await supabase.rpc("create_workflow_instance", {
        p_request_type: hrRequestType,
        p_reference_id: arData.id,
        p_company_id: companyId!,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-hr-requests"] });
      queryClient.invalidateQueries({ queryKey: ["workflow-instances"] });
      toast({ title: "تم الإرسال", description: "تم تقديم طلبك بنجاح وإرساله للموافقة" });
      setHrRequestDialog(false);
      setHrRequestType("general");
    },
    onError: (err: Error) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  const leaveBalances = leaveTypes.map((lt: any) => {
    const used = myLeaves
      .filter((l: any) => l.leave_type_id === lt.id && l.status === "approved")
      .reduce((sum: number, l: any) => {
        const start = new Date(l.start_date);
        const end = new Date(l.end_date);
        const days = Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1;
        return sum + days;
      }, 0);
    return { ...lt, used, remaining: Math.max(0, lt.days_allowed - used) };
  });

  const submitLeave = useMutation({
    mutationFn: async (formData: FormData) => {
      if (!myEmployee) throw new Error("لم يتم ربط حسابك بموظف");
      const { error } = await supabase.from("leave_requests").insert({
        company_id: companyId!,
        employee_id: myEmployee.id,
        leave_type_id: selectedLeaveType || null,
        start_date: formData.get("start_date") as string,
        end_date: formData.get("end_date") as string,
        reason: (formData.get("reason") as string) || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-leaves"] });
      toast({ title: "تم الإرسال", description: "تم تقديم طلب الإجازة بنجاح" });
      setLeaveDialog(false);
      setSelectedLeaveType("");
    },
    onError: (err: Error) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  const submitLoan = useMutation({
    mutationFn: async (formData: FormData) => {
      if (!myEmployee) throw new Error("لم يتم ربط حسابك بموظف");
      const amount = Number(formData.get("amount"));
      const monthly = Number(formData.get("monthly_deduction"));
      const { error } = await supabase.from("loans").insert({
        company_id: companyId!,
        employee_id: myEmployee.id,
        amount,
        remaining_amount: amount,
        monthly_deduction: monthly,
        loan_type: (formData.get("loan_type") as string) || "advance",
        notes: (formData.get("notes") as string) || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-loans"] });
      toast({ title: "تم الإرسال", description: "تم تقديم طلب السلفة" });
      setLoanDialog(false);
    },
    onError: (err: Error) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  const monthNames = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

  const printPayslip = (ps: any) => {
    const w = window.open("", "_blank", "width=800,height=600");
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><title>كشف راتب</title>
    <style>body{font-family:Arial,sans-serif;padding:40px;direction:rtl}table{width:100%;border-collapse:collapse;margin:20px 0}
    th,td{border:1px solid #ddd;padding:10px;text-align:right}th{background:#f5f5f5}
    .header{text-align:center;margin-bottom:30px}.total{font-weight:bold;font-size:1.2em;color:#2563eb}
    @media print{body{padding:20px}}</style></head><body>
    <div class="header"><h1>كشف راتب</h1><p>${monthNames[(ps.payroll_runs?.month || 1) - 1]} ${ps.payroll_runs?.year}</p>
    <p>${myEmployee?.name_ar || ""} - ${myEmployee?.employee_code || ""}</p></div>
    <table><thead><tr><th>البند</th><th>المبلغ (د.ع)</th></tr></thead><tbody>
    <tr><td>الراتب الأساسي</td><td>${(ps.basic_salary || 0).toLocaleString("ar-IQ")}</td></tr>
    <tr><td>البدلات</td><td>${(ps.allowances || 0).toLocaleString("ar-IQ")}</td></tr>
    <tr><td>الإجمالي</td><td>${(ps.gross_salary || 0).toLocaleString("ar-IQ")}</td></tr>
    <tr><td>ضريبة الدخل</td><td style="color:red">- ${(ps.income_tax || 0).toLocaleString("ar-IQ")}</td></tr>
    <tr><td>تأمينات اجتماعية</td><td style="color:red">- ${(ps.social_security_employee || 0).toLocaleString("ar-IQ")}</td></tr>
    <tr><td>خصومات أخرى</td><td style="color:red">- ${(ps.other_deductions || 0).toLocaleString("ar-IQ")}</td></tr>
    <tr><td class="total">الصافي</td><td class="total">${(ps.net_salary || 0).toLocaleString("ar-IQ")}</td></tr>
    </tbody></table><p style="margin-top:40px;text-align:center;color:#888">تم إنشاؤه بواسطة نظام تمكين HR</p>
    </body></html>`);
    w.document.close();
    w.print();
  };

  if (!myEmployee) {
    return (
      <div className="space-y-6 animate-fade-in">
        <h1 className="font-heading font-bold text-2xl text-foreground">الخدمة الذاتية</h1>
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <User className="h-16 w-16 mx-auto mb-4 opacity-20" />
            <p className="font-heading font-medium text-lg">لم يتم ربط حسابك بسجل موظف</p>
            <p className="text-sm mt-2">يرجى التواصل مع مسؤول الموارد البشرية لربط حسابك</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Stylish Profile Hero Card with Islamic Design */}
      <Card className="overflow-hidden border-0 shadow-2xl">
        {/* Header gradient with Islamic overlays */}
        <div className="relative bg-gradient-to-l from-[hsl(222,47%,15%)] via-[hsl(222,64%,25%)] to-[hsl(222,64%,33%)] p-8 pb-10">
          {/* Islamic arch overlay with gold lines */}
          <div className="islamic-arch-overlay" />
          {/* Geometric stars pattern */}
          <div className="absolute inset-0 geometric-stars opacity-50 pointer-events-none" />
          {/* Decorative gold corner flourish */}
          <svg className="absolute top-0 left-0 w-32 h-32 opacity-15 pointer-events-none" viewBox="0 0 100 100">
            <path d="M0 0 Q50 5 5 50 Q10 25 25 10 Z" fill="hsl(43, 96%, 56%)" />
            <path d="M0 0 L40 0 Q20 20 0 40 Z" fill="none" stroke="hsl(43, 96%, 56%)" strokeWidth="0.5" opacity="0.6" />
          </svg>
          <svg className="absolute bottom-0 right-0 w-32 h-32 opacity-15 pointer-events-none rotate-180" viewBox="0 0 100 100">
            <path d="M0 0 Q50 5 5 50 Q10 25 25 10 Z" fill="hsl(43, 96%, 56%)" />
            <path d="M0 0 L40 0 Q20 20 0 40 Z" fill="none" stroke="hsl(43, 96%, 56%)" strokeWidth="0.5" opacity="0.6" />
          </svg>
          
          <div className="relative flex flex-col sm:flex-row items-center sm:items-start gap-6">
            {/* Large Avatar with upload */}
            <div className="relative group">
              <div className="w-28 h-28 rounded-full avatar-ring-gold overflow-hidden bg-gradient-to-br from-[hsl(var(--gold))] to-[hsl(var(--gold-dark))] flex items-center justify-center">
                {myEmployee.avatar_url ? (
                  <img src={myEmployee.avatar_url} alt={myEmployee.name_ar} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-4xl font-heading font-bold text-[hsl(var(--gold-foreground))]">
                    {myEmployee.name_ar?.charAt(0)}
                  </span>
                )}
              </div>
              {/* Camera overlay on hover */}
              <label className="absolute inset-0 rounded-full flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                <Camera className="h-6 w-6 text-white" />
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) uploadAvatar.mutate(file);
                  }}
                />
              </label>
              {uploadAvatar.isPending && (
                <div className="absolute inset-0 rounded-full flex items-center justify-center bg-black/60">
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
            
            {/* Name & Info */}
            <div className="flex-1 text-center sm:text-right">
              <h1 className="font-heading font-bold text-3xl text-primary-foreground tracking-tight">{myEmployee.name_ar}</h1>
              {myEmployee.name_en && (
                <p className="text-primary-foreground/60 text-sm mt-0.5 font-medium tracking-wide">{myEmployee.name_en}</p>
              )}
              <p className="text-[hsl(var(--gold-light))] text-sm mt-1.5 font-heading font-semibold">{myEmployee.position || "—"}</p>
              
              {/* Gold divider */}
              <div className="gold-line my-3 max-w-xs mx-auto sm:mx-0" />
              
              <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
                <Badge className="bg-primary-foreground/10 text-primary-foreground border border-[hsl(var(--gold)/0.3)] backdrop-blur-sm px-3 py-1.5 rounded-lg">
                  {(myEmployee as any).departments?.name || "بدون قسم"}
                </Badge>
                {myEmployee.basic_salary && (
                  <Badge className="bg-[hsl(var(--gold)/0.15)] text-[hsl(var(--gold-light))] border border-[hsl(var(--gold)/0.3)] px-3 py-1.5 font-heading text-sm rounded-lg">
                    {myEmployee.basic_salary.toLocaleString("ar-IQ")} د.ع
                  </Badge>
                )}
                <Badge className="bg-primary-foreground/8 text-primary-foreground/80 border border-primary-foreground/15 px-3 py-1.5 rounded-lg">
                  {myEmployee.employee_code || "—"}
                </Badge>
              </div>
            </div>

            {/* Edit button */}
            <Button
              variant="ghost"
              size="icon"
              className="text-[hsl(var(--gold-light))] hover:text-[hsl(var(--gold))] hover:bg-[hsl(var(--gold)/0.1)] shrink-0 rounded-xl"
              onClick={() => setProfileDialog(true)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Gold separator line */}
        <div className="gold-line" />

        {/* Quick stats bar */}
        <CardContent className="p-0">
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-x-reverse divide-border">
            <div className="p-4 text-center">
              <p className="text-xs text-muted-foreground">القسم</p>
              <p className="font-heading font-bold mt-1 text-foreground">{(myEmployee as any).departments?.name || "—"}</p>
            </div>
            <div className="p-4 text-center">
              <p className="text-xs text-muted-foreground">الفرع</p>
              <p className="font-heading font-bold mt-1 text-foreground">{(myEmployee as any).branches?.name || "—"}</p>
            </div>
            <div className="p-4 text-center">
              <p className="text-xs text-muted-foreground">نوع العقد</p>
              <p className="font-heading font-bold mt-1 text-foreground">{myEmployee.contract_type === "permanent" ? "دائم" : myEmployee.contract_type === "temporary" ? "مؤقت" : myEmployee.contract_type || "—"}</p>
            </div>
            <div className="p-4 text-center">
              <p className="text-xs text-muted-foreground">تاريخ التعيين</p>
              <p className="font-heading font-bold mt-1 text-foreground">{myEmployee.hire_date ? new Date(myEmployee.hire_date).toLocaleDateString("ar-IQ") : "—"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* My Place in Company — Hierarchy Context */}
      <MyPlaceInCompany employee={myEmployee} companyId={companyId!} />

      {/* Attendance Check-in/Check-out */}
      <Card className="border-accent/20 bg-accent/5">
        <CardContent className="p-5">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-accent/10 text-accent-foreground">
                <Clock className="h-6 w-6" />
              </div>
              <div>
                <p className="font-heading font-bold text-base">حضور اليوم</p>
                <p className="text-sm text-muted-foreground">
                  {todayAttendance?.check_in
                    ? `تسجيل الدخول: ${new Date(todayAttendance.check_in).toLocaleTimeString("ar-IQ", { hour: "2-digit", minute: "2-digit" })}`
                    : "لم تسجل حضورك بعد"}
                  {todayAttendance?.check_out && ` • الخروج: ${new Date(todayAttendance.check_out).toLocaleTimeString("ar-IQ", { hour: "2-digit", minute: "2-digit" })}`}
                  {todayAttendance?.hours_worked != null && ` • ${todayAttendance.hours_worked} ساعة`}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              {!todayAttendance ? (
                <Button className="gap-2 font-heading" onClick={() => checkIn.mutate()} disabled={checkIn.isPending}>
                  <LogIn className="h-4 w-4" />{checkIn.isPending ? "جاري..." : "تسجيل الدخول"}
                </Button>
              ) : !todayAttendance.check_out ? (
                <Button variant="outline" className="gap-2 font-heading border-destructive/30 text-destructive hover:bg-destructive hover:text-destructive-foreground" onClick={() => checkOut.mutate()} disabled={checkOut.isPending}>
                  <LogOut className="h-4 w-4" />{checkOut.isPending ? "جاري..." : "تسجيل الخروج"}
                </Button>
              ) : (
                <Badge variant="outline" className="bg-primary/10 text-primary px-4 py-2">✓ اكتمل</Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Leave Balances */}
      {leaveBalances.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {leaveBalances.map((lb: any) => (
            <Card key={lb.id}>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">{lb.name}</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-heading font-bold text-primary">{lb.remaining}</span>
                  <span className="text-xs text-muted-foreground">/ {lb.days_allowed} يوم</span>
                </div>
                <Progress value={(lb.used / lb.days_allowed) * 100} className="h-1.5 mt-2" />
                <p className="text-xs text-muted-foreground mt-1">مستخدم: {lb.used} يوم</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Tabs defaultValue="leaves">
        <TabsList className="flex-wrap">
          <TabsTrigger value="leaves" className="font-heading gap-1"><CalendarDays className="h-3.5 w-3.5" />إجازاتي</TabsTrigger>
          <TabsTrigger value="attendance" className="font-heading gap-1"><Clock className="h-3.5 w-3.5" />حضوري</TabsTrigger>
          <TabsTrigger value="payslips" className="font-heading gap-1"><Wallet className="h-3.5 w-3.5" />كشوف رواتبي</TabsTrigger>
          <TabsTrigger value="loans" className="font-heading gap-1"><FileText className="h-3.5 w-3.5" />سلفي</TabsTrigger>
          <TabsTrigger value="hr-requests" className="font-heading gap-1"><MessageSquare className="h-3.5 w-3.5" />طلباتي{myHrRequests.length > 0 && ` (${myHrRequests.length})`}</TabsTrigger>
          <TabsTrigger value="documents" className="font-heading gap-1"><Upload className="h-3.5 w-3.5" />مستنداتي</TabsTrigger>
          <TabsTrigger value="announcements" className="font-heading gap-1"><Megaphone className="h-3.5 w-3.5" />الإعلانات{announcements.length > 0 && ` (${announcements.length})`}</TabsTrigger>
          <TabsTrigger value="certificates" className="font-heading gap-1"><FileText className="h-3.5 w-3.5" />الشهادات</TabsTrigger>
          <TabsTrigger value="service" className="font-heading gap-1"><Briefcase className="h-3.5 w-3.5" />المسار الوظيفي</TabsTrigger>
        </TabsList>

        {/* Leaves Tab */}
        <TabsContent value="leaves">
          <div className="flex justify-end mb-4">
            <Dialog open={leaveDialog} onOpenChange={setLeaveDialog}>
              <DialogTrigger asChild>
                <Button className="gap-2 font-heading"><Plus className="h-4 w-4" />طلب إجازة</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle className="font-heading">تقديم طلب إجازة</DialogTitle></DialogHeader>
                <form onSubmit={(e) => { e.preventDefault(); submitLeave.mutate(new FormData(e.currentTarget)); }} className="space-y-4">
                  <div className="space-y-2">
                    <Label>نوع الإجازة</Label>
                    <Select value={selectedLeaveType} onValueChange={setSelectedLeaveType}>
                      <SelectTrigger><SelectValue placeholder="اختر النوع" /></SelectTrigger>
                      <SelectContent>
                        {leaveTypes.map((t: any) => (
                          <SelectItem key={t.id} value={t.id}>{t.name} ({t.days_allowed} يوم)</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>من تاريخ</Label><Input name="start_date" type="date" required dir="ltr" className="text-left" /></div>
                    <div className="space-y-2"><Label>إلى تاريخ</Label><Input name="end_date" type="date" required dir="ltr" className="text-left" /></div>
                  </div>
                  <div className="space-y-2"><Label>السبب</Label><Input name="reason" placeholder="سبب الإجازة (اختياري)" /></div>
                  <Button type="submit" className="w-full font-heading" disabled={submitLeave.isPending}>
                    {submitLeave.isPending ? "جاري الإرسال..." : "تقديم الطلب"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          {myLeaves.length > 0 ? (
            <Card><CardContent className="p-0">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>النوع</TableHead><TableHead>من</TableHead><TableHead>إلى</TableHead><TableHead>الحالة</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {myLeaves.map((l: any) => (
                    <TableRow key={l.id}>
                      <TableCell className="font-medium">{l.leave_types?.name || "—"}</TableCell>
                      <TableCell dir="ltr">{l.start_date}</TableCell>
                      <TableCell dir="ltr">{l.end_date}</TableCell>
                      <TableCell><Badge variant="outline" className={statusColors[l.status]}>{statusLabels[l.status]}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent></Card>
          ) : (
            <Card><CardContent className="py-12 text-center text-muted-foreground">
              <CalendarDays className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p className="font-heading font-medium">لا توجد طلبات إجازة</p>
            </CardContent></Card>
          )}
        </TabsContent>

        {/* Attendance Tab */}
        <TabsContent value="attendance">
          {myAttendance.length > 0 ? (
            <Card><CardContent className="p-0">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>التاريخ</TableHead><TableHead>الدخول</TableHead><TableHead>الخروج</TableHead><TableHead>ساعات العمل</TableHead><TableHead>إضافي</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {myAttendance.map((a: any) => (
                    <TableRow key={a.id}>
                      <TableCell dir="ltr">{a.date}</TableCell>
                      <TableCell dir="ltr">{a.check_in ? new Date(a.check_in).toLocaleTimeString("ar-IQ") : "—"}</TableCell>
                      <TableCell dir="ltr">{a.check_out ? new Date(a.check_out).toLocaleTimeString("ar-IQ") : "—"}</TableCell>
                      <TableCell>{a.hours_worked ? `${a.hours_worked} ساعة` : "—"}</TableCell>
                      <TableCell>{a.overtime_hours ? `${a.overtime_hours} ساعة` : "0"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent></Card>
          ) : (
            <Card><CardContent className="py-12 text-center text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p className="font-heading font-medium">لا توجد سجلات حضور</p>
            </CardContent></Card>
          )}
        </TabsContent>

        {/* Payslips Tab */}
        <TabsContent value="payslips">
          {myPayslips.length > 0 ? (
            <div className="space-y-4">
              {myPayslips.map((ps: any) => (
                <Card key={ps.id}>
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-heading font-bold text-lg">
                        كشف راتب {monthNames[(ps.payroll_runs?.month || 1) - 1]} {ps.payroll_runs?.year}
                      </h3>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={ps.payroll_runs?.status === "paid" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}>
                          {ps.payroll_runs?.status === "paid" ? "مدفوع" : ps.payroll_runs?.status === "approved" ? "معتمد" : "قيد المعالجة"}
                        </Badge>
                        <Button variant="outline" size="sm" className="gap-1" onClick={() => printPayslip(ps)}>
                          <Printer className="h-3.5 w-3.5" />طباعة
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                      <div className="p-3 rounded-lg bg-muted/50">
                        <p className="text-muted-foreground text-xs">الراتب الأساسي</p>
                        <p className="font-heading font-bold text-lg">{ps.basic_salary?.toLocaleString("ar-IQ")} د.ع</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/50">
                        <p className="text-muted-foreground text-xs">البدلات</p>
                        <p className="font-heading font-bold text-lg">{(ps.allowances || 0).toLocaleString("ar-IQ")} د.ع</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/50">
                        <p className="text-muted-foreground text-xs">الإجمالي</p>
                        <p className="font-heading font-bold text-lg">{ps.gross_salary?.toLocaleString("ar-IQ")} د.ع</p>
                      </div>
                      <div className="p-3 rounded-lg bg-destructive/5">
                        <p className="text-muted-foreground text-xs">ضريبة الدخل</p>
                        <p className="font-heading font-bold text-lg text-destructive">{(ps.income_tax || 0).toLocaleString("ar-IQ")} د.ع</p>
                      </div>
                      <div className="p-3 rounded-lg bg-destructive/5">
                        <p className="text-muted-foreground text-xs">تأمينات</p>
                        <p className="font-heading font-bold text-lg text-destructive">{(ps.social_security_employee || 0).toLocaleString("ar-IQ")} د.ع</p>
                      </div>
                      <div className="p-3 rounded-lg bg-primary/10">
                        <p className="text-muted-foreground text-xs">الصافي</p>
                        <p className="font-heading font-bold text-xl text-primary">{ps.net_salary?.toLocaleString("ar-IQ")} د.ع</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card><CardContent className="py-12 text-center text-muted-foreground">
              <Wallet className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p className="font-heading font-medium">لا توجد كشوف رواتب</p>
            </CardContent></Card>
          )}
        </TabsContent>

        {/* Loans Tab */}
        <TabsContent value="loans">
          <div className="flex justify-end mb-4">
            <Dialog open={loanDialog} onOpenChange={setLoanDialog}>
              <DialogTrigger asChild>
                <Button className="gap-2 font-heading"><Plus className="h-4 w-4" />طلب سلفة</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle className="font-heading">طلب سلفة / قرض</DialogTitle></DialogHeader>
                <form onSubmit={(e) => { e.preventDefault(); submitLoan.mutate(new FormData(e.currentTarget)); }} className="space-y-4">
                  <div className="space-y-2">
                    <Label>النوع</Label>
                    <Select name="loan_type" defaultValue="advance">
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="advance">سلفة راتب</SelectItem>
                        <SelectItem value="personal_loan">قرض شخصي</SelectItem>
                        <SelectItem value="emergency">طوارئ</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>المبلغ (د.ع)</Label><Input name="amount" type="number" required dir="ltr" className="text-left" /></div>
                    <div className="space-y-2"><Label>القسط الشهري</Label><Input name="monthly_deduction" type="number" required dir="ltr" className="text-left" /></div>
                  </div>
                  <div className="space-y-2"><Label>ملاحظات</Label><Input name="notes" placeholder="سبب الطلب" /></div>
                  <Button type="submit" className="w-full font-heading" disabled={submitLoan.isPending}>
                    {submitLoan.isPending ? "جاري الإرسال..." : "تقديم الطلب"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          {myLoans.length > 0 ? (
            <Card><CardContent className="p-0">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>النوع</TableHead><TableHead>المبلغ</TableHead><TableHead>القسط</TableHead><TableHead>المتبقي</TableHead><TableHead>الحالة</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {myLoans.map((l: any) => (
                    <TableRow key={l.id}>
                      <TableCell className="font-medium">{l.loan_type === "advance" ? "سلفة" : l.loan_type === "personal_loan" ? "قرض شخصي" : "طوارئ"}</TableCell>
                      <TableCell>{l.amount?.toLocaleString("ar-IQ")} د.ع</TableCell>
                      <TableCell>{l.monthly_deduction?.toLocaleString("ar-IQ")} د.ع</TableCell>
                      <TableCell className="font-bold text-primary">{l.remaining_amount?.toLocaleString("ar-IQ")} د.ع</TableCell>
                      <TableCell><Badge variant="outline" className={l.status === "active" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}>{l.status === "active" ? "نشط" : "مسدد"}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent></Card>
          ) : (
            <Card><CardContent className="py-12 text-center text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p className="font-heading font-medium">لا توجد سلف</p>
            </CardContent></Card>
          )}
        </TabsContent>

        {/* HR Requests Tab */}
        <TabsContent value="hr-requests">
          <div className="flex justify-end mb-4">
            <Dialog open={hrRequestDialog} onOpenChange={setHrRequestDialog}>
              <DialogTrigger asChild>
                <Button className="gap-2 font-heading"><Send className="h-4 w-4" />طلب جديد</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle className="font-heading">تقديم طلب HR</DialogTitle></DialogHeader>
                <form onSubmit={(e) => { e.preventDefault(); submitHrRequest.mutate(new FormData(e.currentTarget)); }} className="space-y-4">
                  <div className="space-y-2">
                    <Label>نوع الطلب</Label>
                    <Select value={hrRequestType} onValueChange={setHrRequestType}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">طلب عام</SelectItem>
                        <SelectItem value="letter">طلب خطاب</SelectItem>
                        <SelectItem value="correction">تصحيح بيانات</SelectItem>
                        <SelectItem value="complaint">شكوى</SelectItem>
                        <SelectItem value="suggestion">اقتراح</SelectItem>
                        <SelectItem value="transfer">طلب نقل</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label>الموضوع *</Label><Input name="subject" required /></div>
                  <div className="space-y-2"><Label>التفاصيل</Label><Textarea name="description" rows={3} /></div>
                  <Button type="submit" className="w-full font-heading" disabled={submitHrRequest.isPending}>
                    {submitHrRequest.isPending ? "جاري الإرسال..." : "إرسال الطلب"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          {myHrRequests.length > 0 ? (
            <Card><CardContent className="p-0">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>النوع</TableHead><TableHead>الموضوع</TableHead><TableHead>التاريخ</TableHead><TableHead>الحالة</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {myHrRequests.map((r: any) => {
                    const typeMap: Record<string, string> = { general: "عام", letter: "خطاب", correction: "تصحيح", complaint: "شكوى", suggestion: "اقتراح", transfer: "نقل", certificate_experience: "شهادة خبرة", certificate_salary: "شهادة راتب", certificate_employment: "تعريف بالعمل" };
                    return (
                      <TableRow key={r.id}>
                        <TableCell>{typeMap[r.request_type] || r.request_type}</TableCell>
                        <TableCell className="font-medium">{r.comments || "—"}</TableCell>
                        <TableCell dir="ltr" className="text-sm">{new Date(r.created_at).toLocaleDateString("ar-IQ")}</TableCell>
                        <TableCell><Badge variant="outline" className={statusColors[r.status]}>{statusLabels[r.status] || r.status}</Badge></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent></Card>
          ) : (
            <Card><CardContent className="py-12 text-center text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p className="font-heading font-medium">لا توجد طلبات</p>
            </CardContent></Card>
          )}
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents">
          {myDocuments.length > 0 ? (
            <Card><CardContent className="p-0">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>المستند</TableHead><TableHead>النوع</TableHead><TableHead>التاريخ</TableHead><TableHead>الانتهاء</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {myDocuments.map((d: any) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium">{d.name}</TableCell>
                      <TableCell>{d.file_type || "—"}</TableCell>
                      <TableCell dir="ltr" className="text-sm">{new Date(d.created_at).toLocaleDateString("ar-IQ")}</TableCell>
                      <TableCell dir="ltr" className="text-sm">{d.expires_at ? new Date(d.expires_at).toLocaleDateString("ar-IQ") : "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent></Card>
          ) : (
            <Card><CardContent className="py-12 text-center text-muted-foreground">
              <Upload className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p className="font-heading font-medium">لا توجد مستندات</p>
            </CardContent></Card>
          )}
        </TabsContent>

        {/* Announcements Tab */}
        <TabsContent value="announcements">
          {announcements.length > 0 ? (
            <div className="space-y-3">
              {announcements.map((a: any) => (
                <Card key={a.id} className={a.priority === "high" ? "border-destructive/30" : a.priority === "urgent" ? "border-destructive bg-destructive/5" : ""}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Megaphone className="h-4 w-4 text-primary shrink-0" />
                          <h3 className="font-heading font-bold">{a.title}</h3>
                          {a.priority === "high" && <Badge variant="outline" className="bg-destructive/10 text-destructive text-[10px]">مهم</Badge>}
                          {a.priority === "urgent" && <Badge className="bg-destructive text-destructive-foreground text-[10px]">عاجل</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground whitespace-pre-line">{a.content}</p>
                        <p className="text-xs text-muted-foreground mt-2">{new Date(a.created_at).toLocaleDateString("ar-IQ", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card><CardContent className="py-12 text-center text-muted-foreground">
              <Megaphone className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p className="font-heading font-medium">لا توجد إعلانات حالياً</p>
            </CardContent></Card>
          )}
        </TabsContent>

        {/* Certificates Tab */}
        <TabsContent value="certificates">
          <Card>
            <CardContent className="p-6 space-y-4">
              <h3 className="font-heading font-bold text-lg">طلب شهادة</h3>
              <p className="text-sm text-muted-foreground">اختر نوع الشهادة المطلوبة وسيتم إرسال الطلب لإدارة الموارد البشرية</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { type: "experience", label: "شهادة خبرة", desc: "تثبت فترة عملك ومسماك الوظيفي" },
                  { type: "salary", label: "شهادة راتب", desc: "تثبت راتبك الحالي للجهات الرسمية" },
                  { type: "employment", label: "تعريف بالراتب", desc: "خطاب تعريف موجه لجهة محددة" },
                ].map((cert) => (
                  <Card key={cert.type} className="hover:shadow-md transition-shadow cursor-pointer border-2 hover:border-primary/30" onClick={async () => {
                    if (!myEmployee) return;
                    try {
                      // 1. Create the approval_request record
                      const { data: arData, error: arErr } = await supabase.from("approval_requests").insert({
                        company_id: companyId!,
                        requester_id: user!.id,
                        request_type: `certificate_${cert.type}`,
                        record_id: myEmployee.id,
                        comments: `طلب ${cert.label} - ${myEmployee.name_ar}`,
                      }).select().single();
                      if (arErr) throw arErr;

                      // 2. Create workflow instance for approval routing
                      // Use specific certificate type for proper template/document resolution
                      const specificType = `certificate_${cert.type}`;
                      const { error: wfErr } = await supabase.rpc("create_workflow_instance", {
                        p_request_type: specificType,
                        p_reference_id: arData.id,
                        p_company_id: companyId!,
                      });
                      if (wfErr) {
                        console.error("Workflow creation failed for certificate:", wfErr);
                        toast({ title: "تم حفظ الطلب لكن فشل إنشاء سير العمل", description: wfErr.message, variant: "destructive" });
                      } else {
                        toast({ title: "تم الإرسال", description: `تم تقديم طلب ${cert.label} وإرساله للموافقة` });
                      }
                    } catch (err: any) {
                      toast({ title: "خطأ", description: err.message, variant: "destructive" });
                    }
                  }}>
                    <CardContent className="p-4 text-center">
                      <FileText className="h-8 w-8 mx-auto mb-2 text-primary" />
                      <p className="font-heading font-bold text-sm">{cert.label}</p>
                      <p className="text-xs text-muted-foreground mt-1">{cert.desc}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Service Info / Career Path Tab */}
        <TabsContent value="service">
          <EmployeeServiceInfo employee={myEmployee} companyId={companyId!} />
        </TabsContent>
      </Tabs>

      {/* Profile Edit Dialog */}
      <Dialog open={profileDialog} onOpenChange={setProfileDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-heading">تعديل البيانات الشخصية</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); updateProfile.mutate(new FormData(e.currentTarget)); }} className="space-y-4">
            <div className="space-y-2">
              <Label>البريد الإلكتروني</Label>
              <Input name="email" type="email" defaultValue={myEmployee.email || ""} dir="ltr" className="text-left" />
            </div>
            <div className="space-y-2">
              <Label>رقم الهاتف</Label>
              <Input name="phone" defaultValue={myEmployee.phone || ""} dir="ltr" className="text-left" />
            </div>
            <div className="space-y-2">
              <Label>العنوان</Label>
              <Input name="address" defaultValue={myEmployee.address || ""} />
            </div>
            <p className="text-xs text-muted-foreground">لتعديل بيانات أخرى يرجى التواصل مع إدارة الموارد البشرية</p>
            <Button type="submit" className="w-full font-heading" disabled={updateProfile.isPending}>
              {updateProfile.isPending ? "جاري الحفظ..." : "حفظ التغييرات"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
