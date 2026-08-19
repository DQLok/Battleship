import {
  emitEvent,
  mockTelegramEnv,
  retrieveLaunchParams,
} from "@telegram-apps/sdk-react";
import {
  getOrCreateDevUserId,
  resolveMockUserId,
  toTelegramNumericId,
} from "@/utils/user-info";

const themeParams = {
  accent_text_color: "#22d3ee",
  bg_color: "#061421",
  button_color: "#22d3ee",
  button_text_color: "#061421",
  destructive_text_color: "#ef4444",
  header_bg_color: "#061421",
  hint_color: "#708499",
  link_color: "#22d3ee",
  secondary_bg_color: "#0a1f32",
  section_bg_color: "#061421",
  section_header_text_color: "#22d3ee",
  subtitle_text_color: "#708499",
  text_color: "#f5f5f5",
} as const;

const noInsets = { left: 0, top: 0, bottom: 0, right: 0 } as const;

type TelegramWebApp = {
  initData?: string;
  version?: string;
  platform?: string;
  themeParams?: Record<string, string>;
};

function launchParamsFromTelegramWebApp(): URLSearchParams | null {
  const webApp = (window as unknown as { Telegram?: { WebApp?: TelegramWebApp } })
    .Telegram?.WebApp;
  if (!webApp?.initData) return null;

  return new URLSearchParams([
    ["tgWebAppThemeParams", JSON.stringify(webApp.themeParams || themeParams)],
    ["tgWebAppData", webApp.initData],
    ["tgWebAppVersion", webApp.version || "8.4"],
    ["tgWebAppPlatform", webApp.platform || "ios"],
  ]);
}

/**
 * Ensure launch params exist before `init()`.
 * Real Telegram already has them; browsers / GitHub Pages redirects do not.
 */
export async function mockTelegramEnvIfNeeded(): Promise<void> {
  try {
    retrieveLaunchParams();
    return;
  } catch {
    // Continue with WebApp or local mock.
  }

  const fromWebApp = launchParamsFromTelegramWebApp();
  if (fromWebApp) {
    mockTelegramEnv({
      resetPostMessage: true,
      launchParams: fromWebApp,
      onEvent(e, next) {
        if (e.name === "web_app_request_theme") {
          return emitEvent("theme_changed", { theme_params: themeParams });
        }
        if (e.name === "web_app_request_viewport") {
          return emitEvent("viewport_changed", {
            height: window.innerHeight,
            width: window.innerWidth,
            is_expanded: true,
            is_state_stable: true,
          });
        }
        if (e.name === "web_app_request_content_safe_area") {
          return emitEvent("content_safe_area_changed", noInsets);
        }
        if (e.name === "web_app_request_safe_area") {
          return emitEvent("safe_area_changed", noInsets);
        }
        next();
      },
    });
    return;
  }

  const appUserId = resolveMockUserId() || getOrCreateDevUserId();
  const telegramId = toTelegramNumericId(appUserId);

  mockTelegramEnv({
    resetPostMessage: true,
    onEvent(e) {
      if (e.name === "web_app_request_theme") {
        return emitEvent("theme_changed", { theme_params: themeParams });
      }
      if (e.name === "web_app_request_viewport") {
        return emitEvent("viewport_changed", {
          height: window.innerHeight,
          width: window.innerWidth,
          is_expanded: true,
          is_state_stable: true,
        });
      }
      if (e.name === "web_app_request_content_safe_area") {
        return emitEvent("content_safe_area_changed", noInsets);
      }
      if (e.name === "web_app_request_safe_area") {
        return emitEvent("safe_area_changed", noInsets);
      }
    },
    launchParams: new URLSearchParams([
      ["tgWebAppThemeParams", JSON.stringify(themeParams)],
      [
        "tgWebAppData",
        new URLSearchParams([
          ["auth_date", String((Date.now() / 1000) | 0)],
          ["hash", "some-hash"],
          ["signature", "some-signature"],
          [
            "user",
            JSON.stringify({
              id: telegramId,
              first_name: `Player_${appUserId}`,
              username: appUserId.replace(/^dev_/, "player_"),
            }),
          ],
        ]).toString(),
      ],
      ["tgWebAppVersion", "8.4"],
      ["tgWebAppPlatform", "tdesktop"],
    ]),
  });

  console.info(
    `[Battleship] Mocked Telegram env. profiles.id=${appUserId} telegram.id=${telegramId}. Open /?mockId=player2 for a second player.`
  );
}
