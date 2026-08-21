/**
 * Fallback defaults for schedule `game_lifecycle`.
 * Used when DB fetch fails or before settings are loaded.
 * Time keys: seconds. `max_members_1vs1`: count.
 */
export const GAME_LIFECYCLE_DEFAULTS = {
  reconnect_grace: 30,
  presence_away: 20,
  waiting_ttl: 86400,
  setup_ttl: 21600,
  finished_guest_ttl: 86400,
  max_members_1vs1: 2,
} as const;

export type GameLifecycleKey = keyof typeof GAME_LIFECYCLE_DEFAULTS;

export type GameLifecycleSettings = {
  [K in GameLifecycleKey]: number;
};

/** @deprecated Prefer useGameLifecycle().settings.reconnect_grace */
export const RECONNECT_GRACE_SECONDS = GAME_LIFECYCLE_DEFAULTS.reconnect_grace;
