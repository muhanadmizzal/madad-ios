import { FeatureGate } from "@/components/subscription/FeatureGate";
import AiChat from "@/components/ai/AiChat";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles } from "lucide-react";

export default function EPAiCoach() {
  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h1 className="font-heading font-bold text-2xl text-foreground flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />
          المدرب المهني الذكي
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          مساعدك الذكي لاستكشاف المسارات المهنية وتطوير مهاراتك
        </p>
      </div>

      <FeatureGate featureKey="ai_employee_career_coach">
        <AiChat />
      </FeatureGate>
    </div>
  );
}
