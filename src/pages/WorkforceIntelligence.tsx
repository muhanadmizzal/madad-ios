import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import ReactMarkdown from "react-markdown";
import {
  Brain, BarChart3, Target, Briefcase, Users, MessageSquare,
  Loader2, Sparkles, TrendingUp, AlertTriangle, Search, Send,
  Lightbulb, RefreshCw,
} from "lucide-react";
import { useWorkforceIntelligence } from "@/hooks/useWorkforceIntelligence";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { useToast } from "@/hooks/use-toast";

type WIFeature = "workforce_analytics" | "gap_analysis" | "hiring_strategy" | "hr_operational" | "planning";

const QUICK_QUESTIONS: Record<WIFeature, { label: string; question: string }[]> = {
  workforce_analytics: [
    { label: "تكوين القوى العاملة", question: "قدم تحليلاً شاملاً لتكوين القوى العاملة الحالية مع التوزيعات والنسب" },
    { label: "اتجاهات الحضور", question: "حلل اتجاهات الحضور والعمل الإضافي خلال الفترة الأخيرة وحدد الأقسام الأكثر إنتاجية" },
    { label: "مؤشرات الإنتاجية", question: "ما هي مؤشرات الإنتاجية الرئيسية؟ حدد الأقسام التي تعاني من عمل إضافي مفرط أو غياب مرتفع" },
    { label: "تحليل الرواتب", question: "قدم تحليلاً لتوزيع الرواتب واتجاهات التكاليف" },
  ],
  gap_analysis: [
    { label: "فجوات المهارات", question: "حلل فجوات المهارات في الشركة بناءً على المناصب والأداء والتدريب وقدم توصيات" },
    { label: "فجوات الأدوار", question: "هل توجد أقسام تعاني من نقص في الموظفين بناءً على العمل الإضافي والغياب؟ ما التوصيات؟" },
    { label: "مخاطر الخلافة", question: "حدد الأدوار الرئيسية التي قد تواجه مخاطر خلافة. من الموظفون المؤهلون للترقية؟" },
    { label: "خطر الإرهاق", question: "من الموظفون المعرضون لخطر الإرهاق بناءً على العمل الإضافي وعدم أخذ إجازات؟" },
  ],
  hiring_strategy: [
    { label: "احتياجات التوظيف", question: "ما هي احتياجات التوظيف الحالية والمستقبلية بناءً على حجم العمل والنمو؟" },
    { label: "تحليل خط المرشحين", question: "حلل خط أنابيب المرشحين الحاليين. أين توجد معوقات التوظيف؟" },
    { label: "أداء مصادر التوظيف", question: "ما هي أفضل مصادر التوظيف من حيث الجودة والعدد؟" },
    { label: "استراتيجية التوظيف", question: "قدم استراتيجية توظيف شاملة بناءً على البيانات الحالية" },
  ],
  hr_operational: [
    { label: "عقود قريبة الانتهاء", question: "أي موظفين تقترب عقودهم من الانتهاء في الأشهر الثلاثة القادمة؟" },
    { label: "غياب مرتفع", question: "أي أقسام لديها أعلى معدلات غياب؟ ما الأسباب المحتملة؟" },
    { label: "إجازات مستحقة", question: "من الموظفون الذين لم يأخذوا إجازة لأكثر من 6 أشهر؟" },
    { label: "مخالفات الحضور", question: "ملخص مخالفات الحضور الأخيرة وأبرز الأنماط" },
  ],
  planning: [
    { label: "خطة القوى العاملة", question: "قدم خطة قوى عاملة للربع القادم بناءً على البيانات الحالية" },
    { label: "تحسين الإنتاجية", question: "ما التوصيات لتحسين إنتاجية الأقسام؟" },
    { label: "ميزانية التدريب", question: "كيف يجب توزيع ميزانية التدريب بناءً على الاحتياجات؟" },
    { label: "سياسات HR", question: "قدم توصيات لتحسين سياسات الموارد البشرية بناءً على البيانات" },
  ],
};

function FeatureSection({ feature, title, icon: Icon, description }: {
  feature: WIFeature;
  title: string;
  icon: React.ElementType;
  description: string;
}) {
  const { analyze, result, isLoading, reset } = useWorkforceIntelligence();
  const [customQ, setCustomQ] = useState("");
  const { toast } = useToast();

  const handleAnalyze = async (question: string) => {
    try {
      await analyze(feature, question);
    } catch (e: any) {
      toast({ title: "خطأ", description: e.message, variant: "destructive" });
    }
  };

  const handleCustom = () => {
    if (!customQ.trim()) return;
    handleAnalyze(customQ);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-heading font-bold text-lg flex items-center gap-2">
            <Icon className="h-5 w-5 text-primary" />{title}
          </h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        {result && (
          <Button variant="ghost" size="sm" onClick={reset} className="gap-1">
            <RefreshCw className="h-3.5 w-3.5" />جديد
          </Button>
        )}
      </div>

      {/* Quick question chips */}
      <div className="flex flex-wrap gap-2">
        {QUICK_QUESTIONS[feature].map((q, i) => (
          <Button
            key={i}
            variant="outline"
            size="sm"
            className="gap-1.5 font-heading text-xs"
            onClick={() => handleAnalyze(q.question)}
            disabled={isLoading}
          >
            <Lightbulb className="h-3 w-3" />{q.label}
          </Button>
        ))}
      </div>

      {/* Custom question */}
      <div className="flex gap-2">
        <Input
          placeholder="اسأل سؤالاً مخصصاً..."
          value={customQ}
          onChange={e => setCustomQ(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleCustom()}
          disabled={isLoading}
          className="text-sm"
        />
        <Button size="sm" onClick={handleCustom} disabled={isLoading || !customQ.trim()} className="gap-1">
          <Send className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Results */}
      {(isLoading || result) && (
        <Card className="border-primary/20">
          <CardContent className="pt-4">
            {isLoading && !result ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span className="mr-2 text-sm text-muted-foreground">جاري التحليل...</span>
              </div>
            ) : (
              <ScrollArea className="max-h-[500px]">
                <div className="prose prose-sm max-w-none dark:prose-invert [&>*:first-child]:mt-0" dir="rtl">
                  <ReactMarkdown>{result}</ReactMarkdown>
                  {isLoading && <Loader2 className="h-4 w-4 animate-spin inline-block mr-1" />}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function WorkforceIntelligence() {
  const { companyId } = useCompany();

  const { data: features } = useQuery({
    queryKey: ["ai-features", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("tenant_ai_features").select("*").eq("company_id", companyId!).maybeSingle();
      return data;
    },
    enabled: !!companyId,
  });

  const { data: aiUsage = [] } = useQuery({
    queryKey: ["ai-usage-summary", companyId],
    queryFn: async () => {
      const { data } = await supabase.from("ai_service_logs")
        .select("feature, created_at")
        .eq("company_id", companyId!)
        .order("created_at", { ascending: false })
        .limit(50);
      return data || [];
    },
    enabled: !!companyId,
  });

  const usageCount = aiUsage.length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading font-bold text-2xl text-foreground flex items-center gap-2">
            <Brain className="h-7 w-7 text-primary" />
            ذكاء القوى العاملة
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            تحليلات ورؤى ذكية لتخطيط وإدارة القوى العاملة
          </p>
        </div>
        <Badge variant="outline" className="gap-1 font-heading">
          <Sparkles className="h-3 w-3" />
          {usageCount} تحليل هذا الشهر
        </Badge>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { icon: BarChart3, label: "تحليل القوى العاملة", color: "text-primary" },
          { icon: Target, label: "فجوات وفرص", color: "text-destructive" },
          { icon: Briefcase, label: "استراتيجية التوظيف", color: "text-accent-foreground" },
          { icon: MessageSquare, label: "مساعد HR", color: "text-primary" },
          { icon: TrendingUp, label: "تخطيط", color: "text-primary" },
        ].map((item, i) => (
          <Card key={i}>
            <CardContent className="p-3 text-center">
              <item.icon className={`h-5 w-5 mx-auto mb-1 ${item.color}`} />
              <p className="text-xs font-heading">{item.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="analytics">
        <TabsList className="flex-wrap">
          <TabsTrigger value="analytics" className="font-heading gap-1"><BarChart3 className="h-3.5 w-3.5" />التحليلات</TabsTrigger>
          <TabsTrigger value="gaps" className="font-heading gap-1"><AlertTriangle className="h-3.5 w-3.5" />الفجوات</TabsTrigger>
          <TabsTrigger value="hiring" className="font-heading gap-1"><Briefcase className="h-3.5 w-3.5" />التوظيف</TabsTrigger>
          <TabsTrigger value="operational" className="font-heading gap-1"><MessageSquare className="h-3.5 w-3.5" />العمليات</TabsTrigger>
          <TabsTrigger value="planning" className="font-heading gap-1"><TrendingUp className="h-3.5 w-3.5" />التخطيط</TabsTrigger>
        </TabsList>

        <TabsContent value="analytics">
          <Card>
            <CardContent className="pt-6">
              <FeatureSection
                feature="workforce_analytics"
                title="تحليلات القوى العاملة"
                icon={BarChart3}
                description="تحليل تكوين القوى العاملة، الاتجاهات، والإنتاجية"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gaps">
          <Card>
            <CardContent className="pt-6">
              <FeatureSection
                feature="gap_analysis"
                title="تحليل الفجوات"
                icon={AlertTriangle}
                description="اكتشاف فجوات المهارات، الأدوار، ومخاطر الخلافة"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hiring">
          <Card>
            <CardContent className="pt-6">
              <FeatureSection
                feature="hiring_strategy"
                title="استراتيجية التوظيف"
                icon={Briefcase}
                description="تحليل خط المرشحين واحتياجات التوظيف"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="operational">
          <Card>
            <CardContent className="pt-6">
              <FeatureSection
                feature="hr_operational"
                title="مساعد عمليات HR"
                icon={MessageSquare}
                description="أسئلة تشغيلية حول الموظفين والحضور والعقود"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="planning">
          <Card>
            <CardContent className="pt-6">
              <FeatureSection
                feature="planning"
                title="تخطيط القوى العاملة"
                icon={TrendingUp}
                description="خطط القوى العاملة وتوصيات تحسين الإنتاجية"
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
