import React, { useRef, useEffect, useState } from "react";
import { useCombatStore } from "@/hooks/useCombatStore";
import { showToast } from "zmp-sdk";

const COL_LABELS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];

const GameGrid: React.FC<{ type: "enemy" | "home" }> = ({ type }) => {
  const {
    playerGrid,
    enemyGrid,
    draggingShip,
    placedShips,
    placeShip,
    updateDraggingPos,
    rotateShipAt,
    pickUpShip,
  } = useCombatStore();

  const displayGrid = type === "home" ? playerGrid : enemyGrid;
  const gridRef = useRef<HTMLDivElement>(null);

  // Ref để quản lý thời gian nhấn giữ
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isLongPress, setIsLongPress] = useState(false);

  const getCoords = (clientX: number, clientY: number) => {
    if (!gridRef.current) return null;
    const rect = gridRef.current.getBoundingClientRect();
    const cellSize = rect.width / 10;
    return {
      x: Math.floor((clientX - rect.left) / cellSize),
      y: Math.floor((clientY - rect.top) / cellSize),
    };
  };

  // Logic kéo thả Global (giữ nguyên để mượt mà)
  useEffect(() => {
    if (!draggingShip || type !== "home") return;

    const handleMove = (e: TouchEvent) => {
      if (e.cancelable) e.preventDefault();
      const coords = getCoords(e.touches[0].clientX, e.touches[0].clientY);
      if (coords) updateDraggingPos(coords.x, coords.y);
    };

    const handleEnd = () => placeShip();

    window.addEventListener("touchmove", handleMove, { passive: false });
    window.addEventListener("touchend", handleEnd);
    return () => {
      window.removeEventListener("touchmove", handleMove);
      window.removeEventListener("touchend", handleEnd);
    };
  }, [draggingShip, type, updateDraggingPos, placeShip]);

  // XỬ LÝ SỰ KIỆN CHẠM XUỐNG
  const handleTouchStart = (x: number, y: number) => {
    if (type !== "home") return;
    setIsLongPress(false);

    // Tìm xem ô có tàu không
    const ship = placedShips.find((s) => {
      for (let i = 0; i < s.size; i++) {
        const cx = s.isHorizontal ? s.x + i : s.x;
        const cy = s.isHorizontal ? s.y : s.y + i;
        if (cx === x && cy === y) return true;
      }
      return false;
    });

    if (!ship) return;

    // Bắt đầu đếm ngược 250ms cho Long Press
    timerRef.current = setTimeout(() => {
      setIsLongPress(true);
      pickUpShip(ship.size); // Kích hoạt trạng thái kéo
      // Có thể thêm rung nhẹ ở đây để báo hiệu đã "nhấc" được tàu
    }, 250);
  };

  // XỬ LÝ KHI NHẤC TAY LÊN
  const handleTouchEnd = (x: number, y: number) => {
    // Nếu chưa đủ thời gian Long Press (tức là nhấn nhanh)
    if (!isLongPress && timerRef.current) {
      clearTimeout(timerRef.current);
      const success = rotateShipAt(x, y);
      if (success === false) {
        showToast({ message: "Không đủ chỗ để xoay!" });
      }
    }
    timerRef.current = null;
  };

  return (
    <div className="flex flex-col items-center select-none touch-none">
      <div className="flex ml-6 mb-1">
        {COL_LABELS.map((l) => (
          <div
            key={l}
            className="w-7 h-7 flex items-center justify-center text-[10px] text-cyan-700 font-bold uppercase"
          >
            {l}
          </div>
        ))}
      </div>
      <div className="flex">
        <div className="flex flex-col mr-1">
          {[...Array(10)].map((_, i) => (
            <div
              key={i}
              className="w-7 h-7 flex items-center justify-center text-[10px] text-cyan-700 font-bold"
            >
              {i + 1}
            </div>
          ))}
        </div>
        <div
          ref={gridRef}
          className="grid grid-cols-10 gap-0.5 p-1 bg-[#0a1a29] border border-cyan-500/30 relative"
        >
          {displayGrid.map((row, y) =>
            row.map((status, x) => (
              <div
                key={`${x}-${y}`}
                onTouchStart={() => handleTouchStart(x, y)}
                onTouchEnd={() => handleTouchEnd(x, y)}
                className={`w-7 h-7 border border-cyan-900/30 flex items-center justify-center relative ${
                  status === "empty" ? "bg-[#0d2136]" : ""
                }`}
              >
                {status === "ship" && (
                  <div
                    className={`w-5 h-5 bg-cyan-400 shadow-[0_0_10px_#22d3ee] rounded-sm pointer-events-none ${
                      draggingShip ? "opacity-40 scale-110" : ""
                    }`}
                  />
                )}
                {status === "invalid" && (
                  <div className="absolute inset-0 bg-red-500/40 animate-pulse pointer-events-none" />
                )}
                {status === "empty" && (
                  <div className="w-0.5 h-0.5 bg-cyan-900/50 rounded-full" />
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default GameGrid;
