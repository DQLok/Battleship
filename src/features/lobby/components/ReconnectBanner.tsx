import { useEffect, useState } from "react";
import { Box, Button, Text, useNavigate, useSnackbar } from "zmp-ui";
import { useUser } from "@/context/UserContext";
import { useSupabase } from "@/hooks/useSupabase";
import {
  clearPendingReconnect,
  loadPendingReconnect,
  pendingReconnectSecondsLeft,
} from "@/utils/pending-reconnect";

export const ReconnectBanner = () => {
  const [pending, setPending] = useState(loadPendingReconnect);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [busy, setBusy] = useState(false);
  const { user } = useUser();
  const { reconnectToGame } = useSupabase();
  const navigate = useNavigate();
  const { openSnackbar } = useSnackbar();

  useEffect(() => {
    const tick = () => {
      const current = loadPendingReconnect();
      setPending(current);
      if (current) {
        setSecondsLeft(pendingReconnectSecondsLeft(current));
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  if (!pending || secondsLeft <= 0) return null;

  const handleReconnect = async () => {
    if (!user?.id) {
      openSnackbar({ text: "Chưa có phiên chơi." });
      return;
    }
    setBusy(true);
    const { ok, error } = await reconnectToGame(pending.gameId, user.id);
    setBusy(false);
    if (error || !ok) {
      openSnackbar({
        text: error?.message || "Không thể kết nối lại trận.",
      });
      return;
    }
    clearPendingReconnect();
    setPending(null);
    navigate("/combat", { state: { gameId: pending.gameId } });
  };

  return (
    <Box className="join-room-code mb-4">
      <Text className="join-room-code__label">Trận đang chờ bạn</Text>
      <Text size="xSmall" className="text-cyan-500 mb-2 block">
        Mã {pending.roomCode || "------"} · còn {secondsLeft}s để vào lại
      </Text>
      <Button fullWidth size="small" disabled={busy} onClick={handleReconnect}>
        Kết nối lại trận
      </Button>
    </Box>
  );
};
