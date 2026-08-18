import {
  emitEvent,
  mockTelegramEnv,
} from "@telegram-apps/sdk-react";

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

/**
 * Mock Telegram launch params so `npm run dev` works in a normal browser.
 * Tree-shaken out of production builds.
 */
export async function mockTelegramEnvIfNeeded(): Promise<void> {
  if (!import.meta.env.DEV) return;

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
              id: 1,
              first_name: "Commander",
              username: "commander",
            }),
          ],
        ]).toString(),
      ],
      ["tgWebAppVersion", "8.4"],
      ["tgWebAppPlatform", "tdesktop"],
    ]),
  });

  console.info(
    "Telegram environment was mocked for local development. Production builds only run inside Telegram."
  );
}
