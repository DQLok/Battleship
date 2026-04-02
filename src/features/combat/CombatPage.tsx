// src/features/combat/pages/CombatPage.tsx
import React, { useEffect, useMemo } from "react";
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
  const { placedShips, draggingShip, toggleDraggingRotation } =
    useCombatStore();

  // useEffect(() => {
  //   // Luôn đảm bảo turn được set đúng khi vào trang setup
  //   setTurn(true);
  // }, [setTurn]);

  // Kiểm tra số lượng tàu (giả định bạn có 4 loại tàu khác nhau)
  const isReady = useMemo(() => placedShips.length === 4, [placedShips]);

  const handleStartBattle = () => {
    if (!isReady) {
      showToast({
        message: "Vui lòng đặt đủ hạm đội (4 tàu)!",
      });
      return;
    }
    // Chuyển sang phase chiến đấu
    console.log("Battle Started");
  };

  return (
    <Page
      className={`combat-page ${draggingShip ? "dragging-active" : ""}`}
      // CSS inline để khóa scroll Page khi đang kéo tàu trên Grid
      style={{
        overflow: draggingShip ? "hidden" : "auto",
        height: "100vh",
      }}
    >
      <Header
        title="THIẾT LẬP HẠM ĐỘI"
        showBackIcon={false}
        textColor="#22d3ee"
        backgroundColor="#061421"
      />

      <Box className="combat-main-content pb-32">
        <CombatHeader />

        {/* Lưới kẻ thù: Làm mờ cực mạnh khi đang setup để tránh nhầm lẫn */}
        <Box
          className={`combat-section transition-all duration-300 ${
            draggingShip
              ? "opacity-10 blur-sm pointer-events-none"
              : "opacity-100"
          }`}
        >
          <Text className="text-cyan-900 uppercase text-[9px] mb-2 font-bold tracking-[0.3em] px-4">
            Radar Enemy Area (Locked)
          </Text>
          <GameGrid type="enemy" />
        </Box>

        {/* Dock chọn tàu: Nằm trên Grid nhà để dễ kéo lên */}
        <Box
          className={`combat-section mt-4 transition-transform ${
            draggingShip ? "scale-95 opacity-30" : ""
          }`}
        >
          <ShipDock />
        </Box>

        {/* Khu vực Lưới của mình: Vùng tương tác chính */}
        <Box className="combat-section mt-6">
          <ShipStatusHeader />
          <div className="mt-4 relative flex justify-center">
            {/* Component GameGrid đã tích hợp logic handleTouchMove trong Store */}
            <GameGrid type="home" />

            {/* Hướng dẫn động: Chỉ hiện khi đang cầm tàu */}
            {draggingShip && (
              <div className="absolute -top-12 left-0 right-0 flex justify-center z-50 animate-pulse">
                <div className="bg-cyan-500 text-[#061421] text-[9px] font-black px-4 py-1.5 rounded-full shadow-[0_0_15px_#22d3ee] uppercase">
                  Di chuyển đến ô trống để triển khai
                </div>
              </div>
            )}
          </div>
        </Box>

        {/* Action Bar phụ khi đang kéo */}
        {draggingShip && (
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

        <Box
          className={`px-4 mt-10 transition-opacity ${
            draggingShip ? "opacity-0" : "opacity-100"
          }`}
        >
          <CombatControls />

          <div className="mt-8">
            {isReady ? (
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
            )}

            <Button
              fullWidth
              variant="secondary"
              className="mt-4 border-red-900/20 text-red-900 opacity-40 hover:opacity-100 text-[9px] font-bold tracking-widest"
            >
              RÚT QUÂN (SURRENDER)
            </Button>
          </div>
        </Box>
      </Box>

      <BottomNav />
    </Page>
  );
};

export default CombatPage;
