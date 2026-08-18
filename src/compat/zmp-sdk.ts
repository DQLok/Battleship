/** Leftover Zalo SDK surface used by unused template pages. */

export function openMiniApp(_opts?: unknown) {
  console.warn("openMiniApp is not available in Telegram Mini App");
}

export async function getUserInfo(_opts?: unknown) {
  throw new Error("zmp-sdk getUserInfo was replaced by Telegram initData");
}

export function getSystemInfo() {
  return { zaloTheme: "dark" };
}
