// src/features/combat/pages/CombatPage.tsx
import React, { useMemo, useState } from "react"; // Thêm useState để quản lý phase
import CombatHeader from "../../components/CombatHeader";
import GameGrid from "./components/GameGrid";
import CombatControls from "./components/CombatControls";
import ShipStatusHeader from "./components/ShipStatusHeader";
import { useCombatStore } from "@/hooks/useCombatStore";
import BottomNav from "@/components/BottomNav";
import { Box, Button, Header, Page, Text } from "zmp-ui";
import "@/css/children/CombatPage.scss";
import { ShipDock } from "./components/ShipDock";
import { showToast } from "zmp-sdk";

const CombatPage: React.FC = () => {
  // Lấy thêm các hàm bổ trợ từ store để setup trận đấu
  const {
    placedShips,
    draggingShip,
    toggleDraggingRotation,
    setBotFleet, // Sử dụng hàm này thay vì setEnemyShips thủ công
    setTurn,
  } = useCombatStore();

  const [inBattle, setInBattle] = useState(false);

  // Kiểm tra đủ 4 loại tàu (2, 3, 4, 5)
  const isReady = useMemo(() => placedShips.length === 4, [placedShips]);

  const handleStartBattle = () => {
    if (!isReady) {
      showToast({ message: "Vui lòng triển khai đủ hạm đội (4 tàu)!" });
      return;
    }

    // 1. Store tự tạo hạm đội ngẫu nhiên cho Bot và lưu vào enemyShips
    setBotFleet();

    // 2. Chuyển trạng thái sang chiến đấu
    setInBattle(true);

    // 3. Người chơi luôn đi trước
    setTurn(true);

    showToast({
      message: "Chiến dịch bắt đầu! Radar đối thủ đã được kích hoạt.",
    });
  };

  return (
    <Page
      className={`combat-page ${draggingShip ? "dragging-active" : ""}`}
      style={{
        overflow: draggingShip ? "hidden" : "auto",
        backgroundColor: "#061421",
      }}
    >
      <Header
        title={inBattle ? "GIAO TRANH" : "THIẾT LẬP HẠM ĐỘI"}
        showBackIcon={false}
        textColor="#22d3ee"
        backgroundColor="#061421"
      />

      <Box className="combat-main-content pb-32">
        <CombatHeader />

        {/* Lưới kẻ thù: Hiện rõ khi vào trận (Battle Mode) */}
        <Box
          className={`combat-section ${inBattle ? "" : "pointer-events-none"}`}
        >
          <GameGrid type="enemy" />
        </Box>

        {/* Ẩn Dock chọn tàu khi đã vào trận */}
        {!inBattle && (
          <Box
            className={`combat-section mt-4 transition-transform ${
              draggingShip ? "scale-95 opacity-30" : ""
            }`}
          >
            <ShipDock />
          </Box>
        )}

        {/* Khu vực Lưới của mình */}
        <Box className={`combat-section ${inBattle ? "mt-4" : "mt-6"}`}>
          <ShipStatusHeader />
          <div className="mt-4 relative flex justify-center">
            <GameGrid type="home" />

            {draggingShip && (
              <div className="absolute -top-12 left-0 right-0 flex justify-center z-50 animate-pulse">
                <div className="bg-cyan-500 text-[#061421] text-[9px] font-black px-4 py-1.5 rounded-full shadow-[0_0_15px_#22d3ee] uppercase">
                  Di chuyển để triển khai
                </div>
              </div>
            )}
          </div>
        </Box>

        {/* Nút xoay chỉ hiện khi đang setup */}
        {!inBattle && draggingShip && (
          <Box className="fixed bottom-24 left-0 right-0 flex justify-center z-50 px-6">
            <Button
              fullWidth
              className="bg-cyan-900/40 border border-cyan-400 text-cyan-400 font-bold h-12 backdrop-blur-md"
              onClick={(e) => {
                e.stopPropagation();
                toggleDraggingRotation();
              }}
            >
              XOAY HƯỚNG TÀU (ROTATE)
            </Button>
          </Box>
        )}

        {/* Điều khiển & Nút Start/Surrender */}
        <Box
          className={`px-4 mt-10 transition-opacity ${
            draggingShip ? "opacity-0" : "opacity-100"
          }`}
        >
          {!inBattle && <CombatControls />}

          <div className="mt-8">
            {!inBattle ? (
              isReady ? (
                <Button
                  fullWidth
                  className="btn-ready-start h-14 bg-cyan-500 text-[#061421] font-black italic shadow-[0_0_20px_rgba(34,211,238,0.5)] active:scale-95 transition-transform"
                  onClick={handleStartBattle}
                >
                  KHỞI CHẠY CHIẾN DỊCH
                </Button>
              ) : (
                <div className="text-center p-4 border-2 border-dashed border-cyan-900/50 bg-[#0a1a29] rounded-lg">
                  <Text className="text-cyan-700 text-[10px] uppercase font-bold tracking-widest leading-loose">
                    Chỉ huy hãy triển khai <br />
                    đủ quân số ({placedShips.length}/4)
                  </Text>
                </div>
              )
            ) : (
              <Button
                fullWidth
                variant="secondary"
                className="mt-4 border-red-900/20 text-red-900 opacity-40 hover:opacity-100 text-[9px] font-bold tracking-widest"
                onClick={() => window.location.reload()} // Tạm thời reload để reset
              >
                RÚT QUÂN (SURRENDER)
              </Button>
            )}
          </div>
        </Box>
      </Box>

      <BottomNav />
    </Page>
  );
};

export default CombatPage;
