import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

const AI_ACTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-actions`;

export interface AiActionStructuredOutput {
  [key: string]: any;
}

function extractStructured(text: string): AiActionStructuredOutput | null {
  const jsonMatch = text.match(/```json\s*([\s\S]*?)```/);
  if (jsonMatch) {
    try { return JSON.parse(jsonMatch[1].trim()); } catch { /* ignore */ }
  }
  return null;
}

export function useAiAction() {
  const [result, setResult] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [structuredData, setStructuredData] = useState<AiActionStructuredOutput | null>(null);
  const [quotaExceeded, setQuotaExceeded] = useState(false);

  const execute = useCallback(async (action: string, context: string, options?: { module?: string; record_id?: string }) => {
    setResult("");
    setIsLoading(true);
    setStructuredData(null);
    setQuotaExceeded(false);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const resp = await fetch(AI_ACTIONS_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action, context, module: options?.module || action, record_id: options?.record_id }),
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        if (errData.quota_exceeded) setQuotaExceeded(true);
        throw new Error(errData.error || `Error ${resp.status}`);
      }

      if (!resp.body) throw new Error("No response body");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              accumulated += content;
              setResult(accumulated);
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Final flush
      if (textBuffer.trim()) {
        for (const raw of textBuffer.split("\n")) {
          if (!raw || raw.startsWith(":") || raw.trim() === "") continue;
          if (!raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              accumulated += content;
              setResult(accumulated);
            }
          } catch { /* ignore */ }
        }
      }

      // Extract structured data
      const structured = extractStructured(accumulated);
      if (structured) setStructuredData(structured);

      return accumulated;
    } catch (e: any) {
      throw e;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setResult("");
    setStructuredData(null);
    setQuotaExceeded(false);
  }, []);

  return { execute, result, isLoading, reset, structuredData, quotaExceeded };
}
