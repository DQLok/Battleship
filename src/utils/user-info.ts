import { Profile } from "@/types/supabase/Profile";
import { getUserInfo } from "zmp-sdk";

/**
 * Lấy User ID ưu tiên từ URL (Mock) hoặc từ Zalo SDK
 * @returns Promise<string>
 */
export const getAppUserId = async (): Promise<string> => {
  try {
    // 1. Kiểm tra Mock ID từ URL trước (Dành cho việc test 2 simulator/tab)
    const urlParams = new URLSearchParams(window.location.search);
    const mockId = urlParams.get('mockId');

    if (mockId) {
      console.log("🛠️ Using Mock ID:", mockId);
      return mockId;
    }

    // 2. Nếu không có mockId, lấy từ Zalo SDK
    const { userInfo } = await getUserInfo({});
    return userInfo.id;
    
  } catch (error) {
    console.error("Error getting User Info:", error);
    // Trả về một ID mặc định hoặc rỗng để tránh crash app khi dev
    return "guest_user";
  }
};

export const generateFakePlayers = (count: number): Profile[] => {
  const names = [
    "ADMIRAL_VNG",
    "CAPTAIN_X",
    "NAVIGATOR_88",
    "LT_KIM",
    "STRIKER_ALPHA",
    "RECON_EYE",
    "VULCAN_7",
    "SHADOW_OPS",
  ];

  return Array.from({ length: count }).map((_, index) => {
    // Tạo một chuỗi ngẫu nhiên làm seed (ví dụ: "a1b2c3")
    const randomSeed = Math.random().toString(36).substring(2, 7);

    return {
      id: `fake-id-${randomSeed}-${index}`,
      username:
        names[Math.floor(Math.random() * names.length)] + "_" + (index + 1),
      // Truyền randomSeed vào đây để DiceBear tự vẽ hình mới
      avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${randomSeed}`,
    };
  }) as Profile[];
};