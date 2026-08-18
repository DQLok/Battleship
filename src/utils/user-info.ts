import { Profile } from "@/types/supabase/Profile";
import { initDataUser } from "@telegram-apps/sdk-react";

function readMockId(): string | null {
  const query = new URLSearchParams(window.location.search);
  const hashQuery = new URLSearchParams(window.location.hash.split("?")[1] || "");
  return query.get("mockId") || hashQuery.get("mockId");
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
 * User ID from URL mock (two-tab testing) or Telegram initData.
 */
export const getAppUserId = async (): Promise<string> => {
  try {
    const mockId = readMockId();
    if (mockId) return mockId;

    const user = getTelegramUser();
    if (user?.id) return String(user.id);

    return "guest_user";
  } catch (error) {
    console.error("Error getting User Info:", error);
    return "guest_user";
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
