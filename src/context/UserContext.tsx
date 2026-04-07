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
import { getUserInfo } from "zmp-sdk";

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
        const { userInfo } = await getUserInfo({});
        const id = await getAppUserId();

        const userData = {
          id: id || userInfo.id,
          name: id ? `Player_${id}` : userInfo.name,
          avatar: id ? "" : userInfo.avatar,
        };

        // Sync Supabase ngay tại đây
        await supabase.from("profiles").upsert(
          {
            id: userData.id,
            username: userData.name,
            avatar_url: userData.avatar,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id" }
        );

        setUser(userData);
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
