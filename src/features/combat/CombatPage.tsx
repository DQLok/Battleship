import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Header,
  Modal,
  Page,
  Text,
  useLocation,
  useSnackbar,
} from "zmp-ui";
// import { api } from "zmp-sdk";
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
import { GameBoard } from "@/types/supabase/GameBoard";

const CombatPage: React.FC = () => {
  const { user } = useUser();
  const { state } = useLocation();
  const { saveShipLayout, finishGame, isFinishing, subscribePresence } =
    useSupabase();
  const { openSnackbar } = useSnackbar();

  const {
    game,
    placedShips,
    draggingShip,
    enemyShips,
    winner,
    isBotMode,
    turn,
    setEnemyShips,
    setTurn,
    autoPlaceShips,
    recordMove,
    resetShips,
    generateRandomFleet,
  } = useCombatStore();

  const [inBattle, setInBattle] = useState(false);
  const [isReadySent, setIsReadySent] = useState(false);
  const [isOpponentAway, setIsOpponentAway] = useState(false);
  const [countdown, setCountdown] = useState(20);
  const [isGracePeriod, setIsGracePeriod] = useState(true);

  const gameId = state?.gameId || "ROOM_TEST_01";
  const isReadyToStart = useMemo(() => placedShips.length === 4, [placedShips]);

  useEffect(() => {
    if (inBattle) {
      const timer = setTimeout(() => setIsGracePeriod(false), 5000); // Đợi 5s cho socket ổn định
      return () => clearTimeout(timer);
    }
    setIsGracePeriod(true);
    return;
  }, [inBattle]);

  // useEffect xử lý Presence và Countdown
  useEffect(() => {
    if (isBotMode || !gameId || !user || !inBattle) return;
    const channel = subscribePresence(
      gameId,
      user.id,
      () => setIsOpponentAway(true), // Đối thủ mất kết nối
      () => {
        setIsOpponentAway(false);
        setCountdown(20);
      }
    );
    return () => {
      channel.unsubscribe();
    };
  }, [gameId, user?.id, isBotMode, inBattle]);

  // Logic đếm ngược khi đối thủ vắng mặt
  // Bước 1: Chỉ làm nhiệm vụ giảm số countdown
  useEffect(() => {
    let interval: any;
    if (inBattle && isOpponentAway && !isBotMode && !isGracePeriod && !winner) {
      interval = setInterval(() => {
        setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    } else {
      setCountdown(20); // Reset nếu đối thủ quay lại hoặc game xong
    }
    return () => clearInterval(interval);
  }, [inBattle, isOpponentAway, isBotMode, isGracePeriod, winner]);

  // Bước 2: Theo dõi countdown chạm 0 để xử thắng (Hết lỗi kẹt countdown)
  useEffect(() => {
    if (countdown === 0 && inBattle && isOpponentAway && !winner) {
      handleAutoWin();
    }
  }, [countdown, inBattle, isOpponentAway, winner]);

  useEffect(() => {
    console.log(
      "🛠️ Subscribing to Supabase channels...",
      isBotMode,
      gameId,
      user
    );
    if (isBotMode || !gameId || !user) return;

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
          event: "*",
          schema: "public",
          table: "game_boards",
          // filter: `game_id=eq.${gameId}`,
        },
        (payload) => {
          console.log("⚓ Đối thủ cập nhật trạng thái:", payload.new);

          const data = payload.new as GameBoard;
          // 1. Kiểm tra nếu record đó là của đối thủ và họ đã sẵn sàng
          if (
            data.game_id === gameId &&
            data.user_id !== user.id &&
            data.is_ready
          ) {
            console.log("⚓ Đối thủ đã sẵn sàng:", payload.new);

            setEnemyShips(data.ships_data);
          }
        }
      )
      .subscribe((status) => console.log("📡 Board Channel Status:", status));

    return () => {
      supabase.removeChannel(moveChannel);
      supabase.removeChannel(boardChannel);
    };
  }, [gameId, user?.id, isBotMode]); // Chỉ phụ thuộc vào ID cơ bản

  useEffect(() => {
    if (isReadySent && enemyShips.length > 0 && !inBattle) {
      setInBattle(true);
      setTurn(true); // Hoặc logic lượt đi của bạn
      openSnackbar({ text: "HÀNH QUÂN! ĐỐI THỦ ĐÃ VÀO VỊ TRÍ." });
    }
  }, [isReadySent, enemyShips, inBattle]);

  // --- 2. LOGIC KẾT THÚC & DỌN DẸP DỮ LIỆU ---
  //Thêm useEffect này bên dưới cái Realtime của bạn
  useEffect(() => {
    const handleCleanUp = async () => {
      if (winner && gameId && !isFinishing) {
        if (isBotMode) {
          openSnackbar({
            text: `Chiến dịch ${
              winner === "player" ? "Thất bại" : "Thành công"
            }`,
          });
        } else {
          // Winner ID: Nếu mình thắng thì là user.id, nếu địch thắng thì là opponentId
          const winnerId = winner === "player" ? user?.id : ""; //opponentId;

          if (winnerId) {
            console.log(
              "🛠️ Đang dọn dẹp dữ liệu trận đấu và cập nhật Profile..."
            );
            await finishGame(gameId, winnerId);
          }
        }
      }
    };

    handleCleanUp();
  }, [winner, gameId]);

  // Hàm xử lý thắng do đối thủ mất kết nối
  const handleAutoWin = async () => {
    if (!gameId || !user || isFinishing) return;

    // 1. Thông báo nhanh qua Snackbar
    openSnackbar({ text: "ĐỐI THỦ MẤT KẾT NỐI. BẠN GIÀNH CHIẾN THẮNG!" });

    try {
      // Set winner ngay lập tức để hiện Modal
      useCombatStore.setState({ winner: "player" });
      // Sau đó mới gọi API lưu kết quả ngầm
      await finishGame(gameId, user.id);
    } catch (err) {
      console.error("Lỗi xử lý thắng tự động:", err);
    }
  };

  // --- 3. LOGIC BẮN ---
  const handleAttackEnemy = async (x: number, y: number) => {
    if (!inBattle || !turn || !user || isFinishing) return;

    if (isBotMode) {
      console.log("[Player] Tấn công", x, y);
      // --- CHẾ ĐỘ BOT ---
      // 1. Kiểm tra xem ô (x,y) đã bắn chưa (tránh bắn lại ô cũ)
      if (useCombatStore.getState().enemyGrid[y][x] !== "empty") return;

      // 2. Kiểm tra xem có trúng tàu Bot (enemyShips) không
      const hitShip = enemyShips.find((s) => {
        for (let i = 0; i < s.size; i++) {
          const sx = s.isHorizontal ? s.x + i : s.x;
          const sy = s.isHorizontal ? s.y : s.y + i;
          if (sx === x && sy === y) return true;
        }
        return false;
      });

      // 3. Kiểm tra nếu trúng thì tàu đó có bị chìm luôn không (để lấy sunkShipName)
      let sunkName = "";
      if (hitShip) {
        // Giả lập grid tạm để check chìm
        const tempGrid = useCombatStore
          .getState()
          .enemyGrid.map((row) => [...row]);
        tempGrid[y][x] = "hit"; // Đánh dấu ô vừa bắn là hit

        const isSunk = placedShips.every(() => {
          // Tận dụng helper isShipSunk
          for (let i = 0; i < hitShip.size; i++) {
            const cx = hitShip.isHorizontal ? hitShip.x + i : hitShip.x;
            const cy = hitShip.isHorizontal ? hitShip.y : hitShip.y + i;
            if (tempGrid[cy][cx] !== "hit") return false;
          }
          return true;
        });
        if (isSunk) sunkName = hitShip.name;
      }
      console.log(`[Bot] Tấn công ${x},${y} -> ${hitShip ? "hit" : "miss"}`);

      // 4. Ghi nhận nước đi vào Store (userId khác currentUserId để xác định phe bắn)
      recordMove(
        user.id, // userId của người bắn
        x,
        y,
        !!hitShip,
        user.id, // currentUserId để so sánh
        sunkName
      );
    } else {
      // --- CHẾ ĐỘ ONLINE (Giữ nguyên) ---
      const { error } = await supabase.from("moves").insert({
        game_id: gameId,
        user_id: user.id,
        x,
        y,
      });
      if (error) openSnackbar({ text: "Pháo kích thất bại!" });
    }
  };

  // --- 4. KHỞI CHẠY CHIẾN DỊCH ---
  const handleStartBattle = async () => {
    if (!isReadyToStart || !user) return;
    console.log("[Player] BẮT ĐẦU CHIẾN DỊCH", isBotMode);

    if (isBotMode) {
      // 1. Tạo đội hình ngẫu nhiên cho Bot
      const botFleet = generateRandomFleet();
      setEnemyShips(botFleet);

      // 2. Vào trận ngay lập tức
      setIsReadySent(true);
      setInBattle(true);
      setTurn(true);
      openSnackbar({ text: "CHIẾN DỊCH VỚI BOT BẮT ĐẦU!" });
    } else {
      const { error } = await saveShipLayout(gameId, user.id, placedShips);
      if (error) {
        openSnackbar({ text: "Lỗi kết nối vệ tinh!", type: "error" });
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
        setTurn(false);
        openSnackbar({ text: "CHIẾN DỊCH BẮT ĐẦU!" });
      } else {
        openSnackbar({ text: "Đang đợi đối thủ dàn trận..." });
      }
    }
  };

  const handleEndSession = () => {
    resetShips(); // Cực kỳ quan trọng: reset sạch store trước khi reload
    // Chờ một chút để store kịp clear rồi mới reload/navigate
    // setTimeout(() => {
    // window.location.reload();
    // }, 100);
  };

  return (
    <Page
      className={`combat-page ${draggingShip ? "dragging-active" : ""}`}
      style={{ backgroundColor: "#061421" }}
      hideScrollbar
    >
      <Header
        title={inBattle ? "CHIẾN DỊCH" : "DÀN TRẬN"}
        textColor="#22d3ee"
        backgroundColor="#061421"
      />

      <Box className="combat-main-content pb-32">
        <Box className="flex items-center justify-between mb-4">
          <Text size="small" className="text-cyan-400">
            Room: {game?.room_name}
          </Text>
        </Box>
        <CombatHeader />

        {/* LƯỚI RADAR ĐỊCH */}
        <Box
          className={`combat-section ${
            inBattle && turn ? "" : "pointer-events-none opacity-70"
          }`}
        >
          <Box
            className={`mx-4 mb-4 py-2 px-4 border-l-4 flex items-center justify-between transition-all duration-500 ${
              turn
                ? "border-cyan-400 bg-cyan-950/30 shadow-[0_0_15px_rgba(34,211,238,0.2)]"
                : "border-red-600 bg-red-950/20 shadow-[0_0_15px_rgba(220,38,38,0.1)]"
            }`}
          >
            <Box className="flex items-center gap-2">
              {/* Icon nhấp nháy */}
              <div
                className={`w-2 h-2 rounded-full ${
                  turn ? "bg-cyan-400 animate-pulse" : "bg-red-600"
                }`}
              />

              <Text
                size="xSmall"
                className={`tracking-[0.2em] font-black ${
                  turn ? "text-cyan-400" : "text-red-500"
                }`}
              >
                {turn ? "QUYỀN TẤN CÔNG" : "ĐỊCH TẬP KÍCH"}
              </Text>
            </Box>
          </Box>
          <GameGrid type="enemy" onCellClick={handleAttackEnemy} />
        </Box>

        {/* LƯỚI HẠM ĐỘI NHÀ */}
        <Box className={`combat-section ${inBattle ? "mt-4" : "mt-6"}`}>
          <ShipStatusHeader />
          {!inBattle && (
            <Box
              className={`combat-section mt-4 ${
                draggingShip ? "scale-95 opacity-30" : ""
              }`}
            >
              <ShipDock />
            </Box>
          )}
          <div className="mt-4 relative flex justify-center">
            <GameGrid type="home" />
          </div>
        </Box>

        {/* NÚT ĐIỀU KHIỂN */}
        <Box className="px-4 mt-10">
          {!inBattle ? (
            <Box className="flex flex-col gap-3">
              <Button
                fullWidth
                variant="secondary"
                className="border-cyan-500 text-cyan-500"
                onClick={autoPlaceShips}
                disabled={isReadySent}
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
            </Box>
          ) : (
            <Button
              fullWidth
              variant="secondary"
              className="mt-4 text-red-900/50 text-[9px] border-none"
              onClick={handleEndSession}
            >
              RÚT QUÂN (SURRENDER)
            </Button>
          )}
        </Box>

        {/* DEBUG PANEL */}
        {/* <Box className="mt-20 p-4 border-t border-red-500/20 bg-red-950/5">
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
        </Box> */}
      </Box>

      {/* MODAL KẾT THÚC (Tích hợp trạng thái dọn dẹp) */}
      <Modal
        actions={[
          {
            close: true,
            highLight: true,
            text: "QUAY LẠI CĂN CỨ",
          },
        ]}
        description={
          winner === "player"
            ? "HẠM ĐỘI ĐỊCH ĐÃ BỊ QUÉT SẠCH!"
            : "CHÚNG TA ĐÃ MẤT LIÊN LẠC VỚI HẠM ĐỘI."
        }
        title={winner === "player" ? "VICTORY" : "DEFEAT"}
        visible={!!winner}
        zIndex={1200}
        onClose={handleEndSession}
      />

      {isOpponentAway && inBattle && !isGracePeriod && (
        <Box className="absolute inset-0 z-[99] flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="p-6 border-2 border-red-500 bg-[#061421] rounded-lg text-center shadow-[0_0_15px_rgba(239,68,68,0.5)]">
            <Text className="text-red-500 font-black animate-pulse mb-2">
              MẤT TÍN HIỆU ĐỐI THỦ
            </Text>
            <Text size="small" className="text-cyan-400">
              Tự động xử thắng sau:{" "}
              <span className="text-white text-xl">{countdown}s</span>
            </Text>
          </div>
        </Box>
      )}

      {/* Hiển thị thông báo nhẹ khi đang trong Grace Period lúc mới vào trận */}
      {inBattle && isGracePeriod && (
        <Box className="fixed top-20 left-0 right-0 z-[50] flex justify-center pointer-events-none">
          <div className="bg-cyan-900/80 px-4 py-1 rounded-full border border-cyan-400">
            <Text size="xxSmall" className="text-cyan-300 animate-pulse">
              📡 ĐANG ĐỒNG BỘ TÍN HIỆU CHIẾN TRƯỜNG...
            </Text>
          </div>
        </Box>
      )}

      <BottomNav />
    </Page>
  );
};

export default CombatPage;
