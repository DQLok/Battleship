import React, { useEffect, useRef } from "react";
import { useCombatStore } from "@/hooks/useCombatStore";

export const ShipDragGhost: React.FC = () => {
  const draggingShip = useCombatStore((state) => state.draggingShip);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!draggingShip) return;

    const move = (e: PointerEvent) => {
      const el = ref.current;
      if (!el) return;
      el.style.transform = `translate(${e.clientX + 12}px, ${e.clientY + 12}px)`;
    };

    window.addEventListener("pointermove", move);
    return () => window.removeEventListener("pointermove", move);
  }, [draggingShip]);

  if (!draggingShip) return null;

  return (
    <div
      ref={ref}
      className="fixed top-0 left-0 z-[200] pointer-events-none"
      style={{ transform: "translate(-9999px, -9999px)" }}
    >
      <div
        className={`flex gap-0.5 p-1 rounded-sm border ${
          draggingShip.isValid
            ? "bg-cyan-500/80 border-cyan-200"
            : draggingShip.x < 0
              ? "bg-cyan-500/70 border-cyan-300"
              : "bg-red-500/80 border-red-200"
        } ${draggingShip.isHorizontal ? "flex-row" : "flex-col"}`}
      >
        {[...Array(draggingShip.size)].map((_, i) => (
          <div key={i} className="w-5 h-5 rounded-sm bg-white/90" />
        ))}
      </div>
    </div>
  );
};
