// src/hooks/useSupabase.ts
import { useState, useEffect } from "react";
import { supabase } from "@/api/supabaseClient";
import { useSnackbar } from "zmp-ui";
import { savePendingReconnect } from "@/utils/pending-reconnect";
import { useGameLifecycle } from "@/context/GameLifecycleContext";
import { GAME_LIFECYCLE_DEFAULTS } from "@/constants/game-lifecycle";

const ROOM_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateRoomCode(length = 6) {
  let code = "";
  for (let i = 0; i < length; i += 1) {
    code += ROOM_CODE_ALPHABET[Math.floor(Math.random() * ROOM_CODE_ALPHABET.length)];
  }
  return code;
}

export const useSupabase = () => {
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const { openSnackbar } = useSnackbar();
  const { settings: lifecycle } = useGameLifecycle();
  const reconnectGrace =
    lifecycle.reconnect_grace ?? GAME_LIFECYCLE_DEFAULTS.reconnect_grace;
  const maxMembers1vs1 =
    lifecycle.max_members_1vs1 ?? GAME_LIFECYCLE_DEFAULTS.max_members_1vs1;

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
    if (!userId) {
      return { data: null, error: { message: "Thiếu player id." } };
    }
    let lastError: { message?: string } | null = null;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const { data, error } = await supabase
        .from("games")
        .insert([
          {
            room_name: "BattleShip",
            room_code: generateRoomCode(),
            host_id: userId,
            members: [userId],
            status: "waiting",
          },
        ])
        .select()
        .single();

      if (!error && data) return { data, error: null };
      lastError = error;
      const code = (error as { code?: string } | null)?.code;
      const msg = String(error?.message || "");
      if (code === "23505" && msg.includes("unique_waiting_room_per_user")) {
        const { data: existing } = await supabase
          .from("games")
          .select("*")
          .eq("host_id", userId)
          .eq("status", "waiting")
          .maybeSingle();
        if (!existing) continue;
        const others = (existing.members || []).filter(
          (id: string) => id && id !== userId
        );
        if (others.length === 0) {
          await supabase.from("games").delete().eq("id", existing.id);
          continue;
        }
        return { data: existing, error: null };
      }
      if (code === "23505" || msg.toLowerCase().includes("duplicate")) {
        continue;
      }
      return { data: null, error };
    }
    return { data: null, error: lastError };
  };

  const leaveRoom = async (gameId: string, userId: string) => {
    if (!gameId || gameId === "###" || !userId) {
      return { error: null };
    }
    const { error } = await supabase.rpc("leave_game_room", {
      room_id: gameId,
      leaving_user_id: userId,
    });
    if (error) console.error("Lỗi rời phòng:", error.message);
    return { error };
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

  const joinRoomByCode = async (rawCode: string, userId: string) => {
    const roomCode = rawCode.trim().toUpperCase();
    if (!roomCode) {
      return { data: null, error: { message: "Nhập mã phòng." } };
    }

    const { data, error } = await supabase
      .from("games")
      .select("*")
      .eq("room_code", roomCode)
      .in("status", ["waiting", "setup", "playing"])
      .maybeSingle();

    if (error) return { data: null, error };
    if (!data) return { data: null, error: { message: "Không tìm thấy phòng." } };

    const graceActive =
      data.disconnected_user_id &&
      data.reconnect_until &&
      new Date(data.reconnect_until).getTime() > Date.now();

    if (
      graceActive &&
      data.disconnected_user_id !== userId &&
      !(data.members || []).includes(userId)
    ) {
      return {
        data: null,
        error: { message: "Phòng đang chờ người chơi kết nối lại." },
      };
    }

    if (graceActive && data.disconnected_user_id === userId) {
      const { ok, error: reconnectErr } = await reconnectToGame(data.id, userId);
      if (reconnectErr || !ok) {
        return {
          data: null,
          error: reconnectErr || { message: "Hết thời gian kết nối lại." },
        };
      }
      const { data: refreshed } = await supabase
        .from("games")
        .select("*")
        .eq("id", data.id)
        .single();
      return { data: refreshed || data, error: null };
    }

    const alreadyIn =
      data.host_id === userId || (data.members || []).includes(userId);

    // setup / playing: chỉ member hiện có được vào lại; không nhận người mới.
    if (!alreadyIn && (data.status === "setup" || data.status === "playing")) {
      return {
        data: null,
        error: {
          message:
            data.status === "setup"
              ? "Phòng đang dàn trận. Chỉ thành viên mới vào lại được."
              : "Phòng đang chiến đấu. Chỉ thành viên mới vào lại được.",
        },
      };
    }

    if (!alreadyIn) {
      // 1vs1 rooms are limited to 2 members.
      if (
        (data.game_mode ?? "1vs1") === "1vs1" &&
        (data.members?.length ?? 0) >= maxMembers1vs1
      ) {
        return {
          data: null,
          error: { message: `Phòng (1vs1) đã đủ ${maxMembers1vs1} người.` },
        };
      }

      const { error: joinError } = await joinRoom(data.id, userId);
      if (joinError) return { data: null, error: joinError };
    }

    return { data, error: null };
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
    // Về phòng chờ (lobby waiting). Dùng sau khi một người out hẳn.
    const { error: gameErr } = await supabase
      .from("games")
      .update({
        status: "waiting",
        current_turn: null,
        winner_id: null,
        ready_members: [],
        disconnected_user_id: null,
        reconnect_until: null,
      })
      .eq("id", gameId);

    await supabase.from("moves").delete().eq("game_id", gameId);
    await supabase.from("game_boards").delete().eq("game_id", gameId);

    return { error: gameErr ?? null };
  };

  /** Rematch / rút quân: cả hai ở lại Combat, quay lại dàn tàu (setup). */
  const resetGameToSetup = async (gameId: string) => {
    const { error: gameErr } = await supabase
      .from("games")
      .update({
        status: "setup",
        current_turn: null,
        winner_id: null,
        ready_members: [],
        disconnected_user_id: null,
        reconnect_until: null,
      })
      .eq("id", gameId);

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

    // 3) Reset về setup để sắp xếp lại tàu (không ai rời phòng)
    const resetRes = await resetGameToSetup(gameId);
    return { error: resetRes.error, opponentId };
  };

  const requestLeaveWithReconnect = async (params: {
    gameId: string;
    userId: string;
    graceSeconds?: number;
  }) => {
    const {
      gameId,
      userId,
      graceSeconds = reconnectGrace,
    } = params;

    const { data: gameRow } = await supabase
      .from("games")
      .select("status, room_code")
      .eq("id", gameId)
      .maybeSingle();

    if (gameRow?.status !== "playing") {
      return leaveBattle({ gameId, userId });
    }

    const { error } = await supabase.rpc("request_leave_with_reconnect", {
      p_game_id: gameId,
      p_user_id: userId,
      p_grace_seconds: graceSeconds,
    });
    if (error) {
      console.error("request_leave_with_reconnect:", error.message);
      return { error, roomCode: null as string | null };
    }

    const until = new Date(Date.now() + graceSeconds * 1000).toISOString();
    const roomCode = gameRow.room_code || "";
    savePendingReconnect({ gameId, roomCode, until });
    return { error: null, roomCode };
  };

  const reconnectToGame = async (gameId: string, userId?: string) => {
    const { data: gameRow } = await supabase
      .from("games")
      .select("disconnected_user_id, members")
      .eq("id", gameId)
      .maybeSingle();

    const resolvedUserId =
      userId ||
      gameRow?.disconnected_user_id ||
      gameRow?.members?.[0] ||
      "";

    if (!resolvedUserId) {
      return { ok: false, error: { message: "Thiếu player id." } };
    }

    const { data: ok, error } = await supabase.rpc("reconnect_to_game", {
      p_game_id: gameId,
      p_user_id: resolvedUserId,
    });

    if (error) {
      console.error("reconnect_to_game:", error.message);
      return { ok: false, error };
    }

    return { ok: Boolean(ok), error: null };
  };

  const finalizeDisconnectedLeave = async (
    gameId: string,
    force = false
  ) => {
    const { error } = await supabase.rpc("finalize_disconnected_leave", {
      p_game_id: gameId,
      p_force: force,
    });
    if (error) console.error("finalize_disconnected_leave:", error.message);
    return { error };
  };

  const leaveBattle = async (params: {
    gameId: string;
    userId: string;
  }) => {
    const { gameId, userId } = params;

    const { data: gameRow } = await supabase
      .from("games")
      .select("status, members")
      .eq("id", gameId)
      .maybeSingle();

    const wasPlaying = gameRow?.status === "playing";

    if (wasPlaying) {
      const { error: forfeitErr } = await supabase.rpc("forfeit_game_on_leave", {
        p_game_id: gameId,
      });
      if (forfeitErr) {
        console.error("forfeit_game_on_leave:", forfeitErr.message);
        return { error: forfeitErr };
      }
    }

    await leaveRoom(gameId, userId);

    const { data: stillThere } = await supabase
      .from("games")
      .select("id")
      .eq("id", gameId)
      .maybeSingle();
    if (!stillThere) return { error: null };

    const resetRes = await resetGameToWaiting(gameId);
    return { error: resetRes.error };
  };

  const handleRemoveMemberFromDB = async (userId: string, gameId: string) => {
    await leaveRoom(gameId, userId);
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
    joinRoomByCode,
    deleteRoom,
    saveShipLayout,
    finishGame,
    subscribePresence,
    leaveRoom,
    requestLeaveWithReconnect,
    reconnectToGame,
    finalizeDisconnectedLeave,
    leaveBattle,
    resetGameToWaiting,
    resetGameToSetup,
    surrenderAndResetForRematch,
    handleRemoveMemberFromDB,
  };
};
