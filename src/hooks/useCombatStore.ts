import { create } from "zustand";

export type CellStatus = "empty" | "hit" | "miss" | "ship" | "invalid";

export interface Ship {
  size: number;
  name: string;
  x: number;
  y: number;
  isHorizontal: boolean;
}

const SHIPS_DATA = [
  { size: 5, name: "Carrier" },
  { size: 4, name: "Battle" },
  { size: 3, name: "Cruiser" },
  { size: 2, name: "Destroy" },
];

interface DraggingState extends Ship {
  isValid: boolean;
}

interface CombatState {
  // States
  gameId: string | null;
  user: any;
  isBotMode: boolean;
  playerGrid: CellStatus[][];
  enemyGrid: CellStatus[][];
  placedShips: Ship[];
  draggingShip: DraggingState | null;
  enemyShips: Ship[];
  turn: boolean;
  winner: "player" | "enemy" | null;
  lastPlayerAttack: { x: number; y: number } | null;
  lastBotAttack: { x: number; y: number } | null;
  sunkShips: string[];
  sunkShipsData: { name: string; coords: { x: number; y: number }[] }[];
  isProcessing: boolean;

  // Actions
  initGame: (gameId: string, user: any, isBotMode: boolean) => void;
  setIsBotMode: (val: boolean) => void;
  refreshGrid: (ships: Ship[], ghost?: DraggingState) => CellStatus[][];
  generateRandomFleet: () => Ship[];
  setDraggingShip: (ship: { size: number; name: string } | null) => void;
  updateDraggingPos: (x: number, y: number) => void;
  placeShip: () => boolean;
  pickUpShip: (size: number) => void;
  toggleDraggingRotation: () => void;
  rotateShipAt: (x: number, y: number) => boolean;
  resetShips: () => void;
  autoPlaceShips: () => void;
  setEnemyShips: (ships: Ship[]) => void;
  setTurn: (turn: boolean) => void;
  recordMove: (
    userId: string,
    x: number,
    y: number,
    isHit: boolean,
    currentUserId: string,
    sunkShipName?: string
  ) => void;
  checkGameOver: () => Promise<void>;

  // Helpers
  checkValidPlacement: (
    x: number,
    y: number,
    size: number,
    isH: boolean,
    existingShips: Ship[]
  ) => boolean;
  isShipSunk: (grid: CellStatus[][], ship: Ship) => boolean;
  botTurnAction: () => Promise<void>;
}

const createEmptyGrid = () =>
  Array(10)
    .fill(null)
    .map(() => Array(10).fill("empty"));

export const useCombatStore = create<CombatState>((set, get) => ({
  gameId: null,
  user: null,
  isBotMode: false,
  playerGrid: createEmptyGrid(),
  enemyGrid: createEmptyGrid(),
  placedShips: [],
  enemyShips: [],
  draggingShip: null,
  turn: true,
  lastPlayerAttack: null,
  lastBotAttack: null,
  winner: null,
  sunkShips: [],
  sunkShipsData: [],
  isProcessing: false,

  initGame: (gameId, user, isBotMode) => set({ gameId, user, isBotMode }),

  refreshGrid: (ships, ghost) => {
    const newGrid = createEmptyGrid();
    ships.forEach((ship) => {
      for (let i = 0; i < ship.size; i++) {
        const curY = ship.isHorizontal ? ship.y : ship.y + i;
        const curX = ship.isHorizontal ? ship.x + i : ship.x;
        if (curY >= 0 && curY < 10 && curX >= 0 && curX < 10)
          newGrid[curY][curX] = "ship";
      }
    });
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

  setIsBotMode: (val) => set({ isBotMode: val }),

  // ... (Các hàm setDraggingShip, updateDraggingPos, placeShip, pickUpShip giữ nguyên như code của bạn)
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
      } as DraggingState,
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
    const ghost = { ...ship, isValid: true } as DraggingState;
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
    const isValid = get().checkValidPlacement(
      dragging.x,
      dragging.y,
      dragging.size,
      newIsHorizontal,
      get().placedShips
    );
    set({
      draggingShip: { ...dragging, isHorizontal: newIsHorizontal, isValid },
      playerGrid: get().refreshGrid(get().placedShips, {
        ...dragging,
        isHorizontal: newIsHorizontal,
        isValid,
      }),
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

  setEnemyShips: (ships) => set({ enemyShips: ships }),

  setTurn: (turn) => set({ turn }),

  resetShips: () => {
    set({
      placedShips: [],
      playerGrid: createEmptyGrid(),
      enemyGrid: createEmptyGrid(),
      lastPlayerAttack: null,
      lastBotAttack: null,
      winner: null,
      sunkShips: [],
      sunkShipsData: [],
      isProcessing: false,
    });
  },

  isShipSunk: (grid, ship) => {
    for (let i = 0; i < ship.size; i++) {
      const cx = ship.isHorizontal ? ship.x + i : ship.x;
      const cy = ship.isHorizontal ? ship.y : ship.y + i;
      if (grid[cy][cx] !== "hit") return false;
    }
    return true;
  },

  recordMove: (userId, x, y, isHit, currentUserId, sunkShipName) => {
    const { user, isBotMode, turn, winner } = get();
    if (winner) return;

    const status = isHit ? "hit" : "miss";
    const isOpponentMove = userId !== currentUserId;

    set((state) => {
      const targetGridKey = isOpponentMove ? "playerGrid" : "enemyGrid";
      const newGrid = state[targetGridKey].map((row, rIdx) =>
        rIdx === y ? row.map((cell, cIdx) => (cIdx === x ? status : cell)) : row
      );

      let newSunkShips = [...state.sunkShips];
      if (
        !isOpponentMove &&
        sunkShipName &&
        !newSunkShips.includes(sunkShipName)
      ) {
        newSunkShips.push(sunkShipName);
      }

      let newSunkShipsData = [...state.sunkShipsData];
      // Trong recordMove, phần xử lý sunkShipName
      if (sunkShipName && !isOpponentMove) {
        const connectedHitCoords: { x: number; y: number }[] = [];

        // 1. Thêm ô hiện tại
        connectedHitCoords.push({ x, y });

        // 2. Kiểm tra 4 hướng nhưng dừng lại khi gặp ô không phải 'hit'
        // hoặc vượt quá kích thước logic của 1 con tàu (max 5 ô)
        const directions = [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ];

        directions.forEach(([dx, dy]) => {
          for (let i = 1; i < 5; i++) {
            // Tàu dài nhất là 5
            const nx = x + dx * i;
            const ny = y + dy * i;
            if (
              nx >= 0 &&
              nx < 10 &&
              ny >= 0 &&
              ny < 10 &&
              newGrid[ny][nx] === "hit"
            ) {
              connectedHitCoords.push({ x: nx, y: ny });
            } else {
              break; // Gặp ô trống hoặc miss thì dừng hướng này ngay
            }
          }
        });

        // 3. Lọc trùng và cập nhật
        const uniqueCoords = Array.from(
          new Set(connectedHitCoords.map((c) => `${c.x},${c.y}`))
        ).map((s) => {
          const [cx, cy] = s.split(",").map(Number);
          return { x: cx, y: cy };
        });

        const existingIdx = newSunkShipsData.findIndex(
          (d) => d.name === sunkShipName
        );
        if (existingIdx > -1) {
          newSunkShipsData[existingIdx] = {
            name: sunkShipName,
            coords: uniqueCoords,
          };
        } else {
          newSunkShipsData.push({ name: sunkShipName, coords: uniqueCoords });
        }
      }

      // 4. Logic giữ lượt

      let nextTurn = state.turn;

      if (!isHit) {
        nextTurn = isOpponentMove;
      }

      return {
        [targetGridKey]: newGrid,
        sunkShips: newSunkShips,
        sunkShipsData: newSunkShipsData,
        turn: nextTurn,
        ...(isOpponentMove
          ? { lastBotAttack: { x, y } }
          : { lastPlayerAttack: { x, y } }),
      };
    });

    get().checkGameOver();

    const stateAfter = get();
    if (isBotMode && !stateAfter.turn && !stateAfter.winner) {
      get().botTurnAction();
    }
  },

  checkGameOver: async () => {
    const { sunkShips, placedShips, playerGrid, winner } = get();

    // Nếu đã có người thắng thì không chạy lại
    if (winner) return;

    let currentWinner: "player" | "enemy" | null = null;

    if (sunkShips.length === SHIPS_DATA.length) {
      currentWinner = "player";
    } else {
      const allPlayerSunk =
        placedShips.length > 0 &&
        placedShips.every((s) => get().isShipSunk(playerGrid, s));
      if (allPlayerSunk) currentWinner = "enemy";
    }

    if (currentWinner) {
      set({ winner: currentWinner });
    }
  },

  botTurnAction: async () => {
    const { playerGrid, placedShips, isBotMode, winner } = get();
    if (!isBotMode || winner) return;

    set({ isProcessing: true });
    await new Promise((r) => setTimeout(r, 800)); // Delay cho thật

    let x,
      y,
      valid = false;
    while (!valid) {
      x = Math.floor(Math.random() * 10);
      y = Math.floor(Math.random() * 10);
      if (playerGrid[y][x] === "empty" || playerGrid[y][x] === "ship")
        valid = true;
    }

    const isHit = playerGrid[y][x] === "ship";

    // Kiểm tra xem có tàu nào của người chơi bị chìm không
    let sunkName = undefined;
    if (isHit) {
      // Logic check chìm tàu đơn giản cho Bot
    }

    get().recordMove("bot", x, y, isHit, `${sunkName}`);
    set({ isProcessing: false });
  },
}));
