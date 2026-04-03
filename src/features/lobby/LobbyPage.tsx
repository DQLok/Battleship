import React, { useEffect, useState } from "react";
import {
  Page,
  Tabs,
  Box,
  Button,
  Avatar,
  Text,
  Icon,
  Header,
  SnackbarProvider,
  useSnackbar,
} from "zmp-ui";
import { useSupabase } from "@/hooks/useSupabase";
import { getUserInfo } from "zmp-sdk";
import { useNavigate } from "react-router-dom";
import RoomCard from "./components/RoomCard";
import BottomNav from "@/components/BottomNav";

export const LobbyPage = () => {
  const { rooms, createRoom, joinRoom, fetchRooms } = useSupabase();
  const [myId, setMyId] = useState("");
  const navigate = useNavigate();
  const { openSnackbar } = useSnackbar();

  useEffect(() => {
    getUserInfo({}).then((res) => setMyId(res.userInfo.id));
    fetchRooms(); // Lấy dữ liệu lần đầu
  }, []);

  const handleCreate = async () => {
    const { data, error } = await createRoom(myId);
    if (error) {
      console.error(error);
      openSnackbar({ message: error.code });
      return;
    }
    if (data) navigate(`/combat?gameId=${data.id}`);
  };

  const handleJoin = async (gameId: string) => {
    const { error } = await joinRoom(gameId, myId);
    if (!error) navigate(`/combat?gameId=${gameId}`);
  };

  // Logic phân loại phòng cho 2 Tab
  const waitingRooms = rooms.filter((r) => r.status === "waiting");
  const friendRooms = rooms.filter(
    (r) => r.status === "waiting" && r.player_1 !== myId
  );

  return (
    <Page className="bg-tactical-dark pt-16">
      <Header title="Lobby" textColor="#22d3ee" backgroundColor="#061421" />
      <Tabs id="lobby-tabs">
        <Tabs.Tab
          key="all"
          label="TẤT CẢ PHÒNG"
          style={{ backgroundColor: "#061421" }}
        >
          <Box p={4}>
            {waitingRooms.map((room) => (
              <RoomCard
                key={room.id}
                room={room}
                onJoin={handleJoin}
                myId={myId}
              />
            ))}
          </Box>
        </Tabs.Tab>
        <Tabs.Tab key="friends" label="PHÒNG BẠN BÈ">
          <Box p={4}>
            {friendRooms.map((room) => (
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

      <div className="fixed bottom-20 right-6 z-50">
        <Button
          className="fab-button"
          icon={<Icon icon="zi-plus" />}
          onClick={handleCreate}
        />
      </div>
      <BottomNav />
    </Page>
  );
};
