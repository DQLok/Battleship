import React, { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { Avatar, Box, Header, Page, Sheet, Text, useNavigate, useSnackbar } from "zmp-ui";
import "@/css/children/HomePage.scss";
import CombatHeader from "@/components/CombatHeader";
import { BarChart3, Settings, Ship, Trophy, Zap } from "lucide-react";
import { supabase } from "@/api/supabaseClient";
import { useUser } from "@/context/UserContext";
import { Profile } from "@/types/supabase/Profile";

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { openSnackbar } = useSnackbar();
  const { user } = useUser();

  const [leaderboard, setLeaderboard] = useState<Profile[]>([]);
  const [myProfile, setMyProfile] = useState<Profile | null>(null);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);
  const [loadingMe, setLoadingMe] = useState(false);

  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);

  const myStats = useMemo(() => {
    const src = myProfile || user;
    return {
      wins: src?.wins ?? 0,
      totalGames: src?.total_games ?? 0,
    };
  }, [myProfile, user]);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoadingLeaderboard(true);
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("id, username, avatar_url, wins, total_games, created_at, updated_at")
          .order("wins", { ascending: false })
          .limit(10);

        if (error) throw error;
        setLeaderboard((data || []) as Profile[]);
      } catch (e: any) {
        console.error(e);
        openSnackbar({ text: "Không tải được BXH. Vui lòng thử lại." });
      } finally {
        setLoadingLeaderboard(false);
      }
    };

    fetchLeaderboard();
  }, []);

  useEffect(() => {
    const fetchMe = async () => {
      if (!user?.id) return;
      setLoadingMe(true);
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("id, username, avatar_url, wins, total_games, created_at, updated_at")
          .eq("id", user.id)
          .maybeSingle();
        if (error) throw error;
        setMyProfile((data as Profile) || null);
      } catch (e) {
        // Best-effort; fallback to `user` from context
        setMyProfile(null);
      } finally {
        setLoadingMe(false);
      }
    };

    fetchMe();
  }, [user?.id]);

  return (
    <Page className="home-page" hideScrollbar>
      <Header
        title="Home"
        textColor="#22d3ee"
        backgroundColor="#061421"
        showBackIcon={false}
      />

      {/* Main Content - Áp dụng .main-section */}
      <Box className="main-section">
        <CombatHeader />

        {/* Daily Reward - Áp dụng .daily-reward-box */}
        <motion.div
          initial={{ x: -50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="daily-reward-box absolute top-[20%] left-4 z-50 w-[50%]"
          onClick={() =>
            openSnackbar({ text: "Tính năng phần thưởng hằng ngày đang triển khai." })
          }
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
            onClick={() => {
              navigate("/lobby");
            }}
          >
            <Box className="relative flex items-center justify-center gap-3">
              <Zap className="w-6 h-6 fill-primary" />
              <Box className="font-headline text-xl font-bold tracking-widest uppercase">
                Bắt đầu Chiến đấu
              </Box>
            </Box>
            <Box className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-primary" />
            <Box className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-primary" />
          </motion.button>

          <Box className="grid grid-cols-3 gap-4">
            <QuickActionButton
              icon={<BarChart3 />}
              label="BXH"
              onClick={() => setShowLeaderboard(true)}
            />
            <QuickActionButton
              icon={<Trophy />}
              label="Thành Tích"
              onClick={() => setShowAchievements(true)}
            />
            <QuickActionButton
              icon={<Settings />}
              label="Cài đặt"
              onClick={() => openSnackbar({ text: "Tính năng cài đặt đang triển khai." })}
            />
          </Box>
        </Box>
      </Box>

      {/* BXH */}
      <Sheet
        visible={showLeaderboard}
        onClose={() => setShowLeaderboard(false)}
        autoHeight
        mask
        handler
        swipeToClose
      >
        <Box p={4} className="bg-[#061421]">
          <Text.Title className="text-cyan-400 font-black">BXH (Top 10 Wins)</Text.Title>
          <Text size="xSmall" className="text-cyan-700 mt-1">
            Dữ liệu lấy từ bảng `profiles`, sắp xếp theo `wins` giảm dần.
          </Text>

          <Box className="mt-4 space-y-2">
            {loadingLeaderboard ? (
              <Text className="text-cyan-700 text-sm">Đang tải...</Text>
            ) : leaderboard.length === 0 ? (
              <Text className="text-cyan-700 text-sm">Chưa có dữ liệu.</Text>
            ) : (
              leaderboard.map((p, idx) => (
                <Box
                  key={p.id}
                  className="flex items-center justify-between p-3 border border-cyan-900/40 bg-cyan-950/10"
                >
                  <Box className="flex items-center gap-3">
                    <Box className="text-cyan-400 font-black w-6 text-center">
                      {idx + 1}
                    </Box>
                    <Avatar src={p.avatar_url || undefined} size={36} />
                    <Box className="flex flex-col">
                      <Text className="text-white font-bold text-sm">
                        {p.username || p.id}
                      </Text>
                      <Text className="text-cyan-700 text-[10px] uppercase tracking-widest">
                        {p.id}
                      </Text>
                    </Box>
                  </Box>
                  <Box className="text-right">
                    <Text className="text-cyan-300 font-black">{p.wins ?? 0}</Text>
                    <Text className="text-cyan-700 text-[10px] uppercase">Wins</Text>
                  </Box>
                </Box>
              ))
            )}
          </Box>
        </Box>
      </Sheet>

      {/* Thành tích */}
      <Sheet
        visible={showAchievements}
        onClose={() => setShowAchievements(false)}
        autoHeight
        mask
        handler
        swipeToClose
      >
        <Box p={4} className="bg-[#061421]">
          <Text.Title className="text-cyan-400 font-black">Thành tích</Text.Title>
          <Text size="xSmall" className="text-cyan-700 mt-1">
            Thống kê lấy từ `profiles` của bạn.
          </Text>

          <Box className="mt-4 grid grid-cols-2 gap-3">
            <Box className="p-4 border border-cyan-900/40 bg-cyan-950/10">
              <Text className="text-cyan-700 text-[10px] uppercase tracking-widest">
                Trận tham gia
              </Text>
              <Text className="text-white text-2xl font-black mt-1">
                {loadingMe ? "…" : myStats.totalGames}
              </Text>
            </Box>
            <Box className="p-4 border border-cyan-900/40 bg-cyan-950/10">
              <Text className="text-cyan-700 text-[10px] uppercase tracking-widest">
                Trận thắng
              </Text>
              <Text className="text-white text-2xl font-black mt-1">
                {loadingMe ? "…" : myStats.wins}
              </Text>
            </Box>
          </Box>

          <Box className="mt-4">
            <Box
              className="p-4 border border-cyan-900/40 bg-cyan-950/10 flex items-center justify-between"
              onClick={() =>
                openSnackbar({ text: "Tính năng phần thưởng hằng ngày đang triển khai." })
              }
            >
              <Text className="text-cyan-400 font-bold">Phần thưởng hằng ngày</Text>
              <Text className="text-cyan-700 text-xs">Đang triển khai</Text>
            </Box>
          </Box>
        </Box>
      </Sheet>
    </Page>
  );
};

// Cập nhật Component con dùng class .menu-small-btn
function QuickActionButton({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
}) {
  return (
    <Box
      className="menu-small-btn py-1 flex flex-col items-center gap-2 transition-colors group"
      onClick={onClick}
    >
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
