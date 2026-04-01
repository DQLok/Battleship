import { getSystemInfo } from "zmp-sdk";
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

const Layout = () => {
  return (
    <App theme={getSystemInfo().zaloTheme as AppProps["theme"]}>
      <SnackbarProvider>
        <ZMPRouter>
          <AnimationRoutes>
            {/* <Route path="/" element={<HomePage />}></Route> */}
            <Route path="/" element={<CombatPage/>}></Route>
            <Route path="/home" element={<HomePage/>}></Route>
            <Route path="/match" element={<MatchmakingPage/>}></Route>
            <Route path="/combat" element={<CombatPage/>}></Route>
            <Route path="/result" element={<VictoryPage/>}></Route>
          </AnimationRoutes>
        </ZMPRouter>
      </SnackbarProvider>
    </App>
  );
};
export default Layout;
