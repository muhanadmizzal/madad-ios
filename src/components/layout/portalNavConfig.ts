import {
  LayoutDashboard, Users, Building2, CalendarDays, Clock, Wallet, FileText,
  Settings, Briefcase, Target, GraduationCap, BarChart3, MapPin, CalendarOff,
  Timer, Banknote, Shield, Megaphone, ClipboardCheck, UserCircle, UserX,
  CheckSquare, GitBranch, Bot, FileSignature, Bell, CreditCard, Receipt,
  HeadphonesIcon, ToggleRight, Activity, Brain, Crown, ShieldCheck, FolderKanban,
  Plug, CalendarCheck, Scissors, Layers, Home, UserCheck, PieChart, Gift, Footprints,
  DollarSign, BookOpen, TrendingUp, Package, Warehouse, ArrowDownUp, Truck, ShoppingCart,
} from "lucide-react";
import type { NavGroup } from "./UnifiedSidebar";
import type { AppRole } from "@/hooks/useRole";

export interface RoleNavItem {
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
  roles?: AppRole[];
  featureKey?: string;
}

export interface RoleNavGroup {
  label: string;
  items: RoleNavItem[];
}

// ====== MADAD BUSINESS PORTAL (Tenant Dashboard) ======
export const madadPortalNav: RoleNavGroup[] = [
  {
    label: "الرئيسية",
    items: [
      { path: "/madad/dashboard", label: "لوحة التحكم", icon: LayoutDashboard, exact: true },
      { path: "/madad/modules", label: "الوحدات", icon: Layers },
    ],
  },
  {
    label: "الإدارة",
    items: [
      { path: "/madad/users", label: "المستخدمون", icon: Users, roles: ["tenant_admin", "admin"] },
      { path: "/madad/settings", label: "الإعدادات", icon: Settings, roles: ["tenant_admin", "admin", "hr_manager", "manager"] },
      { path: "/madad/subscriptions", label: "الاشتراكات", icon: Crown, roles: ["tenant_admin", "admin"] },
      { path: "/madad/hybrid-access", label: "الوصول الهجين", icon: Plug, roles: ["tenant_admin", "admin"] },
      { path: "/madad/feature-requests", label: "طلبات الميزات", icon: CheckSquare, roles: ["tenant_admin", "admin"] },
      { path: "/madad/billing", label: "الفوترة", icon: CreditCard, roles: ["tenant_admin", "admin"] },
      { path: "/madad/notifications", label: "الإشعارات", icon: Bell },
      { path: "/madad/support", label: "الدعم الفني", icon: HeadphonesIcon, roles: ["tenant_admin", "admin"] },
    ],
  },
];

// ====== PLATFORM ADMIN (Super Admin) ======
export const businessPortalNav: RoleNavGroup[] = [
  {
    label: "الرئيسية",
    items: [
      { path: "/business-portal", label: "نظرة عامة", icon: LayoutDashboard, exact: true },
    ],
  },
  {
    label: "العمليات",
    items: [
      { path: "/business-portal/tenants", label: "المستأجرون", icon: Building2, roles: ["super_admin", "business_admin"] },
      { path: "/business-portal/tenant-features", label: "ميزات المستأجرين", icon: ToggleRight, roles: ["super_admin", "business_admin"] },
      { path: "/business-portal/staff", label: "الفريق", icon: Users, roles: ["super_admin", "business_admin"] },
      { path: "/business-portal/billing", label: "الفواتير والمالية", icon: Receipt, roles: ["super_admin", "finance_manager"] },
      { path: "/business-portal/support", label: "الدعم الفني", icon: HeadphonesIcon, roles: ["super_admin", "business_admin", "support_agent"] },
    ],
  },
  {
    label: "التحليلات والنظام",
    items: [
      { path: "/business-portal/analytics", label: "التحليلات", icon: BarChart3, roles: ["super_admin", "business_admin", "finance_manager"] },
      { path: "/business-portal/features", label: "الميزات والأسعار", icon: ToggleRight, roles: ["super_admin", "business_admin", "technical_admin", "finance_manager"] },
      { path: "/business-portal/pricing-engine", label: "محرك التسعير", icon: Crown, roles: ["super_admin", "business_admin"] },
      { path: "/madad/admin/payment-methods", label: "طرق الدفع", icon: CreditCard, roles: ["super_admin"] },
      { path: "/madad/admin/activation-requests", label: "طلبات التفعيل", icon: Shield, roles: ["super_admin"] },
      { path: "/madad/admin/workflow-settings", label: "إعدادات سير العمل", icon: Settings, roles: ["super_admin"] },
      { path: "/business-portal/activity", label: "سجل النشاط", icon: Activity, roles: ["super_admin", "business_admin"] },
      { path: "/madad/admin/users", label: "إدارة المستخدمين", icon: ShieldCheck, roles: ["super_admin"] },
      { path: "/madad/admin/local-nodes", label: "العقد الهجينة", icon: Plug, roles: ["super_admin"] },
      { path: "/business-portal/settings", label: "إعدادات المنصة", icon: Settings, roles: ["super_admin"] },
    ],
  },
];

// ====== TAMKEEN BY MADAD — HR Portal ======
export const tamkeenPortalNav: RoleNavGroup[] = [
  {
    label: "الرئيسية",
    items: [
      { path: "/madad/tamkeen", label: "الرئيسية", icon: LayoutDashboard, exact: true },
      { path: "/madad/tamkeen/employees", label: "الموظفون", icon: Users, roles: ["tenant_admin", "admin", "hr_manager", "hr_officer"], featureKey: "employee_profiles" },
      { path: "/madad/tamkeen/departments", label: "الأقسام", icon: Building2, roles: ["tenant_admin", "admin", "hr_manager"], featureKey: "employee_profiles" },
      { path: "/madad/tamkeen/branches", label: "الفروع", icon: MapPin, roles: ["tenant_admin", "admin", "hr_manager"], featureKey: "multi_branch" },
      { path: "/madad/tamkeen/org-chart", label: "الهيكل التنظيمي", icon: GitBranch, roles: ["tenant_admin", "admin", "hr_manager"], featureKey: "org_chart" },
      { path: "/madad/tamkeen/projects", label: "مركز المشاريع", icon: FolderKanban, roles: ["tenant_admin", "admin", "hr_manager", "manager"] },
    ],
  },
  {
    label: "الوقت والحضور",
    items: [
      { path: "/madad/tamkeen/attendance", label: "الحضور", icon: Clock, featureKey: "attendance" },
      { path: "/madad/tamkeen/leave", label: "الإجازات", icon: CalendarDays, featureKey: "leave_management" },
      { path: "/madad/tamkeen/shifts", label: "المناوبات", icon: Timer, roles: ["tenant_admin", "admin", "hr_manager"], featureKey: "attendance" },
      { path: "/madad/tamkeen/holidays", label: "العطل الرسمية", icon: CalendarOff },
    ],
  },
  {
    label: "المالية",
    items: [
      { path: "/madad/tamkeen/payroll", label: "الرواتب", icon: Wallet, roles: ["tenant_admin", "admin", "hr_manager", "finance_manager"], featureKey: "payroll" },
      { path: "/madad/tamkeen/loans", label: "السلف والقروض", icon: Banknote, roles: ["tenant_admin", "admin", "hr_manager", "finance_manager"], featureKey: "payroll" },
      { path: "/madad/tamkeen/contracts", label: "العقود", icon: FileSignature, roles: ["tenant_admin", "admin", "hr_manager"], featureKey: "payroll" },
    ],
  },
  {
    label: "المواهب",
    items: [
      { path: "/madad/tamkeen/recruitment", label: "التوظيف", icon: Briefcase, roles: ["tenant_admin", "admin", "hr_manager", "hr_officer"], featureKey: "recruitment" },
      { path: "/madad/tamkeen/onboarding", label: "التهيئة", icon: ClipboardCheck, roles: ["tenant_admin", "admin", "hr_manager"], featureKey: "onboarding" },
      { path: "/madad/tamkeen/performance", label: "الأداء", icon: Target, roles: ["tenant_admin", "admin", "hr_manager"], featureKey: "performance" },
      { path: "/madad/tamkeen/training", label: "التدريب", icon: GraduationCap, featureKey: "learning" },
      { path: "/madad/tamkeen/exit-management", label: "إنهاء الخدمة", icon: UserX, roles: ["tenant_admin", "admin", "hr_manager"] },
    ],
  },
  {
    label: "النظام",
    items: [
      { path: "/madad/tamkeen/documents", label: "المستندات والأرشيف", icon: FileText, featureKey: "documents" },
      { path: "/madad/tamkeen/announcements", label: "الإعلانات", icon: Megaphone, roles: ["tenant_admin", "admin", "hr_manager"] },
      { path: "/madad/tamkeen/reports", label: "التقارير", icon: BarChart3, roles: ["tenant_admin", "admin", "hr_manager"], featureKey: "reports" },
      { path: "/madad/tamkeen/audit-log", label: "سجل المراجعة", icon: Shield, roles: ["tenant_admin", "admin"] },
      { path: "/madad/tamkeen/notifications", label: "الإشعارات", icon: Bell },
      { path: "/madad/tamkeen/approvals", label: "الموافقات", icon: CheckSquare, roles: ["tenant_admin", "admin", "hr_manager", "hr_officer", "manager"], featureKey: "approvals" },
      { path: "/madad/tamkeen/ai-assistant", label: "مساعد AI", icon: Bot, featureKey: "ai_hr_assistant" },
      { path: "/madad/tamkeen/workforce-intelligence", label: "ذكاء القوى العاملة", icon: Brain, roles: ["tenant_admin", "admin", "hr_manager"], featureKey: "ai_workforce_analytics" },
      { path: "/madad/tamkeen/settings", label: "إعدادات تمكين", icon: Settings, roles: ["tenant_admin", "admin", "hr_manager", "manager"] },
      { path: "/madad/tamkeen/integrations", label: "التكاملات", icon: Plug, roles: ["tenant_admin", "admin"] },
      { path: "/madad/tamkeen/permission-matrix", label: "مصفوفة الصلاحيات", icon: ShieldCheck, roles: ["tenant_admin", "admin"] },
    ],
  },
];

// ====== TATHBEET BY MADAD — Bookings ======
export const tathbeetPortalNav: RoleNavGroup[] = [
  {
    label: "الرئيسية",
    items: [
      { path: "/madad/tathbeet", label: "لوحة التحكم", icon: LayoutDashboard, exact: true },
      { path: "/madad/tathbeet/bookings", label: "الحجوزات", icon: CalendarCheck },
      { path: "/madad/tathbeet/walk-ins", label: "الحضور المباشر", icon: Footprints },
      { path: "/madad/tathbeet/services", label: "الخدمات", icon: Scissors },
      { path: "/madad/tathbeet/staff", label: "الموظفين", icon: Users },
      { path: "/madad/tathbeet/customers", label: "العملاء", icon: UserCheck },
      { path: "/madad/tathbeet/branches", label: "الفروع", icon: MapPin },
    ],
  },
  {
    label: "التقارير والذكاء",
    items: [
      { path: "/madad/tathbeet/analytics", label: "التحليلات", icon: PieChart },
      { path: "/madad/tathbeet/ai-operations", label: "الذكاء التشغيلي", icon: Brain, featureKey: "tathbeet_ai_analysis" },
      { path: "/madad/tathbeet/loyalty", label: "الولاء والمكافآت", icon: Gift },
      { path: "/madad/tathbeet/ai-assistant", label: "المساعد الذكي", icon: Bot },
      { path: "/madad/tathbeet/settings", label: "الإعدادات", icon: Settings },
    ],
  },
];

// ====== TAHSEEL BY MADAD — Finance ======
export const tahseelPortalNav: RoleNavGroup[] = [
  {
    label: "الرئيسية",
    items: [
      { path: "/madad/tahseel", label: "لوحة التحكم", icon: LayoutDashboard, exact: true },
      { path: "/madad/tahseel/invoices", label: "الفواتير", icon: Receipt },
      { path: "/madad/tahseel/expenses", label: "المصروفات", icon: Wallet },
      { path: "/madad/tahseel/payments", label: "المدفوعات", icon: CreditCard },
    ],
  },
  {
    label: "المحاسبة",
    items: [
      { path: "/madad/tahseel/accounts", label: "دليل الحسابات", icon: BookOpen },
      { path: "/madad/tahseel/journal", label: "دفتر اليومية", icon: FileText },
      { path: "/madad/tahseel/settings", label: "الإعدادات", icon: Settings },
    ],
  },
];

// ====== TAKZEEN BY MADAD — Inventory ======
export const takzeenPortalNav: RoleNavGroup[] = [
  {
    label: "الرئيسية",
    items: [
      { path: "/madad/takzeen", label: "لوحة التحكم", icon: LayoutDashboard, exact: true },
      { path: "/madad/takzeen/products", label: "المنتجات", icon: Package },
      { path: "/madad/takzeen/movements", label: "حركات المخزون", icon: ArrowDownUp },
      { path: "/madad/takzeen/warehouses", label: "المستودعات", icon: Warehouse },
    ],
  },
  {
    label: "المشتريات",
    items: [
      { path: "/madad/takzeen/suppliers", label: "الموردون", icon: Truck },
      { path: "/madad/takzeen/purchase-orders", label: "أوامر الشراء", icon: ShoppingCart },
      { path: "/madad/takzeen/settings", label: "الإعدادات", icon: Settings },
    ],
  },
];


// ====== EMPLOYEE PORTAL ======
export const employeePortalNav: RoleNavGroup[] = [
  {
    label: "خدماتي",
    items: [
      { path: "/employee-portal", label: "ملفي الشخصي", icon: UserCircle, exact: true },
      { path: "/employee-portal/attendance", label: "حضوري", icon: Clock, featureKey: "attendance" },
      { path: "/employee-portal/leave", label: "إجازاتي", icon: CalendarDays, featureKey: "leave_management" },
      { path: "/employee-portal/payslips", label: "كشوف رواتبي", icon: Wallet, featureKey: "payroll" },
      { path: "/employee-portal/documents", label: "مستنداتي", icon: FileText, featureKey: "documents" },
      { path: "/employee-portal/my-requests", label: "طلباتي", icon: ClipboardCheck },
      { path: "/employee-portal/onboarding", label: "التهيئة", icon: CheckSquare, featureKey: "onboarding" },
      { path: "/employee-portal/notifications", label: "الإشعارات", icon: Bell },
      { path: "/employee-portal/support", label: "طلب دعم", icon: HeadphonesIcon },
    ],
  },
];

/** Filter nav groups by user roles */
export function filterNavByRoles(groups: RoleNavGroup[], userRoles: AppRole[]): NavGroup[] {
  const isSuperAdmin = userRoles.includes("super_admin");
  return groups
    .map((group) => ({
      label: group.label,
      items: group.items.filter((item) => {
        if (!item.roles || item.roles.length === 0) return true;
        if (isSuperAdmin) return true;
        return item.roles.some((r) => userRoles.includes(r));
      }),
    }))
    .filter((group) => group.items.length > 0);
}

/** Filter nav groups by roles + subscription features + position access */
export function filterNavByAccess(
  groups: RoleNavGroup[],
  userRoles: AppRole[],
  canAccess: (key: string) => boolean,
): NavGroup[] {
  const isSuperAdmin = userRoles.includes("super_admin");
  return groups
    .map((group) => ({
      label: group.label,
      items: group.items.filter((item) => {
        if (item.roles && item.roles.length > 0 && !isSuperAdmin) {
          if (!item.roles.some((r) => userRoles.includes(r))) return false;
        }
        if (item.featureKey) {
          if (!canAccess(item.featureKey)) return false;
        }
        return true;
      }),
    }))
    .filter((group) => group.items.length > 0);
}
