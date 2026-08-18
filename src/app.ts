import "@telegram-apps/telegram-ui/dist/styles.css";
import "@/css/tailwind.scss";
import "@/css/app.scss";

import React from "react";
import { createRoot } from "react-dom/client";

import Layout from "@/components/layout";
import { initTelegram } from "@/telegram/init";
import { mockTelegramEnvIfNeeded } from "@/telegram/mockEnv";

async function bootstrap() {
  await mockTelegramEnvIfNeeded();
  await initTelegram();

  const root = createRoot(document.getElementById("app")!);
  root.render(React.createElement(Layout));

  // HashRouter needs a hash route when opening /Battleship/ directly.
  if (!window.location.hash) {
    window.location.replace(`${window.location.pathname}#/`);
  }
}

bootstrap().catch((error) => {
  console.error("Failed to start Telegram Mini App", error);
  document.body.innerHTML =
    '<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#061421;color:#22d3ee;font-family:monospace;padding:24px;text-align:center">Không thể khởi động Mini App. Mở lại trong Telegram hoặc refresh trang.</div>';
});
