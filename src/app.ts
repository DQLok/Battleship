import "@telegram-apps/telegram-ui/dist/styles.css";
import "@/css/tailwind.scss";
import "@/css/app.scss";

import React from "react";
import { createRoot } from "react-dom/client";
import { applyPolyfills } from "@telegram-apps/sdk-react";

import Layout from "@/components/layout";
import { initTelegram } from "@/telegram/init";
import { mockTelegramEnvIfNeeded } from "@/telegram/mockEnv";
import { markRealTelegramAtLoad, normalizeLaunchUrl } from "@/utils/user-info";

function applyLegacyPolyfills() {
  const ObjectCtor = Object as ObjectConstructor & {
    hasOwn(obj: object, prop: PropertyKey): boolean;
  };

  if (typeof ObjectCtor.hasOwn !== "function") {
    ObjectCtor.hasOwn = (obj, prop) =>
      Object.prototype.hasOwnProperty.call(obj, prop);
  }
}

async function bootstrap() {
  applyLegacyPolyfills();
  applyPolyfills();

  // Detect Telegram and init SDK *before* rewriting the URL. Telegram puts
  // launch params in the hash (`#tgWebAppData=...`); HashRouter needs `#/`.
  markRealTelegramAtLoad();
  try {
    await mockTelegramEnvIfNeeded();
    await initTelegram();
  } catch (error) {
    console.warn("Telegram mock/init failed, continuing:", error);
  }
  normalizeLaunchUrl();

  const root = createRoot(document.getElementById("app")!);
  root.render(React.createElement(Layout));
}

bootstrap().catch((error) => {
  console.error("Failed to start Telegram Mini App", error);
  try {
    const el = document.getElementById("app");
    if (el) {
      createRoot(el).render(React.createElement(Layout));
      return;
    }
  } catch (renderError) {
    console.error("Fallback render failed", renderError);
  }
  document.body.innerHTML =
    '<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#061421;color:#22d3ee;font-family:monospace;padding:24px;text-align:center">Không thể khởi động Mini App. Mở lại trong Telegram hoặc refresh trang.</div>';
});
