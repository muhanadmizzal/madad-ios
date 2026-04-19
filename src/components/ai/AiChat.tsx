import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, Send, User, Loader2, Sparkles, Database } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

type Msg = { role: "user" | "assistant"; content: string };
type AiMode = "general" | "ats" | "policy" | "document" | "analytics";

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`;

const MODE_CONFIG: Record<AiMode, { label: string; description: string; icon: typeof Sparkles }> = {
  general: { label: "مساعد HR", description: "استفسارات عامة", icon: Sparkles },
  ats: { label: "التوظيف", description: "فرز المرشحين والمقابلات", icon: Sparkles },
  policy: { label: "السياسات", description: "قوانين العمل والسياسات", icon: Sparkles },
  document: { label: "المستندات", description: "صياغة خطابات ومستندات", icon: Sparkles },
  analytics: { label: "التحليلات", description: "تحليل بيانات HR وخطط العمل", icon: Database },
};

interface AiChatProps {
  embedded?: boolean;
  defaultMode?: AiMode;
}

export default function AiChat({ embedded = false, defaultMode = "general" }: AiChatProps) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<AiMode>(defaultMode);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg: Msg = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    let assistantSoFar = "";

    try {
      // Get session token for authenticated data access
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ messages: [...messages, userMsg], mode }),
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.error || `Error ${resp.status}`);
      }

      if (!resp.body) throw new Error("No response body");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let streamDone = false;

      const upsertAssistant = (nextChunk: string) => {
        assistantSoFar += nextChunk;
        const content = assistantSoFar;
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant") {
            return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content } : m));
          }
          return [...prev, { role: "assistant", content }];
        });
      };

      while (!streamDone) {
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
          if (jsonStr === "[DONE]") { streamDone = true; break; }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) upsertAssistant(content);
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Final flush
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split("\n")) {
          if (!raw) continue;
          if (raw.endsWith("\r")) raw = raw.slice(0, -1);
          if (raw.startsWith(":") || raw.trim() === "") continue;
          if (!raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) upsertAssistant(content);
          } catch { /* ignore */ }
        }
      }
    } catch (e: any) {
      console.error("AI Chat error:", e);
      toast({ title: "خطأ", description: e.message || "حدث خطأ في الاتصال بخدمة AI", variant: "destructive" });
      if (!assistantSoFar) {
        setMessages((prev) => prev.slice(0, -1));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const suggestions: Record<AiMode, string[]> = {
    general: [
      "حلل بيانات شركتي وقدم ملخصاً شاملاً",
      "ما هي الفجوات في القوى العاملة لدينا؟",
      "اقترح خطة لتحسين توازن العمل والحياة",
    ],
    ats: [
      "حلل فجوات التوظيف في شركتنا واقترح حلول",
      "ما هي الوظائف الأكثر حاجة بناءً على بياناتنا؟",
      "اكتب وصفاً وظيفياً لمنصب مدير موارد بشرية",
    ],
    policy: [
      "اقترح سياسات بناءً على حجم شركتنا",
      "ما هي ساعات العمل القانونية في العراق؟",
      "اكتب سياسة العمل عن بُعد",
    ],
    document: [
      "اكتب خطاب تعيين موظف جديد",
      "اكتب شهادة خبرة",
      "صياغة خطاب إنذار",
    ],
    analytics: [
      "حلل أداء الموظفين وحدد نقاط القوة والضعف",
      "ابنِ خطة أهداف ربع سنوية بناءً على بياناتنا",
      "قدم تقرير شامل عن معدل دوران الموظفين والتوصيات",
    ],
  };

  return (
    <div className={`flex flex-col ${embedded ? "h-[500px]" : "h-[calc(100vh-8rem)]"}`}>
      {/* Mode selector */}
      <div className="flex flex-wrap gap-2 mb-4">
        {(Object.entries(MODE_CONFIG) as [AiMode, typeof MODE_CONFIG[AiMode]][]).map(([key, cfg]) => (
          <button
            key={key}
            onClick={() => { setMode(key); setMessages([]); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              mode === key
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            <cfg.icon className="h-3 w-3" />
            {cfg.label}
          </button>
        ))}
      </div>

      {/* Data badge */}
      <div className="flex items-center gap-2 mb-2">
        <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-success/10 text-success font-medium">
          <Database className="h-3 w-3" />
          متصل ببيانات الشركة
        </span>
      </div>

      {/* Chat area */}
      <Card className="flex-1 flex flex-col overflow-hidden">
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <Bot className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-heading font-bold text-lg text-foreground mb-1">
                {MODE_CONFIG[mode].label}
              </h3>
              <p className="text-sm text-muted-foreground mb-2">{MODE_CONFIG[mode].description}</p>
              <p className="text-xs text-muted-foreground/70 mb-6">
                يستخدم بيانات شركتك الفعلية لتقديم تحليلات وتوصيات دقيقة
              </p>
              <div className="flex flex-wrap gap-2 justify-center max-w-md">
                {suggestions[mode].map((s, i) => (
                  <button
                    key={i}
                    onClick={() => { setInput(s); }}
                    className="text-xs px-3 py-2 rounded-lg bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors text-right"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg, i) => (
              <div key={i} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  msg.role === "user" ? "bg-primary/10" : "bg-accent/10"
                }`}>
                  {msg.role === "user" ? (
                    <User className="h-4 w-4 text-primary" />
                  ) : (
                    <Bot className="h-4 w-4 text-accent" />
                  )}
                </div>
                <div className={`max-w-[80%] rounded-xl px-4 py-3 text-sm ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                }`}>
                  {msg.role === "assistant" ? (
                    <div className="prose prose-sm max-w-none dark:prose-invert [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 overflow-hidden break-words [&_table]:block [&_table]:overflow-x-auto [&_table]:w-full [&_pre]:overflow-x-auto [&_pre]:max-w-full [&_code]:break-all">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <p>{msg.content}</p>
                  )}
                </div>
              </div>
            ))
          )}
          {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                <Bot className="h-4 w-4 text-accent" />
              </div>
              <div className="bg-muted rounded-xl px-4 py-3">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-border p-3">
          <form
            onSubmit={(e) => { e.preventDefault(); send(); }}
            className="flex gap-2"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="اسأل عن بيانات شركتك، خطط العمل، الفجوات..."
              disabled={isLoading}
              className="flex-1"
              dir="rtl"
            />
            <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}
