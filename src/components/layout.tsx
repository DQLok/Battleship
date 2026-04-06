import React from "react";
import { getSystemInfo } from "zmp-sdk";
import { AnimationRoutes, App, Route, SnackbarProvider, ZMPRouter } from "zmp-ui";
import { AppProps } from "zmp-ui/app";
import { UserProvider, useUser } from "@/context/UserContext"; // Import cả 2

// Các màn hình của bạn
import CombatPage from "@/features/combat/CombatPage";
import HomePage from "@/features/home/HomePage";
import VictoryPage from "@/features/result/VictoryPage";
import MatchmakingPage from "@/features/matchmaking/MatchmakingPage";
import { LobbyPage } from "@/features/lobby/LobbyPage";
import MainLayout from "./MainLayout";
import { WaitingRoom } from "@/features/lobby/WaitingRoom";

const AppContent = () => {
  const { loading } = useUser();

  if (loading) {
    // Style này giúp màn hình loading khớp với phong cách Cyberpunk của bạn
    return (
      <div style={{
        background: '#061421', 
        height: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        color: '#22d3ee',
        fontFamily: 'monospace'
      }}>
        LOADING COMMANDER...
      </div>
    );
  }

  return (
    <App theme={getSystemInfo().zaloTheme as AppProps["theme"]}>
      <SnackbarProvider>
        <ZMPRouter>
          <AnimationRoutes>
            <Route element={<MainLayout />}>              
              <Route path="/" element={<HomePage />} />
              <Route path="/combat" element={<CombatPage />} />
              <Route path="/match" element={<MatchmakingPage />} />
              <Route path="/lobby" element={<LobbyPage />} />
            </Route>
            <Route path="/result" element={<VictoryPage />} />
            <Route path="/waiting" element={<WaitingRoom />} />
          </AnimationRoutes>
        </ZMPRouter>
      </SnackbarProvider>
    </App>
  );
};

export const Layout = () => (
  <UserProvider>
    <AppContent />
  </UserProvider>
);

export default Layout;