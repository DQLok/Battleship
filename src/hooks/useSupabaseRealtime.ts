// src/hooks/useSupabaseRealtime.ts
import { useCombatStore } from "./useCombatStore";

export const useSupabaseRealtime = (roomId: string) => {
  const { setTurn, updateEnemyGrid } = useCombatStore();

  const fireAttack = (x: number, y: number) => {
    console.log(`[Mock Attack] Bắn vào vị trí: ${x}, ${y}`);

    // Giả lập logic: Bắn xong mất lượt
    setTurn(false);

    // Giả lập sau 1 giây đối thủ phản hồi "Trúng" (để bạn thấy UI thay đổi)
    setTimeout(() => {
      updateEnemyGrid(x, y, Math.random() > 0.5 ? "hit" : "miss");
      setTurn(true);
    }, 1000);
  };

  return { fireAttack };
};
