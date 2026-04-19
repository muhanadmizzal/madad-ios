export type RuntimeMode = "auto" | "online" | "local";
export type EffectiveMode = "online" | "local";

export const RUNTIME_MODE_STORAGE_KEY = "madad.runtime.mode";
export const LOCAL_BASE_STORAGE_KEY = "madad.runtime.localBaseUrl";
export const RUNTIME_CHANGE_EVENT = "madad-runtime-change";

function getBrowserDefaultLocalApiUrl() {
  if (typeof window === "undefined") {
    return "http://localhost:4000";
  }

  const hostname = window.location.hostname || "localhost";
  const protocol = window.location.protocol === "https:" ? "https:" : "http:";
  return `${protocol}//${hostname}:4000`;
}

export function readStoredRuntimeMode(): RuntimeMode {
  if (typeof window === "undefined") return "auto";
  const value = window.localStorage.getItem(RUNTIME_MODE_STORAGE_KEY);
  return value === "online" || value === "local" ? value : "auto";
}

export function readStoredLocalBaseUrl(): string {
  if (typeof window === "undefined") return "";
  const browserDefault = getBrowserDefaultLocalApiUrl();
  const envValue = import.meta.env.VITE_LOCAL_API_URL as string | undefined;
  const stored = window.localStorage.getItem(LOCAL_BASE_STORAGE_KEY);

  if (stored) {
    return stored;
  }

  if (envValue) {
    try {
      const parsed = new URL(envValue);
      const currentHost = window.location.hostname;
      const isLoopback =
        parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";

      if (currentHost && currentHost !== "localhost" && currentHost !== "127.0.0.1" && isLoopback) {
        return `${parsed.protocol}//${currentHost}:${parsed.port || "4000"}`;
      }

      return envValue;
    } catch {
      return browserDefault;
    }
  }

  return browserDefault;
}

export function getEffectiveRuntimeMode(): EffectiveMode {
  const mode = readStoredRuntimeMode();
  const online = typeof navigator === "undefined" ? true : navigator.onLine;
  if (mode === "local") return "local";
  if (mode === "online") return "online";
  return online ? "online" : "local";
}

export function isLocalRuntimeEnabled() {
  return getEffectiveRuntimeMode() === "local";
}
