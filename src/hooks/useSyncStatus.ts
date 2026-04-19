import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { getEffectiveRuntimeMode, readStoredLocalBaseUrl } from "@/lib/runtimeConfig";

export function useSyncStatus(enabled = true) {
  const { session } = useAuth();

  return useQuery({
    queryKey: ["local-sync-status", getEffectiveRuntimeMode(), readStoredLocalBaseUrl()],
    queryFn: async () => {
      if (getEffectiveRuntimeMode() !== "local") {
        return {
          localMode: false,
          online: typeof navigator === "undefined" ? true : navigator.onLine,
          queueDepth: 0,
        };
      }

      const response = await fetch(`${readStoredLocalBaseUrl()}/api/sync/status`, {
        headers: session?.access_token
          ? { Authorization: `Bearer ${session.access_token}` }
          : undefined,
      });

      if (!response.ok) {
        throw new Error(`Sync status failed with ${response.status}`);
      }

      const payload = await response.json();
      return payload.data;
    },
    enabled,
    refetchInterval: enabled ? 15000 : false,
    staleTime: 5000,
  });
}
