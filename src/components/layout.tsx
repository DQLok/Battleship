import { getSystemInfo, getUserInfo } from "zmp-sdk";
import {
  AnimationRoutes,
  App,
  Route,
  SnackbarProvider,
  ZMPRouter,
} from "zmp-ui";
import { AppProps } from "zmp-ui/app";
import CombatPage from "@/features/combat/CombatPage";
import HomePage from "@/features/home/HomePage";
import VictoryPage from "@/features/result/VictoryPage";
import MatchmakingPage from "@/features/matchmaking/MatchmakingPage";
import { useEffect } from "react";
import { supabase } from "@/api/supabaseClient";
import { LobbyPage } from "@/features/lobby/LobbyPage";

const Layout = () => {
  useEffect(() => {
    const syncUser = async () => {
      try {
        // 1. Lấy thông tin từ Zalo SDK
        const { userInfo } = await getUserInfo({});

        // 2. Thực hiện logic đồng bộ với Supabase
        const { data, error } = await supabase.from("profiles").upsert(
          {
            id: userInfo.id,
            username: userInfo.name,
            avatar_url: userInfo.avatar,
            updated_at: new Date(),
          },
          { onConflict: "id" }
        ); // upsert: Nếu có rồi thì update, chưa có thì insert

        if (error) console.error("Supabase Sync Error:", error.message);
        else console.log("User synced successfully");
      } catch (err) {
        console.error("Zalo SDK Error:", err);
      }
    };

    syncUser();
  }, []); // Chạy 1 lần duy nhất khi mở app
  return (
    <App theme={getSystemInfo().zaloTheme as AppProps["theme"]}>
      <SnackbarProvider>
        <ZMPRouter>
          <AnimationRoutes>
            {/* <Route path="/" element={<HomePage />}></Route> */}
            <Route path="/" element={<CombatPage />}></Route>
            <Route path="/home" element={<HomePage />}></Route>
            <Route path="/match" element={<MatchmakingPage />}></Route>
            <Route path="/combat" element={<CombatPage />}></Route>
            <Route path="/result" element={<VictoryPage />}></Route>
            <Route path="/lobby" element={<LobbyPage />}></Route>
          </AnimationRoutes>
        </ZMPRouter>
      </SnackbarProvider>
    </App>
  );
};
export default Layout;
