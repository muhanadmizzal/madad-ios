import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useRole, type PortalType } from "@/hooks/useRole";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

interface PortalGuardProps {
  children: React.ReactNode;
  portal: PortalType;
}

function PortalLoading({ timedOut }: { timedOut: boolean }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-3">
        <div className="w-12 h-12 rounded-xl bg-primary mx-auto flex items-center justify-center animate-pulse">
          <span className="text-primary-foreground font-heading font-bold text-xl">مدد</span>
        </div>
        <p className="text-muted-foreground text-sm">
          {timedOut ? "تعذّر تحميل الصلاحيات" : "جاري التحقق من الصلاحيات..."}
        </p>
        {timedOut && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.reload()}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            إعادة المحاولة
          </Button>
        )}
      </div>
    </div>
  );
}

export function PortalGuard({ children, portal }: PortalGuardProps) {
  const { canAccessBusinessPortal, canAccessTenantPortal, canAccessEmployeePortal, isLoading, getRedirectPath } = useRole();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      setTimedOut(false);
      return;
    }
    const timer = setTimeout(() => setTimedOut(true), 5000);
    return () => clearTimeout(timer);
  }, [isLoading]);

  if (isLoading || timedOut) {
    return <PortalLoading timedOut={timedOut} />;
  }

  if (portal === "business" && !canAccessBusinessPortal) {
    return <Navigate to={getRedirectPath()} replace />;
  }
  if (portal === "tenant" && !canAccessTenantPortal) {
    return <Navigate to={getRedirectPath()} replace />;
  }
  if (portal === "employee" && !canAccessEmployeePortal) {
    return <Navigate to={getRedirectPath()} replace />;
  }

  return <>{children}</>;
}
