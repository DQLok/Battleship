import { supabase } from "@/api/supabaseClient";
import { Profile } from "@/types/supabase/Profile";
import {
  canPersistTelegramUser,
  guestProfileFromSession,
  getTelegramId,
  getTelegramUser,
  loadGuestSession,
  telegramPublicProfile,
} from "@/utils/user-info";

export type SessionUser = {
  profile: Profile;
  role: "user" | "guest";
};

async function findByTelegramId(telegramId: string) {
  return supabase
    .from("profiles")
    .select("*")
    .eq("telegram_id", telegramId)
    .maybeSingle();
}

/**
 * Telegram Mini App with a real user id → persist/lookup `profiles`.
 * Web / missing telegram_id → guest in localStorage only (no DB row).
 */
export async function ensureSession(): Promise<SessionUser> {
  if (!canPersistTelegramUser()) {
    const guest = loadGuestSession();
    return { profile: guestProfileFromSession(guest), role: "guest" };
  }

  const telegramId = getTelegramId()!;
  const tgUser = getTelegramUser();
  const fields = telegramPublicProfile(telegramId, tgUser);
  const now = new Date().toISOString();
  const publicFields = {
    username: fields.username,
    avatar_url: fields.avatar_url,
    first_name: fields.first_name ?? null,
    last_name: fields.last_name ?? null,
    telegram_username: fields.telegram_username ?? null,
    language_code: fields.language_code ?? null,
    is_premium: fields.is_premium ?? null,
    allows_write_to_pm: fields.allows_write_to_pm ?? null,
  };

  const { data: existing } = await findByTelegramId(telegramId);
  if (existing) {
    const { data: updated, error } = await supabase
      .from("profiles")
      .update({ ...publicFields, telegram_id: telegramId, updated_at: now })
      .eq("telegram_id", telegramId)
      .select()
      .single();
    if (error) {
      console.error(error);
      return { profile: existing as Profile, role: "user" };
    }
    return { profile: (updated || existing) as Profile, role: "user" };
  }

  const insertRow = {
    id: telegramId,
    telegram_id: telegramId,
    ...publicFields,
    updated_at: now,
  };

  const { data: created, error: insertError } = await supabase
    .from("profiles")
    .insert(insertRow)
    .select()
    .single();

  if (!insertError && created) return { profile: created as Profile, role: "user" };

  const { data: raced } = await findByTelegramId(telegramId);
  if (raced) return { profile: raced as Profile, role: "user" };

  console.error(insertError);
  return {
    profile: {
      ...insertRow,
      wins: 0,
      total_games: 0,
      created_at: now,
    } as Profile,
    role: "user",
  };
}
