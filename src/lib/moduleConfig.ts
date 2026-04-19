// Centralized module branding configuration — SINGLE SOURCE OF TRUTH
import madadLogoAsset from "@/assets/madad-logo.jpeg";
import tamkeenFull from "@/assets/tamkeen-full.png";
import tamkeenIcon from "@/assets/tamkeen-icon.png";
import tathbeetFull from "@/assets/tathbeet-full.png";
import tathbeetIcon from "@/assets/tathbeet-icon.png";
import takzeenFull from "@/assets/takzeen-full.png";
import takzeenIcon from "@/assets/takzeen-icon.png";
import tahseelFull from "@/assets/tahseel-full.png";
import tahseelIcon from "@/assets/tahseel-icon.png";

/** MADAD platform logo — use this everywhere instead of direct asset imports */
export const MADAD_LOGO = madadLogoAsset;

export interface ModuleConfig {
  key: string;
  nameAr: string;
  nameEn: string;
  descAr: string;
  descEn: string;
  taglineAr: string;
  taglineEn: string;
  fullLogo: string;
  iconLogo: string;
  /** HSL color string without hsl() wrapper, e.g. "35 85% 52%" */
  color: string;
  /** Hex color for inline styles */
  hex: string;
  cssClass: string;
  route: string;
  status: "active";
}

export const MODULE_REGISTRY: Record<string, ModuleConfig> = {
  tamkeen: {
    key: "tamkeen",
    nameAr: "تمكين",
    nameEn: "Tamkeen",
    descAr: "إدارة الموارد البشرية والقوى العاملة",
    descEn: "HR & Workforce Management",
    taglineAr: "هيكل منظّم، فريق ممكّن",
    taglineEn: "Structured teams, empowered workforce",
    fullLogo: tamkeenFull,
    iconLogo: tamkeenIcon,
    color: "38 80% 60%",
    hex: "#F5B731",
    cssClass: "module-tamkeen",
    route: "/madad/tamkeen",
    status: "active",
  },
  tathbeet: {
    key: "tathbeet",
    nameAr: "تثبيت",
    nameEn: "Tathbeet",
    descAr: "إدارة الحجوزات والخدمات",
    descEn: "Bookings & Service Operations",
    taglineAr: "حجوزات ذكية، عمليات ثابتة",
    taglineEn: "Smart bookings, steady operations",
    fullLogo: tathbeetFull,
    iconLogo: tathbeetIcon,
    color: "0 80% 52%",
    hex: "#E52B2B",
    cssClass: "module-tathbeet",
    route: "/madad/tathbeet",
    status: "active",
  },
  takzeen: {
    key: "takzeen",
    nameAr: "تخزين",
    nameEn: "Takzeen",
    descAr: "إدارة المخزون والمستودعات",
    descEn: "Inventory & Warehouse Management",
    taglineAr: "مخزون مرتّب، توريد ذكي",
    taglineEn: "Organized stock, smart supply",
    fullLogo: takzeenFull,
    iconLogo: takzeenIcon,
    color: "262 72% 48%",
    hex: "#5B21B6",
    cssClass: "module-takzeen",
    route: "/madad/takzeen",
    status: "active",
  },
  tahseel: {
    key: "tahseel",
    nameAr: "تحصيل",
    nameEn: "Tahseel",
    descAr: "الإدارة المالية والمحاسبية",
    descEn: "Finance & Accounting",
    taglineAr: "أرقام دقيقة، قرارات واثقة",
    taglineEn: "Precise numbers, confident decisions",
    fullLogo: tahseelFull,
    iconLogo: tahseelIcon,
    color: "152 72% 42%",
    hex: "#0FA968",
    cssClass: "module-tahseel",
    route: "/madad/tahseel",
    status: "active",
  },
};

export const ALL_MODULES = Object.values(MODULE_REGISTRY);
export const ACTIVE_MODULES = ALL_MODULES;
