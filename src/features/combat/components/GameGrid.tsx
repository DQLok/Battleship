import React, { useRef, useEffect, useState } from "react";
import { useCombatStore } from "@/hooks/useCombatStore";
import { useSnackbar } from "zmp-ui";

const COL_LABELS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];
const DRAG_THRESHOLD = 10;

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
    setDraggingShip,
    turn,
    winner,
  } = useCombatStore();

  const gridRef = useRef<HTMLDivElement>(null);
  const pressRef = useRef<{
    x: number;
    y: number;
    clientX: number;
    clientY: number;
    moved: boolean;
  } | null>(null);
  const [isLongPress, setIsLongPress] = useState(false);
  const { openSnackbar } = useSnackbar();

  const getCoords = (clientX: number, clientY: number) => {
    if (!gridRef.current) return null;
    const rect = gridRef.current.getBoundingClientRect();
    const cellSize = rect.width / 10;
    const x = Math.floor((clientX - rect.left) / cellSize);
    const y = Math.floor((clientY - rect.top) / cellSize);
    if (x < 0 || x > 9 || y < 0 || y > 9) return null;
    return { x, y };
  };

  const isDragging = Boolean(draggingShip);

  useEffect(() => {
    if (!isDragging || type !== "home" || disabledInteraction) return;

    const handleMove = (e: PointerEvent) => {
      const coords = getCoords(e.clientX, e.clientY);
      if (coords) useCombatStore.getState().updateDraggingPos(coords.x, coords.y);
    };

    const handleEnd = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest("button, .ship-dock-item")) return;

      const {
        draggingShip: dragging,
        placeShip: dropShip,
        setDraggingShip: cancelDrag,
        updateDraggingPos: moveGhost,
      } = useCombatStore.getState();
      if (!dragging) return;

      const coords = getCoords(e.clientX, e.clientY);
      if (coords) {
        moveGhost(coords.x, coords.y);
        dropShip();
        return;
      }

      // Tap on dock only "picks" the ship; keep it armed until dropped on the grid.
      if (dragging.x < 0 || dragging.y < 0) return;
      cancelDrag(null);
    };

    const preventScroll = (e: TouchEvent) => {
      if (e.cancelable) e.preventDefault();
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleEnd);
    window.addEventListener("pointercancel", handleEnd);
    window.addEventListener("touchmove", preventScroll, { passive: false });
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleEnd);
      window.removeEventListener("pointercancel", handleEnd);
      window.removeEventListener("touchmove", preventScroll);
    };
  }, [isDragging, type, disabledInteraction]);

  const shipAt = (x: number, y: number) =>
    placedShips.find((s) => {
      for (let i = 0; i < s.size; i++) {
        const cx = s.isHorizontal ? s.x + i : s.x;
        const cy = s.isHorizontal ? s.y : s.y + i;
        if (cx === x && cy === y) return true;
      }
      return false;
    });

  const handlePointerDown = (e: React.PointerEvent, x: number, y: number) => {
    if (winner) return;
    if (disabledInteraction) return;

    if (type === "enemy") {
      if (!turn) {
        openSnackbar({ text: "Chờ đến lượt của bạn!" });
        return;
      }
      if (displayGrid[y][x] !== "empty") return;
      onCellClick?.(x, y);
      return;
    }

    if (draggingShip) {
      updateDraggingPos(x, y);
      return;
    }

    const ship = shipAt(x, y);
    if (!ship) return;

    pressRef.current = {
      x,
      y,
      clientX: e.clientX,
      clientY: e.clientY,
      moved: false,
    };
    setIsLongPress(false);
  };

  const handlePointerMoveOnCell = (e: React.PointerEvent) => {
    const press = pressRef.current;
    if (!press || disabledInteraction || type !== "home" || draggingShip) return;
    const dx = e.clientX - press.clientX;
    const dy = e.clientY - press.clientY;
    if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;

    const ship = shipAt(press.x, press.y);
    if (!ship) return;
    press.moved = true;
    setIsLongPress(true);
    pickUpShip(ship.size);
  };

  const handlePointerUpOnCell = (x: number, y: number) => {
    if (disabledInteraction) return;
    const press = pressRef.current;
    pressRef.current = null;
    if (type !== "home" || draggingShip) return;
    if (press && !press.moved && !isLongPress) {
      rotateShipAt(x, y);
    }
  };

  return (
    <div
      className={`flex flex-col items-center select-none ${
        draggingShip && type === "home" ? "touch-none" : "touch-pan-y"
      }`}
    >
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
            row.map((status, x) => {
              const isLastShot = lastTarget?.x === x && lastTarget?.y === y;
              let isPartOfSunkShip = false;

              if (type === "enemy") {
                isPartOfSunkShip = sunkShipsData.some((ship) =>
                  ship.coords.some((c) => c.x === x && c.y === y)
                );
              } else {
                const myShip = shipAt(x, y);

                if (myShip) {
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

              const shouldShowRedBg = isPartOfSunkShip && status === "hit";
              const isGhost =
                type === "home" &&
                draggingShip &&
                draggingShip.x >= 0 &&
                (() => {
                  for (let i = 0; i < draggingShip.size; i++) {
                    const cx = draggingShip.isHorizontal
                      ? draggingShip.x + i
                      : draggingShip.x;
                    const cy = draggingShip.isHorizontal
                      ? draggingShip.y
                      : draggingShip.y + i;
                    if (cx === x && cy === y) return true;
                  }
                  return false;
                })();

              return (
                <div
                  key={`${x}-${y}`}
                  onPointerDown={(e) => handlePointerDown(e, x, y)}
                  onPointerMove={handlePointerMoveOnCell}
                  onPointerUp={() => handlePointerUpOnCell(x, y)}
                  className={`w-7 h-7 border border-cyan-900/30 flex items-center justify-center relative transition-colors duration-150
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
                    ${
                      status === "invalid" || (isGhost && !draggingShip?.isValid)
                        ? "bg-red-500/40 border-red-400/70"
                        : ""
                    }
                    ${
                      isGhost && draggingShip?.isValid
                        ? "bg-cyan-400/25 border-cyan-300/80"
                        : ""
                    }
                    ${isLastShot ? "z-20" : "z-10"}
                  `}
                >
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

                  {type === "home" && (status === "ship" || status === "invalid") && (
                    <div
                      className={`w-5 h-5 rounded-sm transition-colors duration-200 ${
                        isPartOfSunkShip
                          ? "bg-red-600 animate-pulse"
                          : status === "invalid" ||
                              (isGhost && !draggingShip?.isValid)
                            ? "bg-red-500"
                            : "bg-cyan-500"
                      }`}
                    />
                  )}

                  {status === "miss" && (
                    <div className="w-1.5 h-1.5 bg-cyan-100/40 rounded-full shadow-[0_0_5px_white]" />
                  )}

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
