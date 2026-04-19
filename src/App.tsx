import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { OfflineBanner } from "@/components/layout/OfflineBanner";
import { useSessionTimeout } from "@/hooks/useSessionTimeout";
import { UnifiedLayout } from "@/components/layout/UnifiedLayout";
import { RoleGuard } from "@/components/layout/RoleGuard";
import { PortalGuard } from "@/components/layout/PortalGuard";
import { FeatureRouteGuard } from "@/components/layout/FeatureRouteGuard";
import { ModuleGuard } from "@/components/layout/ModuleGuard";
import {
  businessPortalNav,
  madadPortalNav,
  tamkeenPortalNav,
  tathbeetPortalNav,
  tahseelPortalNav,
  takzeenPortalNav,
  filterNavByRoles,
  filterNavByAccess,
} from "@/components/layout/portalNavConfig";
import { useEmployeePortalNav } from "@/components/layout/EmployeePortalNavWithAi";
import { useRole } from "@/hooks/useRole";
import { useResolvedAccess } from "@/hooks/useResolvedAccess";

import { MODULE_REGISTRY } from "@/lib/moduleConfig";

// Pages — Public Marketing
import MadadLanding from "./pages/MadadLanding";
import MadadModulePage from "./pages/MadadModulePage";
import MadadModules from "./pages/MadadModules";
import MadadPricing from "./pages/MadadPricing";
import MadadOffers from "./pages/MadadOffers";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Unauthorized from "./pages/Unauthorized";
import PublicApply from "./pages/PublicApply";
import PublicBgUpload from "./pages/PublicBgUpload";
import PublicInterviewEval from "./pages/PublicInterviewEval";

// MADAD Dashboard & Pages
import MadadDashboard from "./pages/MadadDashboard";
import MadadModulesPage from "./pages/madad/MadadModules";
import MadadSettingsPage from "./pages/madad/MadadSettingsPage";
import MadadBillingPage from "./pages/madad/MadadBillingPage";
import MadadNotifications from "./pages/madad/MadadNotifications";
import MadadSupportPage from "./pages/madad/MadadSupportPage";
import MadadUsers from "./pages/madad/MadadUsers";
import MadadSubscriptions from "./pages/madad/MadadSubscriptions";
import MadadActivationFlow from "./pages/madad/MadadActivationFlow";
import MadadUpgrade from "./pages/madad/MadadUpgrade";
import MadadPaymentMethods from "./pages/madad/MadadPaymentMethods";
import MadadAdminActivationRequests from "./pages/madad/MadadAdminActivationRequests";
import MadadFeatureReview from "./pages/madad/MadadFeatureReview";
import MadadWorkflowSettings from "./pages/madad/MadadWorkflowSettings";
import MadadAdminUsers from "./pages/madad/MadadAdminUsers";
import MadadAdminLocalNodes from "./pages/madad/MadadAdminLocalNodes";
import MadadHybridAccess from "./pages/madad/MadadHybridAccess";

// Admin pages
import MadadAdminTenants from "./pages/MadadAdminTenants";
import MadadAdminModules from "./pages/MadadAdminModules";
import MadadAdminPackages from "./pages/MadadAdminPackages";
import MadadAdminOffers from "./pages/MadadAdminOffers";
import MadadAdminSubscriptions from "./pages/MadadAdminSubscriptions";
import BPPricingEngine from "./pages/business-portal/BPPricingEngine";

// Tamkeen BY MADAD — HR Module
import Dashboard from "./pages/Dashboard";
import Employees from "./pages/Employees";
import Departments from "./pages/Departments";
import Leave from "./pages/Leave";
import Attendance from "./pages/Attendance";
import Payroll from "./pages/Payroll";
import Documents from "./pages/Documents";
import SettingsPage from "./pages/SettingsPage";
import Recruitment from "./pages/Recruitment";
import Performance from "./pages/Performance";
import Training from "./pages/Training";
import Reports from "./pages/Reports";
import Branches from "./pages/Branches";
import Holidays from "./pages/Holidays";
import Shifts from "./pages/Shifts";
import Loans from "./pages/Loans";
import AuditLog from "./pages/AuditLog";
import Announcements from "./pages/Announcements";
import Onboarding from "./pages/Onboarding";
import ExitManagement from "./pages/ExitManagement";
import Approvals from "./pages/Approvals";
import OrgChart from "./pages/OrgChart";
import AiAssistant from "./pages/AiAssistant";
import WorkforceIntelligence from "./pages/WorkforceIntelligence";
import Contracts from "./pages/Contracts";
import Notifications from "./pages/Notifications";
import TenantSubscription from "./pages/TenantSubscription";
import TenantSupport from "./pages/TenantSupport";
import Integrations from "./pages/Integrations";
import NotFound from "./pages/NotFound";

// Tathbeet BY MADAD — Bookings Module
import TathbeetDashboard from "./pages/tathbeet/TathbeetDashboard";
import TathbeetBookings from "./pages/tathbeet/TathbeetBookings";
import TathbeetServices from "./pages/tathbeet/TathbeetServices";
import TathbeetStaff from "./pages/tathbeet/TathbeetStaff";
import TathbeetBranches from "./pages/tathbeet/TathbeetBranches";
import TathbeetSettings from "./pages/tathbeet/TathbeetSettings";
import TathbeetCustomers from "./pages/tathbeet/TathbeetCustomers";
import TathbeetAnalytics from "./pages/tathbeet/TathbeetAnalytics";
import TathbeetLoyalty from "./pages/tathbeet/TathbeetLoyalty";
import TathbeetWalkIns from "./pages/tathbeet/TathbeetWalkIns";
import TathbeetAiAssistant from "./pages/tathbeet/TathbeetAiAssistant";
import TathbeetAiOperations from "./pages/tathbeet/TathbeetAiOperations";
import PublicBooking from "./pages/tathbeet/PublicBooking";

// Tahseel BY MADAD — Finance Module
import TahseelDashboard from "./pages/tahseel/TahseelDashboard";
import TahseelInvoices from "./pages/tahseel/TahseelInvoices";
import TahseelExpenses from "./pages/tahseel/TahseelExpenses";
import TahseelAccounts from "./pages/tahseel/TahseelAccounts";
import TahseelJournal from "./pages/tahseel/TahseelJournal";
import TahseelPayments from "./pages/tahseel/TahseelPayments";

// Takzeen BY MADAD — Inventory Module
import TakzeenDashboard from "./pages/takzeen/TakzeenDashboard";
import TakzeenProducts from "./pages/takzeen/TakzeenProducts";
import TakzeenWarehouses from "./pages/takzeen/TakzeenWarehouses";
import TakzeenMovements from "./pages/takzeen/TakzeenMovements";
import TakzeenSuppliers from "./pages/takzeen/TakzeenSuppliers";
import TakzeenPurchaseOrders from "./pages/takzeen/TakzeenPurchaseOrders";

// Business Portal (MADAD Admin)
import BPDashboard from "./pages/business-portal/BPDashboard";
import BPTenants from "./pages/business-portal/BPTenants";
import BPBilling from "./pages/business-portal/BPBilling";
import BPSupport from "./pages/business-portal/BPSupport";
import BPAnalytics from "./pages/business-portal/BPAnalytics";
import BPFeatures from "./pages/business-portal/BPFeatures";
import BPSettings from "./pages/business-portal/BPSettings";
import BPStaff from "./pages/business-portal/BPStaff";
import BPActivityLog from "./pages/business-portal/BPActivityLog";
import BPTenantFeatures from "./pages/business-portal/BPTenantFeatures";

// Employee Portal
import EPProfile from "./pages/employee-portal/EPProfile";
import EPAttendance from "./pages/employee-portal/EPAttendance";
import EPLeave from "./pages/employee-portal/EPLeave";
import EPPayslips from "./pages/employee-portal/EPPayslips";
import EPDocuments from "./pages/employee-portal/EPDocuments";
import EPNotifications from "./pages/employee-portal/EPNotifications";
import EPAiCoach from "./pages/employee-portal/EPAiCoach";
import EPMyRequests from "./pages/employee-portal/EPMyRequests";
import EPSupport from "./pages/employee-portal/EPSupport";
import EPOnboarding from "./pages/employee-portal/EPOnboarding";

// Other
import SystemWalkthroughPage from "./pages/SystemWalkthroughPage";
import InterviewEvaluation from "./pages/InterviewEvaluation";
import PermissionMatrix from "./pages/PermissionMatrix";
import ProjectHub from "./pages/ProjectHub";

const queryClient = new QueryClient();

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="w-12 h-12 rounded-xl bg-primary mx-auto mb-3 flex items-center justify-center animate-pulse">
          <span className="text-primary-foreground font-heading font-bold text-xl">م</span>
        </div>
        <p className="text-muted-foreground text-sm">جاري التحميل...</p>
      </div>
    </div>
  );
}

function SmartRedirect() {
  const { user, loading } = useAuth();
  const { isLoading: rolesLoading } = useRole();
  if (loading || rolesLoading) return <LoadingScreen />;
  if (!user) return <Navigate to="/" replace />;
  return <Navigate to="/madad/dashboard" replace />;
}

/** MADAD Business Portal — main tenant entry */
function MadadRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { roles } = useRole();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/auth" replace />;
  const filteredNav = filterNavByRoles(madadPortalNav, roles);
  return (
    <UnifiedLayout navGroups={filteredNav} portalLabel="مدد" showTenantLogo>
      <ErrorBoundary fallbackTitle="خطأ في مدد">{children}</ErrorBoundary>
    </UnifiedLayout>
  );
}

function BusinessPortalRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { roles } = useRole();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/auth" replace />;
  const filteredNav = filterNavByRoles(businessPortalNav, roles);
  return (
    <PortalGuard portal="business">
      <UnifiedLayout navGroups={filteredNav} portalLabel="إدارة المنصة" portalType="business">
        <ErrorBoundary fallbackTitle="خطأ في إدارة مدد">{children}</ErrorBoundary>
      </UnifiedLayout>
    </PortalGuard>
  );
}

/** Tamkeen BY MADAD — HR Module wrapped in MADAD shell */
function TamkeenRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { roles } = useRole();
  const { canAccess } = useResolvedAccess();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/auth" replace />;
  const filteredNav = filterNavByAccess(tamkeenPortalNav, roles, canAccess);
  return (
    <PortalGuard portal="tenant">
      <UnifiedLayout navGroups={filteredNav} portalLabel="إدارة الموارد البشرية" moduleLabel="تمكين" moduleLogo={MODULE_REGISTRY.tamkeen.iconLogo} showTenantLogo moduleClass="module-tamkeen">
        <ErrorBoundary fallbackTitle="خطأ في وحدة تمكين">{children}</ErrorBoundary>
      </UnifiedLayout>
    </PortalGuard>
  );
}

/** Tathbeet BY MADAD — Bookings Module wrapped in MADAD shell */
function TathbeetRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { roles } = useRole();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/auth" replace />;
  const filteredNav = filterNavByRoles(tathbeetPortalNav, roles);
  return (
    <PortalGuard portal="tenant">
      <UnifiedLayout navGroups={filteredNav} portalLabel="إدارة الحجوزات" moduleLabel="تثبيت" moduleLogo={MODULE_REGISTRY.tathbeet.iconLogo} showTenantLogo moduleClass="module-tathbeet">
        <ModuleGuard moduleKey="tathbeet">
          <ErrorBoundary fallbackTitle="خطأ في وحدة تثبيت">{children}</ErrorBoundary>
        </ModuleGuard>
      </UnifiedLayout>
    </PortalGuard>
  );
}

/** Tahseel BY MADAD — Finance Module */
function TahseelRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { roles } = useRole();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/auth" replace />;
  const filteredNav = filterNavByRoles(tahseelPortalNav, roles);
  return (
    <PortalGuard portal="tenant">
      <UnifiedLayout navGroups={filteredNav} portalLabel="الإدارة المالية" moduleLabel="تحصيل" moduleLogo={MODULE_REGISTRY.tahseel?.iconLogo} showTenantLogo moduleClass="module-tahseel">
        <ModuleGuard moduleKey="tahseel">
          <ErrorBoundary fallbackTitle="خطأ في وحدة تحصيل">{children}</ErrorBoundary>
        </ModuleGuard>
      </UnifiedLayout>
    </PortalGuard>
  );
}

/** Takzeen BY MADAD — Inventory Module */
function TakzeenRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { roles } = useRole();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/auth" replace />;
  const filteredNav = filterNavByRoles(takzeenPortalNav, roles);
  return (
    <PortalGuard portal="tenant">
      <UnifiedLayout navGroups={filteredNav} portalLabel="إدارة المخزون" moduleLabel="تخزين" moduleLogo={MODULE_REGISTRY.takzeen.iconLogo} showTenantLogo moduleClass="module-takzeen">
        <ModuleGuard moduleKey="takzeen">
          <ErrorBoundary fallbackTitle="خطأ في وحدة تخزين">{children}</ErrorBoundary>
        </ModuleGuard>
      </UnifiedLayout>
    </PortalGuard>
  );
}

function EmployeeRouteInner({ children }: { children: React.ReactNode }) {
  const navGroups = useEmployeePortalNav();
  return (
    <UnifiedLayout navGroups={navGroups} portalLabel="بوابة الموظف" showTenantLogo>
      <ErrorBoundary fallbackTitle="خطأ في بوابة الموظف">{children}</ErrorBoundary>
    </UnifiedLayout>
  );
}

function EmployeeRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/auth" replace />;
  return (
    <PortalGuard portal="employee">
      <EmployeeRouteInner>{children}</EmployeeRouteInner>
    </PortalGuard>
  );
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (user) return <Navigate to="/madad/dashboard" replace />;
  return <>{children}</>;
}

function AuthRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (user) return <Navigate to="/madad/dashboard" replace />;
  return <>{children}</>;
}

function G({ feature, role, children }: { feature?: string; role?: string; children: React.ReactNode }) {
  let el = <>{children}</>;
  if (feature) el = <FeatureRouteGuard featureKey={feature}>{el}</FeatureRouteGuard>;
  if (role) el = <RoleGuard minRole={role as any}>{el}</RoleGuard>;
  return el;
}

function SessionTimeoutWrapper({ children }: { children: React.ReactNode }) {
  useSessionTimeout();
  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <LanguageProvider>
            <SessionTimeoutWrapper>
              <OfflineBanner />
              <Routes>
                {/* ================ PUBLIC MARKETING ================ */}
                <Route path="/" element={<PublicRoute><MadadLanding /></PublicRoute>} />
                <Route path="/modules" element={<MadadModules />} />
                <Route path="/modules/:moduleKey" element={<MadadModulePage />} />
                <Route path="/pricing" element={<MadadPricing />} />
                <Route path="/offers" element={<MadadOffers />} />

                {/* Auth */}
                <Route path="/auth" element={<AuthRoute><Auth /></AuthRoute>} />
                <Route path="/login" element={<Navigate to="/auth" replace />} />
                <Route path="/register" element={<Navigate to="/auth?mode=signup" replace />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/unauthorized" element={<Unauthorized />} />

                {/* Public forms */}
                <Route path="/apply/:jobId" element={<PublicApply />} />
                <Route path="/bg-upload" element={<PublicBgUpload />} />
                <Route path="/interview-eval" element={<PublicInterviewEval />} />
                <Route path="/booking/:tenantId" element={<PublicBooking />} />

                {/* ================ MADAD BUSINESS PORTAL (POST-LOGIN) ================ */}
                <Route path="/madad" element={<SmartRedirect />} />
                <Route path="/madad/home" element={<Navigate to="/madad/dashboard" replace />} />
                <Route path="/madad/dashboard" element={<MadadRoute><MadadDashboard /></MadadRoute>} />
                <Route path="/madad/modules" element={<MadadRoute><MadadModulesPage /></MadadRoute>} />
                <Route path="/madad/settings" element={<MadadRoute><RoleGuard allowedRoles={["super_admin", "tenant_admin", "admin", "hr_manager", "manager"]}><MadadSettingsPage /></RoleGuard></MadadRoute>} />
                <Route path="/madad/billing" element={<MadadRoute><RoleGuard minRole="admin"><MadadBillingPage /></RoleGuard></MadadRoute>} />
                <Route path="/madad/notifications" element={<MadadRoute><MadadNotifications /></MadadRoute>} />
                <Route path="/madad/support" element={<MadadRoute><RoleGuard minRole="admin"><MadadSupportPage /></RoleGuard></MadadRoute>} />
                <Route path="/madad/users" element={<MadadRoute><RoleGuard allowedRoles={["super_admin", "tenant_admin", "admin"]}><MadadUsers /></RoleGuard></MadadRoute>} />
                <Route path="/madad/subscriptions" element={<MadadRoute><RoleGuard minRole="admin"><MadadSubscriptions /></RoleGuard></MadadRoute>} />
                <Route path="/madad/activate/:moduleKey" element={<MadadRoute><RoleGuard minRole="admin"><MadadActivationFlow /></RoleGuard></MadadRoute>} />
                <Route path="/madad/upgrade" element={<MadadRoute><RoleGuard minRole="admin"><MadadUpgrade /></RoleGuard></MadadRoute>} />
                <Route path="/madad/feature-requests" element={<MadadRoute><RoleGuard minRole="admin"><MadadFeatureReview /></RoleGuard></MadadRoute>} />
                <Route path="/madad/hybrid-access" element={<MadadRoute><RoleGuard allowedRoles={["super_admin", "tenant_admin", "admin"]}><MadadHybridAccess /></RoleGuard></MadadRoute>} />
                <Route path="/madad/subscription/hybrid-access" element={<Navigate to="/madad/hybrid-access" replace />} />
                <Route path="/madad/settings/hybrid-access" element={<Navigate to="/madad/hybrid-access" replace />} />

                {/* MADAD Admin — Super Admin */}
                <Route path="/madad/admin/tenants" element={<BusinessPortalRoute><MadadAdminTenants /></BusinessPortalRoute>} />
                <Route path="/madad/admin/modules" element={<BusinessPortalRoute><MadadAdminModules /></BusinessPortalRoute>} />
                <Route path="/madad/admin/packages" element={<BusinessPortalRoute><MadadAdminPackages /></BusinessPortalRoute>} />
                <Route path="/madad/admin/offers" element={<BusinessPortalRoute><MadadAdminOffers /></BusinessPortalRoute>} />
                <Route path="/madad/admin/subscriptions" element={<BusinessPortalRoute><MadadAdminSubscriptions /></BusinessPortalRoute>} />
                <Route path="/madad/admin/payment-methods" element={<BusinessPortalRoute><MadadPaymentMethods /></BusinessPortalRoute>} />
                <Route path="/madad/admin/activation-requests" element={<BusinessPortalRoute><MadadAdminActivationRequests /></BusinessPortalRoute>} />
                <Route path="/madad/admin/workflow-settings" element={<BusinessPortalRoute><MadadWorkflowSettings /></BusinessPortalRoute>} />
                <Route path="/madad/admin/users" element={<BusinessPortalRoute><MadadAdminUsers /></BusinessPortalRoute>} />
                <Route path="/madad/admin/local-nodes" element={<BusinessPortalRoute><MadadAdminLocalNodes /></BusinessPortalRoute>} />
                <Route path="/business-portal/pricing-engine" element={<BusinessPortalRoute><BPPricingEngine /></BusinessPortalRoute>} />

                {/* ================ TAMKEEN BY MADAD — HR MODULE ================ */}
                <Route path="/madad/tamkeen" element={<TamkeenRoute><Dashboard /></TamkeenRoute>} />
                <Route path="/madad/tamkeen/employees" element={<TamkeenRoute><G role="hr_manager" feature="employee_profiles"><Employees /></G></TamkeenRoute>} />
                <Route path="/madad/tamkeen/departments" element={<TamkeenRoute><G role="hr_manager" feature="employee_profiles"><Departments /></G></TamkeenRoute>} />
                <Route path="/madad/tamkeen/branches" element={<TamkeenRoute><G role="hr_manager" feature="multi_branch"><Branches /></G></TamkeenRoute>} />
                <Route path="/madad/tamkeen/leave" element={<TamkeenRoute><G feature="leave_management"><Leave /></G></TamkeenRoute>} />
                <Route path="/madad/tamkeen/attendance" element={<TamkeenRoute><G feature="attendance"><Attendance /></G></TamkeenRoute>} />
                <Route path="/madad/tamkeen/shifts" element={<TamkeenRoute><G role="hr_manager" feature="attendance"><Shifts /></G></TamkeenRoute>} />
                <Route path="/madad/tamkeen/holidays" element={<TamkeenRoute><Holidays /></TamkeenRoute>} />
                <Route path="/madad/tamkeen/payroll" element={<TamkeenRoute><G role="hr_manager" feature="payroll"><Payroll /></G></TamkeenRoute>} />
                <Route path="/madad/tamkeen/loans" element={<TamkeenRoute><G role="hr_manager" feature="payroll"><Loans /></G></TamkeenRoute>} />
                <Route path="/madad/tamkeen/recruitment" element={<TamkeenRoute><G role="hr_manager" feature="recruitment"><Recruitment /></G></TamkeenRoute>} />
                <Route path="/madad/tamkeen/performance" element={<TamkeenRoute><G role="hr_manager" feature="performance"><Performance /></G></TamkeenRoute>} />
                <Route path="/madad/tamkeen/training" element={<TamkeenRoute><G feature="learning"><Training /></G></TamkeenRoute>} />
                <Route path="/madad/tamkeen/documents" element={<TamkeenRoute><G feature="documents"><Documents /></G></TamkeenRoute>} />
                <Route path="/madad/tamkeen/reports" element={<TamkeenRoute><G role="hr_manager" feature="reports"><Reports /></G></TamkeenRoute>} />
                <Route path="/madad/tamkeen/audit-log" element={<TamkeenRoute><RoleGuard minRole="admin"><AuditLog /></RoleGuard></TamkeenRoute>} />
                <Route path="/madad/tamkeen/announcements" element={<TamkeenRoute><RoleGuard minRole="hr_manager"><Announcements /></RoleGuard></TamkeenRoute>} />
                <Route path="/madad/tamkeen/onboarding" element={<TamkeenRoute><G role="hr_manager" feature="onboarding"><Onboarding /></G></TamkeenRoute>} />
                <Route path="/madad/tamkeen/exit-management" element={<TamkeenRoute><RoleGuard minRole="hr_manager"><ExitManagement /></RoleGuard></TamkeenRoute>} />
                <Route path="/madad/tamkeen/approvals" element={<TamkeenRoute><G role="manager" feature="approvals"><Approvals /></G></TamkeenRoute>} />
                <Route path="/madad/tamkeen/settings" element={<TamkeenRoute><RoleGuard allowedRoles={["super_admin", "tenant_admin", "admin", "hr_manager", "manager"]}><SettingsPage /></RoleGuard></TamkeenRoute>} />
                <Route path="/madad/tamkeen/org-chart" element={<TamkeenRoute><G role="hr_manager" feature="org_chart"><OrgChart /></G></TamkeenRoute>} />
                <Route path="/madad/tamkeen/ai-assistant" element={<TamkeenRoute><G feature="ai_hr_assistant"><AiAssistant /></G></TamkeenRoute>} />
                <Route path="/madad/tamkeen/workforce-intelligence" element={<TamkeenRoute><G role="hr_manager" feature="ai_workforce_analytics"><WorkforceIntelligence /></G></TamkeenRoute>} />
                <Route path="/madad/tamkeen/contracts" element={<TamkeenRoute><G role="hr_manager" feature="payroll"><Contracts /></G></TamkeenRoute>} />
                <Route path="/madad/tamkeen/subscription" element={<Navigate to="/madad/billing" replace />} />
                <Route path="/madad/tamkeen/support" element={<Navigate to="/madad/support" replace />} />
                <Route path="/madad/tamkeen/notifications" element={<TamkeenRoute><Notifications /></TamkeenRoute>} />
                <Route path="/madad/tamkeen/walkthrough" element={<TamkeenRoute><SystemWalkthroughPage /></TamkeenRoute>} />
                <Route path="/madad/tamkeen/interview-evaluation" element={<TamkeenRoute><InterviewEvaluation /></TamkeenRoute>} />
                <Route path="/madad/tamkeen/permission-matrix" element={<TamkeenRoute><RoleGuard minRole="admin"><PermissionMatrix /></RoleGuard></TamkeenRoute>} />
                <Route path="/madad/tamkeen/projects" element={<TamkeenRoute><G role="manager"><ProjectHub /></G></TamkeenRoute>} />
                <Route path="/madad/tamkeen/integrations" element={<TamkeenRoute><RoleGuard minRole="admin"><Integrations /></RoleGuard></TamkeenRoute>} />

                {/* ================ TATHBEET BY MADAD — BOOKINGS MODULE ================ */}
                <Route path="/madad/tathbeet" element={<TathbeetRoute><TathbeetDashboard /></TathbeetRoute>} />
                <Route path="/madad/tathbeet/dashboard" element={<TathbeetRoute><TathbeetDashboard /></TathbeetRoute>} />
                <Route path="/madad/tathbeet/bookings" element={<TathbeetRoute><TathbeetBookings /></TathbeetRoute>} />
                <Route path="/madad/tathbeet/services" element={<TathbeetRoute><TathbeetServices /></TathbeetRoute>} />
                <Route path="/madad/tathbeet/staff" element={<TathbeetRoute><TathbeetStaff /></TathbeetRoute>} />
                <Route path="/madad/tathbeet/branches" element={<TathbeetRoute><TathbeetBranches /></TathbeetRoute>} />
                <Route path="/madad/tathbeet/customers" element={<TathbeetRoute><TathbeetCustomers /></TathbeetRoute>} />
                <Route path="/madad/tathbeet/analytics" element={<TathbeetRoute><TathbeetAnalytics /></TathbeetRoute>} />
                <Route path="/madad/tathbeet/loyalty" element={<TathbeetRoute><TathbeetLoyalty /></TathbeetRoute>} />
                <Route path="/madad/tathbeet/walk-ins" element={<TathbeetRoute><TathbeetWalkIns /></TathbeetRoute>} />
                <Route path="/madad/tathbeet/settings" element={<TathbeetRoute><TathbeetSettings /></TathbeetRoute>} />
                <Route path="/madad/tathbeet/ai-assistant" element={<TathbeetRoute><TathbeetAiAssistant /></TathbeetRoute>} />
                <Route path="/madad/tathbeet/ai-operations" element={<TathbeetRoute><FeatureRouteGuard featureKey="tathbeet_ai_analysis"><TathbeetAiOperations /></FeatureRouteGuard></TathbeetRoute>} />

                {/* ================ TAHSEEL BY MADAD — FINANCE MODULE ================ */}
                <Route path="/madad/tahseel" element={<TahseelRoute><TahseelDashboard /></TahseelRoute>} />
                <Route path="/madad/tahseel/dashboard" element={<TahseelRoute><TahseelDashboard /></TahseelRoute>} />
                <Route path="/madad/tahseel/invoices" element={<TahseelRoute><TahseelInvoices /></TahseelRoute>} />
                <Route path="/madad/tahseel/expenses" element={<TahseelRoute><TahseelExpenses /></TahseelRoute>} />
                <Route path="/madad/tahseel/accounts" element={<TahseelRoute><TahseelAccounts /></TahseelRoute>} />
                <Route path="/madad/tahseel/journal" element={<TahseelRoute><TahseelJournal /></TahseelRoute>} />
                <Route path="/madad/tahseel/payments" element={<TahseelRoute><TahseelPayments /></TahseelRoute>} />
                <Route path="/madad/tahseel/settings" element={<TahseelRoute><TahseelDashboard /></TahseelRoute>} />

                {/* ================ TAKZEEN BY MADAD — INVENTORY MODULE ================ */}
                <Route path="/madad/takzeen" element={<TakzeenRoute><TakzeenDashboard /></TakzeenRoute>} />
                <Route path="/madad/takzeen/dashboard" element={<TakzeenRoute><TakzeenDashboard /></TakzeenRoute>} />
                <Route path="/madad/takzeen/products" element={<TakzeenRoute><TakzeenProducts /></TakzeenRoute>} />
                <Route path="/madad/takzeen/warehouses" element={<TakzeenRoute><TakzeenWarehouses /></TakzeenRoute>} />
                <Route path="/madad/takzeen/movements" element={<TakzeenRoute><TakzeenMovements /></TakzeenRoute>} />
                <Route path="/madad/takzeen/suppliers" element={<TakzeenRoute><TakzeenSuppliers /></TakzeenRoute>} />
                <Route path="/madad/takzeen/purchase-orders" element={<TakzeenRoute><TakzeenPurchaseOrders /></TakzeenRoute>} />
                <Route path="/madad/takzeen/settings" element={<TakzeenRoute><TakzeenDashboard /></TakzeenRoute>} />

                {/* ================ LEGACY REDIRECTS — Old Tamkeen routes → MADAD ================ */}
                <Route path="/dashboard" element={<Navigate to="/madad/tamkeen" replace />} />
                <Route path="/employees" element={<Navigate to="/madad/tamkeen/employees" replace />} />
                <Route path="/departments" element={<Navigate to="/madad/tamkeen/departments" replace />} />
                <Route path="/branches" element={<Navigate to="/madad/tamkeen/branches" replace />} />
                <Route path="/leave" element={<Navigate to="/madad/tamkeen/leave" replace />} />
                <Route path="/attendance" element={<Navigate to="/madad/tamkeen/attendance" replace />} />
                <Route path="/shifts" element={<Navigate to="/madad/tamkeen/shifts" replace />} />
                <Route path="/holidays" element={<Navigate to="/madad/tamkeen/holidays" replace />} />
                <Route path="/payroll" element={<Navigate to="/madad/tamkeen/payroll" replace />} />
                <Route path="/loans" element={<Navigate to="/madad/tamkeen/loans" replace />} />
                <Route path="/recruitment" element={<Navigate to="/madad/tamkeen/recruitment" replace />} />
                <Route path="/performance" element={<Navigate to="/madad/tamkeen/performance" replace />} />
                <Route path="/training" element={<Navigate to="/madad/tamkeen/training" replace />} />
                <Route path="/documents" element={<Navigate to="/madad/tamkeen/documents" replace />} />
                <Route path="/reports" element={<Navigate to="/madad/tamkeen/reports" replace />} />
                <Route path="/audit-log" element={<Navigate to="/madad/tamkeen/audit-log" replace />} />
                <Route path="/announcements" element={<Navigate to="/madad/tamkeen/announcements" replace />} />
                <Route path="/onboarding" element={<Navigate to="/madad/tamkeen/onboarding" replace />} />
                <Route path="/exit-management" element={<Navigate to="/madad/tamkeen/exit-management" replace />} />
                <Route path="/approvals" element={<Navigate to="/madad/tamkeen/approvals" replace />} />
                <Route path="/settings" element={<Navigate to="/madad/tamkeen/settings" replace />} />
                <Route path="/org-chart" element={<Navigate to="/madad/tamkeen/org-chart" replace />} />
                <Route path="/ai-assistant" element={<Navigate to="/madad/tamkeen/ai-assistant" replace />} />
                <Route path="/workforce-intelligence" element={<Navigate to="/madad/tamkeen/workforce-intelligence" replace />} />
                <Route path="/contracts" element={<Navigate to="/madad/tamkeen/contracts" replace />} />
                <Route path="/subscription" element={<Navigate to="/madad/billing" replace />} />
                <Route path="/support" element={<Navigate to="/madad/support" replace />} />
                <Route path="/notifications" element={<Navigate to="/madad/tamkeen/notifications" replace />} />
                <Route path="/walkthrough" element={<Navigate to="/madad/tamkeen/walkthrough" replace />} />
                <Route path="/interview-evaluation" element={<Navigate to="/madad/tamkeen/interview-evaluation" replace />} />
                <Route path="/permission-matrix" element={<Navigate to="/madad/tamkeen/permission-matrix" replace />} />
                <Route path="/projects" element={<Navigate to="/madad/tamkeen/projects" replace />} />
                <Route path="/integrations" element={<Navigate to="/madad/tamkeen/integrations" replace />} />
                <Route path="/super-admin" element={<Navigate to="/business-portal" replace />} />

                {/* ================ BUSINESS PORTAL (MADAD Platform Admin) ================ */}
                <Route path="/business-portal" element={<BusinessPortalRoute><BPDashboard /></BusinessPortalRoute>} />
                <Route path="/business-portal/tenants" element={<BusinessPortalRoute><BPTenants /></BusinessPortalRoute>} />
                <Route path="/business-portal/plans" element={<Navigate to="/business-portal/features" replace />} />
                <Route path="/business-portal/billing" element={<BusinessPortalRoute><BPBilling /></BusinessPortalRoute>} />
                <Route path="/business-portal/support" element={<BusinessPortalRoute><BPSupport /></BusinessPortalRoute>} />
                <Route path="/business-portal/analytics" element={<BusinessPortalRoute><BPAnalytics /></BusinessPortalRoute>} />
                <Route path="/business-portal/features" element={<BusinessPortalRoute><BPFeatures /></BusinessPortalRoute>} />
                <Route path="/business-portal/staff" element={<BusinessPortalRoute><BPStaff /></BusinessPortalRoute>} />
                <Route path="/business-portal/activity" element={<BusinessPortalRoute><BPActivityLog /></BusinessPortalRoute>} />
                <Route path="/business-portal/tenant-features" element={<BusinessPortalRoute><BPTenantFeatures /></BusinessPortalRoute>} />
                <Route path="/business-portal/settings" element={<BusinessPortalRoute><BPSettings /></BusinessPortalRoute>} />

                {/* ================ EMPLOYEE PORTAL ================ */}
                <Route path="/employee-portal" element={<EmployeeRoute><EPProfile /></EmployeeRoute>} />
                <Route path="/employee-portal/attendance" element={<EmployeeRoute><G feature="attendance"><EPAttendance /></G></EmployeeRoute>} />
                <Route path="/employee-portal/leave" element={<EmployeeRoute><G feature="leave_management"><EPLeave /></G></EmployeeRoute>} />
                <Route path="/employee-portal/payslips" element={<EmployeeRoute><G feature="payroll"><EPPayslips /></G></EmployeeRoute>} />
                <Route path="/employee-portal/documents" element={<EmployeeRoute><G feature="documents"><EPDocuments /></G></EmployeeRoute>} />
                <Route path="/employee-portal/notifications" element={<EmployeeRoute><EPNotifications /></EmployeeRoute>} />
                <Route path="/employee-portal/my-requests" element={<EmployeeRoute><EPMyRequests /></EmployeeRoute>} />
                <Route path="/employee-portal/support" element={<EmployeeRoute><EPSupport /></EmployeeRoute>} />
                <Route path="/employee-portal/onboarding" element={<EmployeeRoute><G feature="onboarding"><EPOnboarding /></G></EmployeeRoute>} />
                <Route path="/employee-portal/ai-coach" element={<EmployeeRoute><G feature="ai_employee_career_coach"><EPAiCoach /></G></EmployeeRoute>} />

                {/* Legacy employee */}
                <Route path="/employee/requests" element={<Navigate to="/employee-portal/my-requests" replace />} />
                <Route path="/employee/*" element={<Navigate to="/employee-portal" replace />} />

                <Route path="*" element={<NotFound />} />
              </Routes>
            </SessionTimeoutWrapper>
          </LanguageProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
