/**
 * Fallback defaults for schedule `game_lifecycle`.
 * Used when DB fetch fails or before settings are loaded.
 * Time keys: seconds. `max_members_1vs1`: count.
 *
 * Status TTLs (no `updated_at` change → delete game + cascade match_results):
 * - waiting / setup / playing: 2 days
 * - finished: 7 days
 * - games_ttl: ~1 month catch-all (any status)
 */
export const GAME_LIFECYCLE_DEFAULTS = {
  reconnect_grace: 30,
  presence_away: 20,
  waiting_ttl: 172800,
  setup_ttl: 172800,
  playing_ttl: 172800,
  finished_ttl: 604800,
  /** ~30 days — mọi status nếu không update */
  games_ttl: 2592000,
  max_members_1vs1: 2,
} as const;

export type GameLifecycleKey = keyof typeof GAME_LIFECYCLE_DEFAULTS;

export type GameLifecycleSettings = {
  [K in GameLifecycleKey]: number;
};

/** @deprecated Prefer useGameLifecycle().settings.reconnect_grace */
export const RECONNECT_GRACE_SECONDS = GAME_LIFECYCLE_DEFAULTS.reconnect_grace;
