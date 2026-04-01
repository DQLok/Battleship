import React, { useEffect } from "react";
import CombatHeader from "../../components/CombatHeader";
import GameGrid from "./components/GameGrid";
import CombatControls from "./components/CombatControls";
import ShipStatusHeader from "./components/ShipStatusHeader";
import { useCombatStore } from "@/hooks/useCombatStore"; // Đảm bảo import đúng
import BottomNav from "@/components/BottomNav";
import { Box, Button, Header, Page, Text } from "zmp-ui";
import "@/css/children/CombatPage.scss";

const CombatPage: React.FC = () => {
  const { randomizeShips, setTurn } = useCombatStore();

  useEffect(() => {
    randomizeShips();
    setTurn(true);
  }, []);

  return (
    <Page className="combat-page" hideScrollbar>
      <Header
        title="Combat"
        showBackIcon={false}
        textColor="var(--text)"
        backgroundColor="var(--bg)"
      />

      <Box className="combat-main-content">
        <CombatHeader />

        <Box className="combat-section">
          <Text bold size="large" style={{ color: "var(--text)" }}>
            Enemy Formation
          </Text>
          <GameGrid type="enemy" />
        </Box>

        <Box className="combat-section">
          <CombatControls />
        </Box>

        <Box className="combat-section">
          <ShipStatusHeader />
          <GameGrid type="home" />
        </Box>

        <Box className="combat-section">
          <Button fullWidth className="btn-withdraw">
            RÚT LUI (WITHDRAW)
          </Button>
        </Box>
      </Box>

      <BottomNav />
    </Page>
  );
};

export default CombatPage;
