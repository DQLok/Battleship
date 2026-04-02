import React from "react";
import { useCombatStore } from "@/hooks/useCombatStore";

const ShipItem: React.FC<{ size: number; name: string }> = ({ size, name }) => {
  const { setDraggingShip, placedShips } = useCombatStore();
  const isPlaced = placedShips.some((s) => s.size === size);

  const handleInteraction = () => {
    if (isPlaced) return;

    // Vừa set Dragging (cho Mobile) vừa đảm bảo Store nhận diện tàu đang được tương tác
    setDraggingShip({ size, name });
  };

  return (
    <div
      onClick={handleInteraction} // Thêm onClick cho chắc chắn trên Simulator
      onPointerDown={handleInteraction}
      className={`flex-1 min-w-[65px] p-2 border-2 rounded-sm flex flex-col items-center justify-center transition-all ${
        isPlaced
          ? "border-cyan-900/20 opacity-20 grayscale"
          : "border-cyan-900/50 bg-[#0d2136] active:scale-95"
      }`}
    >
      <div className="flex gap-0.5 mb-1">
        {[...Array(size)].map((_, i) => (
          <div key={i} className="w-2 h-3 bg-cyan-500" />
        ))}
      </div>
      <p className="text-[7px] font-black text-cyan-600 uppercase">{name}</p>
    </div>
  );
};

export const ShipDock: React.FC = () => {
  const { placedShips } = useCombatStore();
  return (
    <div className="w-full px-4">
      <div className="flex flex-row gap-2 p-3 bg-[#061421]/90 border border-cyan-900/40 backdrop-blur-md rounded-lg">
        <ShipItem size={5} name="Carrier" />
        <ShipItem size={4} name="Battle" />
        <ShipItem size={3} name="Cruiser" />
        <ShipItem size={2} name="Destroy" />
      </div>
    </div>
  );
};
