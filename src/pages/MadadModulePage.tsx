import { useParams, useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { MadadNav } from "@/components/madad/MadadNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Users, Clock, Wallet, Briefcase, Target, GraduationCap, GitBranch, FileText,
  ArrowLeft, ArrowRight, CheckCircle2, Package, BarChart3, CalendarCheck,
  Scissors, UserCheck, Truck, ShoppingCart, Receipt, BookOpen,
} from "lucide-react";
import { MODULE_REGISTRY } from "@/lib/moduleConfig";

interface ModuleDetail {
  features: { ar: string; en: string; icon: React.ReactNode }[];
  benefits: { ar: string; en: string }[];
  suggestedKeys: string[];
}

const MODULE_DETAILS: Record<string, ModuleDetail> = {
  tamkeen: {
    features: [
      { ar: "إدارة الموظفين والملفات", en: "Employee profiles & records", icon: <Users className="h-5 w-5" /> },
      { ar: "الحضور والانصراف", en: "Attendance tracking", icon: <Clock className="h-5 w-5" /> },
      { ar: "الرواتب والمستحقات", en: "Payroll processing", icon: <Wallet className="h-5 w-5" /> },
      { ar: "التوظيف وتتبع المرشحين", en: "Recruitment & ATS", icon: <Briefcase className="h-5 w-5" /> },
      { ar: "تقييم الأداء", en: "Performance reviews", icon: <Target className="h-5 w-5" /> },
      { ar: "التدريب والتطوير", en: "Training & development", icon: <GraduationCap className="h-5 w-5" /> },
      { ar: "الهيكل التنظيمي", en: "Org chart", icon: <GitBranch className="h-5 w-5" /> },
      { ar: "المستندات والأرشفة", en: "Document management", icon: <FileText className="h-5 w-5" /> },
    ],
    benefits: [
      { ar: "تقليل الأعمال اليدوية بنسبة 80%", en: "Reduce manual work by 80%" },
      { ar: "تقارير ذكية وتحليلات فورية", en: "Smart reports & real-time analytics" },
      { ar: "تكامل كامل مع وحدات مدد الأخرى", en: "Full integration with other MADAD modules" },
      { ar: "دعم متعدد الفروع واللغات", en: "Multi-branch & multi-language support" },
    ],
    suggestedKeys: ["tahseel", "takzeen"],
  },
  tathbeet: {
    features: [
      { ar: "إدارة الحجوزات", en: "Booking management", icon: <CalendarCheck className="h-5 w-5" /> },
      { ar: "الخدمات", en: "Service management", icon: <Scissors className="h-5 w-5" /> },
      { ar: "العملاء", en: "Customer management", icon: <UserCheck className="h-5 w-5" /> },
      { ar: "برامج الولاء", en: "Loyalty programs", icon: <Target className="h-5 w-5" /> },
    ],
    benefits: [
      { ar: "رؤية كاملة لجميع الحجوزات", en: "Full visibility of all bookings" },
      { ar: "جدولة ذكية للمواعيد", en: "Smart appointment scheduling" },
      { ar: "تقارير أداء الخدمات", en: "Service performance reports" },
    ],
    suggestedKeys: ["tamkeen", "takzeen"],
  },
  takzeen: {
    features: [
      { ar: "إدارة المنتجات", en: "Product management", icon: <Package className="h-5 w-5" /> },
      { ar: "المستودعات", en: "Warehouse management", icon: <Package className="h-5 w-5" /> },
      { ar: "حركات المخزون", en: "Inventory movements", icon: <BarChart3 className="h-5 w-5" /> },
      { ar: "أوامر الشراء", en: "Purchase orders", icon: <ShoppingCart className="h-5 w-5" /> },
      { ar: "الموردون", en: "Supplier management", icon: <Truck className="h-5 w-5" /> },
    ],
    benefits: [
      { ar: "تتبع المخزون في الوقت الفعلي", en: "Real-time inventory tracking" },
      { ar: "أتمتة أوامر الشراء", en: "Automated purchase orders" },
      { ar: "إدارة مستودعات متعددة", en: "Multi-warehouse management" },
    ],
    suggestedKeys: ["tamkeen", "tahseel"],
  },
  tahseel: {
    features: [
      { ar: "الفواتير", en: "Invoicing", icon: <Receipt className="h-5 w-5" /> },
      { ar: "المدفوعات", en: "Payment tracking", icon: <Wallet className="h-5 w-5" /> },
      { ar: "دليل الحسابات", en: "Chart of accounts", icon: <BookOpen className="h-5 w-5" /> },
      { ar: "دفتر اليومية", en: "Journal entries", icon: <FileText className="h-5 w-5" /> },
    ],
    benefits: [
      { ar: "تقارير مالية دقيقة", en: "Accurate financial reports" },
      { ar: "تتبع المدفوعات والمستحقات", en: "Track payments & receivables" },
      { ar: "تكامل مع وحدة الرواتب", en: "Integration with payroll module" },
    ],
    suggestedKeys: ["tamkeen", "takzeen"],
  },
};

export default function MadadModulePage() {
  const { moduleKey } = useParams<{ moduleKey: string }>();
  const { t, lang } = useLanguage();
  const navigate = useNavigate();
  const Arrow = lang === "ar" ? ArrowLeft : ArrowRight;

  const modConfig = MODULE_REGISTRY[moduleKey || ""];
  const modDetail = MODULE_DETAILS[moduleKey || ""];

  if (!modConfig || !modDetail) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <MadadNav />
        <div className="text-center pt-20">
          <h1 className="font-heading text-2xl font-bold mb-4">{t("الوحدة غير موجودة", "Module not found")}</h1>
          <Button onClick={() => navigate("/")}>{t("العودة", "Go back")}</Button>
        </div>
      </div>
    );
  }

  const suggested = modDetail.suggestedKeys
    .map((k) => MODULE_REGISTRY[k])
    .filter(Boolean);

  return (
    <div className="min-h-screen bg-background" dir={lang === "ar" ? "rtl" : "ltr"}>
      <MadadNav />

      {/* Hero */}
      <section className="pt-28 pb-16 px-4 relative overflow-hidden">
        <div className="absolute inset-0 geometric-pattern opacity-20" />
        <div className="max-w-5xl mx-auto relative z-10">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="flex-1 space-y-6">
              <div className="flex items-center gap-4">
                <img src={modConfig.iconLogo} alt={t(modConfig.nameAr, modConfig.nameEn)} className="h-20 w-20 object-contain" />
                <div>
                  <h1 className="font-heading font-extrabold text-3xl sm:text-4xl">{t(modConfig.nameAr, modConfig.nameEn)}</h1>
                  <p className="text-sm font-medium" style={{ color: "hsl(var(--gold))" }}>
                    {t("من مدد", "BY MADAD")}
                  </p>
                </div>
              </div>
              <p className="text-lg text-muted-foreground leading-relaxed">{t(modConfig.descAr, modConfig.descEn)}</p>
              <div className="flex gap-3">
                <Button size="lg" onClick={() => navigate("/auth")} className="bg-accent text-accent-foreground hover:bg-accent/90 font-heading gap-2">
                  {t("دخول النظام", "Login to System")}
                  <Arrow className="h-4 w-4" />
                </Button>
                <Button size="lg" variant="outline" onClick={() => navigate("/auth?mode=signup")} className="font-heading">
                  {t("اشترك الآن", "Subscribe Now")}
                </Button>
              </div>
            </div>
            <div className="flex-1 max-w-md">
              <Card className="border-border/50 shadow-brand-lg overflow-hidden">
                <div className="h-2 w-full" style={{ background: `linear-gradient(90deg, hsl(${modConfig.color}), hsl(var(--gold)))` }} />
                <CardContent className="p-8 text-center space-y-4">
                  <img src={modConfig.fullLogo} alt={t(modConfig.nameAr, modConfig.nameEn)} className="h-24 w-24 mx-auto object-contain" loading="lazy" />
                  <p className="text-sm text-muted-foreground">{t("جزء من منظومة مدد المتكاملة", "Part of the MADAD integrated ecosystem")}</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-heading font-extrabold text-2xl sm:text-3xl text-center mb-10">{t("الميزات الرئيسية", "Key Features")}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {modDetail.features.map((f, i) => (
              <Card key={i} className="border-border/50">
                <CardContent className="p-5 flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: `hsl(${modConfig.color} / 0.12)`, color: `hsl(${modConfig.color})` }}>
                    {f.icon}
                  </div>
                  <span className="text-sm font-medium text-foreground">{t(f.ar, f.en)}</span>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-heading font-extrabold text-2xl sm:text-3xl text-center mb-10">{t("لماذا تختار هذه الوحدة؟", "Why Choose This Module?")}</h2>
          <div className="space-y-4">
            {modDetail.benefits.map((b, i) => (
              <div key={i} className="flex items-center gap-3 p-4 rounded-xl bg-card border border-border/50">
                <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
                <span className="text-foreground font-medium">{t(b.ar, b.en)}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Integration message */}
      <section className="py-12 px-4 bg-muted/30">
        <div className="max-w-3xl mx-auto text-center space-y-4">
          <h3 className="font-heading font-bold text-xl">{t("تكامل مع وحدات مدد الأخرى", "Integrated with Other MADAD Modules")}</h3>
          <p className="text-muted-foreground">
            {t(
              `${modConfig.nameAr} يعمل بسلاسة مع بقية وحدات مدد. البيانات تتدفق تلقائياً بين الوحدات لتوفير رؤية شاملة.`,
              `${modConfig.nameEn} works seamlessly with other MADAD modules. Data flows automatically between modules for a complete view.`
            )}
          </p>
        </div>
      </section>

      {/* Suggested modules */}
      {suggested.length > 0 && (
        <section className="py-16 px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="font-heading font-bold text-xl text-center mb-8">{t("وحدات مقترحة", "Suggested Modules")}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {suggested.map((s) => (
                <Card key={s.key} className="border-border/50 hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/modules/${s.key}`)}>
                  <CardContent className="p-5 flex items-center gap-4">
                    <img src={s.iconLogo} alt={t(s.nameAr, s.nameEn)} className="h-14 w-14 object-contain" loading="lazy" />
                    <div>
                      <h4 className="font-heading font-bold">
                        {t(s.nameAr, s.nameEn)}{" "}
                        <span className="text-xs font-medium" style={{ color: "hsl(var(--gold))" }}>{t("من مدد", "BY MADAD")}</span>
                      </h4>
                      <p className="text-sm text-muted-foreground">{t(s.descAr, s.descEn)}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="border-t border-border py-8 px-4 bg-card text-center">
        <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} {t("مدد", "MADAD")}. {t("جميع الحقوق محفوظة.", "All rights reserved.")}</p>
      </footer>
    </div>
  );
}
