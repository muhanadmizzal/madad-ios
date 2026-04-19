import AiChat from "@/components/ai/AiChat";

export default function AiAssistant() {
  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h1 className="font-heading font-bold text-2xl text-foreground">مساعد AI</h1>
        <p className="text-muted-foreground text-sm mt-1">
          مساعد ذكاء اصطناعي متخصص في الموارد البشرية — التوظيف، السياسات، المستندات، والتحليلات
        </p>
      </div>
      <AiChat />
    </div>
  );
}
