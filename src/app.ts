import "@/css/tailwind.scss";
import "@/css/app.scss";

import React from "react";
import { createRoot } from "react-dom/client";

import Layout from "@/components/layout";
import { startInstantGame } from "@/meta/instant";

document.documentElement.setAttribute("zaui-theme", "dark");

function renderApp() {
  const root = createRoot(document.getElementById("app")!);
  root.render(React.createElement(Layout));
}

startInstantGame()
  .then(renderApp)
  .catch((error) => {
    console.error("Failed to initialize Instant Game:", error);
    const el = document.getElementById("app");
    if (el) {
      el.textContent = "Không khởi động được Instant Game.";
    }
  });
