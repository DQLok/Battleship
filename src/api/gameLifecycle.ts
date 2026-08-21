import { supabase } from "@/api/supabaseClient";
import {
  GAME_LIFECYCLE_DEFAULTS,
  type GameLifecycleKey,
  type GameLifecycleSettings,
} from "@/constants/game-lifecycle";

function isLifecycleKey(key: string): key is GameLifecycleKey {
  return key in GAME_LIFECYCLE_DEFAULTS;
}

/** Load all rows from `game_lifecycle`; missing/failed → constants fallback. */
export async function fetchGameLifecycleSettings(): Promise<GameLifecycleSettings> {
  const fallback: GameLifecycleSettings = { ...GAME_LIFECYCLE_DEFAULTS };

  try {
    const { data, error } = await supabase
      .from("game_lifecycle")
      .select("key, value");

    if (error || !data?.length) {
      if (error) {
        console.warn(
          "[game_lifecycle] fetch failed, using defaults:",
          error.message
        );
      }
      return fallback;
    }

    const next = { ...fallback };
    for (const row of data) {
      const key = String(row.key ?? "");
      if (!isLifecycleKey(key)) continue;
      const n = Number(row.value);
      if (Number.isFinite(n)) next[key] = n;
    }
    return next;
  } catch (e) {
    console.warn("[game_lifecycle] fetch error, using defaults:", e);
    return fallback;
  }
}
