import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Brain, BarChart3, TrendingUp, Building2, Loader2, Sparkles, RefreshCw, Shield, Info } from "lucide-react";
import { useWorkforceIntelligence } from "@/hooks/useWorkforceIntelligence";
import { useToast } from "@/hooks/use-toast";

const BUSINESS_QUESTIONS = [
  { label: "اتجاهات اعتماد المنصة", question: "حلل اتجاهات اعتماد المنصة ومعدلات النمو. قدم بيانات مجمعة ومجهولة فقط." },
  { label: "أنماط القوى العاملة حسب القطاع", question: "ما هي أنماط القوى العاملة حسب القطاعات المختلفة؟ قدم تحليلاً مجهولاً للاتجاهات." },
  { label: "استخدام الميزات", question: "حلل استخدام ميزات المنصة المختلفة. أي الميزات الأكثر استخداماً؟ قدم بيانات مجمعة." },
  { label: "متوسط نمو الشركات", question: "ما هو متوسط نمو الشركات على المنصة؟ قدم إحصائيات مجمعة ومجهولة." },
];

export default function AiBusinessAnalytics() {
  const { analyze, result, isLoading, reset } = useWorkforceIntelligence();
  const { toast } = useToast();

  const handleAnalyze = async (question: string) => {
    try {
      await analyze("business_analytics", question);
    } catch (e: any) {
      toast({ title: "خطأ", description: e.message, variant: "destructive" });
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-heading flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            تحليلات AI للمنصة
          </CardTitle>
          <div className="flex items-center gap-1.5">
            <Badge variant="outline" className="gap-1 text-xs">
              <Shield className="h-3 w-3" />
              بيانات مجهولة
            </Badge>
            {result && (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={reset}>
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          تحليلات مجمعة ومجهولة الهوية عبر جميع الشركات على المنصة
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {!result && !isLoading && (
          <div className="grid grid-cols-2 gap-2">
            {BUSINESS_QUESTIONS.map((q, i) => (
              <Button
                key={i}
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs justify-start h-auto py-2 px-3"
                onClick={() => handleAnalyze(q.question)}
              >
                <Sparkles className="h-3 w-3 text-primary shrink-0" />
                {q.label}
              </Button>
            ))}
          </div>
        )}

        {(isLoading || result) && (
          <div className="rounded-lg border bg-muted/30 p-4">
            {isLoading && !result ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span className="mr-2 text-sm text-muted-foreground">جاري تحليل بيانات المنصة...</span>
              </div>
            ) : (
              <ScrollArea className="max-h-[500px]">
                <div className="prose prose-sm max-w-none dark:prose-invert [&>*:first-child]:mt-0" dir="rtl">
                  <ReactMarkdown>{result}</ReactMarkdown>
                  {isLoading && <Loader2 className="h-3 w-3 animate-spin inline-block mr-1" />}
                </div>
                {result && !isLoading && (
                  <div className="mt-3 pt-2 border-t flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Info className="h-3 w-3" />
                    جميع البيانات مجمعة ومجهولة - لا تُعرض بيانات شركة محددة
                  </div>
                )}
              </ScrollArea>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
