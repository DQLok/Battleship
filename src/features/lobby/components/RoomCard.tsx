import React from "react";
import { Box, Text, Button, Avatar, Icon } from "zmp-ui";

interface RoomCardProps {
  room: any;
  myId: string;
  onJoin: (gameId: string) => void;
}

const RoomCard = ({ room, myId, onJoin }: RoomCardProps) => {
  const isFull = room.player_2 !== null;
  const isMine = room.player_1 === myId;
  const host = room.host; // Data join từ bảng profiles

  return (
    <Box
      className="relative overflow-hidden mb-4"
      style={{
        background: "rgba(10, 26, 31, 0.9)",
        borderLeft: "4px solid #00e5ff",
        boxShadow: "0 0 15px rgba(0, 229, 255, 0.1)",
        borderRadius: "4px",
      }}
    >
      {/* Header: ID và Số lượng người */}
      <Box
        flex
        flexDirection="row"
        justifyContent="space-between"
        p={3}
        className="border-b border-gray-800"
      >
        <Box flex flexDirection="row" alignItems="center">
          <Text
            size="xxSmall"
            className="px-2 py-0.5 bg-cyan-900 text-cyan-400 rounded mr-2 uppercase font-bold"
          >
            #{room.id.slice(0, 4)}
          </Text>
          <Text
            size="small"
            bold
            className="text-white uppercase tracking-widest"
          >
            {room.status === "playing" ? "In Battle" : "Waiting"}
          </Text>
        </Box>
        <Box flex alignItems="center" className="text-cyan-400">
          <Icon icon="zi-user" size={14} />
          <Text size="small" className="ml-1 font-mono">
            {isFull ? "2/2" : "1/2"}
          </Text>
        </Box>
      </Box>

      {/* Body: Thông tin chủ phòng */}
      <Box p={3} flex flexDirection="row" alignItems="center">
        <div className="relative">
          <Avatar
            src={host?.avatar_url}
            size={48}
            className="border border-cyan-500 p-0.5"
          />
          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[#0a1a1f]"></div>
        </div>

        <Box ml={3} flex flexDirection="column">
          <Text size="xSmall" className="text-cyan-600 font-bold uppercase">
            Host Commander
          </Text>
          <Text bold className="text-gray-100 text-lg">
            {host?.username || "Unknown Captain"}
          </Text>
        </Box>
      </Box>

      {/* Footer: Nút bấm */}
      <Box px={3} pb={3}>
        <Button
          fullWidth
          disabled={isFull || isMine}
          onClick={() => onJoin(room.id)}
          className={`h-10 uppercase font-bold tracking-tighter ${
            isFull || isMine
              ? "bg-gray-800 text-gray-500"
              : "bg-gradient-to-r from-cyan-700 to-cyan-400 text-black active:opacity-80"
          }`}
          style={{
            borderRadius: "2px",
            border: "none",
          }}
        >
          {isMine ? "Phòng của bạn" : isFull ? "Full Room" : "Tham gia"}
        </Button>
      </Box>

      {/* Trang trí góc (Glow effect) */}
      <div className="absolute top-0 right-0 w-16 h-16 bg-cyan-500 opacity-5 blur-3xl pointer-events-none"></div>
    </Box>
  );
};

export default RoomCard;
