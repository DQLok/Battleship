// src/hooks/useSupabase.ts
import { useState, useEffect } from "react";
import { supabase } from "@/api/supabaseClient";

export const useSupabase = () => {
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

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
    if (!data || data.length === 0) {
      setRooms([
        {
          id: "0",
          player_1: "",
          player_2: "",
          current_turn: "",
          status: "waiting",
          created_at: "",
        },
        {
          id: "1",
          player_1: "0",
          player_2: "",
          current_turn: "",
          status: "waiting",
          created_at: "",
        },
      ]);
    }
    console.log(rooms);
    setLoading(false);
  };

  // 2. Tạo phòng mới
  const createRoom = async (userId: string) => {
    const { data, error } = await supabase
      .from("games")
      .insert([
        {
          player_1: userId,
          status: "waiting",
          current_turn: userId,
        },
      ])
      .select()
      .single();

    return { data, error };
  };

  // 3. Tham gia phòng
  const joinRoom = async (gameId: string, userId: string) => {
    const { error } = await supabase
      .from("games")
      .update({
        player_2: userId,
        status: "playing",
      })
      .eq("id", gameId);

    return { error };
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

  return { rooms, loading, fetchRooms, createRoom, joinRoom };
};
