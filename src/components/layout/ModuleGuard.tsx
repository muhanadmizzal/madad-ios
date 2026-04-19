import { Navigate } from "react-router-dom";
import { useMadadSubscription } from "@/hooks/useMadadSubscription";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, Zap } from "lucide-react";

interface ModuleGuardProps {
  moduleKey: string;
  children: React.ReactNode;
}

/**
 * Guards a module route — if the module is not active in the tenant's MADAD subscription,
 * shows a locked screen with upgrade CTA instead of the module content.
 */
export function ModuleGuard({ moduleKey, children }: ModuleGuardProps) {
  const { isModuleActive, isLoading } = useMadadSubscription();
  const { t } = useLanguage();

  if (isLoading) return null;

  if (!isModuleActive(moduleKey)) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-8">
        <Card className="border-border/50 max-w-md w-full">
          <CardContent className="p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center bg-muted">
              <Lock className="h-7 w-7 text-muted-foreground" />
            </div>
            <h2 className="font-heading font-bold text-xl">{t("الوحدة غير مفعّلة", "Module Not Active")}</h2>
            <p className="text-sm text-muted-foreground">
              {t(
                "هذه الوحدة غير متضمنة في اشتراكك الحالي. يرجى ترقية باقتك لتفعيلها.",
                "This module is not included in your current plan. Please upgrade to activate it."
              )}
            </p>
            <Button
              className="gap-1.5"
              style={{ background: "hsl(var(--gold))", color: "hsl(var(--gold-foreground, 0 0% 0%))" }}
              onClick={() => window.location.href = "/madad/billing"}
            >
              <Zap className="h-4 w-4" />
              {t("ترقية الآن", "Upgrade Now")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
