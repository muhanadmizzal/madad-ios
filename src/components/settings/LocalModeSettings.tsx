import { useMemo } from "react";
import { RefreshCw, Server, Wifi, WifiOff } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useRuntimeMode } from "@/hooks/useRuntimeMode";
import { useSyncStatus } from "@/hooks/useSyncStatus";

export default function LocalModeSettings() {
  const runtime = useRuntimeMode();
  const { data: syncStatus, isFetching, refetch } = useSyncStatus(runtime.effectiveMode === "local");

  const syncBadge = useMemo(() => {
    if (runtime.effectiveMode !== "local") return { label: "Cloud Mode", variant: "outline" as const };
    if (syncStatus?.online) return { label: "Synced", variant: "default" as const };
    return { label: "Offline Queue", variant: "secondary" as const };
  }, [runtime.effectiveMode, syncStatus?.online]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Server className="h-5 w-5" />
          Local Runtime
        </CardTitle>
        <CardDescription>
          Enable offline LAN deployment while keeping the existing MADAD frontend intact.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between rounded-md border p-3">
          <div className="space-y-1">
            <Label htmlFor="local-mode-switch">Enable Local Mode</Label>
            <p className="text-xs text-muted-foreground">
              Switch auth, CRUD, storage, and sync traffic to the local runtime service.
            </p>
          </div>
          <Switch
            id="local-mode-switch"
            checked={runtime.mode === "local"}
            onCheckedChange={(checked) => runtime.setMode(checked ? "local" : "online")}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="local-api-base">Local API Base URL</Label>
          <Input
            id="local-api-base"
            dir="ltr"
            value={runtime.localBaseUrl}
            onChange={(event) => runtime.setLocalBaseUrl(event.target.value)}
            placeholder="http://192.168.1.20:4000"
          />
          <p className="text-xs text-muted-foreground">
            Use `localhost` on the host machine or your LAN IP for other users on the same network.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-sm">
          <Badge variant={syncBadge.variant}>{syncBadge.label}</Badge>
          <span className="flex items-center gap-1 text-muted-foreground">
            {runtime.online ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
            Internet {runtime.online ? "available" : "not available"}
          </span>
          {runtime.effectiveMode === "local" && (
            <span className="text-muted-foreground">Queue depth: {syncStatus?.queueDepth ?? 0}</span>
          )}
        </div>

        {runtime.effectiveMode === "local" && (
          <div className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
            <div>Last pull: {syncStatus?.lastPull?.pulledAt || "Not yet synced"}</div>
            <div>Last push: {syncStatus?.lastPush?.pushedAt || "Not yet synced"}</div>
            {syncStatus?.error && <div className="text-destructive">Sync error: {syncStatus.error}</div>}
          </div>
        )}

        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
            Refresh Sync Status
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
