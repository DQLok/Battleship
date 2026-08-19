import { Profile } from "@/types/supabase/Profile";
import { initDataUser } from "@telegram-apps/sdk-react";

const DEV_USER_KEY = "battleship_dev_user_id";
const MOCK_USER_KEY = "battleship_mock_user_id";

/** Set once at bootstrap, before `mockTelegramEnvIfNeeded()`. */
let realTelegramAtLoad = false;

function decodeHashContent(hash: string): string {
  let content = hash.startsWith("#") ? hash.slice(1) : hash;
  try {
    content = decodeURIComponent(content);
  } catch {
    // Keep raw hash if decode fails.
  }
  return content;
}

/** Read mockId from current URL (search or hash query). Does not use session cache. */
export function readMockIdFromUrl(): string | null {
  const query = new URLSearchParams(window.location.search);
  const fromSearch = query.get("mockId");
  if (fromSearch) return fromSearch;

  const hashContent = decodeHashContent(window.location.hash);
  const qIndex = hashContent.indexOf("?");
  const hashQuery = new URLSearchParams(
    qIndex >= 0 ? hashContent.slice(qIndex + 1) : ""
  );
  return hashQuery.get("mockId");
}

/**
 * mockId from URL, persisted in sessionStorage for HashRouter navigation.
 * Opening `#/?mockId=player1` then going to `#/lobby` keeps `player1`.
 */
export function resolveMockUserId(): string | null {
  const fromUrl = readMockIdFromUrl();
  if (fromUrl) {
    try {
      sessionStorage.setItem(MOCK_USER_KEY, fromUrl);
    } catch {
      // Ignore storage errors.
    }
    return fromUrl;
  }

  try {
    return sessionStorage.getItem(MOCK_USER_KEY);
  } catch {
    return null;
  }
}

/** @deprecated Use resolveMockUserId() */
export function readMockId(): string | null {
  return resolveMockUserId();
}

function isTelegramLaunchHash(hashBody: string): boolean {
  const body = hashBody.startsWith("/") ? hashBody.slice(1) : hashBody;
  return (
    body.startsWith("tgWebApp") ||
    body.includes("tgWebAppData=") ||
    body.includes("tgWebAppVersion=") ||
    body.includes("tgWebAppPlatform=")
  );
}

function replaceLocation(next: string): void {
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (next !== current) {
    window.history.replaceState(null, "", next);
  }
}

/**
 * Keep mockId on `location.search` and give HashRouter a real `#/` path.
 * Call this *after* Telegram SDK init so launch params are already snapshotted.
 * `/?mockId=player1` → `/?mockId=player1#/` (no full reload).
 */
export function normalizeLaunchUrl(): void {
  const hashRaw = window.location.hash || "";
  const hashBody = hashRaw.startsWith("#") ? hashRaw.slice(1) : hashRaw;

  // Telegram injects `#tgWebAppData=...` — that is not a React Router path.
  if (isTelegramLaunchHash(hashBody)) {
    replaceLocation(`${window.location.pathname}${window.location.search}#/`);
    return;
  }

  let normalizedHash = hashRaw;
  if (normalizedHash.includes("%")) {
    try {
      const decoded = decodeURIComponent(
        normalizedHash.startsWith("#") ? normalizedHash.slice(1) : normalizedHash
      );
      normalizedHash = `#${decoded.startsWith("/") ? decoded : `/${decoded}`}`;
    } catch {
      // Keep original hash.
    }
  }

  const body = normalizedHash.startsWith("#") ? normalizedHash.slice(1) : normalizedHash;
  const qIndex = body.indexOf("?");
  const hashPath = (qIndex >= 0 ? body.slice(0, qIndex) : body) || "/";
  const hashQuery = qIndex >= 0 ? body.slice(qIndex + 1) : "";

  const searchParams = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(hashQuery);
  const mockId = searchParams.get("mockId") || hashParams.get("mockId");

  if (mockId) {
    searchParams.set("mockId", mockId);
    try {
      sessionStorage.setItem(MOCK_USER_KEY, mockId);
    } catch {
      // Ignore storage errors.
    }
  }

  const path = hashPath.startsWith("/") ? hashPath : `/${hashPath}`;
  const nextSearch = searchParams.toString();
  replaceLocation(
    `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ""}#${path}`
  );
}

/** @deprecated Use normalizeLaunchUrl() */
export function normalizeHashRoute(): void {
  normalizeLaunchUrl();
}

export function isRealTelegram(): boolean {
  const initData = (window as unknown as { Telegram?: { WebApp?: { initData?: string } } })
    .Telegram?.WebApp?.initData;
  if (typeof initData === "string" && initData.length > 0) return true;

  const hash = window.location.hash || "";
  const search = window.location.search || "";
  return isTelegramLaunchHash(hash.startsWith("#") ? hash.slice(1) : hash) ||
    search.includes("tgWebAppData=") ||
    search.includes("tgWebAppVersion=");
}

/** Call before mocking Telegram env so dev vs real Telegram is detected correctly. */
export function markRealTelegramAtLoad(): void {
  realTelegramAtLoad = isRealTelegram();
}

export function hadRealTelegramAtLoad(): boolean {
  return realTelegramAtLoad;
}

/** Telegram initData requires numeric `user.id`. App `profiles.id` stays the string mockId. */
export function toTelegramNumericId(appUserId: string): number {
  const parsed = Number(appUserId);
  if (Number.isSafeInteger(parsed) && parsed !== 0) return parsed;

  let hash = 2166136261;
  for (let i = 0; i < appUserId.length; i += 1) {
    hash ^= appUserId.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % 1_000_000_000 || 1;
}

/**
 * Per-tab dev user id for browser testing (sessionStorage).
 * Each tab gets its own id — useful for 2-tab multiplayer on local DB.
 */
export function getOrCreateDevUserId(): string {
  try {
    const existing = sessionStorage.getItem(DEV_USER_KEY);
    if (existing) return existing;

    const id = `dev_${Math.random().toString(36).slice(2, 10)}`;
    sessionStorage.setItem(DEV_USER_KEY, id);
    return id;
  } catch {
    return `dev_${Date.now()}`;
  }
}

export function isDevUserMode(): boolean {
  if (resolveMockUserId()) return true;
  return import.meta.env.DEV && !hadRealTelegramAtLoad();
}

type TelegramUserLike = {
  id: number | string;
  username?: string;
  first_name?: string;
  last_name?: string;
  firstName?: string;
  lastName?: string;
  photo_url?: string;
  photoUrl?: string;
};

export function getTelegramUser(): TelegramUserLike | undefined {
  return initDataUser() as TelegramUserLike | undefined;
}

export function telegramDisplayName(id: string, user = getTelegramUser()) {
  if (!user) return `Player_${id}`;
  if (user.username) return user.username;
  const first = user.first_name || user.firstName;
  const last = user.last_name || user.lastName;
  return [first, last].filter(Boolean).join(" ") || `Player_${id}`;
}

export function telegramAvatarUrl(user = getTelegramUser()) {
  return user?.photo_url || user?.photoUrl || "";
}

/**
 * App user id for `profiles.id` (text).
 * Priority: URL/session mockId → real Telegram initData → per-tab dev id (browser) → guest.
 */
export const getAppUserId = async (): Promise<string> => {
  try {
    const mockId = resolveMockUserId();
    if (mockId) {
      console.info(`[Battleship] Mock user id: ${mockId}`);
      return mockId;
    }

    if (hadRealTelegramAtLoad()) {
      const user = getTelegramUser();
      if (user?.id) return String(user.id);
    }

    if (import.meta.env.DEV) {
      const devId = getOrCreateDevUserId();
      console.info(`[Battleship] Dev user id: ${devId}`);
      return devId;
    }

    const user = getTelegramUser();
    if (user?.id) return String(user.id);

    return "guest_user";
  } catch (error) {
    console.error("Error getting User Info:", error);
    return import.meta.env.DEV ? getOrCreateDevUserId() : "guest_user";
  }
};

export const generateFakePlayers = (count: number): Profile[] => {
  const names = [
    "ADMIRAL_VNG",
    "CAPTAIN_X",
    "NAVIGATOR_88",
    "LT_KIM",
    "STRIKER_ALPHA",
    "RECON_EYE",
    "VULCAN_7",
    "SHADOW_OPS",
  ];

  return Array.from({ length: count }).map((_, index) => {
    const randomSeed = Math.random().toString(36).substring(2, 7);

    return {
      id: `fake-id-${randomSeed}-${index}`,
      username:
        names[Math.floor(Math.random() * names.length)] + "_" + (index + 1),
      avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${randomSeed}`,
    };
  }) as Profile[];
};
