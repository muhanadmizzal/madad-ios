import { useEffect, useState, useCallback } from "react";
import {
  type RuntimeMode,
  type EffectiveMode,
  LOCAL_BASE_STORAGE_KEY,
  RUNTIME_CHANGE_EVENT,
  RUNTIME_MODE_STORAGE_KEY,
  readStoredLocalBaseUrl,
  readStoredRuntimeMode,
} from "@/lib/runtimeConfig";

/**
 * Hook for the tenant runtime mode toggle:
 *  - "auto"   → effective mode follows navigator.onLine
 *  - "online" → forced cloud
 *  - "local"  → forced local runtime (requires localBaseUrl)
 *
 * Also detects connectivity and exposes whether a local runtime endpoint
 * looks reachable.
 */
export function useRuntimeMode() {
  const [mode, setModeState] = useState<RuntimeMode>(readStoredRuntimeMode);
  const [online, setOnline] = useState<boolean>(
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );
  const [localBaseUrl, setLocalBaseUrlState] = useState<string>(readStoredLocalBaseUrl);

  useEffect(() => {
    const onUp = () => setOnline(true);
    const onDown = () => setOnline(false);
    window.addEventListener("online", onUp);
    window.addEventListener("offline", onDown);
    return () => {
      window.removeEventListener("online", onUp);
      window.removeEventListener("offline", onDown);
    };
  }, []);

  const setMode = useCallback((m: RuntimeMode) => {
    localStorage.setItem(RUNTIME_MODE_STORAGE_KEY, m);
    setModeState(m);
    window.dispatchEvent(new Event(RUNTIME_CHANGE_EVENT));
  }, []);

  const setLocalBaseUrl = useCallback((url: string) => {
    localStorage.setItem(LOCAL_BASE_STORAGE_KEY, url);
    setLocalBaseUrlState(url);
    window.dispatchEvent(new Event(RUNTIME_CHANGE_EVENT));
  }, []);

  const effectiveMode: EffectiveMode =
    mode === "local"
      ? "local"
      : mode === "online"
        ? "online"
        : online
          ? "online"
          : "local";

  return {
    mode,
    setMode,
    online,
    effectiveMode,
    localBaseUrl,
    setLocalBaseUrl,
  };
}
