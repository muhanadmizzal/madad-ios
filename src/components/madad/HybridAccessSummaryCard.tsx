import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Server, Activity, Wifi, WifiOff, ArrowLeft, ArrowRight } from "lucide-react";
import { useLocalNodes, useLocalAccessRequests } from "@/hooks/useLocalNodes";
import { useRuntimeMode } from "@/hooks/useRuntimeMode";
import { useLanguage } from "@/contexts/LanguageContext";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

const HEALTH_STYLE: Record<string, string> = {
  healthy: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  degraded: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
  stale: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
  error: "bg-destructive/15 text-destructive border-destructive/30",
  unknown: "bg-muted text-muted-foreground border-border",
};

interface Props {
  /** "compact" hides last sync row; "full" shows everything. */
  variant?: "compact" | "full";
}

/**
 * Platform-wide MADAD Hybrid Access summary.
 * Shows node count, health, runtime mode, last sync, and a CTA to manage hybrid access.
 * Designed for tenant dashboard, subscriptions page, and settings page.
 */
export function HybridAccessSummaryCard({ variant = "full" }: Props) {
  const { t, lang } = useLanguage();
  const navigate = useNavigate();
  const { data: nodes = [] } = useLocalNodes("tenant");
  const { data: requests = [] } = useLocalAccessRequests("tenant");
  const runtime = useRuntimeMode();
  const Arrow = lang === "ar" ? ArrowLeft : ArrowRight;

  const activeNodes = nodes.filter((n) => n.node_status === "active");
  const pendingRequest = requests.find((r) => r.request_status === "pending");
  const latestNode = nodes[0];
  const lastSync = latestNode?.last_sync_at
    ? format(new Date(latestNode.last_sync_at), "dd MMM yyyy HH:mm", {
        locale: lang === "ar" ? ar : undefined,
      })
    : null;

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Server className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="font-semibold">
                {t("الوصول الهجين MADAD", "MADAD Hybrid Access")}
              </div>
              <div className="text-xs text-muted-foreground">
                {t(
                  "تشغيل وحدات اشتراكك على عقدة محلية تحت سيطرة MADAD",
                  "Run your subscribed modules on a local node under MADAD control",
                )}
              </div>
            </div>
          </div>
          {nodes.length > 0 ? (
            <Badge variant="default">{t("مفعّل", "Active")}</Badge>
          ) : pendingRequest ? (
            <Badge variant="outline" className="border-amber-500/40 text-amber-700 dark:text-amber-400">
              {t("قيد المراجعة", "Pending")}
            </Badge>
          ) : (
            <Badge variant="secondary">{t("غير مفعّل", "Not active")}</Badge>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div className="rounded-md bg-background/60 border p-3">
            <div className="text-xs text-muted-foreground">{t("العقد النشطة", "Active nodes")}</div>
            <div className="font-bold text-lg">{activeNodes.length}</div>
          </div>
          <div className="rounded-md bg-background/60 border p-3">
            <div className="text-xs text-muted-foreground">{t("وضع التشغيل", "Runtime mode")}</div>
            <div className="font-medium flex items-center gap-1">
              {runtime.online ? (
                <Wifi className="h-3.5 w-3.5 text-emerald-500" />
              ) : (
                <WifiOff className="h-3.5 w-3.5 text-destructive" />
              )}
              {runtime.effectiveMode === "online"
                ? t("سحابي", "Cloud")
                : t("محلي", "Local")}
            </div>
          </div>
          <div className="rounded-md bg-background/60 border p-3">
            <div className="text-xs text-muted-foreground">{t("صحة المزامنة", "Sync health")}</div>
            <div>
              {latestNode ? (
                <Badge variant="outline" className={HEALTH_STYLE[latestNode.sync_health] || ""}>
                  <Activity className="h-3 w-3 ml-1" />
                  {latestNode.sync_health}
                </Badge>
              ) : (
                <span className="text-muted-foreground text-xs">—</span>
              )}
            </div>
          </div>
          {variant === "full" && (
            <div className="rounded-md bg-background/60 border p-3">
              <div className="text-xs text-muted-foreground">{t("آخر مزامنة", "Last sync")}</div>
              <div className="text-xs font-medium">{lastSync || "—"}</div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-1">
          <p className="text-xs text-muted-foreground">
            {t(
              "يشمل: تمكين، تثبيت، تحصيل، تخزين — وفق اشتراكك",
              "Covers: Tamkeen, Tathbeet, Tahseel, Takzeen — per your subscription",
            )}
          </p>
          <Button size="sm" variant="ghost" onClick={() => navigate("/madad/hybrid-access")}>
            {nodes.length > 0
              ? t("إدارة", "Manage")
              : pendingRequest
              ? t("عرض الطلب", "View request")
              : t("طلب التفعيل", "Request access")}
            <Arrow className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default HybridAccessSummaryCard;
