// src/hooks/useSupabase.ts
import { useState, useEffect } from "react";
import { supabase } from "@/api/supabaseClient";
import { useSnackbar } from "zmp-ui";

export const useSupabase = () => {
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const { openSnackbar } = useSnackbar();

  const incrementMyTotalGames = async (userId: string) => {
    // Best-effort client-side increment.
    // If you later add a DB RPC for atomic increments, swap implementation here.
    const { data: profile, error: readErr } = await supabase
      .from("profiles")
      .select("total_games")
      .eq("id", userId)
      .single();

    if (readErr) return { error: readErr };

    const nextTotal = (profile?.total_games ?? 0) + 1;
    const { error: writeErr } = await supabase
      .from("profiles")
      .update({ total_games: nextTotal })
      .eq("id", userId);

    return { error: writeErr ?? null };
  };

  const incrementWinsAndTotalGames = async (userId: string) => {
    const { data: profile, error: readErr } = await supabase
      .from("profiles")
      .select("wins, total_games")
      .eq("id", userId)
      .single();

    if (readErr) return { error: readErr };

    const nextWins = (profile?.wins ?? 0) + 1;
    const nextTotal = (profile?.total_games ?? 0) + 1;
    const { error: writeErr } = await supabase
      .from("profiles")
      .update({ wins: nextWins, total_games: nextTotal })
      .eq("id", userId);

    return { error: writeErr ?? null };
  };

  // 1. Fetch danh sách phòng
  const fetchRooms = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("games")
      .select(
        `
        *,
        host:profiles!games_player_1_fkey ( username, avatar_url )
      `
      )
      .order("created_at", { ascending: false });

    if (!error && data) {
      setRooms(data);
    }
    setLoading(false);
  };

  // 2. Tạo phòng mới
  const createRoom = async (userId: string) => {
    const { data, error } = await supabase
      .from("games")
      .insert([
        {
          room_name: "BattleShip",
          host_id: userId,
          members: [userId],
          status: "waiting",
        },
      ])
      .select()
      .single();

    return { data, error };
  };

  // 5. Xóa phòng (Chỉ dành cho chủ phòng)
  const deleteRoom = async (gameId: string, userId: string) => {
    setLoading(true);
    const { error } = await supabase
      .from("games")
      .delete()
      .eq("id", gameId)
      .eq("host_id", userId); // Bảo mật: Chỉ xóa nếu đúng là chủ phòng

    setLoading(false);
    return { error };
  };

  // 3. Tham gia phòng
  const joinRoom = async (gameId: string, userId: string) => {
    const { error } = await supabase.rpc("join_game_room", {
      room_id: gameId,
      new_user_id: userId,
    });
    return { error };
  };

  // 6. Lưu đội hình tàu (Dàn trận)
  const saveShipLayout = async (
    gameId: string,
    userId: string,
    ships: any[]
  ) => {
    setLoading(true);
    const { data, error } = await supabase
      .from("game_boards")
      .upsert(
        {
          game_id: gameId,
          user_id: userId,
          ships_data: ships,
          is_ready: true,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "game_id, user_id",
        }
      )
      .select()
      .single();

    setLoading(false);
    return { data, error };
  };

  const finishGame = async (gameId: string, winnerId: string | null) => {
    // Tránh gửi yêu cầu trùng lặp nếu đang xử lý
    if (isFinishing) return false;

    setIsFinishing(true);
    setLoading(true); // Có thể dùng loading chung để hiện Spinner overlay

    try {
      if (winnerId) {
        const { error } = await supabase.rpc("finish_game", {
          p_game_id: gameId,
          p_winner_id: winnerId,
        });

        if (error) throw error;
      }

      openSnackbar({
        text: "Trận đấu kết thúc!",
      });

      // Sau khi kết thúc, ta nên fetch lại danh sách phòng để cập nhật UI Lobby
      await fetchRooms();

      return true;
    } catch (err: any) {
      console.error("Lỗi thực thi finish_game:", err.message);
      openSnackbar({
        text: "Lỗi lưu kết quả, vui lòng kiểm tra mạng.",
      });
      return false;
    } finally {
      setIsFinishing(false);
      setLoading(false);
    }
  };

  const subscribePresence = (
    gameId: string,
    userId: string,
    onOpponentLeft: () => void,
    onOpponentJoined: () => void
  ) => {
    const channel = supabase.channel(`presence_${gameId}`, {
      config: { presence: { key: userId } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const onlineIds = Object.keys(state);

        // Kiểm tra xem có ai khác ngoài mình không
        const isOpponentPresent = onlineIds.some((id) => id !== userId);

        if (!isOpponentPresent) {
          onOpponentLeft();
        } else {
          onOpponentJoined();
        }
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ online_at: new Date().toISOString() });
        }
      });

    return channel;
  };

  const resetGameToWaiting = async (gameId: string) => {
    // Reset trạng thái phòng để quay lại "waiting" và buộc mọi người ready lại.
    // Đồng thời dọn dữ liệu trận (moves/boards) theo best-effort.
    const { error: gameErr } = await supabase
      .from("games")
      .update({
        status: "waiting",
        current_turn: null,
        winner_id: null,
        ready_members: [],
      })
      .eq("id", gameId);

    // Best-effort cleanup. Nếu RLS không cho phép thì bỏ qua.
    await supabase.from("moves").delete().eq("game_id", gameId);
    await supabase.from("game_boards").delete().eq("game_id", gameId);

    return { error: gameErr ?? null };
  };

  const surrenderAndResetForRematch = async (params: {
    gameId: string;
    loserId: string;
  }) => {
    const { gameId, loserId } = params;

    // 1) Xác định đối thủ trong phòng
    const { data: gameRow, error: gameErr } = await supabase
      .from("games")
      .select("id, host_id, members")
      .eq("id", gameId)
      .single();

    if (gameErr) return { error: gameErr, opponentId: null as string | null };

    const members: string[] = gameRow?.members || [];
    const opponentId = members.find((id) => id !== loserId) || null;

    // 2) Cập nhật thống kê:
    // - Loser: +1 total_games
    // - Opponent: +1 wins, +1 total_games
    await incrementMyTotalGames(loserId);
    if (opponentId) {
      await incrementWinsAndTotalGames(opponentId);
    }

    // 3) Reset dữ liệu trận để sắp xếp lại tàu và chơi trận mới (không ai rời phòng)
    const resetRes = await resetGameToWaiting(gameId);
    return { error: resetRes.error, opponentId };
  };

  const leaveBattle = async (params: {
    gameId: string;
    userId: string;
    isHost: boolean;
  }) => {
    const { gameId, userId, isHost } = params;

    // 1) Người rời luôn bị tính 1 trận tham gia (không cộng win cho ai).
    await incrementMyTotalGames(userId);

    // 2) Cập nhật phòng tuỳ vai trò
    if (isHost) {
      // Host rời: giữ members, reset về waiting để cả phòng quay lại phòng chờ.
      return await resetGameToWaiting(gameId);
    }

    // Member rời: remove khỏi phòng, đồng thời reset phòng về waiting cho người còn lại.
    await handleRemoveMemberFromDB(userId, gameId);
    return await resetGameToWaiting(gameId);
  };

  const handleRemoveMemberFromDB = async (userId, gameId) => {
    // 1. Lấy dữ liệu hiện tại của game
    const { data: currentGame } = await supabase
      .from("games")
      .select("members, ready_members")
      .eq("id", gameId)
      .single();

    if (currentGame) {
      // 2. Loại bỏ userId khỏi cả hai mảng
      const newMembers = (currentGame.members || []).filter(
        (id) => id !== userId
      );
      const newReadyMembers = (currentGame.ready_members || []).filter(
        (id) => id !== userId
      );

      // 3. Cập nhật lại Database
      const { error } = await supabase
        .from("games")
        .update({
          members: newMembers,
          ready_members: newReadyMembers,
        })
        .eq("id", gameId);

      if (error) console.error("Lỗi khi xóa người chơi:", error.message);
    }
  };

  // 4. Realtime Subscription (Lắng nghe thay đổi)
  useEffect(() => {
    const channel = supabase
      .channel("lobby-updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "games" },
        () => fetchRooms()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    rooms,
    loading,
    isFinishing,
    fetchRooms,
    createRoom,
    joinRoom,
    deleteRoom,
    saveShipLayout,
    finishGame,
    subscribePresence,
    leaveBattle,
    resetGameToWaiting,
    surrenderAndResetForRematch,
    handleRemoveMemberFromDB,
  };
};
