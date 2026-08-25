import { useState, useEffect } from "react";
import { Box, Button, Sheet, Text } from "zmp-ui";

type Props = {
  visible: boolean;
  roomCode?: string | null;
  busy?: boolean;
  onClose: () => void;
  onSubmit: (password: string) => void;
};

export const JoinPasswordSheet = ({
  visible,
  roomCode,
  busy,
  onClose,
  onSubmit,
}: Props) => {
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (!visible) setPassword("");
  }, [visible]);

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      autoHeight
      mask
      handler
      swipeToClose
    >
      <Box p={4} className="bg-[#061421] join-password-sheet">
        <Text.Title className="text-cyan-400 mb-2 text-center tracking-widest uppercase">
          Phòng có mật khẩu
        </Text.Title>
        {roomCode && (
          <Text size="small" className="text-cyan-700 text-center mb-3 block">
            Mã phòng: {roomCode}
          </Text>
        )}
        <input
          className="join-password-sheet__input"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Nhập mật khẩu"
          autoComplete="current-password"
          maxLength={32}
          onKeyDown={(e) => {
            if (e.key === "Enter" && password.trim()) onSubmit(password.trim());
          }}
        />
        <Box flex flexDirection="row" className="gap-2 mt-3">
          <Button fullWidth variant="secondary" onClick={onClose} disabled={busy}>
            Hủy
          </Button>
          <Button
            fullWidth
            disabled={busy || !password.trim()}
            className="bg-cyan-400 text-black font-black"
            onClick={() => onSubmit(password.trim())}
          >
            Vào phòng
          </Button>
        </Box>
      </Box>
    </Sheet>
  );
};
