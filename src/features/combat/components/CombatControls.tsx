import React from "react";
import { useCombatStore } from "@/hooks/useCombatStore";
import { Button, Box, Icon } from "zmp-ui";

const CombatControls: React.FC = () => {
  const { autoPlaceShips, resetShips, placedShips } = useCombatStore();

  return (
    <Box className="flex gap-3 mt-4">
      <Button
        fullWidth
        variant="secondary"
        size="small"
        className="border-cyan-500/30 text-cyan-500 bg-cyan-500/5 font-bold uppercase text-[10px] tracking-wider"
        onClick={autoPlaceShips}
      >
        <div className="flex items-center gap-2">
          <span>TỰ ĐỘNG DÀN TRẬN</span>
        </div>
      </Button>

      <Button
        size="small"
        className="bg-red-900/20 border border-red-500/30 text-red-500 px-4"
        onClick={resetShips}
      >
        <span className="text-[10px] font-bold">RESET</span>
      </Button>
    </Box>
  );
};

export default CombatControls;