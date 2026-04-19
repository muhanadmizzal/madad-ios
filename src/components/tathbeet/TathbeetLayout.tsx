import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { LanguageSwitcher } from "@/components/madad/LanguageSwitcher";
import { Button } from "@/components/ui/button";
import { MODULE_REGISTRY } from "@/lib/moduleConfig";
const tathbeetLogo = MODULE_REGISTRY.tathbeet.iconLogo;
import {
  LayoutDashboard, CalendarCheck, Scissors, Users, MapPin, Settings, ArrowRight, ArrowLeft, LogOut, ChevronLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { path: "/madad/tathbeet", labelAr: "لوحة التحكم", labelEn: "Dashboard", icon: LayoutDashboard, end: true },
  { path: "/madad/tathbeet/bookings", labelAr: "الحجوزات", labelEn: "Bookings", icon: CalendarCheck },
  { path: "/madad/tathbeet/services", labelAr: "الخدمات", labelEn: "Services", icon: Scissors },
  { path: "/madad/tathbeet/staff", labelAr: "الموظفين", labelEn: "Staff", icon: Users },
  { path: "/madad/tathbeet/branches", labelAr: "الفروع", labelEn: "Branches", icon: MapPin },
  { path: "/madad/tathbeet/settings", labelAr: "الإعدادات", labelEn: "Settings", icon: Settings },
];

export default function TathbeetLayout() {
  const { t, lang } = useLanguage();
  const { signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex" dir={lang === "ar" ? "rtl" : "ltr"}>
      {/* Sidebar */}
      <aside className="w-64 shrink-0 border-e border-border bg-card hidden md:flex flex-col">
        <div className="p-4 border-b border-border flex items-center gap-3">
          <img src={tathbeetLogo} alt={t("تثبيت", "Tathbeet")} className="h-10 w-10 object-contain" />
          <div>
            <p className="font-heading font-bold text-sm">{t("تثبيت", "Tathbeet")}</p>
            <p className="text-xs" style={{ color: "hsl(var(--gold))" }}>{t("من مدد", "BY MADAD")}</p>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              className={({ isActive }) => cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {t(item.labelAr, item.labelEn)}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-border space-y-1">
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-xs" onClick={() => navigate("/madad/home")}>
            <ChevronLeft className="h-3.5 w-3.5" />
            {t("العودة لمدد", "Back to MADAD")}
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 h-14 bg-card/80 backdrop-blur-xl border-b border-border/50 flex items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-2 md:hidden">
            <img src={tathbeetLogo} alt="" className="h-8 w-8 object-contain" />
            <span className="font-heading font-bold text-sm">{t("تثبيت", "Tathbeet")}</span>
          </div>
          <div className="hidden md:block" />
          <div className="flex items-center gap-2">
            <LanguageSwitcher variant="ghost" />
            <Button variant="ghost" size="icon" onClick={() => signOut()}>
              <LogOut className="h-4 w-4 text-muted-foreground" />
            </Button>
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
