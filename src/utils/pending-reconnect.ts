const PENDING_RECONNECT_KEY = "battleship_pending_reconnect";

export type PendingReconnect = {
  gameId: string;
  roomCode: string;
  until: string;
};

export function savePendingReconnect(session: PendingReconnect): void {
  try {
    sessionStorage.setItem(PENDING_RECONNECT_KEY, JSON.stringify(session));
  } catch {
    // Ignore storage errors.
  }
}

export function loadPendingReconnect(): PendingReconnect | null {
  try {
    const raw = sessionStorage.getItem(PENDING_RECONNECT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingReconnect;
    if (!parsed?.gameId || !parsed?.until) return null;
    if (new Date(parsed.until).getTime() <= Date.now()) {
      clearPendingReconnect();
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearPendingReconnect(): void {
  try {
    sessionStorage.removeItem(PENDING_RECONNECT_KEY);
  } catch {
    // Ignore storage errors.
  }
}

export function pendingReconnectSecondsLeft(pending: PendingReconnect): number {
  return Math.max(
    0,
    Math.ceil((new Date(pending.until).getTime() - Date.now()) / 1000)
  );
}

/** Re-export fallback for callers that still need a constant name. */
export { RECONNECT_GRACE_SECONDS } from "@/constants/game-lifecycle";
