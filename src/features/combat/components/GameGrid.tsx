import React, { useRef, useEffect, useState } from "react";
import { useCombatStore } from "@/hooks/useCombatStore";
import { showToast } from "zmp-sdk";
import { useSupabaseRealtime } from "@/hooks/useSupabaseRealtime";

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
    turn,
    enemyShips,
    lastPlayerAttack,
    lastBotAttack,
  } = useCombatStore();
  const { fireAttack } = useSupabaseRealtime("room-id-123");
  const lastTarget = type === "enemy" ? lastPlayerAttack : lastBotAttack;

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
    // TRƯỜNG HỢP 1: Tương tác trên lưới nhà (Sắp xếp tàu)
    if (type === "home") {
      setIsLongPress(false);

      // Kiểm tra xem vị trí nhấn có tàu đã đặt chưa
      const ship = placedShips.find((s) => {
        for (let i = 0; i < s.size; i++) {
          const cx = s.isHorizontal ? s.x + i : s.x;
          const cy = s.isHorizontal ? s.y : s.y + i;
          if (cx === x && cy === y) return true;
        }
        return false;
      });

      if (!ship) return;

      // Logic Long Press để "nhấc" tàu lên (Chế độ kéo thả)
      timerRef.current = setTimeout(() => {
        setIsLongPress(true);
        pickUpShip(ship.size);
        // Tip: Bạn có thể thêm navigator.vibrate(50) để tạo cảm giác haptic
      }, 250);
      return;
    }

    // TRƯỜNG HỢP 2: Tương tác trên lưới địch (Tấn công)
    if (type === "enemy") {
      // 1. Chỉ cho phép bắn khi đang trong trận (nếu bạn có biến inBattle)
      // 2. Chỉ cho phép bắn khi tới lượt (turn === true)
      // 3. Chỉ cho phép bắn vào ô chưa từng bắn (empty)
      if (turn && enemyGrid[y][x] === "empty") {
        fireAttack(x, y);
      } else if (!turn) {
        showToast({ message: "Đang chờ đối thủ phản pháo..." });
      }
    }
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
          className="grid grid-cols-10 gap-0.5 p-1 bg-[#0a1a29] border border-cyan-500/30 relative touch-none"
        >
          {displayGrid.map((row, y) =>
            row.map((status, x) => {
              const isLastShot = lastTarget?.x === x && lastTarget?.y === y;
              // Tìm xem ô hiện tại thuộc con tàu nào đã bị hạ chưa
              const sunkShip = (
                type === "enemy" ? enemyShips : placedShips
              ).find((s) => {
                let isPart = false;
                for (let i = 0; i < s.size; i++) {
                  const cx = s.isHorizontal ? s.x + i : s.x;
                  const cy = s.isHorizontal ? s.y : s.y + i;
                  if (cx === x && cy === y) isPart = true;
                }
                if (!isPart) return false;

                // Kiểm tra xem toàn bộ các ô của tàu này đã là 'hit' chưa
                const grid = type === "enemy" ? enemyGrid : playerGrid;
                for (let i = 0; i < s.size; i++) {
                  const cx = s.isHorizontal ? s.x + i : s.x;
                  const cy = s.isHorizontal ? s.y : s.y + i;
                  if (grid[cy][cx] !== "hit") return false;
                }
                return true;
              });

              return (
                <div
                  key={`${x}-${y}`}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    handleTouchStart(x, y);
                  }}
                  className={`w-7 h-7 border border-cyan-900/30 flex items-center justify-center relative ${
                    isLastShot ? "z-20" : "z-10"
                  }`}
                >
                  {/* 1. THÂN TÀU (Lưới nhà hoặc Tàu địch đã bị lộ do chìm) */}
                  {((type === "home" && status === "ship") ||
                    (type === "enemy" && sunkShip)) && (
                    <div
                      className={`w-5 h-5 rounded-sm ${
                        sunkShip ? "bg-red-800" : "bg-cyan-400"
                      }`}
                    />
                  )}

                  {/* 2. HIỆU ỨNG NỔ & TÀU BỊ HẠ */}
                  {status === "hit" && (
                    <div className="absolute inset-0 flex items-center justify-center z-30">
                      <div
                        className={`w-5 h-5 rounded-sm animate-pulse ${
                          sunkShip
                            ? "bg-orange-700 shadow-[0_0_15px_orange]"
                            : "bg-red-500"
                        }`}
                      />
                      <span className="absolute text-[14px]">
                        {sunkShip ? "🔥" : "💥"}
                      </span>
                      {sunkShip && (
                        <div className="absolute inset-0 bg-red-500/20 animate-ping rounded-full" />
                      )}
                    </div>
                  )}

                  {/* 3. HIỆU ỨNG TRƯỢT */}
                  {status === "miss" && (
                    <div className="w-1.5 h-1.5 bg-white/40 rounded-full" />
                  )}

                  {/* 4. HIGHLIGHT PHÁT BẮN CUỐI CÙNG */}
                  {isLastShot && (
                    <div className="absolute inset-0 border-2 border-yellow-400 shadow-[0_0_12px_#facc15] z-40 pointer-events-none animate-pulse" />
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
