import { HashRouter, Route, Routes } from "react-router-dom";
import { SnackbarProvider } from "@/ui";
import { UserProvider, useUser } from "@/context/UserContext";

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

export const Layout = () => (
  <HashRouter>
    <UserProvider>
      <AppContent />
    </UserProvider>
  </HashRouter>
);

export default Layout;
