import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

type WIFeature = "workforce_analytics" | "gap_analysis" | "hiring_strategy" | "hr_operational" | "career_coach" | "planning" | "business_analytics" | "ats_cv_analysis" | "ats_interview" | "ats_communication" | "shortlist_candidates" | "generate_training_plan" | "generate_workforce_plan";

export interface StructuredOutput {
  candidates?: Array<{ name: string; score: number; match_percent: number; reasons: string[]; risks: string[]; recommendations: string[]; next_actions: string[] }>;
  interview_kit?: { questions: Array<{ question: string; category: string; evaluates: string }>; evaluation_criteria?: Array<{ criterion: string; weight: number }> };
  drafts?: Array<{ type: string; subject: string; body: string }>;
  shortlist?: Array<{ candidate_id: string; name: string; score: number; reasons: string[]; risks: string[]; recommendation: string }>;
  training_plan?: { title: string; modules: Array<{ name: string; objectives: string[]; duration_hours: number; priority: string }>; recommendations: string[] };
  action_plan?: { title: string; actions: Array<{ action: string; priority: string; owner: string; deadline: string; expected_impact: string }>; risks: Array<{ risk: string; mitigation: string }>; kpis: Array<{ metric: string; target: string; current: string }> };
  ranking?: Array<{ name: string; score: number; match_percent: number; strengths: string[]; gaps: string[]; recommendation: string; next_action: string }>;
  pipeline_analysis?: { total_candidates: number; bottlenecks: Array<{ stage: string; issue: string; recommendation: string }>; recommendations: string[] };
  [key: string]: any;
}

function extractStructuredOutput(text: string): StructuredOutput | null {
  const jsonMatch = text.match(/```json\s*([\s\S]*?)```/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[1].trim());
    } catch { /* ignore */ }
  }
  // Try raw JSON at start
  const trimmed = text.trim();
  if (trimmed.startsWith("{")) {
    const endIdx = trimmed.indexOf("}\n");
    if (endIdx > 0) {
      try { return JSON.parse(trimmed.substring(0, endIdx + 1)); } catch { /* ignore */ }
    }
    try { return JSON.parse(trimmed); } catch { /* ignore */ }
  }
  return null;
}

export function useWorkforceIntelligence() {
  const [result, setResult] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [structuredData, setStructuredData] = useState<StructuredOutput | null>(null);
  const [quotaExceeded, setQuotaExceeded] = useState(false);

  const analyze = useCallback(async (feature: WIFeature, question?: string, options?: { module?: string; record_id?: string }) => {
    setIsLoading(true);
    setResult("");
    setStructuredData(null);
    setQuotaExceeded(false);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/workforce-intelligence`;
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          feature,
          question,
          messages: question ? [{ role: "user", content: question }] : undefined,
          module: options?.module || feature,
          record_id: options?.record_id,
        }),
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({ error: "خطأ غير معروف" }));
        if (errData.quota_exceeded) setQuotaExceeded(true);
        throw new Error(errData.error || `Error ${resp.status}`);
      }

      if (!resp.body) throw new Error("No response body");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullText += content;
              setResult(fullText);
            }
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }

      // Extract structured data from completed response
      const structured = extractStructuredOutput(fullText);
      if (structured) setStructuredData(structured);

      return fullText;
    } catch (err: any) {
      const errorMsg = err.message || "حدث خطأ";
      setResult(`❌ ${errorMsg}`);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setResult("");
    setIsLoading(false);
    setStructuredData(null);
    setQuotaExceeded(false);
  }, []);

  return { analyze, result, isLoading, reset, structuredData, quotaExceeded };
}
