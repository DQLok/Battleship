import { getMetaPlayerId } from "@/meta/instant";
import { Profile } from "@/types/supabase/Profile";

const LOCAL_PLAYER_KEY = "battleship_local_player";

function localPlayerId(): string {
  const existing = sessionStorage.getItem(LOCAL_PLAYER_KEY);
  if (existing) return existing;
  const id = `local_${Math.random().toString(36).slice(2, 10)}`;
  sessionStorage.setItem(LOCAL_PLAYER_KEY, id);
  return id;
}

/**
 * Player id written to the same profile/game columns.
 * Meta: FBInstant.player.getID() after startGameAsync.
 * Browser: ?mockId= or a per-tab local id.
 */
export const getAppUserId = async (): Promise<string> => {
  const mockId = new URLSearchParams(window.location.search).get("mockId");
  if (mockId) return mockId;

  return getMetaPlayerId() || localPlayerId();
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
    // Tạo một chuỗi ngẫu nhiên làm seed (ví dụ: "a1b2c3")
    const randomSeed = Math.random().toString(36).substring(2, 7);

    return {
      id: `fake-id-${randomSeed}-${index}`,
      username:
        names[Math.floor(Math.random() * names.length)] + "_" + (index + 1),
      // Truyền randomSeed vào đây để DiceBear tự vẽ hình mới
      avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${randomSeed}`,
    };
  }) as Profile[];
};
