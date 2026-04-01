import React from "react";
import { useCombatStore } from "@/hooks/useCombatStore";
import { useSupabaseRealtime } from "@/hooks/useSupabaseRealtime";

const CombatControls: React.FC = () => {
  const { isPlayerTurn, selectedCoord, roomId, useOil } = useCombatStore();
  const { fireAttack } = useSupabaseRealtime(roomId || "");

  const handleAttack = () => {
    // Chỉ cho phép bắn nếu đang trong lượt và đã chọn 1 ô trên lưới
    if (!isPlayerTurn || !selectedCoord || !roomId) {
      if (!selectedCoord) alert("Vui lòng chọn mục tiêu trên lưới!");
      return;
    }

    fireAttack(selectedCoord.x, selectedCoord.y);
    // Sau khi bắn, reset ô đã chọn
    useCombatStore.getState().setSelectedCoord(null);
  };

  const handleRadar = () => {
    if (!isPlayerTurn) return;

    // Radar tốn 2 thùng dầu mỗi lần quét
    const success = useOil(2);
    
    if (success) {
      console.log("Radar đang quét vùng xung quanh mục tiêu...");
      // Logic: Gửi event 'radar_scan' qua Supabase hoặc xử lý local để lộ diện tàu địch
    } else {
      alert("Không đủ nhiên liệu (Dầu) để kích hoạt Ra-đa!");
    }
  };

  return (
    <div className="grid grid-cols-2 gap-3 w-full max-w-md mx-auto mt-4 font-mono">
      {/* Nút Tấn Công */}
      <button
        onClick={handleAttack}
        disabled={!isPlayerTurn || !selectedCoord}
        className={`
          relative flex flex-col items-center justify-center py-4 rounded-sm border-2 transition-all
          ${isPlayerTurn && selectedCoord
              ? "border-cyan-400 bg-cyan-950/30 text-cyan-400 shadow-[0_0_20px_rgba(0,242,255,0.4)] active:scale-95"
              : "border-gray-800 bg-gray-900/50 text-gray-600 cursor-not-allowed opacity-40"}
        `}
      >
        <div className={`mb-1 text-2xl font-bold ${selectedCoord ? 'animate-pulse' : ''}`}>◎</div>
        <span className="text-xs font-bold uppercase tracking-widest">
          {selectedCoord ? `Tấn công [${selectedCoord.x},${selectedCoord.y}]` : "Chọn mục tiêu"}
        </span>
        <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-white/40"></div>
      </button>

      {/* Nút Radar */}
      <button
        onClick={handleRadar}
        disabled={!isPlayerTurn}
        className={`
          relative flex flex-col items-center justify-center py-4 rounded-sm border-2 transition-all
          ${isPlayerTurn 
            ? "border-amber-500/50 bg-amber-950/20 text-amber-500 shadow-lg hover:bg-amber-900/30" 
            : "border-gray-800 bg-gray-900/50 text-gray-600 opacity-40"}
        `}
      >
        <div className="mb-1 text-2xl font-bold text-amber-400">⊚</div>
        <span className="text-xs font-bold uppercase tracking-widest">Ra-đa (-2 Dầu)</span>
        <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-white/20"></div>
      </button>
    </div>
  );
};

export default CombatControls;