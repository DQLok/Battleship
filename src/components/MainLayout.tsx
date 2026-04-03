// Tạo file mới: src/components/MainLayout.tsx (hoặc đặt trong folder layout)
import { Outlet } from "react-router-dom";
import BottomNav from "./BottomNav"; // Đường dẫn đến file BottomNav của bạn

const MainLayout = () => {
  return (
    <div className="flex flex-col h-screen">
      <div className="flex-1 overflow-y-auto pb-16"> 
        {/* pb-16 để không bị BottomNav đè lên nội dung cuối trang */}
        <Outlet /> 
      </div>
      <BottomNav />
    </div>
  );
};

export default MainLayout;