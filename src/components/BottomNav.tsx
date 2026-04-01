import { BottomNavigation, Icon } from "zmp-ui";
import { useNavigate, useLocation } from "react-router-dom";

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const activeTab = location.pathname;

  const navItems = [
    { path: "/", label: "Combat", icon: "zi-group-solid" },
    { path: "/match", label: "Match", icon: "zi-user-search" },
    { path: "/home", label: "Home", icon: "zi-drag-indicator-solid" },
    { path: "/result", label: "Result", icon: "zi-more-diamond-solid" },
  ];

  return (
    <BottomNavigation
      fixed
      activeKey={activeTab}
      // Thêm class để dễ target trong scss nếu cần
      className="tactical-bottom-nav"
    >
      {navItems.map((item) => (
        <BottomNavigation.Item
          key={item.path}
          label={item.label}
          icon={<Icon icon={item.icon as any} />}
          // Dùng màu Cyan của bạn cho active state
          className={
            activeTab === item.path ? "!text-[#22d3ee]" : "!text-gray-500"
          }
          onClick={() => navigate(item.path)}
        />
      ))}
    </BottomNavigation>
  );
}
