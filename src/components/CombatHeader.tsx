// src/features/combat/components/CombatHeader.tsx
import React from "react";
import { useCombatStore } from "@/hooks/useCombatStore";

const CombatHeader: React.FC = () => {
  // Lấy riêng biệt để tránh lỗi render và dễ debug
  const commanderName = useCombatStore((state) => state.commanderName);
  const xp = useCombatStore((state) => state.xp);

  // Debug: Kiểm tra xem dữ liệu có lấy được từ Store không
  // console.log("Header Data:", { commanderName, xp });

  return (
    <div className="flex justify-between items-center w-full border-b border-cyan-900/50 pb-2 mb-2 font-mono">
      {/* Bên trái: Avatar & Name */}
      <div className="flex items-center gap-3">
        <div className="relative w-8 h-8 md:w-10 md:h-10 border border-cyan-400 p-0.5 rounded-sm shadow-[0_0_10px_rgba(0,242,255,0.2)]">
          <img
            src="https://img.icons8.com/officel/80/000000/manager.png"
            alt="Avatar"
            className="w-full h-full object-cover bg-cyan-950"
          />
          {/* Góc trang trí giả lập UI công nghệ */}
          <div className="absolute -top-1 -left-1 w-2 h-2 border-t border-l border-cyan-400"></div>
        </div>
        <h1 className="text-cyan-400 font-bold tracking-[0.1em] text-xs md:text-sm uppercase truncate max-w-[120px]">
          {commanderName || "COMMANDER"}
        </h1>
      </div>

      {/* Bên phải: XP Badge */}
      <div className="bg-[#0a1a29]/80 border border-cyan-800 px-2 py-1 rounded flex items-center gap-1.5 shadow-inner">
        <div className="w-3.5 h-3.5 bg-cyan-500 rounded-sm flex items-center justify-center text-[8px] text-[#061421] font-bold">
          ★
        </div>
        <span className="text-cyan-300 font-bold text-xs tracking-tighter">
          {(xp || 0).toLocaleString()}{" "}
          <span className="text-[9px] font-normal opacity-60 ml-0.5">XP</span>
        </span>
      </div>
    </div>
  );
};

export default CombatHeader;
