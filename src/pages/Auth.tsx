import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Building2, Phone } from "lucide-react";
import { MADAD_LOGO } from "@/lib/moduleConfig";

type AuthMode = "login" | "signup" | "forgot";

const PLATFORM_ROLES = ["super_admin", "business_admin", "finance_manager", "support_agent", "sales_manager", "technical_admin"];
const TENANT_ROLES = ["tenant_admin", "admin", "hr_manager", "hr_officer", "manager"];

function getRedirectFromRoles(_roles: string[]): string {
  // All users go to MADAD dashboard after login
  return "/madad/home";
}

export default function Auth() {
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<AuthMode>(() => {
    const m = searchParams.get("mode");
    return m === "signup" ? "signup" : "login";
  });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companyPhone, setCompanyPhone] = useState("");
  const [sector, setSector] = useState("private");
  const [employeeRange, setEmployeeRange] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const fetchRolesWithRetry = async (userId: string, retries = 3): Promise<string[]> => {
    for (let i = 0; i < retries; i++) {
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);
      const roles = (roleData || []).map((r: any) => r.role as string);
      if (roles.length > 0) return roles;
      if (i < retries - 1) await new Promise((r) => setTimeout(r, 300 * (i + 1)));
    }
    return [];
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    // Rate limiting
    if (lockedUntil && Date.now() < lockedUntil) {
      const secs = Math.ceil((lockedUntil - Date.now()) / 1000);
      toast({ title: "حساب مقفل مؤقتاً", description: `حاول مرة أخرى بعد ${secs} ثانية`, variant: "destructive" });
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      const attempts = loginAttempts + 1;
      setLoginAttempts(attempts);
      if (attempts >= 5) {
        const lockDuration = Math.min(30000 * Math.pow(2, attempts - 5), 300000); // 30s, 60s, 120s... max 5min
        setLockedUntil(Date.now() + lockDuration);
        toast({ title: "محاولات كثيرة", description: `تم قفل الحساب مؤقتاً لمدة ${Math.ceil(lockDuration / 1000)} ثانية`, variant: "destructive" });
      } else {
        toast({ title: "خطأ في تسجيل الدخول", description: error.message, variant: "destructive" });
      }
      setLoading(false);
      return;
    }
    setLoginAttempts(0);
    setLockedUntil(null);
    if (data.user) {
      let roles = await fetchRolesWithRetry(data.user.id);

      if (roles.length === 0) {
        const { data: recovered, error: rpcErr } = await supabase.rpc("recover_own_role");
        if (!rpcErr && recovered && Array.isArray(recovered) && recovered.length > 0) {
          roles = recovered.map((r: any) => r.role as string);
        }
      }

      navigate(getRedirectFromRoles(roles));
    }
    setLoading(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8 || !/[a-zA-Z]/.test(password) || !/\d/.test(password)) {
      toast({ title: "كلمة المرور ضعيفة", description: "يجب أن تكون 8 أحرف على الأقل وتحتوي على حرف ورقم", variant: "destructive" });
      return;
    }
    if (!fullName.trim() || !companyName.trim()) {
      toast({ title: "بيانات ناقصة", description: "يرجى إدخال الاسم الكامل واسم الشركة", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          full_name: fullName,
          company_name: companyName,
          company_phone: companyPhone || undefined,
          sector,
          employee_count_range: employeeRange || undefined,
        },
      },
    });
    if (error) {
      toast({ title: "خطأ في التسجيل", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "تم التسجيل بنجاح", description: "تحقق من بريدك الإلكتروني لتأكيد الحساب" });
      setMode("login");
    }
    setLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "تم الإرسال", description: "تحقق من بريدك الإلكتروني لإعادة تعيين كلمة المرور" });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background geometric-pattern p-4" dir="rtl">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <img src={MADAD_LOGO} alt="MADAD — مدد" className="h-20 mx-auto mb-2 object-contain dark:brightness-0 dark:invert" />
          <h2 className="font-heading font-bold text-xl text-foreground">مدد <span className="text-sm font-medium" style={{ color: "hsl(var(--gold))" }}>MADAD</span></h2>
          <p className="text-muted-foreground text-sm">منصة الأعمال المتكاملة</p>
          <Button variant="ghost" size="sm" className="mt-2 gap-1 text-xs text-muted-foreground" onClick={() => navigate("/")}>
            الصفحة الرئيسية
          </Button>
        </div>

        <Card className="shadow-elevated border-border/50">
          <CardHeader className="text-center pb-4">
            <CardTitle className="font-heading text-xl">
              {mode === "login" && "تسجيل الدخول"}
              {mode === "signup" && "تسجيل شركة جديدة"}
              {mode === "forgot" && "استعادة كلمة المرور"}
            </CardTitle>
            <CardDescription>
              {mode === "login" && "أدخل بياناتك للوصول إلى لوحة التحكم"}
              {mode === "signup" && "سجّل شركتك في منصة مدد وابدأ فوراً"}
              {mode === "forgot" && "أدخل بريدك الإلكتروني لإعادة تعيين كلمة المرور"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={mode === "login" ? handleLogin : mode === "signup" ? handleSignup : handleForgotPassword} className="space-y-4">
              {mode === "signup" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="fullName">الاسم الكامل</Label>
                    <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="أحمد محمد" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="companyName">اسم الشركة</Label>
                    <div className="relative">
                      <Input id="companyName" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="شركة المثال" className="pr-10" required />
                      <Building2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="sector">القطاع</Label>
                      <Select value={sector} onValueChange={setSector}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="private">خاص</SelectItem>
                          <SelectItem value="public">عام</SelectItem>
                          <SelectItem value="ngo">منظمة</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="employeeRange">عدد الموظفين</Label>
                      <Select value={employeeRange} onValueChange={setEmployeeRange}>
                        <SelectTrigger><SelectValue placeholder="اختر..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1-10">1–10</SelectItem>
                          <SelectItem value="11-50">11–50</SelectItem>
                          <SelectItem value="51-200">51–200</SelectItem>
                          <SelectItem value="201-500">201–500</SelectItem>
                          <SelectItem value="500+">500+</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="companyPhone">هاتف الشركة (اختياري)</Label>
                    <div className="relative">
                      <Input id="companyPhone" value={companyPhone} onChange={(e) => setCompanyPhone(e.target.value)} placeholder="+964..." dir="ltr" className="text-left pr-10" />
                      <Phone className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">البريد الإلكتروني</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="example@company.iq" required dir="ltr" className="text-left" />
              </div>

              {mode !== "forgot" && (
                <div className="space-y-2">
                  <Label htmlFor="password">كلمة المرور</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      dir="ltr"
                      className="text-left pl-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              )}

              {mode === "login" && (
                <button type="button" onClick={() => setMode("forgot")} className="text-sm text-primary hover:underline">
                  نسيت كلمة المرور؟
                </button>
              )}

              <Button type="submit" className="w-full font-heading font-semibold" disabled={loading}>
                {loading ? "جاري التحميل..." : mode === "login" ? "دخول" : mode === "signup" ? "تسجيل الشركة" : "إرسال رابط الاستعادة"}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm">
              {mode === "login" ? (
                <p className="text-muted-foreground">
                  ليس لديك حساب؟{" "}
                  <button onClick={() => setMode("signup")} className="text-primary font-medium hover:underline">سجّل شركتك الآن</button>
                </p>
              ) : (
                <p className="text-muted-foreground">
                  لديك حساب بالفعل؟{" "}
                  <button onClick={() => setMode("login")} className="text-primary font-medium hover:underline">تسجيل الدخول</button>
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
