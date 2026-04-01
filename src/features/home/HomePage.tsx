import React from "react";
import { Box, Button, Header, Page } from "zmp-ui";
import BottomNav from "@/components/BottomNav";
import "@/css/children/HomePage.scss"; // Import file SCSS vừa tạo
import CombatHeader from "@/components/CombatHeader";

const HomePage: React.FC = () => {
  return (
    <Page className="home-page" hideScrollbar>
      <Header
        title="COMMANDER CENTER"
        textColor="#22d3ee"
        backgroundColor="#061421"
      />

      <Box className="header">
        <CombatHeader />
      </Box>

      <Box className="main-section">
        <Box className="daily-reward-box">
          <span className="text-cyan-400 text-xs font-bold">🎁 HÀNG NGÀY</span>
          <p className="text-[10px] text-slate-400 mb-2">
            Nhận 500 Gold ngay bây giờ.
          </p>
          <Button className="text-[10px] text-cyan-400 font-bold underline uppercase tracking-tighter">
            Nhận thưởng
          </Button>
        </Box>

        {/* 3. Central Radar Logo */}
        <div className="radar-container">
          <div className="radar-logo">
            <svg
              width="100"
              height="100"
              viewBox="0 0 24 24"
              fill="none"
              className="text-cyan-400 drop-shadow-[0_0_12px_rgba(34,211,238,0.8)]"
            >
              <path
                d="M2 17L12 21L22 17M2 12L12 16L22 12M12 3L2 7L12 11L22 7L12 3Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <div className="corner-decoration"></div>
          </div>
        </div>

        {/* 4. Game Title */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-black italic tracking-tighter text-cyan-400 neon-text mb-1">
            BẮN TÀU
          </h1>
          <p className="text-[9px] tracking-[0.4em] text-cyan-700 font-bold uppercase">
            Fleet Command • Protocol Active
          </p>
        </div>

        {/* 5. Main Action Button */}
        <button className="btn-primary-combat w-full py-4 rounded flex items-center justify-center gap-3 group">
          <span className="text-cyan-400 group-hover:animate-bounce">⚡</span>
          <span className="text-cyan-400 font-bold tracking-[0.2em] uppercase text-sm">
            Bắt đầu chiến đấu
          </span>
        </button>

        {/* 6. Secondary Menu */}
        <div className="grid grid-cols-3 gap-3 w-full mt-6">
          <MenuSmallBtn icon="📊" label="BXH" />
          <MenuSmallBtn icon="🎖" label="Thành tích" />
          <MenuSmallBtn icon="⚙" label="Cài đặt" />
        </div>
      </Box>

      <BottomNav />
    </Page>
  );
};

const MenuSmallBtn = ({ icon, label }: { icon: string; label: string }) => (
  <button className="menu-small-btn py-3 rounded flex flex-col items-center gap-1">
    <span className="text-lg">{icon}</span>
    <span className="text-[8px] text-slate-500 font-bold uppercase">
      {label}
    </span>
  </button>
);

export default HomePage;
