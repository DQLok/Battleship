import { supabase } from "@/api/supabaseClient";
import { Profile } from "@/types/supabase/Profile";
import {
  getAppUserId,
  getTelegramUser,
  telegramAvatarUrl,
  telegramDisplayName,
} from "@/utils/user-info";
import {
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

interface UserContextType {
  user: Profile | null;
  loading: boolean;
}

const UserContext = createContext<UserContextType>({
  user: null,
  loading: true,
});

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initUser = async () => {
      try {
        const id = await getAppUserId();
        const tgUser = getTelegramUser();
        const isMocked = Boolean(
          new URLSearchParams(window.location.search).get("mockId") ||
            new URLSearchParams(window.location.hash.split("?")[1] || "").get("mockId")
        );

        const userData = {
          id,
          username: isMocked ? `Player_${id}` : telegramDisplayName(id, tgUser),
          avatar_url: isMocked ? "" : telegramAvatarUrl(tgUser),
        };

        const { data, error } = await supabase
          .from("profiles")
          .upsert(
            {
              id: userData.id,
              username: userData.username,
              avatar_url: userData.avatar_url,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "id" }
          )
          .select()
          .single();

        if (error || !data) {
          console.error(error);
          setUser({
            id: userData.id,
            username: userData.username,
            avatar_url: userData.avatar_url,
            wins: 0,
            total_games: 0,
            updated_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
          });
          return;
        }

        setUser(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    initUser();
  }, []);

  return (
    <UserContext.Provider value={{ user, loading }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
