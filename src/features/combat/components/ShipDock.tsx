import React from "react";
import { useCombatStore } from "@/hooks/useCombatStore";

const ShipItem: React.FC<{ size: number; name: string; disabled?: boolean }> = ({
  size,
  name,
  disabled,
}) => {
  const { setDraggingShip, placedShips, draggingShip } = useCombatStore();
  const isPlaced = placedShips.some((s) => s.size === size);
  const isActive = draggingShip?.size === size && draggingShip?.name === name;

  const startDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled || isPlaced) return;
    e.preventDefault();
    e.stopPropagation();
    setDraggingShip({ size, name });
  };

  return (
    <div
      onPointerDown={startDrag}
      className={`ship-dock-item flex-1 min-w-[65px] p-2 border-2 rounded-sm flex flex-col items-center justify-center transition-all touch-none select-none ${
        disabled
          ? "border-cyan-900/10 opacity-10 grayscale pointer-events-none"
          : isPlaced
            ? "border-cyan-900/20 opacity-20 grayscale pointer-events-none"
            : isActive
              ? "border-cyan-400 bg-cyan-500/20 scale-105"
              : "border-cyan-900/50 bg-[#0d2136] cursor-grab active:cursor-grabbing"
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

export const ShipDock: React.FC<{ disabled?: boolean }> = ({ disabled }) => {
  return (
    <div className="w-full px-4">
      <p className="text-[9px] font-black tracking-widest text-cyan-700 uppercase text-center mb-2">
        Kéo tàu thả vào bản đồ
      </p>
      <div className="flex flex-row gap-2 p-3 bg-[#061421]/90 border border-cyan-900/40 backdrop-blur-md rounded-lg">
        <ShipItem size={5} name="Carrier" disabled={disabled} />
        <ShipItem size={4} name="Battle" disabled={disabled} />
        <ShipItem size={3} name="Cruiser" disabled={disabled} />
        <ShipItem size={2} name="Destroy" disabled={disabled} />
      </div>
    </div>
  );
};
