// src/features/combat/components/GameGrid.tsx
import React from "react";
import { useCombatStore } from "@/hooks/useCombatStore";

const COL_LABELS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];

interface GameGridProps {
  type: "enemy" | "home";
}

const GameGrid: React.FC<GameGridProps> = ({ type }) => {
  const { 
    playerGrid, 
    enemyGrid, 
    selectedCoord, 
    setSelectedCoord, 
    isPlayerTurn 
  } = useCombatStore();

  // Đảm bảo luôn có mảng để map, tránh return null
  const currentGrid = (type === "enemy" ? enemyGrid : playerGrid) || [];

  const handleCellClick = (x: number, y: number) => {
    if (type === "enemy" && isPlayerTurn) {
      setSelectedCoord({ x, y });
    }
  };

  if (currentGrid.length === 0) return <div className="text-white">Loading Grid...</div>;

  return (
    <div className={`flex flex-col items-center ${type === 'home' ? 'scale-90 opacity-80' : ''}`}>
      <div className="flex ml-6 mb-1">
        {COL_LABELS.map((l) => (
          <div key={l} className="w-7 h-7 flex items-center justify-center text-[10px] text-cyan-700 font-bold">{l}</div>
        ))}
      </div>

      <div className="flex">
        <div className="flex flex-col mr-1">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="w-7 h-7 flex items-center justify-center text-[10px] text-cyan-700 font-bold">{i + 1}</div>
          ))}
        </div>

        <div className="grid grid-cols-10 gap-0.5 p-1 bg-[#0a1a29] border border-cyan-500/30">
          {currentGrid.map((row, y) =>
            row.map((status, x) => {
              const isSelected = type === "enemy" && selectedCoord?.x === x && selectedCoord?.y === y;
              return (
                <div
                  key={`${x}-${y}`}
                  onClick={() => handleCellClick(x, y)}
                  className={`relative w-7 h-7 border border-cyan-900/30 flex items-center justify-center
                    ${isSelected ? "bg-cyan-500/20 border-white z-10" : "bg-[#0d2136]"}
                  `}
                >
                  {status === "hit" && <span className="text-red-500 font-bold text-lg">×</span>}
                  {status === "miss" && <div className="w-1.5 h-1.5 bg-slate-600 rounded-full opacity-50" />}
                  {type === "home" && status === "ship" && <div className="w-4 h-4 bg-cyan-500/40 border border-cyan-400" />}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default GameGrid;