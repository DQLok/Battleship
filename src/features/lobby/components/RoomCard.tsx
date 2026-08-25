import { Game } from "@/types/supabase/Game";
import React from "react";
import { Box, Text, Button, Icon } from "zmp-ui";
import { useGameLifecycle } from "@/context/GameLifecycleContext";
import { GAME_LIFECYCLE_DEFAULTS } from "@/constants/game-lifecycle";

interface RoomCardProps {
  room: any;
  myId: string;
  onJoin: (gameId: string, game: Game) => void;
  onDelete?: (gameId: string) => void;
}

const statusLabel = (status: string) => {
  switch (status) {
    case "playing":
      return "In Battle";
    case "setup":
      return "Setup";
    case "finished":
      return "Finished";
    default:
      return "Waiting";
  }
};

const RoomCard = ({ room, myId, onJoin, onDelete }: RoomCardProps) => {
  const { settings: lifecycle } = useGameLifecycle();
  const memberCount = room.members?.length || 0;
  const gameMode = room.game_mode ?? "1vs1";
  const maxMembers =
    gameMode === "1vs1"
      ? lifecycle.max_members_1vs1 ?? GAME_LIFECYCLE_DEFAULTS.max_members_1vs1
      : 8;
  const isFull = memberCount >= maxMembers;
  const isMine = room.host_id === myId;
  const isMember = (room.members || []).includes(myId);
  const isWaiting = room.status === "waiting" || !room.status;
  const isBot = room.id === "###";
  const hostName = isMine
    ? "Bạn"
    : room.host?.username || (String(room.host_id || "").startsWith("guest_") ? "Guest" : "Unknown");

  const canJoinWaiting =
    isWaiting && !isBot && (isMine || isMember || !isFull);

  const handleAction = (e: React.MouseEvent, callback: () => void) => {
    e.stopPropagation();
    callback();
  };

  if (isBot) {
    return (
      <Box className="room-card room-card--bot">
        <Box className="room-card__meta">
          <Text className="room-card__code">BOT</Text>
          <Text className="room-card__host">Bot Mode</Text>
          <Text className="room-card__status">Offline</Text>
          <Text className="room-card__members">1</Text>
        </Box>
        <Button
          fullWidth
          className="room-card__join bg-red-600 text-white"
          onClick={(e) => handleAction(e, () => onJoin(room.id, room))}
        >
          Vào chiến trường
        </Button>
      </Box>
    );
  }

  return (
    <Box
      className={`room-card ${isMine ? "room-card--mine" : ""} ${
        room.has_password ? "room-card--locked" : ""
      }`}
    >
      <Box className="room-card__row">
        <Text className="room-card__label">Code</Text>
        <Text className="room-card__value room-card__code">
          {room.room_code || room.id?.slice?.(0, 6)?.toUpperCase()}
          {room.has_password ? " 🔒" : ""}
        </Text>
      </Box>
      <Box className="room-card__row">
        <Text className="room-card__label">Host</Text>
        <Text className="room-card__value">{hostName}</Text>
      </Box>
      <Box className="room-card__row">
        <Text className="room-card__label">Trạng thái</Text>
        <Text
          className={`room-card__value room-card__status room-card__status--${
            room.status || "waiting"
          }`}
        >
          {statusLabel(room.status || "waiting")}
        </Text>
      </Box>
      <Box className="room-card__row">
        <Text className="room-card__label">Members</Text>
        <Text className="room-card__value room-card__members">
          {memberCount}
          {gameMode === "1vs1" ? ` / ${maxMembers}` : ""}
        </Text>
      </Box>

      <Box className="room-card__actions">
        {isMine && onDelete && (
          <Button
            variant="secondary"
            type="neutral"
            className="room-card__delete"
            onClick={(e) => handleAction(e, () => onDelete(room.id))}
          >
            <Icon icon="zi-delete" size={18} />
          </Button>
        )}
        {isWaiting ? (
          <Button
            fullWidth
            disabled={!canJoinWaiting && !isMine && !isMember}
            className="room-card__join"
            onClick={(e) => handleAction(e, () => onJoin(room.id, room))}
          >
            {isMine || isMember
              ? "Vào phòng"
              : isFull
              ? "Đã đủ người"
              : room.has_password
              ? "Tham gia (có MK)"
              : "Tham gia"}
          </Button>
        ) : isMine || isMember ? (
          <Button
            fullWidth
            className="room-card__join room-card__join--secondary"
            onClick={(e) => handleAction(e, () => onJoin(room.id, room))}
          >
            {room.status === "setup"
              ? "Vào dàn trận"
              : room.status === "playing"
              ? "Vào trận"
              : "Xem phòng"}
          </Button>
        ) : null}
      </Box>
    </Box>
  );
};

export default RoomCard;
