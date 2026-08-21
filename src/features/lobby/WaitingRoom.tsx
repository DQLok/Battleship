import React, { useEffect, useRef, useState } from "react";
import {
  Icon,
  useNavigate,
  Box,
  Header,
  Page,
  useSnackbar,
  useLocation,
  Text,
} from "zmp-ui";
import { supabase } from "@/api/supabaseClient";
import { Profile } from "@/types/supabase/Profile";
import { PlayerItem } from "./components/PlayerItem";
import { useUser } from "@/context/UserContext";
import { useSupabase } from "@/hooks/useSupabase";
import { renderTeamSlots } from "./components/TeamSlot";
import "@/css/features/waiting-room.scss";

function mergeMemberProfiles(
  memberIds: string[] = [],
  profiles: Array<Pick<Profile, "id" | "username" | "avatar_url">> | null,
  currentUser: Profile | null
): Profile[] {
  const byId = new Map((profiles || []).map((p) => [p.id, p]));
  const now = new Date().toISOString();
  return memberIds.map((id) => {
    const fromDb = byId.get(id);
    if (fromDb) {
      return {
        id,
        username: fromDb.username,
        avatar_url: fromDb.avatar_url,
        wins: 0,
        total_games: 0,
        created_at: now,
        updated_at: now,
      };
    }
    if (currentUser?.id === id) return currentUser;
    const short = id.replace(/^guest_/, "").slice(-4).toUpperCase();
    return {
      id,
      username: id.startsWith("guest_") ? `Guest_${short}` : id,
      avatar_url: null,
      wins: 0,
      total_games: 0,
      created_at: now,
      updated_at: now,
    };
  });
}

export const WaitingRoom = () => {
  const navigate = useNavigate();
  const { state } = useLocation(); // Giả sử bạn truyền gameId qua đây
  const { leaveRoom } = useSupabase();
  const gameId = state?.gameId || "###";

  const [game, setGame] = useState<any>(null);
  const [players, setPlayers] = useState<Profile[]>([]);
  const [myId, setMyId] = useState("");
  const { user } = useUser();
  const { openSnackbar } = useSnackbar();
  const skipLeaveRef = useRef(false);
  const gameRef = useRef(game);
  gameRef.current = game;

  // Thêm vào trong component WaitingRoom
  const toggleGameMode = async () => {
    if (game?.host_id !== myId) return;

    const nextMode = game.game_mode === "1vs1" ? "1vs1" : "team";

    if (nextMode === "team") {
      openSnackbar({
        text: "Chiến dịch sẽ mở trong tương lai!",
      });
      return;
    }

    const { error } = await supabase
      .from("games")
      .update({ game_mode: nextMode })
      .eq("id", gameId);

    if (error) openSnackbar({ text: "Không thể đổi chế độ!" });
  };

  // --- LOGIC KIỂM TRA TẤT CẢ SẴN SÀNG ---
  const isAllReady = React.useMemo(() => {
    // Nếu chưa có dữ liệu game, mặc định là chưa sẵn sàng
    if (!game || !game.members) return false;

    // Lọc danh sách những người cần sẵn sàng (không tính Host)
    const otherMembers = game.members.filter(
      (id: string) => id !== game.host_id
    );

    // Nếu phòng chỉ có 1 mình Host
    if (otherMembers.length === 0) return false;

    // Kiểm tra: tất cả thành viên khác phải nằm trong mảng ready_members
    // Dùng mảng rỗng [] làm mặc định nếu ready_members bị undefined/null
    const readyList = game.ready_members || [];

    return otherMembers.every((id: string) => readyList.includes(id));
  }, [game]);

  const handleAction = async () => {
    if (!game) return;

    if (game.host_id === myId) {
      // --- CHỈ CHO PHÉP NẾU TẤT CẢ ĐÃ READY ---
      if (!isAllReady) {
        openSnackbar({ text: "Chờ tất cả người chơi sẵn sàng!" });
        return;
      }
      // --- HOST: vào giai đoạn dàn tàu (setup), chưa bắn ---
      const { error } = await supabase
        .from("games")
        .update({
          status: "setup",
          current_turn: null,
          ready_members: [],
        })
        .eq("id", gameId);

      if (!error) {
        skipLeaveRef.current = true;
        navigate("/combat", { state: { gameId } });
      }
    } else {
      // --- KỊCH BẢN CHO MEMBER ---
      const readyList = game?.ready_members || []; // Đảm bảo luôn là mảng
      const isReady = readyList.includes(myId);

      const newReadyList = isReady
        ? readyList.filter((id) => id !== myId)
        : [...readyList, myId];

      await supabase
        .from("games")
        .update({ ready_members: newReadyList })
        .eq("id", gameId);
    }
  };

  // 1. Fetch dữ liệu phòng và người chơi
  const fetchData = async () => {
    const { data: gameData } = await supabase
      .from("games")
      .select("*")
      .eq("id", gameId)
      .single();

    if (gameData) {
      // const fakePlayers = generateFakePlayers(0);
      setGame(gameData);
      // Fetch thông tin profile của tất cả members trong mảng
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .in("id", gameData.members);
      setPlayers(mergeMemberProfiles(gameData.members, profiles, user));
    }
  };

  // 2. Realtime lắng nghe thay đổi (Khi có người Join/Leave)
  useEffect(() => {
    if (!user) {
      openSnackbar({ text: "Vui lòng đăng nhập!" });
      return;
    }
    setMyId(user.id);
    fetchData();

    const channel = supabase
      .channel(`lobby-${gameId}`, {
        config: { presence: { key: user.id } },
      })
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "games",
          filter: `id=eq.${gameId}`,
        },
        async (payload) => {
          const updatedGame = payload.new;
          setGame(updatedGame);

          // QUAN TRỌNG: Khi members thay đổi, phải fetch lại profile người chơi mới
          if (updatedGame.members) {
            const { data: profiles } = await supabase
              .from("profiles")
              .select("id, username, avatar_url")
              .in("id", updatedGame.members);

            setPlayers(mergeMemberProfiles(updatedGame.members, profiles, user));
          }

          if (
            updatedGame.status === "setup" ||
            updatedGame.status === "playing"
          ) {
            skipLeaveRef.current = true;
            navigate("/combat", { state: { gameId } });
          }
        }
      )
      .subscribe();

    const onPageHide = () => {
      if (skipLeaveRef.current) return;
      const st = gameRef.current?.status;
      if (st === "setup" || st === "playing") return;
      if (user.id && gameId !== "###") {
        void leaveRoom(gameId, user.id);
      }
    };
    window.addEventListener("pagehide", onPageHide);

    return () => {
      window.removeEventListener("pagehide", onPageHide);
      supabase.removeChannel(channel);
      if (skipLeaveRef.current) return;
      const st = gameRef.current?.status;
      if (st === "setup" || st === "playing") return;
      void leaveRoom(gameId, user.id);
    };
  }, [gameId, user]);

  const onLeaveRoom = async () => {
    if (!user?.id || gameId === "###") return;
    await leaveRoom(gameId, user.id);
  };

  return (
    <Page className="waiting-page">
      {/* Header */}
      <Header
        title="BATTLE LOBBY"
        textColor="#22d3ee"
        backgroundColor="#061421"
        onBackClick={async () => {
          await onLeaveRoom();
          // Ensure Back from waiting goes to lobby, not previous combat entry.
          navigate("/lobby", { replace: true });
        }}
      />
      {/* Room ID Box */}
      <Box className="bg-[#07242B] border border-cyan-900 p-3 mb-2 flex justify-between items-start">
        <Box>
          <Text className="text-[10px] text-cyan-700 uppercase block">
            Mã phòng
          </Text>
          <Text className="text-xl font-bold tracking-[0.25em] block leading-tight">
            {game?.room_code || game?.id?.slice(0, 6).toUpperCase() || "------"}
          </Text>
        </Box>
        <Box className="flex items-center gap-2 bg-[#0A323B] px-3 py-1 rounded-full border border-cyan-500/30">
          <Box className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <Box className="text-xs uppercase">
            {game?.game_mode === "1vs1" ? "Duel (1vs1)" : "Tactical (Teams)"}
          </Box>
        </Box>
      </Box>

      {/* NEW: Mode Selection (Chỉ dành cho Host) */}
      {game?.host_id === myId && (
        <Box className="flex gap-2 mb-6">
          <Box
            onClick={toggleGameMode}
            className={`flex flex-1 py-2 text-[10px] border transition-all justify-center items-center ${
              game?.game_mode === "1vs1"
                ? "bg-cyan-400 text-black border-cyan-400"
                : "border-cyan-900 text-cyan-900"
            }`}
          >
            SINGLE DUEL (1VS1)
          </Box>
          <Box
            onClick={toggleGameMode}
            className={`flex flex-1 py-2 text-[10px] border transition-all justify-center items-center ${
              game?.game_mode === "team"
                ? "bg-cyan-400 text-black border-cyan-400"
                : "border-cyan-900 text-cyan-900"
            }`}
          >
            TEAM BATTLE (4VS4)
          </Box>
        </Box>
      )}

      {/* Team Section */}
      <Box className="flex-1 z-10 overflow-y-auto pr-1 no-scrollbar space-y-8">
        {/* --- TEAM ALPHA (Luôn hiển thị) --- */}
        <Box>
          <Box className="flex justify-between items-center mb-4 border-b border-cyan-900 pb-1">
            <Box className="text-sm font-bold flex items-center gap-2">
              <Icon icon="zi-group" />{" "}
              {game?.game_mode === "1vs1" ? "PLAYER 1" : "TEAM ALPHA"}
            </Box>
          </Box>
          <Box className="space-y-3">
            {renderTeamSlots(
              players.slice(0, game?.game_mode === "1vs1" ? 1 : 4),
              "alpha",
              game,
              myId,
              game?.game_mode === "1vs1" ? 1 : 4 // Số slot tối đa
            )}
          </Box>
        </Box>

        {/* --- TEAM BRAVO (Chỉ hiển thị slot 1 nếu là 1vs1) --- */}
        <Box>
          <Box className="flex justify-between items-center mb-4 border-b border-red-900/50 pb-1">
            <Box className="text-sm font-bold flex items-center gap-2 text-red-400">
              <Icon icon="zi-group" />{" "}
              {game?.game_mode === "1vs1" ? "PLAYER 2" : "TEAM BRAVO"}
            </Box>
          </Box>
          <Box className="space-y-3">
            {/* Logic BRAVO: 
                - 1vs1: Lấy người chơi thứ 2 (index 1), tối đa 1 slot
                - Team: Lấy từ người chơi thứ 5 (index 4), tối đa 4 slot 
            */}
            {renderTeamSlots(
              game?.game_mode === "1vs1"
                ? players.slice(1, 2)
                : players.slice(4, 8),
              "bravo",
              game,
              myId,
              game?.game_mode === "1vs1" ? 1 : 4
            )}
          </Box>
        </Box>
      </Box>

      {/* Footer Actions */}
      <Box className="mt-auto flex gap-4 pt-6 z-10">
        <Box
          onClick={handleAction}
          disabled={game?.host_id === myId && !isAllReady}
          className={`flex-1 font-black py-4 flex items-center justify-center gap-2 transition-all active:scale-95 uppercase tracking-tighter
    ${
      game?.host_id === myId
        ? isAllReady
          ? "bg-cyan-400 text-black shadow-[0_0_20px_rgba(0,255,255,0.5)]" // Host đủ điều kiện
          : "bg-slate-700 text-slate-400 cursor-not-allowed opacity-50" // Host đang chờ
        : (game?.ready_members || []).includes(myId)
        ? "bg-[#0A262E] text-cyan-700 border border-cyan-900" // Member ĐÃ READY (Làm tối đi)
        : "bg-cyan-400 text-black shadow-[0_0_20px_rgba(0,255,255,0.5)]" // Member CHƯA READY (Nổi bật)
    }`}
        >
          <Icon
            icon={game?.host_id === myId ? "zi-play-solid" : "zi-check"}
            className={
              (game?.ready_members || []).includes(myId) &&
              game?.host_id !== myId
                ? "opacity-50"
                : ""
            }
          />
          {game?.host_id === myId
            ? isAllReady
              ? "BẮT ĐẦU"
              : "ĐANG CHỜ..."
            : (game?.ready_members || []).includes(myId)
            ? "HỦY SẴN SÀNG"
            : "SẴN SÀNG"}
        </Box>
      </Box>
    </Page>
  );
};
