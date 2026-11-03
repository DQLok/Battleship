/**
 * Facebook Instant Games bootstrap.
 * SDK script is loaded from index.html and only exists inside Facebook or Messenger.
 */

interface FBInstantPlayer {
  getID(): string | null;
}

interface FBInstantSDK {
  initializeAsync(): Promise<void>;
  setLoadingProgress(progress: number): void;
  startGameAsync(): Promise<void>;
  player: FBInstantPlayer;
}

declare global {
  interface Window {
    FBInstant?: FBInstantSDK;
  }
}

let metaPlayerId: string | null = null;

export function getMetaPlayerId(): string | null {
  return metaPlayerId;
}

function isLocalHost(): boolean {
  const host = window.location.hostname;
  return host === "localhost" || host === "127.0.0.1" || host === "[::1]";
}

/**
 * Run initialize → loading progress → startGame before any gameplay UI.
 * The SDK script still creates `FBInstant` in a normal browser, but
 * `initializeAsync()` never settles outside Facebook or Messenger.
 */
export async function startInstantGame(): Promise<void> {
  const sdk = window.FBInstant;
  if (!sdk || isLocalHost()) {
    return;
  }

  const settled = await Promise.race([
    sdk
      .initializeAsync()
      .then(() => "ok" as const)
      .catch(() => "fail" as const),
    new Promise<"timeout">((resolve) => {
      window.setTimeout(() => resolve("timeout"), 4000);
    }),
  ]);

  if (settled !== "ok") {
    console.warn("Instant Games SDK did not initialize:", settled);
    return;
  }

  // Entry bundle is already executing; nothing else is fetched before start.
  sdk.setLoadingProgress(100);
  await sdk.startGameAsync();
  metaPlayerId = sdk.player.getID();
}
