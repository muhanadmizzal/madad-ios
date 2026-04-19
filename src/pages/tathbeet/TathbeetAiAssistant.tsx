import { useState, useRef, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCompany } from "@/hooks/useCompany";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, Send, Loader2, Sparkles, BarChart3, Users, CalendarCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const QUICK_PROMPTS = [
  { label: "تقرير الحجوزات", labelEn: "Bookings Report", icon: CalendarCheck, prompt: "اعطيني تقرير شامل عن الحجوزات" },
  { label: "أداء الموظفين", labelEn: "Staff Performance", icon: Users, prompt: "شلون أداء الموظفين؟ مين الأحسن؟" },
  { label: "تحليل الإيرادات", labelEn: "Revenue Analysis", icon: BarChart3, prompt: "حلل لي الإيرادات وشنو الخدمات الأكثر ربحاً" },
  { label: "نصائح تطوير", labelEn: "Growth Tips", icon: Sparkles, prompt: "شنو اقتراحاتك لتطوير شغلي؟" },
];

export default function TathbeetAiAssistant() {
  const { t } = useLanguage();
  const { companyId } = useCompany();
  const { session } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || !companyId || loading) return;
    const userMsg: Message = { role: "user", content: text.trim(), timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("tathbeet-ai", {
        body: { message: text.trim(), companyId },
      });
      if (error) throw error;
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply, timestamp: new Date() }]);
    } catch (err: any) {
      toast.error(t("حدث خطأ في الاتصال بالمساعد", "Error connecting to assistant"));
      setMessages((prev) => [...prev, { role: "assistant", content: "عذراً، حدث خطأ. حاول مرة أخرى.", timestamp: new Date() }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading font-bold text-2xl text-foreground flex items-center gap-2">
          <Bot className="h-6 w-6" style={{ color: "hsl(var(--gold))" }} />
          {t("المساعد الذكي", "AI Assistant")}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {t("مساعدك الذكي لتحليل بيانات عملك — يفهم العراقي!", "Your AI assistant for business analytics — understands Iraqi dialect!")}
        </p>
      </div>

      {/* Quick prompts */}
      {messages.length === 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {QUICK_PROMPTS.map((qp) => (
            <Card
              key={qp.prompt}
              className="border-border/50 cursor-pointer hover:border-primary/50 hover:shadow-sm transition-all"
              onClick={() => sendMessage(qp.prompt)}
            >
              <CardContent className="p-4 text-center space-y-2">
                <qp.icon className="h-6 w-6 mx-auto" style={{ color: "hsl(var(--gold))" }} />
                <p className="text-sm font-medium">{t(qp.label, qp.labelEn)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Chat area */}
      <Card className="border-border/50">
        <CardContent className="p-0">
          <ScrollArea className="h-[55vh] p-4">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground gap-3">
                <Bot className="h-12 w-12 opacity-20" />
                <p className="text-sm">{t("اسألني أي سؤال عن عملك... أفهم عراقي!", "Ask me anything about your business... I understand Iraqi!")}</p>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`mb-4 flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-xl px-4 py-3 text-sm ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/50 border border-border/50"
                }`}>
                  {msg.role === "assistant" ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none [&_table]:text-xs [&_table]:w-full [&_th]:text-start [&_td]:p-1.5 [&_th]:p-1.5 [&_table]:border-collapse [&_td]:border [&_th]:border [&_td]:border-border [&_th]:border-border [&_th]:bg-muted/50">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <p>{msg.content}</p>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start mb-4">
                <div className="bg-muted/50 border border-border/50 rounded-xl px-4 py-3 flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("جاري التحليل...", "Analyzing...")}
                </div>
              </div>
            )}
            <div ref={scrollRef} />
          </ScrollArea>

          {/* Input */}
          <div className="border-t border-border p-3 flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t("اكتب سؤالك هنا... (مثلاً: شكد الحجوزات اليوم؟)", "Type your question... (e.g. How many bookings today?)")}
              className="min-h-[44px] max-h-[120px] resize-none text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage(input);
                }
              }}
            />
            <Button
              size="icon"
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || loading}
              style={{ background: "hsl(var(--gold))", color: "hsl(var(--gold-foreground, 0 0% 0%))" }}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
