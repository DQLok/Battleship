// src/features/combat/components/CombatHeader.tsx
import React, { useEffect } from "react";
import { useUser } from "@/context/UserContext";
import { Avatar, Box, ImageViewer, Text } from "zmp-ui";

const CombatHeader: React.FC = () => {
  const { user, isGuest } = useUser();

  useEffect(() => {});

  return (
    <Box className="flex justify-between items-center w-full border-b border-cyan-900/50 pb-2 mb-2 font-mono">
      {/* Bên trái: Avatar & Name */}
      <Box className="flex items-center gap-3">
        <Box className="relative w-8 h-8 md:w-12 md:h-12 border border-cyan-400 p-0.5 rounded-sm shadow-[0_0_15px_rgba(34,211,238,0.3)] bg-cyan-950/50">
          <Avatar
            src={
              user?.avatar_url ||
              "https://img.icons8.com/officel/80/000000/manager.png"
            }
            style={{ width: "100%", height: "100%" }}
          />

          {/* Lớp Overlay quét Radar giả lập (Option) */}
          <Box className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent via-cyan-400/5 to-transparent animate-pulse"></Box>

          {/* Các góc trang trí Tactical UI */}
          <Box className="absolute -top-1 -left-1 w-2 h-2 border-t-2 border-l-2 border-cyan-400"></Box>
          <Box className="absolute -bottom-1 -right-1 w-2 h-2 border-b-2 border-r-2 border-cyan-400"></Box>

          {/* Trạng thái Online (Nếu cần) */}
          <Box className="absolute -bottom-0.5 -left-0.5 w-2 h-2 bg-green-500 rounded-full border border-[#05161A] shadow-[0_0_5px_#22c55e]"></Box>
        </Box>
        <Text className="text-cyan-400 font-bold tracking-[0.1em] text-xs md:text-sm uppercase truncate max-w-[120px]">
          {user?.username || "COMMANDER"}
        </Text>
        {isGuest && (
          <Text className="text-[9px] text-cyan-700 uppercase tracking-widest ml-1">
            Guest
          </Text>
        )}
      </Box>

      {/* Bên phải: XP Badge */}
      <Box className="bg-[#0a1a29]/80 border border-cyan-800 px-2 py-1 rounded flex items-center gap-1.5 shadow-inner">
        <Box className="w-3.5 h-3.5 bg-cyan-500 rounded-sm flex items-center justify-center text-[8px] text-[#061421] font-bold">
          ★
        </Box>
        <Box className="text-cyan-300 font-bold text-xs tracking-tighter">
          {(user?.wins || 0).toLocaleString()}
          {isGuest ? " Guest" : " Win"}
        </Box>
      </Box>
    </Box>
  );
};

export default CombatHeader;
