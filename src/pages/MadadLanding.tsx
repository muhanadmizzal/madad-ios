import { useLanguage } from "@/contexts/LanguageContext";
import { MadadNav } from "@/components/madad/MadadNav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { MADAD_LOGO } from "@/lib/moduleConfig";
import { ALL_MODULES } from "@/lib/moduleConfig";
import {
  ArrowLeft, ArrowRight, CheckCircle2, Layers, Zap, Shield,
  ChevronDown, Globe, Cloud, BarChart, Lock, Smartphone, Sparkles,
  Gift, Percent, Clock, Users, CalendarCheck, Package, CreditCard,
} from "lucide-react";

const FEATURES = [
  { icon: Layers, ar: "نظام وحدات مرن", en: "Modular System" },
  { icon: Globe, ar: "واجهة عربية أولاً", en: "Arabic-First Design" },
  { icon: Cloud, ar: "سحابي بالكامل", en: "Fully Cloud-Based" },
  { icon: BarChart, ar: "تحليلات متقدمة", en: "Advanced Analytics" },
  { icon: Lock, ar: "صلاحيات حسب الدور", en: "Role-Based Access" },
  { icon: Smartphone, ar: "متوافق مع الجوال", en: "Mobile Responsive" },
];

const PACKAGES = [
  {
    nameAr: "أساسي", nameEn: "Basic",
    priceAr: "١٥٠,٠٠٠ د.ع", priceEn: "$110",
    period: { ar: "/شهرياً", en: "/month" },
    features: { ar: ["وحدة تمكين", "حتى ٢٥ موظف", "دعم بريدي"], en: ["Tamkeen Module", "Up to 25 employees", "Email support"] },
    modules: ["tamkeen"],
  },
  {
    nameAr: "احترافي", nameEn: "Pro",
    priceAr: "٣٥٠,٠٠٠ د.ع", priceEn: "$260",
    period: { ar: "/شهرياً", en: "/month" },
    features: { ar: ["تمكين + تثبيت", "حتى ١٠٠ موظف", "إشعارات واتساب", "تقارير متقدمة"], en: ["Tamkeen + Tathbeet", "Up to 100 employees", "WhatsApp alerts", "Advanced reports"] },
    popular: true,
    modules: ["tamkeen", "tathbeet"],
  },
  {
    nameAr: "مؤسسي", nameEn: "Enterprise",
    priceAr: "٧٥٠,٠٠٠ د.ع", priceEn: "$550",
    period: { ar: "/شهرياً", en: "/month" },
    features: { ar: ["جميع الوحدات", "بدون حد للموظفين", "API كامل", "مدير حساب"], en: ["All Modules", "Unlimited employees", "Full API", "Account manager"] },
    modules: ["tamkeen", "tathbeet", "takzeen", "tahseel"],
  },
];

export default function MadadLanding() {
  const { t, lang } = useLanguage();
  const navigate = useNavigate();
  const Arrow = lang === "ar" ? ArrowLeft : ArrowRight;

  return (
    <div className="min-h-screen bg-background" dir={lang === "ar" ? "rtl" : "ltr"}>
      <MadadNav />

      {/* ═══ HERO ═══ */}
      <section className="relative pt-28 pb-28 px-4 overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 geometric-pattern opacity-20" />
        <div className="absolute top-0 left-0 right-0 h-full" style={{ background: "radial-gradient(ellipse 80% 60% at 50% 20%, hsl(221 78% 13% / 0.06) 0%, transparent 60%)" }} />
        {/* Floating module icons */}
        <div className="absolute top-20 left-[10%] w-12 h-12 rounded-xl opacity-10 animate-pulse hidden lg:block" style={{ background: `hsl(38 80% 60%)` }} />
        <div className="absolute top-40 right-[12%] w-10 h-10 rounded-xl opacity-10 animate-pulse hidden lg:block" style={{ background: `hsl(0 80% 52%)`, animationDelay: "1s" }} />
        <div className="absolute bottom-20 left-[18%] w-8 h-8 rounded-xl opacity-10 animate-pulse hidden lg:block" style={{ background: `hsl(262 72% 48%)`, animationDelay: "2s" }} />
        <div className="absolute bottom-28 right-[20%] w-9 h-9 rounded-xl opacity-10 animate-pulse hidden lg:block" style={{ background: `hsl(152 72% 42%)`, animationDelay: "0.5s" }} />

        <div className="max-w-5xl mx-auto text-center relative z-10">
          <img src={MADAD_LOGO} alt="MADAD" className="h-20 w-auto mx-auto mb-6 object-contain" />
          <Badge variant="secondary" className="mb-5 px-5 py-1.5 text-sm font-medium">
            {t("منصة أعمال متكاملة", "Unified Business Platform")}
          </Badge>
          <h1 className="font-heading font-extrabold text-4xl sm:text-5xl lg:text-6xl text-foreground mb-6 leading-tight tracking-tight">
            {t("مدد — منصة واحدة لجميع عملياتك", "MADAD — One Platform for All Operations")}
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            {t(
              "مدد يجمع الموارد البشرية والحجوزات والمخزون والمالية في نظام واحد. اختر الوحدات التي تحتاجها وادفع فقط مقابل ما تستخدمه.",
              "MADAD unifies HR, bookings, inventory & finance into one system. Pick what you need, pay for what you use."
            )}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button size="lg" onClick={() => navigate("/auth?mode=signup")} className="font-heading font-bold text-base px-8 gap-2 shadow-lg hover:shadow-xl transition-shadow">
              {t("ابدأ تجربة مجانية", "Start Free Trial")}
              <Arrow className="h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate("/pricing")} className="font-heading font-semibold text-base px-8">
              {t("عرض الأسعار", "View Pricing")}
            </Button>
          </div>
          
          {/* Trust indicators */}
          <div className="flex items-center justify-center gap-6 mt-10 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5"><Shield className="h-4 w-4" />{t("مشفّر بالكامل", "Fully Encrypted")}</span>
            <span className="flex items-center gap-1.5"><Cloud className="h-4 w-4" />{t("سحابي ١٠٠٪", "100% Cloud")}</span>
            <span className="flex items-center gap-1.5"><Globe className="h-4 w-4" />{t("عربي + إنجليزي", "AR + EN")}</span>
          </div>
        </div>
      </section>

      {/* ═══ MODULES SHOWCASE ═══ */}
      <section id="modules" className="py-24 px-4 bg-muted/30 relative">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-3 px-4 py-1">{t("النظام البيئي", "Ecosystem")}</Badge>
            <h2 className="font-heading font-extrabold text-3xl sm:text-4xl text-foreground mb-4">
              {t("وحدات مدد", "MADAD Modules")}
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              {t("كل وحدة تعمل بشكل مستقل أو متكاملة ضمن النظام.", "Each module works standalone or seamlessly integrated.")}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {ALL_MODULES.map((m) => (
              <div
                key={m.key}
                className={`group relative bg-card rounded-2xl border border-border/50 overflow-hidden transition-all duration-300 hover:shadow-elevated hover:-translate-y-1 cursor-pointer`}
                onClick={() => m.status === "active" && navigate(`/modules/${m.key}`)}
              >
                {/* Module color top bar */}
                <div className="h-1 w-full" style={{ background: `hsl(${m.color})` }} />
                
                <div className="p-6 space-y-5">
                  {/* Logo + Status */}
                  <div className="flex items-start justify-between">
                    <div className="w-14 h-14 rounded-xl flex items-center justify-center p-1.5" style={{ background: `hsl(${m.color} / 0.08)` }}>
                      <img src={m.iconLogo} alt={t(m.nameAr, m.nameEn)} className="h-10 w-10 object-contain" loading="lazy" />
                    </div>
                    <Badge variant="default" className="text-xs bg-success text-success-foreground">{t("مفعل", "Live")}</Badge>
                  </div>

                  {/* Name */}
                  <div>
                    <h3 className="font-heading font-bold text-lg text-foreground">{t(m.nameAr, m.nameEn)}</h3>
                    <p className="text-xs font-medium mt-0.5" style={{ color: `hsl(${m.color})` }}>
                      BY MADAD
                    </p>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-muted-foreground leading-relaxed">{t(m.descAr, m.descEn)}</p>

                  {/* Tagline */}
                  <p className="text-xs italic text-muted-foreground/70">{t(m.taglineAr, m.taglineEn)}</p>

                  {/* CTA */}
                  {m.status === "active" && (
                    <div className="flex items-center gap-1 text-sm font-medium transition-colors" style={{ color: `hsl(${m.color})` }}>
                      {t("استكشف", "Explore")}
                      <Arrow className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-x-0.5" />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ INTEGRATION ═══ */}
      <section className="py-24 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-heading font-extrabold text-3xl sm:text-4xl text-foreground mb-4">
              {t("تكامل سلس بين الوحدات", "Seamless Module Integration")}
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              {t("تسجيل دخول واحد، لوحة تحكم واحدة، بيانات مشتركة.", "One login, one dashboard, shared data.")}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: Layers, titleAr: "بيانات موحّدة", titleEn: "Unified Data", descAr: "جميع الوحدات تشترك في قاعدة بيانات واحدة.", descEn: "All modules share a single source of truth." },
              { icon: Zap, titleAr: "أتمتة ذكية", titleEn: "Smart Automation", descAr: "إجراء في تمكين يُحدّث تحصيل تلقائياً.", descEn: "An action in Tamkeen auto-updates Tahseel." },
              { icon: Shield, titleAr: "صلاحيات مركزية", titleEn: "Centralized Access", descAr: "تحكّم مركزي في من يستطيع الوصول لكل وحدة.", descEn: "Central control over who can access each module." },
            ].map((item, i) => (
              <div key={i} className="bg-card rounded-2xl border border-border/50 p-8 text-center space-y-4 hover:shadow-card-hover transition-shadow">
                <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center bg-primary/5 text-primary">
                  <item.icon className="h-8 w-8" />
                </div>
                <h3 className="font-heading font-bold text-lg">{t(item.titleAr, item.titleEn)}</h3>
                <p className="text-sm text-muted-foreground">{t(item.descAr, item.descEn)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ WHY MADAD ═══ */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="font-heading font-extrabold text-3xl sm:text-4xl text-foreground mb-4">
              {t("لماذا مدد؟", "Why MADAD?")}
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {FEATURES.map((f, i) => (
              <div key={i} className="flex items-center gap-3 p-4 rounded-xl bg-card border border-border/50 hover:shadow-card-hover transition-shadow">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-primary/5 text-primary">
                  <f.icon className="h-5 w-5" />
                </div>
                <span className="text-sm font-medium text-foreground">{t(f.ar, f.en)}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ PRICING ═══ */}
      <section id="pricing" className="py-24 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <Badge variant="outline" className="mb-3 px-4 py-1">{t("الأسعار", "Pricing")}</Badge>
          <h2 className="font-heading font-extrabold text-3xl sm:text-4xl text-foreground mb-4">
            {t("باقات مرنة تناسبك", "Flexible Plans That Fit")}
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto mb-14">
            {t("اختر الباقة المناسبة لحجم أعمالك.", "Choose the plan that fits your business size.")}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PACKAGES.map((plan, i) => (
              <div
                key={i}
                className={`relative bg-card rounded-2xl border overflow-hidden transition-all duration-300 hover:shadow-elevated ${
                  plan.popular ? "border-primary ring-2 ring-primary/20 scale-[1.02]" : "border-border/50"
                }`}
              >
                {plan.popular && (
                  <Badge className="absolute -top-0 left-1/2 -translate-x-1/2 translate-y-[-50%] bg-primary text-primary-foreground px-4 py-1 z-10">
                    {t("الأكثر شيوعاً", "Most Popular")}
                  </Badge>
                )}
                <div className="p-7 pt-8 space-y-6">
                  <div>
                    <h3 className="font-heading font-bold text-xl">{t(plan.nameAr, plan.nameEn)}</h3>
                    <p className="font-heading font-extrabold text-3xl mt-2 text-foreground">
                      {t(plan.priceAr, plan.priceEn)}
                      <span className="text-sm font-normal text-muted-foreground">{t(plan.period.ar, plan.period.en)}</span>
                    </p>
                  </div>

                  {/* Included modules */}
                  <div className="flex items-center justify-center gap-2">
                    {plan.modules.map((mk) => {
                      const mod = ALL_MODULES.find((m) => m.key === mk);
                      if (!mod) return null;
                      return (
                        <div
                          key={mk}
                          className="w-8 h-8 rounded-lg flex items-center justify-center p-1"
                          style={{ background: `hsl(${mod.color} / 0.1)` }}
                          title={t(mod.nameAr, mod.nameEn)}
                        >
                          <img src={mod.iconLogo} alt="" className="h-5 w-5 object-contain" />
                        </div>
                      );
                    })}
                  </div>

                  <ul className="space-y-2.5 text-sm text-start">
                    {(lang === "ar" ? plan.features.ar : plan.features.en).map((f, j) => (
                      <li key={j} className="flex items-center gap-2 text-muted-foreground">
                        <CheckCircle2 className="h-4 w-4 text-success shrink-0" />{f}
                      </li>
                    ))}
                  </ul>

                  <Button
                    variant={plan.popular ? "default" : "outline"}
                    className="w-full font-heading"
                    onClick={() => navigate("/auth?mode=signup")}
                  >
                    {t("ابدأ الآن", "Get Started")}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section className="py-24 px-4 relative overflow-hidden">
        <div className="absolute inset-0 geometric-stars opacity-30" />
        <div className="max-w-3xl mx-auto text-center space-y-6 relative z-10">
          <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center bg-primary/5">
            <Sparkles className="h-8 w-8 text-primary" />
          </div>
          <h2 className="font-heading font-extrabold text-3xl text-foreground">
            {t("ابدأ رحلتك مع مدد اليوم", "Start Your Journey with MADAD Today")}
          </h2>
          <p className="text-muted-foreground text-lg">
            {t("جرّب المنصة مجاناً واكتشف كيف يمكن لمدد تحسين عملياتك.", "Try free and discover how MADAD can improve your operations.")}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button size="lg" onClick={() => navigate("/auth?mode=signup")} className="font-heading font-bold px-8 gap-2">
              {t("ابدأ تجربة مجانية", "Start Free Trial")}
              <Arrow className="h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" className="font-heading px-8">
              {t("احجز عرضاً تجريبياً", "Book a Demo")}
            </Button>
          </div>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="border-t border-border py-12 px-4 bg-card">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
            <div>
              <div className="flex items-center gap-2.5 mb-4">
                <span className="font-heading font-bold text-foreground text-lg">{t("مدد", "MADAD")}</span>
              </div>
              <p className="text-sm text-muted-foreground">{t("منصة الأعمال المتكاملة", "Unified Business Platform")}</p>
            </div>
            <div>
              <h4 className="font-heading font-bold text-sm mb-3">{t("الوحدات", "Modules")}</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {ALL_MODULES.map((m) => (
                  <li key={m.key} className="hover:text-foreground cursor-pointer">
                    {t(m.nameAr, m.nameEn)}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-heading font-bold text-sm mb-3">{t("الشركة", "Company")}</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="hover:text-foreground cursor-pointer">{t("عن مدد", "About")}</li>
                <li className="hover:text-foreground cursor-pointer">{t("الأسعار", "Pricing")}</li>
                <li className="hover:text-foreground cursor-pointer">{t("الدعم", "Support")}</li>
              </ul>
            </div>
            <div>
              <h4 className="font-heading font-bold text-sm mb-3">{t("قانوني", "Legal")}</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="hover:text-foreground cursor-pointer">{t("سياسة الخصوصية", "Privacy")}</li>
                <li className="hover:text-foreground cursor-pointer">{t("الشروط والأحكام", "Terms")}</li>
              </ul>
            </div>
          </div>
          <div className="gold-line mb-6" />
          <p className="text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()} MADAD. {t("جميع الحقوق محفوظة.", "All rights reserved.")}
          </p>
        </div>
      </footer>
    </div>
  );
}
