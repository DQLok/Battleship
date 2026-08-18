import {
  backButton,
  emitEvent,
  init as initSDK,
  initData,
  miniApp,
  mockTelegramEnv,
  retrieveLaunchParams,
  setDebug,
  themeParams,
  viewport,
  type ThemeParams,
} from "@telegram-apps/sdk-react";

function mountMiniApp() {
  if (!miniApp.mountSync.isAvailable()) return;

  themeParams.mountSync();
  miniApp.mountSync();

  if (themeParams.bindCssVars.isAvailable()) {
    themeParams.bindCssVars();
  }

  if (miniApp.ready.isAvailable()) {
    miniApp.ready();
  }
}

function mountViewport() {
  if (!viewport.mount.isAvailable()) return;

  viewport
    .mount()
    .then(() => {
      viewport.bindCssVars();
      viewport.expand.ifAvailable();
    })
    .catch((error) => {
      console.warn("Viewport mount skipped:", error);
    });
}

/**
 * Initialize Telegram Mini Apps SDK and bind theme/viewport CSS variables.
 */
export async function initTelegram(): Promise<void> {
  setDebug(import.meta.env.DEV);
  initSDK();

  const launchParams = retrieveLaunchParams();
  if (launchParams.tgWebAppPlatform === "macos") {
    let firstThemeSent = false;
    mockTelegramEnv({
      onEvent(event, next) {
        if (event.name === "web_app_request_theme") {
          let tp: ThemeParams = {};
          if (firstThemeSent) {
            tp = themeParams.state();
          } else {
            firstThemeSent = true;
            tp = retrieveLaunchParams().tgWebAppThemeParams;
          }
          return emitEvent("theme_changed", { theme_params: tp });
        }

        if (event.name === "web_app_request_safe_area") {
          return emitEvent("safe_area_changed", {
            left: 0,
            top: 0,
            right: 0,
            bottom: 0,
          });
        }

        next();
      },
    });
  }

  backButton.mount.ifAvailable();
  initData.restore();
  mountMiniApp();
  mountViewport();
}
