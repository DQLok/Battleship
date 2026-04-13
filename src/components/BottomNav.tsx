import { BottomNavigation, Icon, useLocation, useNavigate } from "zmp-ui";

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  // Đảm bảo activeKey luôn khớp với pathname hiện tại
  const activeTab = location.pathname;

  const navItems = [
    { path: "/", label: "Home", icon: "zi-group-solid" },
    // { path: "/match", label: "Match", icon: "zi-user-search" },
    // { path: "/combat", label: "Combat", icon: "zi-drag-indicator-solid" },
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
