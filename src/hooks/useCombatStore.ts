import { create } from "zustand";

export type CellStatus = "empty" | "hit" | "miss" | "ship" | "invalid";

interface Ship {
  size: number;
  x: number;
  y: number;
  isHorizontal: boolean;
  name: string;
}

interface DraggingState {
  size: number;
  name: string;
  x: number;
  y: number;
  isHorizontal: boolean;
  isValid: boolean;
}

interface CombatState {
  playerGrid: CellStatus[][];
  enemyGrid: CellStatus[][];
  placedShips: Ship[];
  draggingShip: DraggingState | null;

  // Actions
  refreshGrid: (ships: Ship[], ghost?: DraggingState) => CellStatus[][];
  setDraggingShip: (ship: { size: number; name: string } | null) => void;
  updateDraggingPos: (x: number, y: number) => void;
  placeShip: () => boolean;
  pickUpShip: (size: number) => void;
  toggleDraggingRotation: () => void;
  rotateShipAt: (x: number, y: number) => boolean; // Đổi sang trả về boolean
  resetShips: () => void;
}

const createEmptyGrid = () =>
  Array(10)
    .fill(null)
    .map(() => Array(10).fill("empty"));

export const useCombatStore = create<CombatState>((set, get) => ({
  playerGrid: createEmptyGrid(),
  enemyGrid: createEmptyGrid(),
  placedShips: [],
  draggingShip: null,

  // Render lại lưới dựa trên trạng thái tàu hiện tại và bóng ma (nếu có)
  refreshGrid: (ships, ghost) => {
    const newGrid = createEmptyGrid();

    // Vẽ tàu đã đặt
    ships.forEach((ship) => {
      for (let i = 0; i < ship.size; i++) {
        const curY = ship.isHorizontal ? ship.y : ship.y + i;
        const curX = ship.isHorizontal ? ship.x + i : ship.x;
        if (curY >= 0 && curY < 10 && curX >= 0 && curX < 10) {
          newGrid[curY][curX] = "ship";
        }
      }
    });

    // Vẽ tàu đang kéo
    if (ghost && ghost.x !== -1 && ghost.y !== -1) {
      for (let i = 0; i < ghost.size; i++) {
        const curY = ghost.isHorizontal ? ghost.y : ghost.y + i;
        const curX = ghost.isHorizontal ? ghost.x + i : ghost.x;
        if (curY >= 0 && curY < 10 && curX >= 0 && curX < 10) {
          const isOverlapping = newGrid[curY][curX] === "ship";
          newGrid[curY][curX] =
            isOverlapping || !ghost.isValid ? "invalid" : "ship";
        }
      }
    }
    return newGrid;
  },

  setDraggingShip: (ship) => {
    if (!ship) {
      set({
        draggingShip: null,
        playerGrid: get().refreshGrid(get().placedShips),
      });
      return;
    }
    set({
      draggingShip: {
        ...ship,
        x: -1,
        y: -1,
        isHorizontal: true,
        isValid: false,
      },
    });
  },

  updateDraggingPos: (x, y) => {
    const dragging = get().draggingShip;
    if (!dragging || (dragging.x === x && dragging.y === y)) return;

    let isValid = true;
    const currentPlaced = get().placedShips;

    for (let i = 0; i < dragging.size; i++) {
      const curY = dragging.isHorizontal ? y : y + i;
      const curX = dragging.isHorizontal ? x + i : x;

      // Kiểm tra biên
      if (curY < 0 || curY >= 10 || curX < 0 || curX >= 10) {
        isValid = false;
        break;
      }

      // Kiểm tra va chạm với tàu khác
      const isOverlap = currentPlaced.some((s) => {
        for (let j = 0; j < s.size; j++) {
          const sy = s.isHorizontal ? s.y : s.y + j;
          const sx = s.isHorizontal ? s.x + j : s.x;
          if (sx === curX && sy === curY) return true;
        }
        return false;
      });

      if (isOverlap) {
        isValid = false;
        break;
      }
    }

    const newGhost = { ...dragging, x, y, isValid };
    set({
      draggingShip: newGhost,
      playerGrid: get().refreshGrid(currentPlaced, newGhost),
    });
  },

  placeShip: () => {
    const dragging = get().draggingShip;
    if (!dragging || !dragging.isValid) {
      set({
        draggingShip: null,
        playerGrid: get().refreshGrid(get().placedShips),
      });
      return false;
    }
    const newShips = [...get().placedShips, { ...dragging }];
    set({
      placedShips: newShips,
      playerGrid: get().refreshGrid(newShips),
      draggingShip: null,
    });
    return true;
  },

  pickUpShip: (size) => {
    const ship = get().placedShips.find((s) => s.size === size);
    if (!ship) return;
    const remaining = get().placedShips.filter((s) => s.size !== size);
    const ghost = { ...ship, isValid: true };
    set({
      placedShips: remaining,
      draggingShip: ghost,
      playerGrid: get().refreshGrid(remaining, ghost),
    });
  },

  toggleDraggingRotation: () => {
    const dragging = get().draggingShip;
    if (!dragging) return;
    const newRotation = { ...dragging, isHorizontal: !dragging.isHorizontal };
    set({ draggingShip: newRotation });
    // Re-validate vị trí sau khi xoay bóng ma
    get().updateDraggingPos(dragging.x, dragging.y);
  },

  rotateShipAt: (x, y) => {
    const ships = [...get().placedShips];
    const shipIdx = ships.findIndex((s) => {
      for (let i = 0; i < s.size; i++) {
        const curX = s.isHorizontal ? s.x + i : s.x;
        const curY = s.isHorizontal ? s.y : s.y + i;
        if (curX === x && curY === y) return true;
      }
      return false;
    });

    if (shipIdx === -1) return false;

    const ship = ships[shipIdx];
    const newIsHorizontal = !ship.isHorizontal;
    const otherShips = ships.filter((_, idx) => idx !== shipIdx);

    let canRotate = true;
    for (let i = 0; i < ship.size; i++) {
      const curX = newIsHorizontal ? ship.x + i : ship.x;
      const curY = newIsHorizontal ? ship.y : ship.y + i;

      if (curX < 0 || curX >= 10 || curY < 0 || curY >= 10) {
        canRotate = false;
        break;
      }

      const isOverlap = otherShips.some((os) => {
        for (let j = 0; j < os.size; j++) {
          const osX = os.isHorizontal ? os.x + j : os.x;
          const osY = os.isHorizontal ? os.y : os.y + j;
          if (osX === curX && osY === curY) return true;
        }
        return false;
      });

      if (isOverlap) {
        canRotate = false;
        break;
      }
    }

    if (canRotate) {
      ships[shipIdx] = { ...ship, isHorizontal: newIsHorizontal };
      set({
        placedShips: ships,
        playerGrid: get().refreshGrid(ships),
      });
      return true;
    }
    return false;
  },

  resetShips: () =>
    set({ placedShips: [], playerGrid: createEmptyGrid(), draggingShip: null }),
}));
