import React from "react";
import { Box, Text, Button, Avatar, Icon, useNavigate } from "zmp-ui";

interface RoomCardProps {
  room: any;
  myId: string;
  onJoin: (gameId: string) => void;
  onDelete: (gameId: string) => void;
}

const RoomCard = ({ room, myId, onJoin, onDelete }: RoomCardProps) => {
  const memberCount = room.members?.length || 0;
  const isFull = memberCount >= 8;
  const isMine = room.host_id === myId;
  const isPlaying = room.status === "playing";
  const host = room.host;
  const navigate = useNavigate();
  const isOnline = room.id !== "###";

  // Hàm xử lý điều hướng chung dựa trên status
  const goToRoom = () => {
    const targetPath = isPlaying || !isOnline ? "/combat" : "/waiting";
    navigate(targetPath, { state: { gameId: room.id } });
  };

  const handleAction = (e: React.MouseEvent, callback: () => void) => {
    e.stopPropagation();
    callback();
  };

  return (
    <Box
      className="relative overflow-hidden mb-4 transition-all active:scale-[0.98] cursor-pointer"
      onClick={goToRoom}
      style={{
        background: isMine ? "rgba(20, 40, 45, 0.95)" : "rgba(10, 26, 31, 0.9)",
        borderLeft: isMine
          ? "4px solid #facc15"
          : isPlaying
          ? "4px solid #ef4444"
          : "4px solid #00e5ff",
        boxShadow: isMine
          ? "0 0 20px rgba(250, 204, 21, 0.15)"
          : "0 0 15px rgba(0, 229, 255, 0.1)",
        borderRadius: "4px",
      }}
    >
      {/* Header: ID và Status */}
      {isOnline && (
        <Box
          flex
          flexDirection="row"
          justifyContent="space-between"
          p={3}
          className="border-b border-gray-800/50"
        >
          <Box flex flexDirection="row" alignItems="center">
            <Text
              size="xxSmall"
              className={`rounded mr-2 uppercase font-bold ${
                isMine
                  ? "bg-yellow-900 text-yellow-400"
                  : "bg-cyan-900 text-cyan-400"
              }`}
            >
              #{room.id.slice(0, 4).toUpperCase()}
            </Text>
            <Text
              size="small"
              bold
              className={`${
                isPlaying ? "text-red-500 animate-pulse" : "text-green-400"
              } uppercase tracking-widest`}
            >
              {isPlaying ? "• In Battle" : "• Waiting"}
            </Text>
          </Box>

          <Box
            flex
            alignItems="center"
            className={isPlaying ? "text-red-400" : "text-cyan-400"}
          >
            <Icon icon="zi-group" size={14} style={{ marginRight: 4 }} />
            {memberCount}
          </Box>
        </Box>
      )}

      {/* Body: Host Info */}
      <Box p={3} flex flexDirection="row" alignItems="center">
        <div className="relative">
          <Avatar
            src={host?.avatar_url}
            size={48}
            className={`border p-0.5 ${
              isMine ? "border-yellow-500" : "border-cyan-500"
            }`}
          />
          {isMine && (
            <div className="absolute -top-1 -left-1 bg-yellow-500 text-[8px] px-1 font-black text-black rounded-sm shadow-lg">
              HOST
            </div>
          )}
        </div>

        <Box ml={3} flex flexDirection="column">
          <Text
            size="xSmall"
            className="text-cyan-600 font-bold uppercase tracking-tighter"
          >
            {room.room_name || "STRATEGY_DECK"}
          </Text>
          <Text bold className="text-gray-100 text-lg leading-tight">
            {isMine ? "YOU (COMMANDER)" : host?.username || "Unknown Captain"}
          </Text>
        </Box>
      </Box>

      {/* Footer: Actions */}
      <Box
        px={2}
        pb={2}
        flex
        flexDirection="row"
        className="gap-2 items-center"
      >
        {isOnline && isMine && (
          <Button
            variant="secondary"
            type="neutral"
            className="h-10 w-12 bg-red-900/20 border-red-500/50 text-red-500 p-0 flex items-center justify-center shrink-0"
            onClick={(e) => handleAction(e, () => onDelete(room.id))}
            style={{ borderRadius: "10px", minWidth: "40px" }}
          >
            <Icon icon="zi-delete" size={20} />
          </Button>
        )}

        <Button
          fullWidth
          disabled={isFull && !isMine && !room.members?.includes(myId)}
          onClick={(e) =>
            handleAction(e, () => {
              if (isMine || room.members?.includes(myId)) {
                goToRoom();
              } else {
                onJoin(room.id);
              }
            })
          }
          className={`h-10 uppercase font-black tracking-tighter flex-1 ${
            isMine
              ? "bg-yellow-500 text-black"
              : isPlaying
              ? "bg-red-600 text-white shadow-[0_0_15px_rgba(239,68,68,0.4)]"
              : isFull
              ? "bg-gray-800 text-gray-500"
              : "bg-cyan-400 text-black"
          }`}
          style={{ borderRadius: "2px", border: "none" }}
        >
          {isMine || room.members?.includes(myId)
            ? isPlaying
              ? "VÀO CHIẾN TRƯỜNG"
              : "VÀO PHÒNG CHỜ"
            : isFull
            ? "FULL UNIT"
            : "GIA NHẬP"}
        </Button>
      </Box>
    </Box>
  );
};

export default RoomCard;
