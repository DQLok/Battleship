import { supabase } from "@/api/supabaseClient";
import { Profile } from "@/types/supabase/Profile";
import { getAppUserId } from "@/utils/user-info";
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

// src/context/UserContext.tsx
export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initUser = async () => {
      try {
        const id = await getAppUserId();
        const now = new Date().toISOString();
        const userData = {
          id,
          username: `Player_${id}`,
          avatar_url: "",
          wins: 0,
          total_games: 0,
          created_at: now,
          updated_at: now,
        };

        const { data, error } = await supabase
          .from("profiles")
          .upsert(
            {
              id: userData.id,
              username: userData.username,
              avatar_url: userData.avatar_url,
              updated_at: now,
            },
            { onConflict: "id" }
          )
          .select()
          .single();

        if (error) {
          console.error("Profile sync failed:", error);
        }

        setUser(data ?? userData);
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
