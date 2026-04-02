import { create } from "zustand";

export type CellStatus = "empty" | "hit" | "miss" | "ship" | "invalid";

const SHIPS_DATA = [
  { size: 5, name: "Carrier" },
  { size: 4, name: "Battle" },
  { size: 3, name: "Cruiser" },
  { size: 2, name: "Destroy" },
];

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
  enemyShips: Ship[];
  turn: boolean;

  // Actions
  refreshGrid: (ships: Ship[], ghost?: DraggingState) => CellStatus[][];
  setDraggingShip: (ship: { size: number; name: string } | null) => void;
  updateDraggingPos: (x: number, y: number) => void;
  placeShip: () => boolean;
  pickUpShip: (size: number) => void;
  toggleDraggingRotation: () => void;
  rotateShipAt: (x: number, y: number) => boolean;
  resetShips: () => void;
  autoPlaceShips: () => void;
  setEnemyShips: (ships: Ship[]) => void; // Đã thêm
  setBotFleet: () => void; // Đã thêm
  updatePlayerGrid: (x: number, y: number) => "hit" | "miss";
  isShipSunk: (grid: CellStatus[][], ship: Ship) => boolean;
  updateEnemyGrid: (x: number, y: number, status: "hit" | "miss") => void;
  setTurn: (turn: boolean) => void;
  // Helper
  checkValidPlacement: (
    x: number,
    y: number,
    size: number,
    isH: boolean,
    existingShips: Ship[]
  ) => boolean;
  generateRandomFleet: () => Ship[];
  lastPlayerAttack: { x: number; y: number } | null;
  lastBotAttack: { x: number; y: number } | null;
}

const createEmptyGrid = () =>
  Array(10)
    .fill(null)
    .map(() => Array(10).fill("empty"));

export const useCombatStore = create<CombatState>((set, get) => ({
  playerGrid: createEmptyGrid(),
  enemyGrid: createEmptyGrid(),
  placedShips: [],
  enemyShips: [],
  draggingShip: null,
  turn: true,
  lastPlayerAttack: null,
  lastBotAttack: null,

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

    // Vẽ tàu đang kéo (Ghost)
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

    const isValid = get().checkValidPlacement(
      x,
      y,
      dragging.size,
      dragging.isHorizontal,
      get().placedShips
    );
    const newGhost = { ...dragging, x, y, isValid };

    set({
      draggingShip: newGhost,
      playerGrid: get().refreshGrid(get().placedShips, newGhost),
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
    const newIsHorizontal = !dragging.isHorizontal;

    // Check valid ngay khi xoay
    const isValid = get().checkValidPlacement(
      dragging.x,
      dragging.y,
      dragging.size,
      newIsHorizontal,
      get().placedShips
    );
    const newGhost = { ...dragging, isHorizontal: newIsHorizontal, isValid };

    set({
      draggingShip: newGhost,
      playerGrid: get().refreshGrid(get().placedShips, newGhost),
    });
  },

  rotateShipAt: (x, y) => {
    const ships = [...get().placedShips];
    const shipIdx = ships.findIndex((s) => {
      for (let i = 0; i < s.size; i++) {
        const cx = s.isHorizontal ? s.x + i : s.x;
        const cy = s.isHorizontal ? s.y : s.y + i;
        if (cx === x && cy === y) return true;
      }
      return false;
    });

    if (shipIdx === -1) return false;
    const ship = ships[shipIdx];
    const otherShips = ships.filter((_, idx) => idx !== shipIdx);
    const canRotate = get().checkValidPlacement(
      ship.x,
      ship.y,
      ship.size,
      !ship.isHorizontal,
      otherShips
    );

    if (canRotate) {
      ships[shipIdx] = { ...ship, isHorizontal: !ship.isHorizontal };
      set({ placedShips: ships, playerGrid: get().refreshGrid(ships) });
      return true;
    }
    return false;
  },

  checkValidPlacement: (x, y, size, isH, existingShips) => {
    for (let i = 0; i < size; i++) {
      const cx = isH ? x + i : x;
      const cy = isH ? y : y + i;
      if (cx < 0 || cx >= 10 || cy < 0 || cy >= 10) return false;

      const overlap = existingShips.some((s) => {
        for (let j = 0; j < s.size; j++) {
          const sx = s.isHorizontal ? s.x + j : s.x;
          const sy = s.isHorizontal ? s.y : s.y + j;
          if (sx === cx && sy === cy) return true;
        }
        return false;
      });
      if (overlap) return false;
    }
    return true;
  },

  generateRandomFleet: () => {
    const newShips: Ship[] = [];
    SHIPS_DATA.forEach((shipData) => {
      let placed = false;
      let attempts = 0;
      while (!placed && attempts < 150) {
        const isH = Math.random() > 0.5;
        const x = Math.floor(Math.random() * 10);
        const y = Math.floor(Math.random() * 10);
        if (get().checkValidPlacement(x, y, shipData.size, isH, newShips)) {
          newShips.push({ ...shipData, x, y, isHorizontal: isH });
          placed = true;
        }
        attempts++;
      }
    });
    return newShips;
  },

  autoPlaceShips: () => {
    const fleet = get().generateRandomFleet();
    set({
      placedShips: fleet,
      playerGrid: get().refreshGrid(fleet),
      draggingShip: null,
    });
  },

  setBotFleet: () => {
    const fleet = get().generateRandomFleet();
    set({ enemyShips: fleet, enemyGrid: createEmptyGrid() });
  },

  resetShips: () => {
    set({
      placedShips: [],
      playerGrid: createEmptyGrid(),
      enemyGrid: createEmptyGrid(),
      lastPlayerAttack: null,
      lastBotAttack: null,
    });
  },

  setEnemyShips: (ships) => set({ enemyShips: ships }),

  updatePlayerGrid: (x, y) => {
    const isHit = get().placedShips.some((s) => {
      // ... logic check hit cũ
    });
    const status = isHit ? "hit" : "miss";
    set((state) => ({
      playerGrid: state.playerGrid.map((row, rIdx) =>
        rIdx === y ? row.map((cell, cIdx) => (cIdx === x ? status : cell)) : row
      ),
      lastBotAttack: { x, y }, // Lưu vị trí gần nhất của Bot
    }));
    return status;
  },

  isShipSunk: (grid, ship) => {
    for (let i = 0; i < ship.size; i++) {
      const cx = ship.isHorizontal ? ship.x + i : ship.x;
      const cy = ship.isHorizontal ? ship.y : ship.y + i;
      if (grid[cy][cx] !== "hit") return false;
    }
    return true;
  },

  updateEnemyGrid: (x, y, status) => {
    set((state) => {
      const newGrid = state.enemyGrid.map((row, rIdx) =>
        rIdx === y ? row.map((cell, cIdx) => (cIdx === x ? status : cell)) : row
      );
      return {
        enemyGrid: newGrid,
        lastPlayerAttack: { x, y }, // Lưu vị trí gần nhất của mình
      };
    });
  },

  setTurn: (turn) => set({ turn }),
}));
