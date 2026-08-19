import { useState } from "react";
import { Box, Button, Text, useNavigate, useSnackbar } from "zmp-ui";
import { useUser } from "@/context/UserContext";
import { useCombatStore } from "@/hooks/useCombatStore";
import { useSupabase } from "@/hooks/useSupabase";

export const JoinRoomCode = () => {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const { user } = useUser();
  const { joinRoomByCode } = useSupabase();
  const { initGame, setIsBotMode } = useCombatStore();
  const { openSnackbar } = useSnackbar();
  const navigate = useNavigate();

  const handleJoin = async () => {
    if (!user?.id) {
      openSnackbar({ text: "Chưa có phiên chơi." });
      return;
    }
    setBusy(true);
    const { data, error } = await joinRoomByCode(code, user.id);
    setBusy(false);
    if (error || !data) {
      openSnackbar({ text: error?.message || "Không vào được phòng." });
      return;
    }

    initGame(data, user, false);
    setIsBotMode(false);
    if (data.status === "playing") {
      navigate("/combat", { state: { gameId: data.id } });
      return;
    }
    navigate("/waiting", { state: { gameId: data.id } });
  };

  return (
    <Box className="join-room-code">
      <Text className="join-room-code__label">Nhập mã phòng</Text>
      <Box className="join-room-code__row">
        <input
          className="join-room-code__input"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="VD: 7K2M9Q"
          maxLength={8}
          autoCapitalize="characters"
          autoCorrect="off"
        />
        <Button
          size="small"
          disabled={busy || !code.trim()}
          onClick={handleJoin}
        >
          Vào
        </Button>
      </Box>
    </Box>
  );
};
