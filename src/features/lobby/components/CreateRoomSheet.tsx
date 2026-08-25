import { useEffect, useState } from "react";
import { Box, Button, Text } from "zmp-ui";

type Props = {
  visible: boolean;
  busy?: boolean;
  onClose: () => void;
  onQuickCreate: () => void;
  onCreateWithPassword: (password: string) => void;
};

export const CreateRoomSheet = ({
  visible,
  busy,
  onClose,
  onQuickCreate,
  onCreateWithPassword,
}: Props) => {
  const [mode, setMode] = useState<"menu" | "password">("menu");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (!visible) {
      setMode("menu");
      setPassword("");
    }
  }, [visible]);

  if (!visible) return null;

  const handleClose = () => {
    setMode("menu");
    setPassword("");
    onClose();
  };

  return (
    <div className="create-room-popup" role="dialog" aria-modal="true">
      <button
        type="button"
        className="create-room-popup__mask"
        aria-label="Đóng"
        onClick={handleClose}
      />
      <Box className="create-room-popup__panel">
        <Text.Title className="create-room-popup__title">Tạo phòng</Text.Title>

        {mode === "menu" ? (
          <Box flex flexDirection="column" className="create-room-popup__body">
            <Text size="small" className="create-room-popup__hint">
              Chọn cách tạo phòng mới
            </Text>
            <Button
              fullWidth
              disabled={busy}
              className="create-room-popup__btn create-room-popup__btn--primary"
              onClick={onQuickCreate}
            >
              Tạo nhanh
            </Button>
            <Button
              fullWidth
              variant="secondary"
              disabled={busy}
              className="create-room-popup__btn"
              onClick={() => setMode("password")}
            >
              Có mật khẩu
            </Button>
            <Button
              fullWidth
              variant="tertiary"
              className="create-room-popup__btn"
              onClick={handleClose}
            >
              Hủy
            </Button>
          </Box>
        ) : (
          <Box flex flexDirection="column" className="create-room-popup__body">
            <Text size="small" className="create-room-popup__hint">
              Đặt mật khẩu phòng
            </Text>
            <input
              className="create-room-popup__input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Nhập mật khẩu"
              autoComplete="new-password"
              maxLength={32}
              autoFocus
            />
            <Button
              fullWidth
              disabled={busy || !password.trim()}
              className="create-room-popup__btn create-room-popup__btn--primary"
              onClick={() => onCreateWithPassword(password.trim())}
            >
              Tạo phòng
            </Button>
            <Button
              fullWidth
              variant="tertiary"
              disabled={busy}
              className="create-room-popup__btn"
              onClick={() => {
                setMode("menu");
                setPassword("");
              }}
            >
              Quay lại
            </Button>
          </Box>
        )}
      </Box>
    </div>
  );
};
