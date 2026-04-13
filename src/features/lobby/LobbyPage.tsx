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
} from "zmp-ui";
import "@/css/children/LobbyPage.scss";
import { useSupabase } from "@/hooks/useSupabase";
import RoomCard from "./components/RoomCard";
import BottomNav from "@/components/BottomNav";
import { useUser } from "@/context/UserContext";
import { useCombatStore } from "@/hooks/useCombatStore";
import { Game } from "@/types/supabase/Game";

export const LobbyPage = () => {
  const { rooms, createRoom, joinRoom, fetchRooms, deleteRoom } = useSupabase();
  const { initGame, setIsBotMode } = useCombatStore();
  const navigate = useNavigate();
  const { openSnackbar } = useSnackbar();
  const { user } = useUser();
  const [myId, setMyId] = useState("");

  useEffect(() => {
    if (!user) {
      openSnackbar({ text: "Vui lòng đăng nhập!" });
      return;
    }
    setMyId(user.id);
    fetchRooms(); // Lấy dữ liệu lần đầu
  }, []);

  const handleCreate = async () => {
    const { data, error } = await createRoom(myId);
    if (error) {
      console.error(error);
      openSnackbar({ message: error.code });
      return;
    }
    // if (data) navigate(`/combat?gameId=${data.id}`);
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
    console.log("Joining room:", gameId);
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
    if (targetRoom.status === "playing") {
      // Nếu đang đánh nhau -> Vào thẳng bàn cờ
      navigate("/combat", { state: { gameId } });
    } else {
      // Nếu đang đợi -> Vào phòng chờ
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
      <BottomNav />
    </Page>
  );
};
