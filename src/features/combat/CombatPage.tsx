import React, { useEffect, useMemo, useState } from "react";
import { Box, Button, Header, Modal, Page, Text, useLocation, useSnackbar } from "zmp-ui";
import { supabase } from "@/api/supabaseClient";
import { useUser } from "@/context/UserContext";
import { useCombatStore } from "@/hooks/useCombatStore";
import { useSupabase } from "@/hooks/useSupabase";

// Components
import CombatHeader from "../../components/CombatHeader";
import GameGrid from "./components/GameGrid";
import ShipStatusHeader from "./components/ShipStatusHeader";
import BottomNav from "@/components/BottomNav";
import { ShipDock } from "./components/ShipDock";

import "@/css/children/CombatPage.scss";

const CombatPage: React.FC = () => {
  const { user } = useUser();
  const { state } = useLocation();
  const { saveShipLayout, finishGame, isFinishing } = useSupabase();
  const { openSnackbar } = useSnackbar();

  const {
    placedShips,
    draggingShip,
    enemyShips,
    winner,
    setEnemyShips,
    setTurn,
    turn,
    autoPlaceShips,
    recordMove,
    resetShips,
  } = useCombatStore();

  const [inBattle, setInBattle] = useState(false);
  const [isReadySent, setIsReadySent] = useState(false);

  const gameId = state?.gameId || "ROOM_TEST_01";
  const opponentId = state?.opponentId;
  const isReadyToStart = useMemo(() => placedShips.length === 4, [placedShips]);

  useEffect(() => {
    if (!gameId || !user) return;

    // --- CHANNEL 1: CHUYÊN XỬ LÝ LƯỢT BẮN (MOVES) ---
    const moveChannel = supabase
      .channel(`moves_${gameId}`) // Tên channel khác đi một chút
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "moves",
          filter: `game_id=eq.${gameId}`,
        },
        (payload) => {
          recordMove(
            payload.new.user_id,
            payload.new.x,
            payload.new.y,
            payload.new.is_hit,
            user.id,
            payload.new.sunk_ship_name
          );
        }
      )
      .subscribe();

    // --- CHANNEL 2: CHUYÊN XỬ LÝ TRẠNG THÁI SẴN SÀNG (BOARDS) ---
    const boardChannel = supabase
      .channel(`boards_${gameId}`) // Tên channel khác
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "game_boards",
          filter: `game_id=eq.${gameId}`,
        },
        (payload) => {
          console.log("⚓ Board Event:", payload.new);
          if (payload.new.user_id !== user.id && payload.new.is_ready) {
            setEnemyShips(payload.new.ships_data);
            // Kiểm tra trực tiếp từ store để tránh closure cũ
            const currentPlacedShips = useCombatStore.getState().placedShips;
            if (currentPlacedShips.length === 4) {
              setInBattle(true);
              setTurn(true);
              openSnackbar({ text: "ĐỐI THỦ ĐÃ SẴN SÀNG! CHIẾN!" });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(moveChannel);
      supabase.removeChannel(boardChannel);
    };
  }, [gameId, user?.id]); // Chỉ phụ thuộc vào ID cơ bản

  // --- 2. LOGIC KẾT THÚC & DỌN DẸP DỮ LIỆU ---
  //Thêm useEffect này bên dưới cái Realtime của bạn
  useEffect(() => {
    const handleCleanUp = async () => {
      if (winner && gameId && !isFinishing) {
        // Winner ID: Nếu mình thắng thì là user.id, nếu địch thắng thì là opponentId
        const winnerId = winner === "player" ? user?.id : opponentId;

        if (winnerId) {
          console.log(
            "🛠️ Đang dọn dẹp dữ liệu trận đấu và cập nhật Profile..."
          );
          await finishGame(gameId, winnerId);
        }
      }
    };

    handleCleanUp();
  }, [winner, gameId]);

  // --- 3. LOGIC BẮN ---
  const handleAttackEnemy = async (x: number, y: number) => {
    if (!inBattle || !turn || !user || isFinishing) return;

    const { error } = await supabase.from("moves").insert({
      game_id: gameId,
      user_id: user.id,
      x,
      y,
    });

    if (error) openSnackbar({ text: "Pháo kích thất bại!" });
  };

  // --- 4. KHỞI CHẠY CHIẾN DỊCH ---
  const handleStartBattle = async () => {
    if (!isReadyToStart || !user) return;

    const { error } = await saveShipLayout(gameId, user.id, placedShips);
    if (error) {
      openSnackbar({ text: "Lỗi kết nối vệ tinh!" });
      return;
    }

    setIsReadySent(true);

    const { data: opponent } = await supabase
      .from("game_boards")
      .select("ships_data, is_ready")
      .eq("game_id", gameId)
      .neq("user_id", user.id)
      .maybeSingle();

    if (opponent?.is_ready) {
      setEnemyShips(opponent.ships_data);
      setInBattle(true);
      setTurn(true);
      openSnackbar({ text: "CHIẾN DỊCH BẮT ĐẦU!" });
    } else {
      openSnackbar({ text: "Đang đợi đối thủ dàn trận..." });
    }
  };

  const handleEndSession = () => {
    resetShips(); // Clear zustand
    window.location.reload(); // Hoặc navigate về Home
  };

  return (
    <Page
      className={`combat-page ${draggingShip ? "dragging-active" : ""}`}
      style={{ backgroundColor: "#061421" }}
      hideScrollbar
    >
      <Header
        title={inBattle ? "GIAO TRANH THỰC TẾ" : "THIẾT LẬP HẠM ĐỘI"}
        showBackIcon={false}
        textColor="#22d3ee"
        backgroundColor="#061421"
      />

      <Box className="combat-main-content pb-32">
        <Box className="flex items-center justify-between mb-4">
          <Text size="small" className="text-cyan-400">Room: {gameId}</Text>
        </Box>
        <CombatHeader />

        {/* LƯỚI RADAR ĐỊCH */}
        <Box
          className={`combat-section ${
            inBattle && turn ? "" : "pointer-events-none opacity-70"
          }`}
        >
          <Text
            size="xxSmall"
            className={`ml-4 mb-2 tracking-[0.3em] font-bold ${
              turn ? "text-cyan-400 animate-pulse" : "text-gray-600"
            }`}
          >
            {turn ? ">> LƯỢT TẤN CÔNG <<" : ">> ĐỢI CHỈ THỊ ĐỊCH <<"}
          </Text>
          <GameGrid type="enemy" onCellClick={handleAttackEnemy} />
        </Box>

        {!inBattle && (
          <Box
            className={`combat-section mt-4 ${
              draggingShip ? "scale-95 opacity-30" : ""
            }`}
          >
            <ShipDock />
          </Box>
        )}

        {/* LƯỚI HẠM ĐỘI NHÀ */}
        <Box className={`combat-section ${inBattle ? "mt-4" : "mt-6"}`}>
          <ShipStatusHeader />
          <div className="mt-4 relative flex justify-center">
            <GameGrid type="home" />
          </div>
        </Box>

        {/* NÚT ĐIỀU KHIỂN */}
        <Box className="px-4 mt-10">
          {!inBattle ? (
            <div className="flex flex-col gap-3">
              <Button
                fullWidth
                variant="secondary"
                className="border-cyan-500 text-cyan-500"
                onClick={autoPlaceShips}
              >
                DÀN TRẬN NGẪU NHIÊN
              </Button>

              <Button
                fullWidth
                disabled={!isReadyToStart || isReadySent}
                className={`h-14 font-black ${
                  isReadySent
                    ? "bg-gray-700"
                    : "bg-cyan-500 shadow-[0_0_20px_#22d3ee]"
                }`}
                onClick={handleStartBattle}
              >
                {isReadySent ? "ĐANG ĐỢI ĐỐI THỦ..." : "XÁC NHẬN TRIỂN KHAI"}
              </Button>
            </div>
          ) : (
            <Button
              fullWidth
              variant="secondary"
              className="mt-4 text-red-900/50 text-[9px] border-none"
              onClick={() => window.location.reload()}
            >
              RÚT QUÂN (SURRENDER)
            </Button>
          )}
        </Box>

        {/* DEBUG PANEL */}
        <Box className="mt-20 p-4 border-t border-red-500/20 bg-red-950/5">
          <Text className="text-red-500/40 text-[9px] font-black text-center mb-2">
            DEBUG: VỆ TINH SOI ĐỊCH
          </Text>
          <div className="flex justify-center opacity-20 scale-50">
            <div className="relative">
              <GameGrid type="enemy" />
              <div className="absolute inset-0 grid grid-cols-10 gap-0.5 p-1 ml-7 mt-8">
                {[...Array(100)].map((_, i) => {
                  const x = i % 10;
                  const y = Math.floor(i / 10);
                  const isShip = enemyShips.some((s) => {
                    for (let j = 0; j < s.size; j++) {
                      const sx = s.isHorizontal ? s.x + j : s.x;
                      const sy = s.isHorizontal ? s.y : s.y + j;
                      if (sx === x && sy === y) return true;
                    }
                    return false;
                  });
                  return (
                    <div
                      key={i}
                      className="w-7 h-7 flex items-center justify-center"
                    >
                      {isShip && (
                        <div className="w-3 h-3 bg-red-500 rounded-full" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </Box>
      </Box>

      {/* MODAL KẾT THÚC (Tích hợp trạng thái dọn dẹp) */}
      <Modal
        visible={!!winner}
        title={winner === "player" ? "VICTORY" : "DEFEAT"}
      >
        <Box className="p-6 text-center bg-[#0a1a29]">
          <Text
            className={
              winner === "player" ? "text-cyan-400 font-black" : "text-red-500"
            }
          >
            {winner === "player"
              ? "HẠM ĐỘI ĐỊCH ĐÃ BỊ QUÉT SẠCH!"
              : "CHÚNG TA ĐÃ MẤT LIÊN LẠC VỚI HẠM ĐỘI."}
          </Text>

          <Box className="mt-4 py-2 border-t border-cyan-900/30">
            {isFinishing ? (
              <Text size="xxSmall" className="text-cyan-600 animate-pulse">
                ĐANG LƯU DỮ LIỆU CHIẾN TRƯỜNG...
              </Text>
            ) : (
              <Text size="xxSmall" className="text-green-500">
                DỮ LIỆU ĐÃ ĐƯỢC TỐI ƯU HÓA.
              </Text>
            )}
          </Box>

          <Button
            fullWidth
            disabled={isFinishing}
            className={`mt-8 ${isFinishing ? "bg-gray-700" : "bg-cyan-500"}`}
            onClick={handleEndSession}
          >
            QUAY LẠI CĂN CỨ
          </Button>
        </Box>
      </Modal>

      <BottomNav />
    </Page>
  );
};

export default CombatPage;
