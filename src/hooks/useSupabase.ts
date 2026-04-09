// src/hooks/useSupabase.ts
import { useState, useEffect } from "react";
import { supabase } from "@/api/supabaseClient";
import { useSnackbar } from "zmp-ui";

export const useSupabase = () => {
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const { openSnackbar } = useSnackbar();

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

  const finishGame = async (gameId: string, winnerId: string) => {
    // Tránh gửi yêu cầu trùng lặp nếu đang xử lý
    if (isFinishing) return false;

    setIsFinishing(true);
    setLoading(true); // Có thể dùng loading chung để hiện Spinner overlay

    try {
      const { error } = await supabase.rpc("finish_game", {
        p_game_id: gameId,
        p_winner_id: winnerId,
      });

      if (error) throw error;

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
  };
};
