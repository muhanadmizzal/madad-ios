import { Users, Building2, CalendarDays, Wallet, UserPlus, PlayCircle, ClipboardCheck, Megaphone, CalendarCheck, AlertCircle, FileWarning, Clock, UserCircle, Cake, FileText, TrendingUp, ArrowUpRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { useRole } from "@/hooks/useRole";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { AttendanceChart, PayrollChart, LeaveChart } from "@/components/dashboard/DashboardCharts";
import { WalkthroughAutoPrompt } from "@/components/onboarding/SystemWalkthrough";
import RecentActivity from "@/components/dashboard/RecentActivity";
import { DepartmentChart } from "@/components/dashboard/DepartmentChart";
import { EmployeeGrowthChart } from "@/components/dashboard/EmployeeGrowthChart";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "صباح الخير";
  if (hour < 17) return "مساء الخير";
  return "مساء النور";
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { companyId, profile } = useCompany();
  const { isAdmin, isHrManager } = useRole();
  const { user } = useAuth();

  // ===== Admin/HR Stats =====
  const { data: employeeCount = 0, isLoading: loadingEmp } = useQuery({
    queryKey: ["employee-count", companyId],
    queryFn: async () => {
      const { count } = await supabase.from("employees").select("*", { count: "exact", head: true }).eq("company_id", companyId!).eq("status", "active");
      return count || 0;
    },
    enabled: !!companyId && isHrManager,
  });

  const { data: deptCount = 0, isLoading: loadingDept } = useQuery({
    queryKey: ["department-count", companyId],
    queryFn: async () => {
      const { count } = await supabase.from("departments").select("*", { count: "exact", head: true }).eq("company_id", companyId!);
      return count || 0;
    },
    enabled: !!companyId && isHrManager,
  });

  const { data: pendingLeave = 0, isLoading: loadingLeave } = useQuery({
    queryKey: ["pending-leave-count", companyId],
    queryFn: async () => {
      const { count } = await supabase.from("leave_requests").select("*", { count: "exact", head: true }).eq("company_id", companyId!).eq("status", "pending");
      return count || 0;
    },
    enabled: !!companyId && isHrManager,
  });

  const { data: pendingApprovals = 0 } = useQuery({
    queryKey: ["pending-approvals-count", companyId],
    queryFn: async () => {
      const { count } = await supabase.from("approval_requests").select("*", { count: "exact", head: true }).eq("company_id", companyId!).eq("status", "pending");
      return count || 0;
    },
    enabled: !!companyId && isHrManager,
  });

  const { data: totalSalary = 0, isLoading: loadingSalary } = useQuery({
    queryKey: ["total-salary", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("employees").select("basic_salary").eq("company_id", companyId!).eq("status", "active");
      return data?.reduce((sum, e) => sum + (e.basic_salary || 0), 0) || 0;
    },
    enabled: !!companyId && isAdmin,
  });

  const { data: recentAnnouncements = [] } = useQuery({
    queryKey: ["recent-announcements", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("announcements").select("id, title, priority, created_at").eq("company_id", companyId!).eq("is_active", true).order("created_at", { ascending: false }).limit(3);
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: upcomingHolidays = [] } = useQuery({
    queryKey: ["upcoming-holidays", companyId],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data } = await supabase.from("public_holidays").select("name, date").eq("company_id", companyId!).gte("date", today).order("date").limit(3);
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: expiringContracts = [] } = useQuery({
    queryKey: ["expiring-contracts", companyId],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const thirtyDays = new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0];
      const { data } = await supabase
        .from("contracts")
        .select("id, end_date, contract_type, employees(name_ar)")
        .eq("company_id", companyId!)
        .eq("status", "active")
        .not("end_date", "is", null)
        .gte("end_date", today)
        .lte("end_date", thirtyDays)
        .order("end_date")
        .limit(5);
      return data || [];
    },
    enabled: !!companyId && isAdmin,
  });

  const { data: newHiresCount = 0 } = useQuery({
    queryKey: ["new-hires-count", companyId],
    queryFn: async () => {
      const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0];
      const { count } = await supabase.from("employees").select("*", { count: "exact", head: true }).eq("company_id", companyId!).gte("hire_date", firstOfMonth);
      return count || 0;
    },
    enabled: !!companyId && isHrManager,
  });

  const { data: birthdayEmployees = [] } = useQuery({
    queryKey: ["birthday-employees", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("employees").select("id, name_ar, date_of_birth").eq("company_id", companyId!).eq("status", "active").not("date_of_birth", "is", null);
      if (!data) return [];
      const today = new Date();
      const todayMD = `${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
      return data.filter(e => e.date_of_birth && e.date_of_birth.slice(5) === todayMD);
    },
    enabled: !!companyId && isHrManager,
  });

  const { data: expiringDocs = [] } = useQuery({
    queryKey: ["expiring-documents", companyId],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const thirtyDays = new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0];
      const { data } = await supabase
        .from("documents")
        .select("id, name, expires_at, employees(name_ar)")
        .eq("company_id", companyId!)
        .not("expires_at", "is", null)
        .gte("expires_at", today)
        .lte("expires_at", thirtyDays)
        .order("expires_at")
        .limit(5);
      return data || [];
    },
    enabled: !!companyId && isAdmin,
  });

  // ===== Employee-specific data =====
  const { data: myEmployee } = useQuery({
    queryKey: ["my-employee-dashboard", user?.id, companyId],
    queryFn: async () => {
      const { data } = await supabase
        .from("employees")
        .select("*, departments(name)")
        .eq("company_id", companyId!)
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user && !!companyId && !isHrManager,
  });

  const { data: myPendingLeaves = 0 } = useQuery({
    queryKey: ["my-pending-leaves", myEmployee?.id],
    queryFn: async () => {
      const { count } = await supabase.from("leave_requests").select("*", { count: "exact", head: true }).eq("employee_id", myEmployee!.id).eq("status", "pending");
      return count || 0;
    },
    enabled: !!myEmployee,
  });

  const { data: myTodayAttendance } = useQuery({
    queryKey: ["my-today-attendance", myEmployee?.id],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data } = await supabase.from("attendance_records").select("*").eq("employee_id", myEmployee!.id).eq("date", today).maybeSingle();
      return data;
    },
    enabled: !!myEmployee,
  });

  const adminQuickActions = [
    { title: "إضافة موظف", icon: UserPlus, path: "/madad/tamkeen/employees", desc: "تسجيل موظف جديد" },
    { title: "تشغيل الرواتب", icon: PlayCircle, path: "/madad/tamkeen/payroll", desc: "إعداد كشف الرواتب" },
    { title: "مراجعة الطلبات", icon: ClipboardCheck, path: "/madad/tamkeen/approvals", desc: `${pendingApprovals} طلب معلق` },
  ];

  const employeeQuickActions = [
    { title: "طلب إجازة", icon: CalendarDays, path: "/employee-portal/leave", desc: "تقديم طلب إجازة جديد" },
    { title: "عرض كشف الراتب", icon: Wallet, path: "/employee-portal/payslips", desc: "عرض آخر كشف راتب" },
    { title: "تسجيل الحضور", icon: Clock, path: "/madad/tamkeen/attendance", desc: "تسجيل دخول/خروج" },
  ];

  const quickActions = isHrManager ? adminQuickActions : employeeQuickActions;

  const adminStats = [
    { title: "إجمالي الموظفين", value: employeeCount, icon: Users, gradient: "from-primary/15 to-primary/5", iconBg: "bg-primary/15 text-primary", loading: loadingEmp },
    { title: "الأقسام", value: deptCount, icon: Building2, gradient: "from-secondary/15 to-secondary/5", iconBg: "bg-secondary/15 text-secondary", loading: loadingDept },
    { title: "إجازات معلقة", value: pendingLeave, icon: CalendarDays, gradient: "from-accent/15 to-accent/5", iconBg: "bg-accent/15 text-accent", loading: loadingLeave },
    { title: "إجمالي الرواتب (د.ع)", value: totalSalary.toLocaleString("ar-IQ"), icon: Wallet, gradient: "from-primary/15 to-primary/5", iconBg: "bg-primary/15 text-primary", loading: loadingSalary },
  ];

  const priorityColors: Record<string, string> = {
    urgent: "bg-destructive/10 text-destructive border-destructive/20",
    high: "bg-warning/10 text-warning border-warning/20",
    normal: "bg-muted text-muted-foreground",
    low: "bg-muted text-muted-foreground",
  };

  // ===== Employee Dashboard =====
  if (!isHrManager) {
    return (
      <div className="space-y-6 animate-fade-in">
        {/* Welcome Header */}
        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-bl from-primary/10 via-card to-accent/5 border border-border/50 px-6 py-6">
          <div className="absolute top-0 left-0 w-32 h-32 opacity-10 pointer-events-none" style={{ background: "radial-gradient(circle at 0% 0%, hsl(var(--gold)) 0%, transparent 70%)" }} />
          <div className="absolute bottom-0 right-0 w-40 h-40 opacity-[0.04] pointer-events-none geometric-stars" />
          <div className="relative z-10">
            <p className="text-sm text-muted-foreground font-body">{getGreeting()}</p>
            <h1 className="font-heading font-bold text-2xl text-foreground mt-1">{profile?.full_name || ""}</h1>
            <p className="text-muted-foreground text-sm mt-1">لوحة الخدمة الذاتية</p>
          </div>
          <div className="gold-line mt-4" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { title: "القسم", value: myEmployee?.departments?.name || "—", icon: Building2, gradient: "from-primary/10 to-transparent" },
            { title: "المنصب", value: myEmployee?.position || "—", icon: UserCircle, gradient: "from-secondary/10 to-transparent" },
            { title: "إجازات معلقة", value: myPendingLeaves, icon: CalendarDays, gradient: "from-accent/10 to-transparent" },
            { title: "حضور اليوم", value: myTodayAttendance?.check_in ? new Date(myTodayAttendance.check_in).toLocaleTimeString("ar-IQ", { hour: "2-digit", minute: "2-digit" }) : "لم تسجل بعد", icon: Clock, gradient: "from-primary/10 to-transparent" },
          ].map((stat) => (
            <Card key={stat.title} className="group hover:shadow-card-hover transition-all duration-300 border-border/60">
              <CardContent className={`p-5 bg-gradient-to-bl ${stat.gradient} rounded-xl`}>
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground font-body">{stat.title}</p>
                    <p className="text-lg font-heading font-bold mt-1.5 text-foreground truncate">{stat.value}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-card/80 border border-border/40 shadow-sm group-hover:scale-105 transition-transform">
                    <stat.icon className="h-5 w-5 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="border-border/60">
            <CardHeader className="pb-3"><CardTitle className="font-heading text-base">إجراءات سريعة</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-col gap-2">
                {quickActions.map((action) => (
                  <Button key={action.title} variant="outline" onClick={() => navigate(action.path)} className="gap-3 font-heading justify-start h-auto py-3 hover:bg-primary/5 hover:border-primary/30 transition-all duration-200 group">
                    <div className="p-1.5 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors"><action.icon className="h-4 w-4 text-primary" /></div>
                    <div className="text-right">
                      <span className="block text-sm">{action.title}</span>
                      <span className="block text-[11px] text-muted-foreground font-body">{action.desc}</span>
                    </div>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="font-heading text-base flex items-center gap-2"><Megaphone className="h-4 w-4 text-accent" />آخر الإعلانات</CardTitle>
            </CardHeader>
            <CardContent>
              {recentAnnouncements.length > 0 ? (
                <div className="space-y-3">
                  {recentAnnouncements.map((a: any) => (
                    <div key={a.id} className="flex items-start gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                      <Badge variant="outline" className={`text-[10px] shrink-0 mt-0.5 ${priorityColors[a.priority] || ""}`}>{a.priority === "urgent" ? "عاجل" : a.priority === "high" ? "مهم" : "عادي"}</Badge>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{a.title}</p>
                        <p className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleDateString("ar-IQ")}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : <p className="text-sm text-muted-foreground text-center py-6">لا توجد إعلانات</p>}
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="font-heading text-base flex items-center gap-2"><CalendarCheck className="h-4 w-4 text-primary" />العطل القادمة</CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingHolidays.length > 0 ? (
                <div className="space-y-3">
                  {upcomingHolidays.map((h: any) => (
                    <div key={h.date} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
                      <p className="text-sm font-medium">{h.name}</p>
                      <Badge variant="outline" className="text-xs font-mono" dir="ltr">{h.date}</Badge>
                    </div>
                  ))}
                </div>
              ) : <p className="text-sm text-muted-foreground text-center py-6">لا توجد عطل قادمة</p>}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ===== Admin/HR Dashboard =====
  return (
    <div className="space-y-6 animate-fade-in">
      <WalkthroughAutoPrompt />

      {/* Welcome Header */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-bl from-primary/8 via-card to-accent/5 border border-border/50 px-6 py-6">
        <div className="absolute top-0 left-0 w-40 h-40 opacity-10 pointer-events-none" style={{ background: "radial-gradient(circle at 0% 0%, hsl(var(--gold)) 0%, transparent 70%)" }} />
        <div className="absolute bottom-0 right-0 w-48 h-48 opacity-[0.03] pointer-events-none geometric-stars" />
        <div className="relative z-10 flex items-start justify-between flex-wrap gap-4">
          <div>
            <p className="text-sm text-muted-foreground font-body">{getGreeting()}</p>
            <h1 className="font-heading font-bold text-2xl text-foreground mt-1">{profile?.full_name || ""}</h1>
            <p className="text-muted-foreground text-sm mt-1">نظرة عامة على شركتك</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-body bg-muted/50 rounded-lg px-3 py-1.5 border border-border/40">
            <Clock className="h-3.5 w-3.5" />
            {new Date().toLocaleDateString("ar-IQ", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </div>
        </div>
        <div className="gold-line mt-5" />
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {adminStats.map((stat) => (
          <Card key={stat.title} className="group hover:shadow-card-hover transition-all duration-300 border-border/60 overflow-hidden">
            <CardContent className={`p-5 bg-gradient-to-bl ${stat.gradient} rounded-xl relative`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-body">{stat.title}</p>
                  {stat.loading ? (
                    <Skeleton className="h-9 w-20 mt-1.5" />
                  ) : (
                    <p className="text-2xl font-heading font-bold mt-1.5 text-foreground">{stat.value}</p>
                  )}
                </div>
                <div className={`p-3.5 rounded-xl ${stat.iconBg} shadow-sm group-hover:scale-105 transition-transform duration-300`}>
                  <stat.icon className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Alerts Section */}
      {(birthdayEmployees.length > 0 || pendingApprovals > 0 || expiringContracts.length > 0 || expiringDocs.length > 0 || newHiresCount > 0) && (
        <div className="space-y-2">
          {birthdayEmployees.length > 0 && (
            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-accent/8 border border-accent/20">
              <div className="p-2 rounded-lg bg-accent/15"><Cake className="h-4 w-4 text-accent" /></div>
              <p className="text-sm font-heading font-medium">
                عيد ميلاد اليوم: <span className="text-accent font-bold">{birthdayEmployees.map((e: any) => e.name_ar).join("، ")}</span>
              </p>
            </div>
          )}

          {pendingApprovals > 0 && (
            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-warning/8 border border-warning/20 cursor-pointer hover:bg-warning/12 transition-colors" onClick={() => navigate("/approvals")}>
              <div className="p-2 rounded-lg bg-warning/15"><AlertCircle className="h-4 w-4 text-warning" /></div>
              <p className="text-sm font-heading font-medium flex-1">لديك <span className="text-warning font-bold">{pendingApprovals}</span> طلب موافقة معلق</p>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
            </div>
          )}

          {expiringContracts.length > 0 && (
            <div className="p-3.5 rounded-xl bg-destructive/6 border border-destructive/20">
              <div className="flex items-center gap-2 mb-2.5">
                <div className="p-2 rounded-lg bg-destructive/15"><FileWarning className="h-4 w-4 text-destructive" /></div>
                <p className="text-sm font-heading font-bold text-destructive">{expiringContracts.length} عقد ينتهي خلال 30 يوم</p>
              </div>
              <div className="space-y-1.5 mr-10">
                {expiringContracts.map((c: any) => (
                  <div key={c.id} className="flex items-center justify-between text-sm">
                    <span className="font-medium">{c.employees?.name_ar}</span>
                    <Badge variant="outline" className="text-xs font-mono bg-destructive/5 text-destructive border-destructive/20" dir="ltr">{c.end_date}</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {expiringDocs.length > 0 && (
            <div className="p-3.5 rounded-xl bg-accent/6 border border-accent/20 cursor-pointer hover:bg-accent/10 transition-colors" onClick={() => navigate("/documents")}>
              <div className="flex items-center gap-2 mb-2.5">
                <div className="p-2 rounded-lg bg-accent/15"><FileText className="h-4 w-4 text-accent" /></div>
                <p className="text-sm font-heading font-bold">{expiringDocs.length} مستند ينتهي خلال 30 يوم</p>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground mr-auto" />
              </div>
              <div className="space-y-1.5 mr-10">
                {expiringDocs.map((d: any) => (
                  <div key={d.id} className="flex items-center justify-between text-sm">
                    <span className="font-medium">{d.name} {d.employees?.name_ar ? `(${d.employees.name_ar})` : ""}</span>
                    <Badge variant="outline" className="text-xs font-mono" dir="ltr">{d.expires_at}</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {newHiresCount > 0 && (
            <div className="flex items-center gap-3 p-3.5 rounded-xl bg-success/8 border border-success/20">
              <div className="p-2 rounded-lg bg-success/15"><TrendingUp className="h-4 w-4 text-success" /></div>
              <p className="text-sm font-heading font-medium"><span className="text-success font-bold">{newHiresCount}</span> موظف جديد هذا الشهر</p>
            </div>
          )}
        </div>
      )}

      {/* Quick Actions & Info Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="border-border/60">
          <CardHeader className="pb-3"><CardTitle className="font-heading text-base">إجراءات سريعة</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2">
              {quickActions.map((action) => (
                <Button key={action.title} variant="outline" onClick={() => navigate(action.path)} className="gap-3 font-heading justify-start h-auto py-3 hover:bg-primary/5 hover:border-primary/30 transition-all duration-200 group">
                  <div className="p-1.5 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors"><action.icon className="h-4 w-4 text-primary" /></div>
                  <div className="text-right">
                    <span className="block text-sm">{action.title}</span>
                    <span className="block text-[11px] text-muted-foreground font-body">{action.desc}</span>
                  </div>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="font-heading text-base flex items-center gap-2"><Megaphone className="h-4 w-4 text-accent" />آخر الإعلانات</CardTitle>
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-7 px-2" onClick={() => navigate("/announcements")}>عرض الكل</Button>
            </div>
          </CardHeader>
          <CardContent>
            {recentAnnouncements.length > 0 ? (
              <div className="space-y-2">
                {recentAnnouncements.map((a: any) => (
                  <div key={a.id} className="flex items-start gap-2 p-2.5 rounded-lg hover:bg-muted/50 transition-colors">
                    <Badge variant="outline" className={`text-[10px] shrink-0 mt-0.5 ${priorityColors[a.priority] || ""}`}>
                      {a.priority === "urgent" ? "عاجل" : a.priority === "high" ? "مهم" : "عادي"}
                    </Badge>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{a.title}</p>
                      <p className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleDateString("ar-IQ")}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-muted-foreground text-center py-6">لا توجد إعلانات</p>}
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="font-heading text-base flex items-center gap-2"><CalendarCheck className="h-4 w-4 text-primary" />العطل القادمة</CardTitle>
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-7 px-2" onClick={() => navigate("/holidays")}>عرض الكل</Button>
            </div>
          </CardHeader>
          <CardContent>
            {upcomingHolidays.length > 0 ? (
              <div className="space-y-2">
                {upcomingHolidays.map((h: any) => (
                  <div key={h.date} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-muted/50 transition-colors">
                    <p className="text-sm font-medium">{h.name}</p>
                    <Badge variant="outline" className="text-xs font-mono" dir="ltr">{h.date}</Badge>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-muted-foreground text-center py-6">لا توجد عطل قادمة</p>}
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AttendanceChart />
        <LeaveChart />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <PayrollChart />
        <DepartmentChart />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <EmployeeGrowthChart />
        {companyId && <RecentActivity companyId={companyId} />}
      </div>
    </div>
  );
}
