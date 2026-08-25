import { useEffect, useState } from "react";
import {
  Page,
  Tabs,
  Box,
  Button,
  Icon,
  Header,
  useSnackbar,
  useNavigate,
  Text,
} from "zmp-ui";
import "@/css/features/lobby.scss";
import { useSupabase } from "@/hooks/useSupabase";
import RoomCard from "./components/RoomCard";
import { JoinRoomCode } from "./components/JoinRoomCode";
import { ReconnectBanner } from "./components/ReconnectBanner";
import { CreateRoomSheet } from "./components/CreateRoomSheet";
import { JoinPasswordSheet } from "./components/JoinPasswordSheet";
import { useUser } from "@/context/UserContext";
import { useCombatStore } from "@/hooks/useCombatStore";
import { Game } from "@/types/supabase/Game";

export const LobbyPage = () => {
  const { rooms, createRoom, joinRoom, fetchRooms, deleteRoom } = useSupabase();
  const { initGame, setIsBotMode } = useCombatStore();
  const navigate = useNavigate();
  const { openSnackbar } = useSnackbar();
  const { user, isGuest, loading: userLoading } = useUser();
  const myId = user?.id || "";

  const [showCreateSheet, setShowCreateSheet] = useState(false);
  const [creating, setCreating] = useState(false);
  const [joinTarget, setJoinTarget] = useState<Game | null>(null);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (userLoading) return;
    if (!user?.id) {
      openSnackbar({ text: "Chưa có phiên chơi." });
      return;
    }
    fetchRooms();
  }, [userLoading, user?.id]);

  const runCreate = async (password?: string) => {
    if (!user?.id) {
      openSnackbar({ text: "Chưa có phiên chơi." });
      return;
    }
    setCreating(true);
    const { data, error } = await createRoom(
      user.id,
      password ? { password } : undefined
    );
    setCreating(false);
    if (error || !data) {
      openSnackbar({
        text: error?.message || "Không tạo được phòng.",
        type: "error",
      });
      return;
    }
    setShowCreateSheet(false);
    navigate(`/waiting`, { state: { gameId: data.id } });
  };

  const handleDelete = async (gameId: string) => {
    const { error } = await deleteRoom(gameId, myId);
    if (error) {
      openSnackbar({
        text: "Không thể xóa phòng: " + error.message,
        type: "error",
      });
    } else {
      openSnackbar({
        text: "Đã giải tán phòng thành công!",
        type: "success",
      });
      fetchRooms();
    }
  };

  const enterRoom = (targetRoom: Game) => {
    initGame(targetRoom, user, false);
    if (targetRoom.status === "playing" || targetRoom.status === "setup") {
      navigate("/combat", { state: { gameId: targetRoom.id } });
    } else {
      navigate("/waiting", { state: { gameId: targetRoom.id } });
    }
  };

  const handleJoin = async (gameId: string, game: Game) => {
    if (!gameId || !game) return;
    const isBotMode = gameId === "###";
    initGame(game, user, isBotMode);
    if (isBotMode) {
      setIsBotMode(true);
      navigate("/combat", { state: { gameId } });
      return;
    }

    const targetRoom = rooms.find((r) => r.id === gameId) || game;
    if (!targetRoom) return;

    const isMember = targetRoom.members?.includes(myId);
    const isHost = targetRoom.host_id === myId;

    if (!isMember && !isHost) {
      if (targetRoom.status === "setup" || targetRoom.status === "playing") {
        openSnackbar({
          text:
            targetRoom.status === "setup"
              ? "Phòng đang dàn trận. Chỉ thành viên mới vào lại được."
              : "Phòng đang chiến đấu. Chỉ thành viên mới vào lại được.",
          type: "error",
        });
        return;
      }
      if (targetRoom.status === "finished") {
        openSnackbar({ text: "Phòng đã kết thúc.", type: "error" });
        return;
      }
      if (targetRoom.has_password) {
        setJoinTarget(targetRoom);
        return;
      }
      setJoining(true);
      const { error } = await joinRoom(gameId, myId);
      setJoining(false);
      if (error) {
        openSnackbar({
          text: "Không thể vào phòng: " + error.message,
          type: "error",
        });
        return;
      }
    }

    enterRoom(targetRoom);
  };

  const handlePasswordJoin = async (password: string) => {
    if (!joinTarget || !myId) return;
    setJoining(true);
    const { error } = await joinRoom(joinTarget.id, myId, password);
    setJoining(false);
    if (error) {
      openSnackbar({
        text: error.message?.includes("Sai mật khẩu")
          ? "Sai mật khẩu phòng."
          : "Không thể vào phòng: " + error.message,
        type: "error",
      });
      return;
    }
    const room = joinTarget;
    setJoinTarget(null);
    enterRoom(room);
  };

  const waitingRooms = rooms;
  const friendRooms = rooms.filter(
    (r) => (r.members || []).includes(myId) && r.host_id !== myId
  );
  const botRooms = [
    {
      id: "###",
      room_name: "Bot Mode",
      host_id: myId,
      members: [myId],
      status: "waiting",
    },
  ];

  return (
    <Page className="lobby-page">
      <Header
        title="Lobby"
        textColor="#22d3ee"
        backgroundColor="#061421"
        showBackIcon={false}
      />
      <Box className="lobby-page__top">
        {isGuest && (
          <Text size="xSmall" className="text-cyan-600 mb-3 uppercase tracking-wider">
            Guest — nhập mã rồi Vào, hoặc bấm + để tạo phòng. Lượt đi / thắng
            dùng ID phiên web, không ghi profiles.
          </Text>
        )}
        <ReconnectBanner />
        <JoinRoomCode enterFullWidth />
      </Box>
      <Box className="lobby-page__tabs">
        <Tabs id="lobby-tabs">
          <Tabs.Tab key="all" label="TẤT CẢ PHÒNG" className="lobby-tabs">
            <Box className="lobby-tab-panel">
              {waitingRooms.map((room) => (
                <RoomCard
                  key={room.id}
                  room={room}
                  onJoin={handleJoin}
                  onDelete={handleDelete}
                  myId={myId}
                />
              ))}
            </Box>
          </Tabs.Tab>
          <Tabs.Tab key="friends" label="PHÒNG BẠN BÈ" className="lobby-tabs">
            <Box className="lobby-tab-panel">
              {friendRooms.map((room) => (
                <RoomCard
                  key={room.id}
                  room={room}
                  onJoin={handleJoin}
                  onDelete={handleDelete}
                  myId={myId}
                />
              ))}
            </Box>
          </Tabs.Tab>
          <Tabs.Tab key="bot" label="PHÒNG BOT" className="lobby-tabs">
            <Box className="lobby-tab-panel">
              {botRooms.map((room) => (
                <RoomCard
                  key={room.id}
                  room={room}
                  onJoin={handleJoin}
                  myId={myId}
                />
              ))}
            </Box>
          </Tabs.Tab>
        </Tabs>
      </Box>

      <Button
        className="fab-button"
        icon={<Icon icon="zi-plus" />}
        onClick={() => setShowCreateSheet(true)}
      />

      <CreateRoomSheet
        visible={showCreateSheet}
        busy={creating}
        onClose={() => setShowCreateSheet(false)}
        onQuickCreate={() => void runCreate()}
        onCreateWithPassword={(pw) => void runCreate(pw)}
      />

      <JoinPasswordSheet
        visible={!!joinTarget}
        roomCode={joinTarget?.room_code}
        busy={joining}
        onClose={() => setJoinTarget(null)}
        onSubmit={(pw) => void handlePasswordJoin(pw)}
      />
    </Page>
  );
};
