// Tạo file mới: src/components/MainLayout.tsx (hoặc đặt trong folder layout)
import { Outlet } from "react-router-dom";
import BottomNav from "./BottomNav"; // Đường dẫn đến file BottomNav của bạn

const MainLayout = () => {
  return (
    <div className="flex h-screen min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <Outlet />
      </div>
      <BottomNav />
    </div>
  );
};

export default MainLayout;