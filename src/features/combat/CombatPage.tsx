import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  Header,
  Icon,
  Modal,
  Page,
  Sheet,
  Text,
  useLocation,
  useNavigate,
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

import "@/css/features/combat.scss";
import { GameBoard } from "@/types/supabase/GameBoard";

const CombatPage: React.FC = () => {
  const { user } = useUser();
  const { state } = useLocation();
  const navigate = useNavigate();
  const { saveShipLayout, finishGame, isFinishing, subscribePresence, leaveBattle } =
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
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [serverGame, setServerGame] = useState<any>(null);
  const leavingSelfRef = useRef(false);
  const lastGameSnapshotRef = useRef<any>(null);

  const gameId = state?.gameId || "ROOM_TEST_01";
  const isReadyToStart = useMemo(() => placedShips.length === 4, [placedShips]);

  // Lắng nghe trạng thái game để điều hướng khi phòng bị reset về waiting
  useEffect(() => {
    if (!gameId || !user || isBotMode) return;

    const gameChannel = supabase
      .channel(`game_${gameId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "games", filter: `id=eq.${gameId}` },
        (payload) => {
          const updated = payload.new as any;
          const prev = lastGameSnapshotRef.current;
          setServerGame(updated);
          lastGameSnapshotRef.current = updated;

          // Host sees snackbar when opponent leaves (room resets to waiting),
          // but not when host initiated the leave.
          if (
            updated?.status === "waiting" &&
            prev?.status === "playing" &&
            user.id === updated?.host_id &&
            !leavingSelfRef.current
          ) {
            const prevMembers: string[] = prev?.members || [];
            const nextMembers: string[] = updated?.members || [];
            const someoneLeft = nextMembers.length < prevMembers.length;
            if (someoneLeft) {
              openSnackbar({
                text: "Đối thủ đã rời phòng. Quay lại phòng chờ để sẵn sàng lại.",
              });
            }
          }

          // Nếu host reset phòng (host thoát) hoặc member thoát -> phòng về waiting.
          if (updated?.status === "waiting") {
            const members: string[] = updated?.members || [];
            const stillInRoom = members.includes(user.id) || updated?.host_id === user.id;
            if (stillInRoom) {
              // Replace history so Back from waiting returns to lobby (not combat)
              navigate("/waiting", { state: { gameId }, replace: true });
            } else {
              navigate("/lobby", { replace: true });
            }
          }
        }
      )
      .subscribe();

    // Fetch snapshot ban đầu (phục vụ xác định host khi thoát)
    (async () => {
      const { data } = await supabase.from("games").select("*").eq("id", gameId).maybeSingle();
      if (data) {
        setServerGame(data);
        lastGameSnapshotRef.current = data;
      }
    })();

    return () => {
      supabase.removeChannel(gameChannel);
    };
  }, [gameId, user?.id, isBotMode]);

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
          const data = payload.new as GameBoard;
          // 1. Kiểm tra nếu record đó là của đối thủ và họ đã sẵn sàng
          if (
            data.game_id === gameId &&
            data.user_id !== user.id &&
            data.is_ready
          ) {
            setEnemyShips(data.ships_data);
          }
        }
      )
      .subscribe();

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
            await finishGame(gameId, winnerId);
          }
        }
      }
    };

    handleCleanUp();
  }, [winner, gameId]);

  useEffect(() => {
    // Hàm này sẽ chạy khi user nhấn nút Back của Zalo hoặc nút Back vật lý
    const handleBackEvent = () => {
      if (inBattle && !winner) {
        // Nếu đang trong trận và chưa có kết quả -> Hiện Sheet xác nhận
        setShowExitConfirm(true);
        // Giữ người dùng ở lại trang (không cho back thực sự)
        window.history.pushState(null, "", window.location.href);
        return false;
      }
      return true;
    };

    window.history.pushState(null, "", window.location.href);
    window.addEventListener("popstate", handleBackEvent);

    return () => {
      window.removeEventListener("popstate", handleBackEvent);
    };
  }, [inBattle, winner]);

  // Hàm xử lý thắng do đối thủ mất kết nối
  const handleAutoWin = async () => {
    if (!gameId || !user || isFinishing) return;

    // 1. Thông báo nhanh qua Snackbar
    openSnackbar({ text: "ĐỐI THỦ MẤT KẾT NỐI. BẠN GIÀNH CHIẾN THẮNG!" });

    try {
      // Set winner ngay lập tức để hiện Modal
      useCombatStore.setState({ winner: "player" });
      // Sau đó mới gọi API lưu kết quả ngầm
      await finishGame(gameId, null);
    } catch (err) {
      console.error("Lỗi xử lý thắng tự động:", err);
    }
  };

  const handleLeaveBattle = async () => {
    if (!gameId || !user) return;
    if (isBotMode) {
      resetShips();
      setInBattle(false);
      navigate("/lobby");
      return;
    }

    const isHost = (serverGame?.host_id && serverGame.host_id === user.id) || false;

    // Rời trận: người rời bị tính 1 trận tham gia.
    // - Host rời: reset phòng về waiting => tất cả còn lại về waiting.
    // - Member rời: member về lobby, host/những người còn lại về waiting.
    try {
      leavingSelfRef.current = true;
      await leaveBattle({ gameId, userId: user.id, isHost });
    } finally {
      // allow future snackbars for subsequent sessions
      leavingSelfRef.current = false;
      resetShips();
      setInBattle(false);
      if (isHost) {
        // Replace history so Back from waiting returns to lobby (not combat)
        navigate("/waiting", { state: { gameId }, replace: true });
      } else {
        navigate("/lobby", { replace: true });
      }
    }
  };

  // --- 3. LOGIC BẮN ---
  const handleAttackEnemy = async (x: number, y: number) => {
    if (!inBattle || !turn || !user || isFinishing) return;

    if (isBotMode) {
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
    setInBattle(false);
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
        // Nếu đang trong trận, ẩn nút back mặc định, buộc dùng nút Rút quân hoặc nút vật lý
        showBackIcon={!inBattle}
        onBackClick={() => {
          setShowExitConfirm(true);
        }}
      />

      <Box className="combat-main-content pb-32">
        <Box className="flex items-center justify-between mb-4">
          <Text size="small" className="text-cyan-400">
            Room: {isBotMode ? "Bot" : game?.room_name}
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

      <Sheet
        visible={showExitConfirm}
        onClose={() => setShowExitConfirm(false)}
        autoHeight
        mask
        handler
        swipeToClose
      >
        <Box p={4} className="bg-[#061421]">
          <Box mb={4} flex flexDirection="column" alignItems="center">
            <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mb-2">
              <Icon icon="zi-warning-solid" className="text-red-500" />
            </div>
            <Text.Title className="text-red-500 font-black">
              CẢNH BÁO
            </Text.Title>
          </Box>

          <Box mb={6}>
            <Text className="text-cyan-400 text-center">
              Chỉ huy rút lui sẽ bị coi là
              <span className="text-red-500 font-bold"> TỰ HỦY </span>
              và chiến dịch{" "}
              <span className="text-red-500 font-bold">THẤT BẠI</span>.
            </Text>
          </Box>

          <Box flex flexDirection="row">
            <Button
              fullWidth
              variant="secondary"
              className="border-cyan-500 text-cyan-500"
              onClick={() => setShowExitConfirm(false)}
            >
              CHIẾN ĐẤU
            </Button>
            <Button
              fullWidth
              type="danger"
              className="bg-red-600 shadow-[0_0_15px_rgba(220,38,38,0.5)]"
              onClick={async () => {
                setShowExitConfirm(false);
                await handleLeaveBattle();
              }}
            >
              NHẬN THUA
            </Button>
          </Box>
        </Box>
      </Sheet>

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
