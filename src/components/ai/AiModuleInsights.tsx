import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, Brain, Send, RefreshCw, Info, X, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useWorkforceIntelligence, StructuredOutput } from "@/hooks/useWorkforceIntelligence";
import { useToast } from "@/hooks/use-toast";

export interface AiQuickAction {
  label: string;
  question: string;
  icon?: React.ReactNode;
  actionType?: string;
}

interface Props {
  module: string;
  title: string;
  description?: string;
  quickActions: AiQuickAction[];
  contextData?: string;
  feature?: "workforce_analytics" | "gap_analysis" | "hiring_strategy" | "hr_operational" | "career_coach" | "planning" | "shortlist_candidates" | "generate_training_plan" | "generate_workforce_plan";
  className?: string;
  compact?: boolean;
  recordId?: string;
}

function StructuredResultCard({ data }: { data: StructuredOutput }) {
  // Render ranking/candidates
  const items = data.candidates || data.ranking || data.shortlist;
  if (items && items.length > 0) {
    return (
      <div className="space-y-2 mb-3">
        <h4 className="text-xs font-heading text-foreground flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3 text-primary" />
          نتائج مُهيكلة ({items.length})
        </h4>
        {items.slice(0, 10).map((item: any, i: number) => (
          <div key={i} className="p-2 rounded-md border border-primary/10 bg-primary/[0.02] space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-foreground">{item.name}</span>
              <Badge variant="outline" className="text-[10px]">
                {item.score || item.match_percent || 0}%
              </Badge>
            </div>
            {item.recommendation && (
              <Badge variant={item.recommendation === "shortlist" || item.recommendation === "suitable" ? "default" : "secondary"} className="text-[10px]">
                {item.recommendation}
              </Badge>
            )}
            {item.reasons?.length > 0 && (
              <div className="text-[10px] text-muted-foreground">✅ {item.reasons.slice(0, 2).join(" | ")}</div>
            )}
            {item.risks?.length > 0 && (
              <div className="text-[10px] text-destructive/80">⚠️ {item.risks.slice(0, 2).join(" | ")}</div>
            )}
          </div>
        ))}
      </div>
    );
  }

  // Render action plan
  if (data.action_plan) {
    return (
      <div className="space-y-2 mb-3">
        <h4 className="text-xs font-heading text-foreground">{data.action_plan.title || "خطة العمل"}</h4>
        {data.action_plan.actions?.slice(0, 5).map((a: any, i: number) => (
          <div key={i} className="p-2 rounded-md border text-[11px] space-y-0.5">
            <div className="flex items-center justify-between">
              <span className="font-medium text-foreground">{a.action}</span>
              <Badge variant={a.priority === "critical" ? "destructive" : "outline"} className="text-[9px]">{a.priority}</Badge>
            </div>
            {a.expected_impact && <div className="text-muted-foreground">الأثر: {a.expected_impact}</div>}
          </div>
        ))}
      </div>
    );
  }

  // Render training plan
  if (data.training_plan) {
    return (
      <div className="space-y-2 mb-3">
        <h4 className="text-xs font-heading text-foreground">{data.training_plan.title || "خطة التدريب"}</h4>
        {data.training_plan.modules?.slice(0, 5).map((m: any, i: number) => (
          <div key={i} className="p-2 rounded-md border text-[11px]">
            <div className="flex items-center justify-between">
              <span className="font-medium">{m.name}</span>
              <Badge variant="outline" className="text-[9px]">{m.duration_hours}h | {m.priority}</Badge>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Render interview kit
  if (data.interview_kit) {
    return (
      <div className="space-y-2 mb-3">
        <h4 className="text-xs font-heading text-foreground">حزمة المقابلة ({data.interview_kit.questions?.length || 0} سؤال)</h4>
        {data.interview_kit.questions?.slice(0, 5).map((q: any, i: number) => (
          <div key={i} className="p-2 rounded-md border text-[11px]">
            <div className="font-medium text-foreground">{q.question}</div>
            <div className="text-muted-foreground mt-0.5">
              <Badge variant="secondary" className="text-[9px] mr-1">{q.category}</Badge>
              يقيّم: {q.evaluates}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return null;
}

export function AiModuleInsights({
  module,
  title,
  description,
  quickActions,
  contextData,
  feature = "hr_operational",
  className = "",
  compact = false,
  recordId,
}: Props) {
  const { analyze, result, isLoading, reset, structuredData, quotaExceeded } = useWorkforceIntelligence();
  const [customQ, setCustomQ] = useState("");
  const [expanded, setExpanded] = useState(!compact);
  const { toast } = useToast();

  const handleAnalyze = async (question: string, actionFeature?: string) => {
    const fullQ = contextData
      ? `[وحدة: ${module}]\n${contextData}\n\nالسؤال: ${question}\n\nتعليمات: قدم تحليلاً مفصلاً مع شرح العوامل (explainability). استخدم بيانات الشركة فقط.`
      : `[وحدة: ${module}]\n\n${question}\n\nتعليمات: قدم تحليلاً مفصلاً مع شرح العوامل. استخدم بيانات الشركة فقط.`;
    try {
      await analyze((actionFeature || feature) as any, fullQ, { module, record_id: recordId });
    } catch (e: any) {
      toast({ title: "خطأ", description: e.message, variant: "destructive" });
    }
  };

  if (!expanded) {
    return (
      <Button
        variant="outline"
        size="sm"
        className={`gap-1.5 border-primary/20 ${className}`}
        onClick={() => setExpanded(true)}
      >
        <Brain className="h-3.5 w-3.5 text-primary" />
        رؤى ذكية - {title}
      </Button>
    );
  }

  // Remove markdown content after JSON block for display
  const displayResult = result.replace(/```json[\s\S]*?```\s*/g, "").trim();

  return (
    <Card className={`border-primary/20 bg-gradient-to-br from-primary/[0.02] to-transparent ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-heading flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-primary/10">
              <Brain className="h-4 w-4 text-primary" />
            </div>
            <div>
              <span>{title}</span>
              {description && <p className="text-xs text-muted-foreground font-normal mt-0.5">{description}</p>}
            </div>
          </CardTitle>
          <div className="flex items-center gap-1">
            {result && (
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={reset}>
                <RefreshCw className="h-3 w-3" />
              </Button>
            )}
            {compact && (
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setExpanded(false); reset(); }}>
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {/* Quota Warning */}
        {quotaExceeded && (
          <div className="flex items-center gap-2 p-2 rounded-md bg-destructive/10 text-destructive text-xs">
            <AlertTriangle className="h-3.5 w-3.5" />
            تم استنفاد حصة AI الشهرية. يرجى ترقية الباقة.
          </div>
        )}

        {/* Quick Actions */}
        {!result && !isLoading && !quotaExceeded && (
          <div className="flex flex-wrap gap-1.5">
            {quickActions.map((action, i) => (
              <Button
                key={i}
                variant="outline"
                size="sm"
                className="gap-1 text-xs h-7 border-primary/15 hover:bg-primary/5 hover:border-primary/30"
                onClick={() => handleAnalyze(action.question, action.actionType)}
                disabled={isLoading}
              >
                {action.icon || <Sparkles className="h-3 w-3 text-primary" />}
                {action.label}
              </Button>
            ))}
          </div>
        )}

        {/* Custom Question */}
        {!result && !isLoading && !quotaExceeded && (
          <div className="flex gap-1.5">
            <Input
              placeholder="اسأل سؤالاً مخصصاً..."
              value={customQ}
              onChange={e => setCustomQ(e.target.value)}
              onKeyDown={e => e.key === "Enter" && customQ.trim() && handleAnalyze(customQ)}
              className="text-xs h-7"
              disabled={isLoading}
            />
            <Button size="sm" className="h-7 px-2" onClick={() => customQ.trim() && handleAnalyze(customQ)} disabled={isLoading || !customQ.trim()}>
              <Send className="h-3 w-3" />
            </Button>
          </div>
        )}

        {/* Results */}
        {(isLoading || result) && (
          <div className="rounded-lg border border-primary/10 bg-background p-3">
            {isLoading && !result ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span className="mr-2 text-xs text-muted-foreground">جاري التحليل...</span>
              </div>
            ) : (
              <ScrollArea className="max-h-[400px]">
                {/* Structured output cards */}
                {structuredData && <StructuredResultCard data={structuredData} />}

                {/* Markdown explanation */}
                {displayResult && (
                  <div className="prose prose-sm max-w-none dark:prose-invert text-xs [&>*:first-child]:mt-0 overflow-hidden break-words [&_table]:block [&_table]:overflow-x-auto [&_table]:w-full [&_pre]:overflow-x-auto [&_pre]:max-w-full [&_code]:break-all" dir="rtl">
                    <ReactMarkdown>{displayResult}</ReactMarkdown>
                    {isLoading && <Loader2 className="h-3 w-3 animate-spin inline-block mr-1" />}
                  </div>
                )}
                {result && !isLoading && (
                  <div className="mt-3 pt-2 border-t border-border flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Info className="h-3 w-3" />
                    النتائج مبنية على بيانات شركتك فقط مع شرح العوامل المؤثرة
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
