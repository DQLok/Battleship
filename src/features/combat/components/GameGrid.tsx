import React, { useRef, useEffect, useState } from "react";
import { useCombatStore } from "@/hooks/useCombatStore";
import { useSnackbar } from "zmp-ui";

const COL_LABELS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];

interface GameGridProps {
  type: "enemy" | "home";
  onCellClick?: (x: number, y: number) => void;
  disabledInteraction?: boolean;
}

const GameGrid: React.FC<GameGridProps> = ({
  type,
  onCellClick,
  disabledInteraction,
}) => {
  // 1. Selector tối ưu Re-render
  const displayGrid = useCombatStore((state) =>
    type === "home" ? state.playerGrid : state.enemyGrid
  );
  const lastTarget = useCombatStore((state) =>
    type === "enemy" ? state.lastPlayerAttack : state.lastBotAttack
  );
  const sunkShipsData = useCombatStore((state) => state.sunkShipsData);
  const {
    draggingShip,
    placedShips,
    placeShip,
    updateDraggingPos,
    rotateShipAt,
    pickUpShip,
    turn,
    winner,
    enemyShips,
  } = useCombatStore();

  const gridRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isLongPress, setIsLongPress] = useState(false);
  const { openSnackbar } = useSnackbar();

  const getCoords = (clientX: number, clientY: number) => {
    if (!gridRef.current) return null;
    const rect = gridRef.current.getBoundingClientRect();
    const cellSize = rect.width / 10;
    return {
      x: Math.floor((clientX - rect.left) / cellSize),
      y: Math.floor((clientY - rect.top) / cellSize),
    };
  };

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

  const handleTouchStart = (x: number, y: number) => {
    if (winner) return;
    if (disabledInteraction) return;

    if (type === "enemy") {
      if (!turn) {
        openSnackbar({ text: "Chờ đến lượt của bạn!" });
        return;
      }
      // Ngăn bắn vào ô đã có kết quả
      if (displayGrid[y][x] !== "empty") {
        return;
      }
      if (onCellClick) onCellClick(x, y);
    }

    if (type === "home") {
      setIsLongPress(false);
      const ship = placedShips.find((s) => {
        for (let i = 0; i < s.size; i++) {
          const cx = s.isHorizontal ? s.x + i : s.x;
          const cy = s.isHorizontal ? s.y : s.y + i;
          if (cx === x && cy === y) return true;
        }
        return false;
      });
      if (!ship) return;
      timerRef.current = setTimeout(() => {
        setIsLongPress(true);
        pickUpShip(ship.size);
      }, 250);
    }
  };

  const handleTouchEnd = (x: number, y: number) => {
    if (disabledInteraction) return;
    if (type === "home" && !isLongPress && timerRef.current) {
      clearTimeout(timerRef.current);
      rotateShipAt(x, y);
    }
    timerRef.current = null;
  };

  return (
    <div className="flex flex-col items-center select-none touch-pan-y">
      {/* Labels A-J */}
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
        {/* Numbers 1-10 */}
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
            row.map((status, x) => {
              const isLastShot = lastTarget?.x === x && lastTarget?.y === y;
              let isPartOfSunkShip = false;

              // XÁC ĐỊNH Ô THUỘC TÀU ĐÃ ĐẮM
              if (type === "enemy") {
                // Tìm xem ô (x,y) này có nằm trong danh sách tọa độ của CHÍNH xác tàu đã đắm không
                isPartOfSunkShip = sunkShipsData.some((ship) =>
                  ship.coords.some((c) => c.x === x && c.y === y)
                );
              } else {
                // Lưới nhà: Dựa vào danh sách tàu mình đã đặt (Chính xác tuyệt đối)
                const myShip = placedShips.find((s) => {
                  for (let i = 0; i < s.size; i++) {
                    const cx = s.isHorizontal ? s.x + i : s.x;
                    const cy = s.isHorizontal ? s.y : s.y + i;
                    if (cx === x && cy === y) return true;
                  }
                  return false;
                });

                if (myShip) {
                  // Kiểm tra xem TOÀN BỘ các ô của con tàu này đã bị 'hit' chưa
                  let isAllHit = true;
                  for (let i = 0; i < myShip.size; i++) {
                    const cx = myShip.isHorizontal ? myShip.x + i : myShip.x;
                    const cy = myShip.isHorizontal ? myShip.y : myShip.y + i;
                    if (displayGrid[cy][cx] !== "hit") {
                      isAllHit = false;
                      break;
                    }
                  }
                  isPartOfSunkShip = isAllHit;
                }
              }

              // Logic tô màu đỏ: Chỉ tô khi ô đó ĐÃ BỊ BẮN TRÚNG (hit) và THUỘC TÀU ĐẮM
              const shouldShowRedBg = isPartOfSunkShip && status === "hit";

              return (
                <div
                  key={`${x}-${y}`}
                  onPointerDown={(e) => {
                    if (disabledInteraction) return;
                    handleTouchStart(x, y);
                  }}
                  onPointerUp={() => handleTouchEnd(x, y)}
                  className={`w-7 h-7 border border-cyan-900/30 flex items-center justify-center relative transition-all duration-300
                    ${
                      shouldShowRedBg
                        ? "bg-red-600/40 shadow-[inset_0_0_12px_rgba(220,38,38,0.5)]"
                        : ""
                    }
                    ${
                      status === "hit" && !isPartOfSunkShip
                        ? "bg-red-500/10"
                        : ""
                    }
                    ${isLastShot ? "z-20" : "z-10"}
                  `}
                >
                  {/* 3. HIỂN THỊ ICON: Đã chìm thì tất cả ô 'hit' đổi thành 🔥 */}
                  {status === "hit" && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span
                        className={`transition-all duration-500 ${
                          shouldShowRedBg ? "text-lg scale-110" : "text-sm"
                        }`}
                      >
                        {shouldShowRedBg ? "🔥" : "💥"}
                      </span>
                    </div>
                  )}

                  {/* Tàu của mình (Lưới trái) */}
                  {type === "home" && status === "ship" && (
                    <div
                      className={`w-5 h-5 rounded-sm transition-colors duration-700 ${
                        isPartOfSunkShip
                          ? "bg-red-600 animate-pulse"
                          : "bg-cyan-500"
                      }`}
                    />
                  )}

                  {/* Bắn hụt (Miss) */}
                  {status === "miss" && (
                    <div className="w-1.5 h-1.5 bg-cyan-100/40 rounded-full shadow-[0_0_5px_white]" />
                  )}

                  {/* Tâm ngắm (Crosshair) */}
                  {isLastShot && (
                    <div className="absolute inset-0 border-2 border-yellow-400 animate-pulse z-30 shadow-[0_0_15px_rgba(250,204,21,0.6)]">
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-full bg-yellow-400/20" />
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-0.5 bg-yellow-400/20" />
                    </div>
                  )}
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
