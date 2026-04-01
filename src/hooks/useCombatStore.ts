import { create } from "zustand";

export type CellStatus = 'empty' | 'hit' | 'miss' | 'ship';

interface CombatState {
  roomId: string | null;
  hullIntegrity: number;// máu
  isPlayerTurn: boolean;//khoá mở khi người chơi đến lượt
  commanderName: string;
  enemyName: string;
  xp: number;
  oil: number;// mana
  selectedCoord: { x: number; y: number } | null;
  
  // Lưới dữ liệu
  playerGrid: CellStatus[][];
  enemyGrid: CellStatus[][];

  // Actions (Hành động)
  setRoom: (id: string) => void;
  setTurn: (isMyTurn: boolean) => void;
  setSelectedCoord: (coord: { x: number; y: number } | null) => void;
  useOil: (amount: number) => boolean;
  takeDamage: (amount: number) => void;
  checkHit: (x: number, y: number) => boolean;
  updateEnemyGrid: (x: number, y: number, status: 'hit' | 'miss') => void;
  randomizeShips: () => void; // <--- Đã thêm khai báo này
  resetCombat: () => void;
}

const createEmptyGrid = () => Array(10).fill(null).map(() => Array(10).fill('empty'));

export const useCombatStore = create<CombatState>((set, get) => ({
  roomId: null,
  hullIntegrity: 100,
  isPlayerTurn: false,
  commanderName: "COMMANDER ALPHA",
  enemyName: "UNKNOWN ENEMY",
  xp: 1250,
  oil: 5,
  selectedCoord: null,
  playerGrid: createEmptyGrid(),
  enemyGrid: createEmptyGrid(),

  setRoom: (id) => set({ roomId: id }),
  setTurn: (isMyTurn) => set({ isPlayerTurn: isMyTurn }),
  setSelectedCoord: (coord) => set({ selectedCoord: coord }),

  useOil: (amount) => {
    const currentOil = get().oil;
    if (currentOil >= amount) {
      set({ oil: currentOil - amount });
      return true;
    }
    return false;
  },

  takeDamage: (amount) =>
    set((state) => ({
      hullIntegrity: Math.max(0, state.hullIntegrity - amount),
    })),

  checkHit: (x, y) => {
    const grid = get().playerGrid;
    return grid[y][x] === 'ship';
  },

  updateEnemyGrid: (x, y, status) => {
    // Clone mảng 2 chiều để trigger re-render
    const newGrid = get().enemyGrid.map(row => [...row]);
    newGrid[y][x] = status;
    set({ enemyGrid: newGrid });
  },

  // Logic tự động rải tàu 5, 4, 3, 2 ô
  randomizeShips: () => {
    const newGrid = createEmptyGrid();
    const shipSizes = [5, 4, 3, 2];

    shipSizes.forEach((size) => {
      let placed = false;
      while (!placed) {
        const isHorizontal = Math.random() > 0.5;
        const x = Math.floor(Math.random() * (isHorizontal ? 10 - size : 10));
        const y = Math.floor(Math.random() * (isHorizontal ? 10 : 10 - size));

        let canPlace = true;
        for (let i = 0; i < size; i++) {
          const checkY = isHorizontal ? y : y + i;
          const checkX = isHorizontal ? x + i : x;
          if (newGrid[checkY][checkX] !== 'empty') {
            canPlace = false;
            break;
          }
        }

        if (canPlace) {
          for (let i = 0; i < size; i++) {
            newGrid[isHorizontal ? y : y + i][isHorizontal ? x + i : x] = 'ship';
          }
          placed = true;
        }
      }
    });
    set({ playerGrid: newGrid });
  },

  resetCombat: () =>
    set({
      hullIntegrity: 100,
      isPlayerTurn: false,
      selectedCoord: null,
      playerGrid: createEmptyGrid(),
      enemyGrid: createEmptyGrid(),
      oil: 5
    }),
}));