import React, { useEffect, useMemo, useState } from "react";
import { Box, Button, Header, Modal, Page, Text, useLocation } from "zmp-ui";
import { showToast } from "zmp-sdk";
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
  const { saveShipLayout } = useSupabase();

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
  } = useCombatStore();

  const [inBattle, setInBattle] = useState(false);
  const [isReadySent, setIsReadySent] = useState(false);

  const gameId = state?.gameId || "ROOM_TEST_01";
  const isReadyToStart = useMemo(() => placedShips.length === 4, [placedShips]);

  // --- 1. REALTIME ENGINE ---
  useEffect(() => {
    if (!gameId || !user) return;

    const combatChannel = supabase
      .channel(`game_${gameId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "moves",
          filter: `game_id=eq.${gameId}`,
        },
        async (payload) => {
          const move = payload.new;
          const isMine = move.user_id === user.id;

          recordMove(
            move.user_id,
            move.x,
            move.y,
            move.is_hit,
            user.id,
            move.sunk_ship_name
          );

          if (move.is_hit) {
            showToast({
              message: isMine
                ? "🎯 TRÚNG RỒI! Bắn tiếp đi!"
                : "⚠️ Địch bắn trúng! Chúng đang bắn tiếp...",
            });
          } else {
            showToast({
              message: isMine
                ? "🌊 Hụt rồi! Đổi lượt."
                : "🛡️ Đối thủ bắn hụt! Đến lượt bạn.",
            });
          }
        }
      )
      .subscribe();

    return () => {
      console.log("alooooo");
      supabase.removeChannel(combatChannel);
    };
  }, [gameId, user?.id, isReadySent]);

  // --- 2. LOGIC BẮN (MULTI PLAYER) ---
  const handleAttackEnemy = async (x: number, y: number) => {
    if (!inBattle || !turn || !user) return;

    // Check hit cục bộ dựa trên enemyShips đã sync
    // const isHit = enemyShips.some((s) => {
    //   for (let i = 0; i < s.size; i++) {
    //     const sx = s.isHorizontal ? s.x + i : s.x;
    //     const sy = s.isHorizontal ? s.y : s.y + i;
    //     if (sx === x && sy === y) return true;
    //   }
    //   return false;
    // });

    const { error } = await supabase.from("moves").insert({
      game_id: gameId,
      user_id: user.id,
      x,
      y,
      // Không cần tính is_hit ở đây, DB Trigger sẽ tự override giá trị này
    });

    if (error) console.error("Lỗi pháo kích:", error);
  };

  // --- 3. KHỞI CHẠY CHIẾN DỊCH ---
  const handleStartBattle = async () => {
    if (!isReadyToStart || !user) return;

    const { error } = await saveShipLayout(gameId, user.id, placedShips);
    if (error) {
      showToast({ message: "Lỗi kết nối vệ tinh!" });
      return;
    }

    setIsReadySent(true);

    // Kiểm tra xem đối thủ đã "ở đó" chưa
    const { data: opponent } = await supabase
      .from("game_boards")
      .select("ships_data")
      .eq("game_id", gameId)
      .neq("user_id", user.id)
      .maybeSingle();

    if (opponent) {
      setEnemyShips(opponent.ships_data);
      setInBattle(true);
      setTurn(true);
      showToast({ message: "CHIẾN DỊCH BẮT ĐẦU!" });
    } else {
      showToast({ message: "Đang đợi đối thủ dàn trận..." });
    }
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
          <Button
            fullWidth
            className="mt-8 bg-cyan-500"
            onClick={() => window.location.reload()}
          >
            KẾT THÚC
          </Button>
        </Box>
      </Modal>

      <BottomNav />
    </Page>
  );
};

export default CombatPage;
