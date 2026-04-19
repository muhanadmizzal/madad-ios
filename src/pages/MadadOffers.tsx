import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { MadadNav } from "@/components/madad/MadadNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Gift, Percent, Clock, ArrowLeft, ArrowRight, Sparkles } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const ICON_MAP: Record<string, React.ReactNode> = {
  percentage: <Percent className="h-6 w-6" />,
  fixed: <Clock className="h-6 w-6" />,
  bundle: <Gift className="h-6 w-6" />,
};

export default function MadadOffers() {
  const { t, lang } = useLanguage();
  const navigate = useNavigate();
  const Arrow = lang === "ar" ? ArrowLeft : ArrowRight;

  const { data: offers = [] } = useQuery({
    queryKey: ["madad-offers"],
    queryFn: async () => {
      const { data } = await supabase.from("madad_offers").select("*").eq("is_active", true);
      return data || [];
    },
  });

  return (
    <div className="min-h-screen bg-background" dir={lang === "ar" ? "rtl" : "ltr"}>
      <MadadNav />

      <section className="pt-28 pb-8 px-4 text-center relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full opacity-10" style={{ background: "radial-gradient(circle, hsl(var(--gold)) 0%, transparent 70%)" }} />
        <Sparkles className="h-12 w-12 mx-auto mb-4" style={{ color: "hsl(var(--gold))" }} />
        <h1 className="font-heading font-extrabold text-4xl sm:text-5xl text-foreground mb-4">{t("العروض الخاصة", "Special Offers")}</h1>
        <p className="text-muted-foreground text-lg max-w-xl mx-auto">{t("استفد من عروضنا الحصرية وابدأ رحلتك مع مدد بأفضل سعر.", "Take advantage of our exclusive offers and start your MADAD journey at the best price.")}</p>
      </section>

      <section className="pb-20 px-4">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
          {offers.map((offer: any) => (
            <Card key={offer.id} className="border-border/50 hover:shadow-brand-lg transition-all duration-300 overflow-hidden">
              <div className="h-1 w-full bg-accent" />
              <CardContent className="p-6 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-accent/10 text-accent">
                    {ICON_MAP[offer.discount_type] || <Gift className="h-6 w-6" />}
                  </div>
                  {(offer.badge_ar || offer.badge_en) && (
                    <Badge className="bg-accent/10 text-accent border-accent/20">{t(offer.badge_ar, offer.badge_en)}</Badge>
                  )}
                </div>
                <div>
                  <h3 className="font-heading font-bold text-lg text-foreground">{t(offer.title_ar, offer.title_en)}</h3>
                  <p className="text-sm text-muted-foreground mt-2">{t(offer.description_ar, offer.description_en)}</p>
                </div>
                {offer.discount_type === "percentage" && offer.discount_value > 0 && (
                  <div className="bg-accent/5 rounded-xl p-3 text-center">
                    <span className="font-heading font-extrabold text-3xl text-accent">{offer.discount_value}%</span>
                    <span className="text-sm text-muted-foreground mr-2">{t("خصم", "OFF")}</span>
                  </div>
                )}
                <Button className="w-full font-heading gap-2 bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => navigate("/auth?mode=signup")}>
                  {t("استفد من العرض", "Claim Offer")}
                  <Arrow className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {offers.length === 0 && (
          <div className="text-center py-16">
            <Gift className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">{t("لا توجد عروض حالياً", "No offers available right now")}</p>
          </div>
        )}
      </section>

      <footer className="border-t border-border py-8 px-4 bg-card text-center">
        <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} {t("مدد", "MADAD")}. {t("جميع الحقوق محفوظة.", "All rights reserved.")}</p>
      </footer>
    </div>
  );
}
