import type { CapacitorConfig } from "@capacitor/cli";

const serverUrl = process.env.CAP_SERVER_URL;

const config: CapacitorConfig = {
  appId: "iq.madad.platform",
  appName: "MADAD",
  webDir: "dist",
  bundledWebRuntime: false,
  ios: {
    contentInset: "automatic",
    scheme: "MADAD",
    limitsNavigationsToAppBoundDomains: false,
  },
  server: serverUrl
    ? {
        url: serverUrl,
        cleartext: serverUrl.startsWith("http://"),
      }
    : undefined,
};

export default config;
