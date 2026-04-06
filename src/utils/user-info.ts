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