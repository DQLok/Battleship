import React from "react";
import { motion } from "motion/react";
import { Box, Header, Page } from "zmp-ui";
import "@/css/children/HomePage.scss";
import CombatHeader from "@/components/CombatHeader";
import { BarChart3, Settings, Ship, Trophy, Zap } from "lucide-react";

const HomePage: React.FC = () => {
  return (
    <Page className="home-page" hideScrollbar>
      <Header
        title="Home"
        textColor="#22d3ee"
        backgroundColor="#061421"
        showBackIcon={false}
      />
      {/* Header - Class .header đã có trong SCSS */}
      <Box className="header">
        <CombatHeader />
      </Box>

      {/* Main Content - Áp dụng .main-section */}
      <main className="main-section">
        {/* Daily Reward - Áp dụng .daily-reward-box */}
        <motion.div
          initial={{ x: -100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="daily-reward-box z-40 max-w-[220px]"
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="font-headline text-[10px] font-bold tracking-widest uppercase">
              Hàng Ngày
            </span>
          </div>
          <p className="text-xs text-slate-400 leading-tight">
            Nhận 500 Gold ngay bây giờ.
          </p>
          <button className="mt-2 text-[10px] font-bold uppercase hover:underline decoration-primary/50">
            Nhận Thưởng
          </button>
        </motion.div>

        {/* Radar Centerpiece - Cấu trúc lại theo .radar-container và .radar-logo */}
        <div className="radar-container mb-12">
          <div className="radar-logo w-72 h-72 md:w-80 md:h-80">
            {/* Radar Rings */}
            <div className="absolute inset-0 border border-primary/10 rounded-full" />
            <div className="absolute inset-8 border border-primary/20 rounded-full" />
            <div className="absolute inset-16 border border-primary/5 rounded-full" />

            {/* Scan Line - Sử dụng .radar-gradient từ SCSS */}
            <div className="absolute inset-0 radar-scan rounded-full opacity-40 animate-scan" />

            {/* Ship Silhouette */}
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="relative z-20 drop-shadow-[0_0_30px_var(--accent)]"
            >
              <Ship className="w-48 h-48" strokeWidth={1} />
            </motion.div>

            {/* Corner Decoration từ SCSS */}
            <div className="corner-decoration" />

            {/* Decorative Pings */}
            <div className="absolute top-1/4 right-1/4 w-2 h-2 bg-primary rounded-full animate-pulse shadow-[0_0_10px_var(--accent)]" />
            <div className="absolute bottom-1/3 left-1/4 w-1.5 h-1.5 bg-red-500 rounded-full opacity-60 animate-ping" />
          </div>
        </div>

        {/* Title Section - Áp dụng .neon-text */}
        <div className="text-center mb-10">
          <h1 className="neon-text font-headline text-5xl md:text-6xl font-black italic tracking-tighter mb-2">
            BẮN TÀU
          </h1>
          <p className="font-headline text-[10px] tracking-[0.4em] uppercase opacity-60">
            Fleet Command • Protocol Active
          </p>
        </div>

        {/* Action Buttons - Áp dụng .btn-primary-combat */}
        <div className="w-full max-w-sm space-y-6">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="btn-primary-combat group relative w-full py-5 rounded-sm overflow-hidden transition-all"
          >
            <div className="relative flex items-center justify-center gap-3">
              <Zap className="w-6 h-6 fill-primary" />
              <span className="font-headline text-xl font-bold tracking-widest uppercase">
                Bắt đầu Chiến đấu
              </span>
            </div>
            {/* Corner Accents */}
            <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-primary" />
            <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-primary" />
          </motion.button>

          <div className="grid grid-cols-3 gap-4">
            <QuickActionButton icon={<BarChart3 />} label="BXH" />
            <QuickActionButton icon={<Trophy />} label="Thành Tích" />
            <QuickActionButton icon={<Settings />} label="Cài đặt" />
          </div>
        </div>
      </main>

      {/* Side Telemetry */}
      <div className="fixed right-8 top-1/2 -translate-y-1/2 hidden lg:flex flex-col gap-8 opacity-30 pointer-events-none">
        <TelemetryItem label="LAT 40.7128° N" width="w-16" />
        <TelemetryItem label="LON 74.0060° W" width="w-12" />
        <TelemetryItem label="DEPTH 4200M" width="w-20" />
      </div>
    </Page>
  );
};

// Cập nhật Component con dùng class .menu-small-btn
function QuickActionButton({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button className="menu-small-btn py-4 flex flex-col items-center gap-2 transition-colors group">
      <div className="text-primary/70 group-hover:text-primary transition-colors">
        {icon}
      </div>
      <span className="font-headline text-[10px] uppercase tracking-wider text-slate-400 group-hover:text-white">
        {label}
      </span>
    </button>
  );
}

function TelemetryItem({ label, width }: { label: string; width: string }) {
  return (
    <div className="flex flex-col items-end">
      <span className="font-headline text-[10px] text-primary">{label}</span>
      <div className={`${width} h-[1px] bg-primary mt-1`} />
    </div>
  );
}

export default HomePage;
