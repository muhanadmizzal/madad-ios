import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, BarChart3, Briefcase, UserCircle, Target, Lightbulb, CheckCircle2, XCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";

const AI_FEATURES = [
  { key: "ai_hr_assistant", label: "مساعد HR التشغيلي", desc: "أسئلة تشغيلية حول الموظفين والحضور", icon: Brain },
  { key: "ai_workforce_analytics", label: "تحليلات القوى العاملة", desc: "تكوين واتجاهات القوى العاملة", icon: BarChart3 },
  { key: "ai_recruitment_intelligence", label: "ذكاء التوظيف", desc: "تحليل خط المرشحين واستراتيجية التوظيف", icon: Briefcase },
  { key: "ai_gap_analysis", label: "تحليل الفجوات", desc: "فجوات المهارات والأدوار ومخاطر الخلافة", icon: Target },
  { key: "ai_planning_advisor", label: "مستشار التخطيط", desc: "تخطيط القوى العاملة وتوصيات الإنتاجية", icon: Lightbulb },
  { key: "ai_employee_career_coach", label: "المدرب المهني للموظفين", desc: "مسارات مهنية واقتراحات تطوير للموظفين", icon: UserCircle },
];

export default function AiFeatureSettings() {
  const { companyId } = useCompany();

  const { data: activeFeatures = [], isLoading } = useQuery({
    queryKey: ["tenant-ai-basket", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenant_features")
        .select("feature_key, status")
        .eq("company_id", companyId!)
        .eq("status", "active")
        .like("feature_key", "ai_%");
      if (error) throw error;
      return (data || []).map((d: any) => d.feature_key as string);
    },
    enabled: !!companyId,
  });

  const activeSet = new Set(activeFeatures);

  if (isLoading) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="font-heading text-lg flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          ميزات الذكاء الاصطناعي
        </CardTitle>
        <p className="text-sm text-muted-foreground">الميزات المفعّلة ضمن سلة اشتراك الشركة</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {AI_FEATURES.map((f) => {
          const isActive = activeSet.has(f.key);
          return (
            <div key={f.key} className={`flex items-center justify-between p-3 rounded-lg border ${!isActive ? "opacity-60 bg-muted/30" : ""}`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${isActive ? "bg-primary/10" : "bg-muted"}`}>
                  {isActive ? (
                    <f.icon className="h-4 w-4 text-primary" />
                  ) : (
                    <XCircle className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <span className="font-heading text-sm">{f.label}</span>
                  <p className="text-xs text-muted-foreground">{f.desc}</p>
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
  );
}
