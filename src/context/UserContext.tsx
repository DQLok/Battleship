import { Profile } from "@/types/supabase/Profile";
import { ensureSession } from "@/api/ensureProfile";
import {
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

interface UserContextType {
  user: Profile | null;
  role: "user" | "guest";
  isGuest: boolean;
  loading: boolean;
}

const UserContext = createContext<UserContextType>({
  user: null,
  role: "guest",
  isGuest: true,
  loading: true,
});

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<Profile | null>(null);
  const [role, setRole] = useState<"user" | "guest">("guest");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initUser = async () => {
      try {
        const session = await ensureSession();
        setUser(session.profile);
        setRole(session.role);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    initUser();
  }, []);

  return (
    <UserContext.Provider
      value={{ user, role, isGuest: role === "guest", loading }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
