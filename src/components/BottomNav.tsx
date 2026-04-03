import { BottomNavigation, Icon } from "zmp-ui";
import { useNavigate, useLocation } from "react-router-dom";

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  // Đảm bảo activeKey luôn khớp với pathname hiện tại
  const activeTab = location.pathname;

  const navItems = [
    { path: "/", label: "Combat", icon: "zi-group-solid" },
    { path: "/match", label: "Match", icon: "zi-user-search" },
    { path: "/home", label: "Home", icon: "zi-drag-indicator-solid" },
    { path: "/lobby", label: "Lobby", icon: "zi-more-diamond-solid" },
  ];

  return (
    <BottomNavigation fixed activeKey={activeTab}>
      {navItems.map((item) => (
        <BottomNavigation.Item
          key={item.path} // Key cực kỳ quan trọng để xác định tab active
          label={item.label}
          icon={<Icon icon={item.icon as any} />}
          onClick={() => navigate(item.path)}
        />
      ))}
    </BottomNavigation>
  );
}
