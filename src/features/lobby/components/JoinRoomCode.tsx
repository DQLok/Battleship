import { useState } from "react";
import { Box, Button, Text, useNavigate, useSnackbar } from "zmp-ui";
import { useUser } from "@/context/UserContext";
import { useCombatStore } from "@/hooks/useCombatStore";
import { useSupabase } from "@/hooks/useSupabase";
import { JoinPasswordSheet } from "./JoinPasswordSheet";
import { Game } from "@/types/supabase/Game";

type Props = {
  /** Lobby: nút Vào full-width dưới ô mã (tạo phòng dùng FAB). */
  enterFullWidth?: boolean;
};

export const JoinRoomCode = ({ enterFullWidth = false }: Props) => {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [pendingRoom, setPendingRoom] = useState<Game | null>(null);
  const { user } = useUser();
  const { joinRoomByCode } = useSupabase();
  const { initGame, setIsBotMode } = useCombatStore();
  const { openSnackbar } = useSnackbar();
  const navigate = useNavigate();

  const goIn = (data: Game) => {
    initGame(data, user, false);
    setIsBotMode(false);
    if (data.status === "setup" || data.status === "playing") {
      navigate("/combat", { state: { gameId: data.id } });
      return;
    }
    navigate("/waiting", { state: { gameId: data.id } });
  };

  const handleJoin = async (password?: string) => {
    if (!user?.id) {
      openSnackbar({ text: "Chưa có phiên chơi." });
      return;
    }
    setBusy(true);
    const result = await joinRoomByCode(code, user.id, password);
    setBusy(false);

    if ((result as { needsPassword?: boolean }).needsPassword) {
      setPendingRoom((result as { room?: Game }).room || null);
      return;
    }

    if (result.error || !result.data) {
      openSnackbar({
        text: result.error?.message || "Không vào được phòng.",
      });
      return;
    }

    setPendingRoom(null);
    goIn(result.data as Game);
  };

  return (
    <Box className={`join-room-code ${enterFullWidth ? "join-room-code--enter-full" : ""}`}>
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
          onKeyDown={(e) => {
            if (e.key === "Enter" && code.trim()) void handleJoin();
          }}
        />
        {!enterFullWidth && (
          <Button
            size="small"
            disabled={busy || !code.trim()}
            onClick={() => void handleJoin()}
          >
            Vào
          </Button>
        )}
      </Box>
      {enterFullWidth && (
        <Button
          className="join-room-code__enter"
          fullWidth
          disabled={busy || !code.trim()}
          onClick={() => void handleJoin()}
        >
          Vào
        </Button>
      )}

      <JoinPasswordSheet
        visible={!!pendingRoom}
        roomCode={pendingRoom?.room_code || code}
        busy={busy}
        onClose={() => setPendingRoom(null)}
        onSubmit={(pw) => void handleJoin(pw)}
      />
    </Box>
  );
};
