import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Brain, Shield, Users, CheckCircle2, XCircle, ShoppingBag } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";

const AI_FEATURE_KEYS = [
  { key: "ai_hr_assistant", label: "مساعد HR التشغيلي" },
  { key: "ai_workforce_analytics", label: "تحليلات القوى العاملة" },
  { key: "ai_recruitment_intelligence", label: "ذكاء التوظيف" },
  { key: "ai_gap_analysis", label: "تحليل الفجوات" },
  { key: "ai_planning_advisor", label: "مستشار التخطيط" },
  { key: "ai_employee_career_coach", label: "المدرب المهني للموظفين" },
];

const ROLE_FEATURE_MAP: Record<string, string[]> = {
  admin: ["ai_hr_assistant", "ai_workforce_analytics", "ai_recruitment_intelligence", "ai_gap_analysis", "ai_planning_advisor", "ai_employee_career_coach"],
  hr_manager: ["ai_hr_assistant", "ai_workforce_analytics", "ai_recruitment_intelligence", "ai_gap_analysis", "ai_planning_advisor", "ai_employee_career_coach"],
  hr_officer: ["ai_hr_assistant", "ai_workforce_analytics", "ai_recruitment_intelligence"],
  manager: ["ai_hr_assistant", "ai_planning_advisor"],
  employee: ["ai_employee_career_coach"],
};

const ROLE_LABELS: Record<string, string> = {
  admin: "مدير",
  hr_manager: "مدير HR",
  hr_officer: "موظف HR",
  manager: "مدير قسم",
  employee: "موظف",
};

export default function AiSettingsAdmin() {
  const { companyId } = useCompany();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Active AI features from the tenant basket
  const { data: activeFeatures = [] } = useQuery({
    queryKey: ["tenant-ai-basket", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenant_features")
        .select("feature_key, status, activated_at")
        .eq("company_id", companyId!)
        .eq("status", "active")
        .like("feature_key", "ai_%");
      if (error) throw error;
      return (data || []) as { feature_key: string; status: string; activated_at: string | null }[];
    },
    enabled: !!companyId,
  });

  const activeSet = new Set(activeFeatures.map((f) => f.feature_key));

  // AI usage logs for quota display
  const { data: usageLogs = [] } = useQuery({
    queryKey: ["ai-usage-logs", companyId],
    queryFn: async () => {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
      const { data } = await supabase
        .from("ai_service_logs")
        .select("feature, created_at")
        .eq("company_id", companyId!)
        .gte("created_at", thirtyDaysAgo);
      return data || [];
    },
    enabled: !!companyId,
  });

  const totalRequests = usageLogs.length;
  const featureUsage = usageLogs.reduce<Record<string, number>>((acc, log: any) => {
    acc[log.feature] = (acc[log.feature] || 0) + 1;
    return acc;
  }, {});

  // User overrides
  const { data: users = [] } = useQuery({
    queryKey: ["company-users-ai", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("user_id, full_name").eq("company_id", companyId!);
      return data || [];
    },
    enabled: !!companyId,
  });

  const { data: overrides = [] } = useQuery({
    queryKey: ["user-ai-overrides", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("user_ai_overrides").select("*").eq("company_id", companyId!);
      return data || [];
    },
    enabled: !!companyId,
  });

  const setUserOverride = useMutation({
    mutationFn: async ({ userId, key, value }: { userId: string; key: string; value: boolean | null }) => {
      const existing = overrides.find((o: any) => o.user_id === userId);
      if (existing) {
        const { error } = await supabase.from("user_ai_overrides").update({ [key]: value, updated_at: new Date().toISOString() } as any).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("user_ai_overrides").insert({ user_id: userId, company_id: companyId!, [key]: value } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-ai-overrides"] });
      queryClient.invalidateQueries({ queryKey: ["ai-entitlements"] });
      toast({ title: "تم التحديث" });
    },
    onError: (err: Error) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-6">
      {/* Active AI Features from Basket */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="font-heading text-lg flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-primary" />
            ميزات AI المفعّلة (من سلة الميزات)
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            الميزات المشتراة والمفعّلة ضمن اشتراك الشركة — لإضافة ميزات جديدة استخدم صفحة الاشتراك
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {AI_FEATURE_KEYS.map((f) => {
            const isActive = activeSet.has(f.key);
            const activatedAt = activeFeatures.find((af) => af.feature_key === f.key)?.activated_at;
            return (
              <div key={f.key} className={`flex items-center justify-between p-3 rounded-lg border ${isActive ? "" : "opacity-60 bg-muted/30"}`}>
                <div className="flex items-center gap-3">
                  {isActive ? (
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                  ) : (
                    <XCircle className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                  <div>
                    <span className="font-heading text-sm">{f.label}</span>
                    {isActive && activatedAt && (
                      <p className="text-[10px] text-muted-foreground">
                        مفعّل منذ {new Date(activatedAt).toLocaleDateString("ar-IQ")}
                      </p>
                    )}
                  </div>
                </div>
                <Badge variant="outline" className={isActive ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}>
                  {isActive ? "مفعّل" : "غير مشترك"}
                </Badge>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Monthly Usage */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="font-heading text-lg flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            استهلاك AI الشهري
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">إجمالي الطلبات (آخر 30 يوم)</span>
            <span className="font-heading font-bold">{totalRequests}</span>
          </div>
          {Object.keys(featureUsage).length > 0 && (
            <div className="space-y-1.5 pt-2 border-t">
              <p className="text-xs text-muted-foreground font-heading">توزيع الاستخدام</p>
              {Object.entries(featureUsage).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([feature, count]) => (
                <div key={feature} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{feature}</span>
                  <Badge variant="secondary" className="text-[10px]">{count}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Role Access Matrix */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="font-heading text-lg flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            مصفوفة صلاحيات AI حسب الدور
          </CardTitle>
          <p className="text-sm text-muted-foreground">الميزات المتاحة لكل دور (تطبّق تلقائياً)</p>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الدور</TableHead>
                {AI_FEATURE_KEYS.map((f) => (
                  <TableHead key={f.key} className="text-center text-[11px]">{f.label}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(ROLE_FEATURE_MAP).map(([role, allowed]) => (
                <TableRow key={role}>
                  <TableCell className="font-medium text-sm">{ROLE_LABELS[role] || role}</TableCell>
                  {AI_FEATURE_KEYS.map((f) => (
                    <TableCell key={f.key} className="text-center">
                      {allowed.includes(f.key) && activeSet.has(f.key) ? (
                        <Badge variant="outline" className="bg-primary/10 text-primary text-[9px]">✓</Badge>
                      ) : allowed.includes(f.key) ? (
                        <span className="text-muted-foreground/40 text-xs">○</span>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p className="text-[10px] text-muted-foreground mt-2">✓ = مفعّل ومشترك &nbsp; ○ = يدعمه الدور لكن غير مشترك &nbsp; — = غير متاح للدور</p>
        </CardContent>
      </Card>

      {/* User Overrides */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="font-heading text-lg flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            تجاوزات AI لكل مستخدم
          </CardTitle>
          <p className="text-sm text-muted-foreground">تفعيل أو تعطيل AI لمستخدمين محددين (يتجاوز إعدادات الدور)</p>
        </CardHeader>
        <CardContent>
          {users.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>المستخدم</TableHead>
                  <TableHead className="text-center">AI كامل</TableHead>
                  <TableHead className="text-center">المدرب المهني</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u: any) => {
                  const override = overrides.find((o: any) => o.user_id === u.user_id);
                  return (
                    <TableRow key={u.user_id}>
                      <TableCell className="font-medium text-sm">{u.full_name || "—"}</TableCell>
                      <TableCell className="text-center">
                        <Select
                          value={override?.ai_enabled === true ? "on" : override?.ai_enabled === false ? "off" : "default"}
                          onValueChange={(v) => setUserOverride.mutate({ userId: u.user_id, key: "ai_enabled", value: v === "default" ? null : v === "on" })}
                        >
                          <SelectTrigger className="w-24 h-7 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="default">افتراضي</SelectItem>
                            <SelectItem value="on">مفعّل</SelectItem>
                            <SelectItem value="off">معطّل</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-center">
                        <Select
                          value={override?.ai_employee_career_coach === true ? "on" : override?.ai_employee_career_coach === false ? "off" : "default"}
                          onValueChange={(v) => setUserOverride.mutate({ userId: u.user_id, key: "ai_employee_career_coach", value: v === "default" ? null : v === "on" })}
                        >
                          <SelectTrigger className="w-24 h-7 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="default">افتراضي</SelectItem>
                            <SelectItem value="on">مفعّل</SelectItem>
                            <SelectItem value="off">معطّل</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">لا يوجد مستخدمون</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
