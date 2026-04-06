import React, { useEffect, useState } from "react";
import { Icon, Button, useNavigate, Box, Header, Page } from "zmp-ui";
import { supabase } from "@/api/supabaseClient";
import { useLocation } from "react-router-dom";
import { Profile } from "@/types/supabase/Profile";
import { PlayerItem } from "./components/PlayerItem";
import { getUserInfo } from "zmp-sdk";

const generateFakePlayers = (count: number): Profile[] => {
  const names = [
    "ADMIRAL_VNG",
    "CAPTAIN_X",
    "NAVIGATOR_88",
    "LT_KIM",
    "STRIKER_ALPHA",
    "RECON_EYE",
    "VULCAN_7",
    "SHADOW_OPS",
  ];

  return Array.from({ length: count }).map((_, index) => {
    // Tạo một chuỗi ngẫu nhiên làm seed (ví dụ: "a1b2c3")
    const randomSeed = Math.random().toString(36).substring(2, 7);

    return {
      id: `fake-id-${randomSeed}-${index}`,
      username:
        names[Math.floor(Math.random() * names.length)] + "_" + (index + 1),
      // Truyền randomSeed vào đây để DiceBear tự vẽ hình mới
      avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${randomSeed}`,
    };
  }) as Profile[];
};

export const WaitingRoom = () => {
  const navigate = useNavigate();
  const { state } = useLocation(); // Giả sử bạn truyền gameId qua đây
  const gameId = state?.gameId || "ROOM_ID_HERE";

  const [game, setGame] = useState<any>(null);
  const [players, setPlayers] = useState<Profile[]>([]);
  const [myId, setMyId] = useState("");

  const handleAction = async () => {
    if (!game) return;    

    if (game.host_id === myId) {
      // --- KỊCH BẢN CHO HOST: BẮT ĐẦU GAME ---
      const { error } = await supabase
        .from("games")
        .update({
          status: "playing",
          current_turn: myId, // Host đi trước
        })
        .eq("id", gameId);

      if (!error) {
        // Sau khi update, dùng Realtime để tất cả cùng chuyển trang
        // hoặc navigate trực tiếp cho host
        navigate("/combat", { state: { gameId } });
      }
    } else {
      // --- KỊCH BẢN CHO MEMBER: SẴN SÀNG ---
      // Kiểm tra xem đã sẵn sàng chưa để toggle (thêm/xóa khỏi mảng)
      const isReady = game.ready_members?.includes(myId);
      const newReadyList = isReady
        ? game.ready_members.filter((id) => id !== myId)
        : [...(game.ready_members || []), myId];

      await supabase
        .from("games")
        .update({ ready_members: newReadyList })
        .eq("id", gameId);
    }
  };

  // 1. Fetch dữ liệu phòng và người chơi
  const fetchData = async () => {
    console.log(gameId+", "+myId);
    const { data: gameData } = await supabase
      .from("games")
      .select("*")
      .eq("id", gameId)
      .single();

    if (gameData) {
      const fakePlayers = generateFakePlayers(6);
      setGame(gameData);
      // Fetch thông tin profile của tất cả members trong mảng
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .in("id", gameData.members);
      if (profiles) setPlayers([...profiles, ...fakePlayers] as Profile[]);
    }
  };

  // 2. Realtime lắng nghe thay đổi (Khi có người Join/Leave)
  useEffect(() => {
    getUserInfo({}).then((res) => setMyId(res.userInfo.id));
    fetchData();

    const channel = supabase
      .channel(`lobby-${gameId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "games",
          filter: `id=eq.${gameId}`,
        },
        (payload) => {
          const updatedGame = payload.new;
          setGame(updatedGame);

          // Nếu Host đã đổi status sang 'playing', các máy khách tự động chuyển trang
          if (updatedGame.status === "playing") {
            navigate("/game-play", { state: { gameId } });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId]);

  return (
    <Page className="min-h-screen pt-20 bg-[#05161A] text-cyan-400 font-mono p-4 flex flex-col relative overflow-hidden">
      {/* Header */}
      <Header
        title="BATTLE LOBBY"
        textColor="#22d3ee"
        backgroundColor="#061421"
      />
      {/* Background Grid Pattern */}
      <div
        className="fixed inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(#00FFFF 1px, transparent 1px), linear-gradient(90deg, #00FFFF 1px, transparent 1px)",
          //   size: "20px 20px",
        }}
      ></div>

      {/* Room ID Box */}
      <div className="bg-[#07242B] border border-cyan-900 p-3 mb-6 flex justify-between items-center">
        <div>
          <p className="text-[10px] text-cyan-700 uppercase">Command Deck</p>
          <p className="text-xl font-bold">
            #{game?.id?.slice(0, 4).toUpperCase() || "1234"}
          </p>
        </div>
        <div className="flex items-center gap-2 bg-[#0A323B] px-3 py-1 rounded-full border border-cyan-500/30">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-xs uppercase">Public</span>
        </div>
      </div>

      {/* Team Section */}
      <Box className="flex-1 z-10 overflow-y-auto pr-1 no-scrollbar space-y-8">
        {/* --- TEAM ALPHA --- */}
        <Box>
          <div className="flex justify-between items-center mb-4 border-b border-cyan-900 pb-1 bg-transparent z-20">
            <h2 className="text-sm font-bold flex items-center gap-2">
              <Icon icon="zi-group" className="text-cyan-400" /> TEAM ALPHA
            </h2>
            <span className="text-[10px] text-cyan-700">
              {Math.min(players.length, 4)} / 4 Connected
            </span>
          </div>

          <div className="space-y-3">
            {renderTeamSlots(players.slice(0, 4), "alpha", game, myId)}
          </div>
        </Box>

        {/* --- TEAM BRAVO --- */}
        <Box>
          <div className="flex justify-between items-center mb-4 border-b border-red-900/50 pb-1 sticky top-0 bg-[#05161A] z-20">
            <h2 className="text-sm font-bold flex items-center gap-2 text-red-400">
              <Icon icon="zi-group" /> TEAM BRAVO
            </h2>
            <span className="text-[10px] text-red-900">
              {Math.max(0, Math.min(players.length - 4, 4))} / 4 Connected
            </span>
          </div>

          <div className="space-y-3">
            {renderTeamSlots(players.slice(4, 8), "bravo", game, myId)}
          </div>
        </Box>
      </Box>

      {/* Footer Actions */}
      <div className="mt-auto flex gap-4 pt-6 z-10">
        <button className="p-4 border border-cyan-500 bg-[#0A262E] text-cyan-400">
          <Icon icon="zi-chat" />
        </button>

        <button
          onClick={handleAction}
          className="flex-1 bg-cyan-400 hover:bg-cyan-300 text-black font-black py-4 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,255,255,0.5)] transition-all active:scale-95 uppercase tracking-tighter"
        >
          <Icon icon="zi-play-solid" />
          {game?.host_id === myId ? "BẮT ĐẦU" : "SẴN SÀNG"}
        </button>

        <button className="p-4 border border-cyan-500 bg-[#0A262E] text-cyan-400">
          <Icon icon="zi-share" />
        </button>
      </div>
    </Page>
  );
};

const renderTeamSlots = (
  teamPlayers: Profile[],
  teamType: "alpha" | "bravo",
  game: any,
  myId: string
) => {
  const MAX_SLOTS = 4;
  // SỬA Ở ĐÂY: Thêm kiểu dữ liệu React.ReactNode[] cho mảng slots
  const slots: React.ReactNode[] = [];

  for (let i = 0; i < MAX_SLOTS; i++) {
    if (teamPlayers[i]) {
      // Nếu có người chơi thật tại vị trí này
      slots.push(
        <PlayerItem
          key={teamPlayers[i].id}
          player={teamPlayers[i]}
          game={game}
          myId={myId}
          role={i === 0 ? "Commander" : "Crew"}
          teamColor={
            teamType === "alpha" ? "border-cyan-400" : "border-red-500"
          }
        />
      );
    } else {
      // Nếu vị trí này trống -> Hiển thị Slot chờ
      slots.push(
        <div key={`empty-${teamType}-${i}`} className="relative group">
          <div
            className={`flex items-center justify-between p-3 bg-slate-900/10 border-l-4 border-dashed ${
              teamType === "alpha" ? "border-cyan-900/30" : "border-red-900/30"
            } opacity-40`}
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded border border-dashed border-slate-800 flex items-center justify-center">
                <Icon icon="zi-user" className="text-slate-800" size={20} />
              </div>
              <div>
                <p className="text-slate-700 font-bold text-xs uppercase tracking-widest italic">
                  Awaiting Unit...
                </p>
                <p className="text-[9px] text-slate-800 font-mono italic">
                  EMPTY_SLOT_0{i + 1}
                </p>
              </div>
            </div>
            <div className="text-[8px] text-slate-900 uppercase font-mono">
              Standby
            </div>
          </div>
        </div>
      );
    }
  }
  return slots;
};
