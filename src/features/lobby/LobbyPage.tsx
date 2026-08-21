import { useEffect } from "react";
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

  useEffect(() => {
    if (userLoading) return;
    if (!user?.id) {
      openSnackbar({ text: "Chưa có phiên chơi." });
      return;
    }
    fetchRooms();
  }, [userLoading, user?.id]);

  const handleCreate = async () => {
    if (!user?.id) {
      openSnackbar({ text: "Chưa có phiên chơi." });
      return;
    }
    const { data, error } = await createRoom(user.id);
    if (error || !data) {
      console.error(error);
      openSnackbar({
        text: error?.message || "Không tạo được phòng.",
        type: "error",
      });
      return;
    }
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
      fetchRooms(); // Tải lại danh sách
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
    // 1. Tìm thông tin phòng hiện tại trong danh sách rooms đã fetch
    const targetRoom = rooms.find((r) => r.id === gameId);
    if (!targetRoom) return;

    // 2. Nếu người chơi chưa có trong phòng, hãy gọi RPC để gia nhập
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
      const { error } = await joinRoom(gameId, myId);
      if (error) {
        openSnackbar({
          message: "Không thể vào phòng: " + error.message,
          type: "error",
        });
        return;
      }
    }

    // 3. Điều hướng dựa trên trạng thái (Status) của phòng
    if (targetRoom.status === "playing" || targetRoom.status === "setup") {
      navigate("/combat", { state: { gameId } });
    } else {
      navigate("/waiting", { state: { gameId } });
    }
  };

  // Logic phân loại phòng cho 2 Tab
  const waitingRooms = rooms; //.filter((r) => r.status === "waiting");
  const friendRooms = rooms.filter(
    (r) => (r.members || []).includes(myId) && r.host_id !== myId
  );
  const botRooms = [
    {
      id: "###",
      rooms_name: "Bot Mode",
      host_id: myId,
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
      <Box p={4} className="pb-0">
        {isGuest && (
          <Text size="xSmall" className="text-cyan-600 mb-3 uppercase tracking-wider">
            Guest — tạo phòng (nút +) hoặc nhập mã để tham gia. Lượt đi / thắng
            dùng ID phiên web, không ghi profiles.
          </Text>
        )}
        <ReconnectBanner />
        <JoinRoomCode />
        <Button className="lobby-create" fullWidth onClick={handleCreate}>
          Tạo phòng
        </Button>
      </Box>
      <Tabs id="lobby-tabs">
        <Tabs.Tab key="all" label="TẤT CẢ PHÒNG" className="lobby-tabs">
          <Box p={4}>
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
          <Box p={4}>
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
          <Box p={4}>
            {botRooms.map((room) => (
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
      </Tabs>

      <Button
        className="fab-button"
        icon={<Icon icon="zi-plus" />}
        onClick={handleCreate}
      />
    </Page>
  );
};
