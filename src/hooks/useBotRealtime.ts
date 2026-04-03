import { useCombatStore } from "./useCombatStore";

export const useBotRealtime = (roomId: string) => {
  const { setTurn, updateEnemyGrid, enemyShips, updatePlayerGrid, playerGrid } =
    useCombatStore();

  // Hàm helper kiểm tra Bot bắn trả (Random vị trí trên lưới người chơi)
  const botCounterAttack = () => {
    setTimeout(() => {
      let x: number, y: number;
      // Tìm ô mà Bot chưa bắn vào trên lưới của người chơi
      do {
        x = Math.floor(Math.random() * 10);
        y = Math.floor(Math.random() * 10);
      } while (playerGrid[y][x] === "hit" || playerGrid[y][x] === "miss");

      const result = updatePlayerGrid(x, y);
      console.log(`[Bot] Bắn vào ${x},${y} -> Kết quả: ${result}`);

      // Sau khi Bot bắn xong, trả lượt cho người chơi
      setTurn(true);
    }, 1500); // Bot đợi 1.5s mới bắn để tạo cảm giác thật
  };

  const fireAttack = (x: number, y: number) => {
    // 1. Kiểm tra xem tọa độ (x, y) có nằm trong bất kỳ con tàu nào của Bot không
    const hitShip = enemyShips.find((ship) => {
      for (let i = 0; i < ship.size; i++) {
        const curX = ship.isHorizontal ? ship.x + i : ship.x;
        const curY = ship.isHorizontal ? ship.y : ship.y + i;
        if (curX === x && curY === y) return true;
      }
      return false;
    });

    const status = hitShip ? "hit" : "miss";

    console.log(`[Player] Tấn công ${x},${y} -> ${status.toUpperCase()}`);

    // 2. Cập nhật kết quả lên lưới Radar (Enemy Grid)
    updateEnemyGrid(x, y, status);

    // 3. Kết thúc lượt của người chơi
    setTurn(false);

    // 4. Nếu bắn trượt, Bot sẽ phản công ngay.
    // Nếu bắn trúng, bạn có thể cho người chơi bắn tiếp (tùy luật game)
    // Ở đây ta mặc định bắn xong là đổi lượt:
    botCounterAttack();
  };

  return { fireAttack };
};
