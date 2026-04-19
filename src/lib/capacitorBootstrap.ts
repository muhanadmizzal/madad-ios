import { Capacitor } from "@capacitor/core";

export function bootstrapCapacitorUi() {
  if (typeof document === "undefined") return;

  const body = document.body;
  const html = document.documentElement;
  const platform = Capacitor.getPlatform();
  const isNative = Capacitor.isNativePlatform();

  html.classList.toggle("native-shell", isNative);
  body.classList.toggle("native-shell", isNative);
  html.dataset.platform = platform;
  body.dataset.platform = platform;

  if (platform === "ios") {
    html.classList.add("platform-ios");
    body.classList.add("platform-ios");
  }
}
