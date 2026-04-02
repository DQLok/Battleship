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
              const belongsToSunkShip = (
                type === "enemy" ? enemyShips : placedShips
              ).find((s) => {
                // 1. Kiểm tra ô (x,y) có thuộc tàu s không
                let isPart = false;
                for (let i = 0; i < s.size; i++) {
                  const cx = s.isHorizontal ? s.x + i : s.x;
                  const cy = s.isHorizontal ? s.y : s.y + i;
                  if (cx === x && cy === y) isPart = true;
                }
                if (!isPart) return false;

                // 2. Nếu thuộc tàu s, kiểm tra xem tàu s đã bị hạ chưa (tất cả các ô đều là 'hit')
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
                    status === "empty" ? "bg-[#0d2136]" : ""
                  }`}
                >
                  {/* Hiệu ứng Highlight cho phát bắn gần nhất */}
                  {isLastShot && (
                    <div className="absolute inset-0 border-2 border-yellow-400 shadow-[0_0_10px_#facc15] animate-pulse pointer-events-none">
                      {/* Thêm một biểu tượng nhỏ để phân biệt */}
                      <div className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-400 rounded-full" />
                    </div>
                  )}

                  {/* HIỆN THÂN TÀU BỊ HẠ (SUNK) */}
                  {belongsToSunkShip && (
                    <div className="absolute inset-0 bg-red-600/30 border border-red-500 z-0 animate-pulse" />
                  )}

                  {/* HIỂN THỊ TÀU (Lưới nhà hoặc Ô đã trúng của địch) */}
                  {((type === "home" && status === "ship") ||
                    status === "hit") && (
                    <div
                      className={`w-5 h-5 rounded-sm z-10 ${
                        status === "hit"
                          ? "bg-red-500 shadow-[0_0_10px_red]"
                          : "bg-cyan-400"
                      }`}
                    />
                  )}

                  {/* HIỆN ICON NỔ KHI TÀU CHÌM */}
                  {belongsToSunkShip && status === "hit" && (
                    <span className="absolute z-20 text-[14px]">🔥</span>
                  )}

                  {/* CÁC TRẠNG THÁI KHÁC */}
                  {status === "miss" && (
                    <div className="w-1.5 h-1.5 bg-white/20 rounded-full" />
                  )}
                  {status === "empty" && (
                    <div className="w-0.5 h-0.5 bg-cyan-900/50 rounded-full" />
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
