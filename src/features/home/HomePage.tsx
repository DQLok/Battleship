import React from "react";
import { motion } from "motion/react";
import { Box, Header, Page, Text } from "zmp-ui";
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
      <Box className="main-section">
        {/* Daily Reward - Áp dụng .daily-reward-box */}
        <motion.div
          initial={{ x: -100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="daily-reward-box z-40 max-w-[220px]"
        >
          <Box className="flex items-center gap-2 mb-1">
            <Box className="font-headline text-[10px] font-bold tracking-widest uppercase">
              Hàng Ngày
            </Box>
          </Box>
          <Box className="text-xs text-slate-400 leading-tight">
            Nhận 500 Gold ngay bây giờ.
          </Box>
          <Text className="mt-2 text-[10px] font-bold uppercase hover:underline decoration-primary/50">
            Nhận Thưởng
          </Text>
        </motion.div>

        {/* Radar Centerpiece - Cấu trúc lại theo .radar-container và .radar-logo */}
        <Box className="radar-container">
          <Box className="radar-logo w-72 h-72 md:w-80 md:h-80">
            {/* Radar Rings */}
            <Box className="absolute inset-0 border border-primary/10 rounded-full" />
            <Box className="absolute inset-8 border border-primary/20 rounded-full" />
            <Box className="absolute inset-16 border border-primary/5 rounded-full" />

            {/* Scan Line - Sử dụng .radar-gradient từ SCSS */}
            <Box className="absolute inset-0 radar-scan rounded-full opacity-40 animate-scan" />

            {/* Ship Silhouette */}
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="relative z-20 drop-shadow-[0_0_30px_var(--accent)]"
            >
              <Ship className="w-40 h-40" strokeWidth={1} />
            </motion.div>

            {/* Corner Decoration từ SCSS */}
            <Box className="corner-decoration" />

            {/* Decorative Pings */}
            <Box className="absolute top-1/4 right-1/4 w-2 h-2 bg-primary rounded-full animate-pulse shadow-[0_0_10px_var(--accent)]" />
            <Box className="absolute bottom-1/3 left-1/4 w-1.5 h-1.5 bg-red-500 rounded-full opacity-60 animate-ping" />
          </Box>
        </Box>

        {/* Title Section - Áp dụng .neon-text */}
        <Box className="text-center mb-4">
          <Text className="neon-text font-headline text-3xl md:text-6xl font-black italic tracking-tighter my-2">
            BẮN TÀU
          </Text>
          <Text className="font-headline text-[10px] tracking-[0.4em] uppercase opacity-60">
            Fleet Command • Protocol Active
          </Text>
        </Box>

        {/* Action Buttons - Áp dụng .btn-primary-combat */}
        <Box className="w-full max-w-sm space-y-6">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="btn-primary-combat group relative w-full py-4 rounded-sm overflow-hidden transition-all"
          >
            <Box className="relative flex items-center justify-center gap-3">
              <Zap className="w-6 h-6 fill-primary" />
              <Box className="font-headline text-xl font-bold tracking-widest uppercase">
                Bắt đầu Chiến đấu
              </Box>
            </Box>
            {/* Corner Accents */}
            <Box className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-primary" />
            <Box className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-primary" />
          </motion.button>

          <Box className="grid grid-cols-3 gap-4">
            <QuickActionButton icon={<BarChart3 />} label="BXH" />
            <QuickActionButton icon={<Trophy />} label="Thành Tích" />
            <QuickActionButton icon={<Settings />} label="Cài đặt" />
          </Box>
        </Box>
      </Box>
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
    <Box className="menu-small-btn py-1 flex flex-col items-center gap-2 transition-colors group">
      <Box className="text-primary/70 group-hover:text-primary transition-colors">
        {icon}
      </Box>
      <Text className="font-headline text-[10px] uppercase tracking-wider text-slate-400 group-hover:text-white">
        {label}
      </Text>
    </Box>
  );
}

export default HomePage;
