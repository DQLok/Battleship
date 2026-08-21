import { useEffect } from "react";
import { AppRoot } from "@telegram-apps/telegram-ui";
import { backButton, retrieveLaunchParams } from "@telegram-apps/sdk-react";
import { HashRouter, Route, Routes, useLocation } from "react-router-dom";
import { SnackbarProvider } from "zmp-ui";
import { UserProvider, useUser } from "@/context/UserContext";
import { GameLifecycleProvider } from "@/context/GameLifecycleContext";

import CombatPage from "@/features/combat/CombatPage";
import HomePage from "@/features/home/HomePage";
import VictoryPage from "@/features/result/VictoryPage";
import MatchmakingPage from "@/features/matchmaking/MatchmakingPage";
import { LobbyPage } from "@/features/lobby/LobbyPage";
import MainLayout from "./MainLayout";
import { WaitingRoom } from "@/features/lobby/WaitingRoom";

function TelegramBackButton() {
  const location = useLocation();

  useEffect(() => {
    if (location.pathname === "/") {
      backButton.hide.ifAvailable();
    } else {
      backButton.show.ifAvailable();
    }

    const result = backButton.onClick.ifAvailable(() => {
      window.history.back();
    });

    return () => {
      if (result[0]) result[1]();
    };
  }, [location.pathname]);

  return null;
}

const AppContent = () => {
  const { loading } = useUser();

  if (loading) {
    return (
      <div
        style={{
          background: "#061421",
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#22d3ee",
          fontFamily: "monospace",
        }}
      >
        LOADING COMMANDER...
      </div>
    );
  }

  return (
    <SnackbarProvider>
      <TelegramBackButton />
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/combat" element={<CombatPage />} />
          <Route path="/match" element={<MatchmakingPage />} />
          <Route path="/lobby" element={<LobbyPage />} />
        </Route>
        <Route path="/result" element={<VictoryPage />} />
        <Route path="/waiting" element={<WaitingRoom />} />
      </Routes>
    </SnackbarProvider>
  );
};

function telegramPlatform(): "ios" | "base" {
  try {
    const { tgWebAppPlatform } = retrieveLaunchParams();
    return tgWebAppPlatform === "ios" || tgWebAppPlatform === "macos"
      ? "ios"
      : "base";
  } catch {
    return "base";
  }
}

export const Layout = () => (
  <AppRoot appearance="dark" platform={telegramPlatform()} className="h-full">
    <UserProvider>
      <GameLifecycleProvider>
        <HashRouter>
          <AppContent />
        </HashRouter>
      </GameLifecycleProvider>
    </UserProvider>
  </AppRoot>
);

export default Layout;
