import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { MADAD_LOGO } from "@/lib/moduleConfig";
import { Menu, X } from "lucide-react";
import { useState } from "react";

export function MadadNav() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const links = [
    { href: "/modules", label: t("الوحدات", "Modules") },
    { href: "/pricing", label: t("الأسعار", "Pricing") },
    { href: "/offers", label: t("العروض", "Offers") },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-xl border-b border-border/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2">
            <img src={MADAD_LOGO} alt={t("مدد", "MADAD")} className="h-10 w-10 object-contain" />
            <span className="font-heading font-bold text-xl text-foreground">{t("مدد", "MADAD")}</span>
          </Link>

          <div className="hidden md:flex items-center gap-6">
            {links.map((link) => (
              <Link key={link.href} to={link.href} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                {link.label}
              </Link>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-2">
            <LanguageSwitcher />
            <Button variant="ghost" onClick={() => navigate("/auth")}>
              {t("تسجيل الدخول", "Login")}
            </Button>
            <Button onClick={() => navigate("/auth?mode=signup")} className="bg-accent text-accent-foreground hover:bg-accent/90">
              {t("ابدأ الآن", "Get Started")}
            </Button>
          </div>

          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-card p-4 space-y-3">
          {links.map((link) => (
            <Link key={link.href} to={link.href} className="block text-sm font-medium text-muted-foreground hover:text-foreground py-2" onClick={() => setMobileOpen(false)}>
              {link.label}
            </Link>
          ))}
          <div className="flex items-center gap-2 pt-2 border-t border-border">
            <LanguageSwitcher />
            <Button variant="ghost" size="sm" onClick={() => navigate("/auth")}>{t("دخول", "Login")}</Button>
            <Button size="sm" onClick={() => navigate("/auth?mode=signup")} className="bg-accent text-accent-foreground">{t("ابدأ", "Start")}</Button>
          </div>
        </div>
      )}
    </nav>
  );
}
