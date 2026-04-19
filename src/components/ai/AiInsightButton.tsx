import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, Loader2, ChevronDown, ChevronUp, X } from "lucide-react";
import { useWorkforceIntelligence } from "@/hooks/useWorkforceIntelligence";
import { useToast } from "@/hooks/use-toast";

interface Props {
  feature: "workforce_analytics" | "gap_analysis" | "hiring_strategy" | "hr_operational" | "career_coach" | "planning" | "ats_cv_analysis" | "ats_interview" | "ats_communication";
  question: string;
  label: string;
  icon?: React.ReactNode;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "icon" | "lg";
  className?: string;
}

export function AiInsightButton({
  feature,
  question,
  label,
  icon,
  variant = "outline",
  size = "sm",
  className = "",
}: Props) {
  const { analyze, result, isLoading, reset } = useWorkforceIntelligence();
  const [expanded, setExpanded] = useState(false);
  const { toast } = useToast();

  const handleClick = async () => {
    if (result && !isLoading) {
      setExpanded(!expanded);
      return;
    }
    setExpanded(true);
    try {
      await analyze(feature, question);
    } catch (e: any) {
      toast({ title: "خطأ", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-2">
      <Button
        variant={variant}
        size={size}
        className={`gap-1.5 ${className}`}
        onClick={handleClick}
        disabled={isLoading}
      >
        {isLoading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          icon || <Sparkles className="h-3.5 w-3.5" />
        )}
        {label}
        {result && !isLoading && (expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
      </Button>

      {expanded && (result || isLoading) && (
        <Card className="border-primary/20">
          <CardContent className="pt-3 pb-3 relative">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-1 left-1 h-6 w-6"
              onClick={() => { setExpanded(false); reset(); }}
            >
              <X className="h-3 w-3" />
            </Button>
            {isLoading && !result ? (
              <div className="flex items-center gap-2 py-4 justify-center">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span className="text-xs text-muted-foreground">جاري التحليل...</span>
              </div>
            ) : (
              <ScrollArea className="max-h-[300px]">
                <div className="prose prose-sm max-w-none dark:prose-invert text-xs [&>*:first-child]:mt-0 overflow-hidden break-words [&_table]:block [&_table]:overflow-x-auto [&_table]:w-full [&_pre]:overflow-x-auto [&_pre]:max-w-full [&_code]:break-all" dir="rtl">
                  <ReactMarkdown>{result}</ReactMarkdown>
                  {isLoading && <Loader2 className="h-3 w-3 animate-spin inline-block mr-1" />}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
