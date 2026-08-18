import React, { useState, useEffect } from "react";

const MatchmakingPage: React.FC = () => {
  const [seconds, setSeconds] = useState(0);

  // Bộ đếm thời gian giả lập
  useEffect(() => {
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  return (
    <div className="h-screen w-full bg-[#061421] text-white flex flex-col font-mono overflow-hidden">
      {/* Header */}
      <div className="p-4 flex justify-between items-center border-b border-cyan-900/30">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 border border-cyan-400 rounded-full bg-slate-800" />
          <span className="text-cyan-400 font-bold text-xs uppercase tracking-widest">
            Commander
          </span>
        </div>
        <div className="bg-cyan-950/40 border border-cyan-800 px-3 py-1 rounded text-cyan-300 text-xs font-bold">
          ★ 1,250 XP
        </div>
      </div>

      <div className="flex-grow flex flex-col items-center pt-10 px-6">
        {/* Status Badge */}
        <div className="bg-red-950/30 border border-red-900/50 px-4 py-1 rounded-full mb-4 flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping" />
          <span className="text-red-500 text-[10px] font-bold tracking-widest uppercase">
            Matchmaking Active
          </span>
        </div>

        <h1 className="text-3xl font-black text-white mb-2">
          ĐANG TÌM ĐỐI THỦ...
        </h1>
        <p className="text-cyan-700 text-[10px] tracking-widest mb-10 text-center">
          Searching deep sea sectors for hostile fleet...
        </p>

        {/* Radar Animation Area */}
        <div className="relative w-64 h-64 border border-cyan-900/30 rounded-xl bg-cyan-950/10 flex items-center justify-center">
          {/* Hiệu ứng Radar quét (CSS Animation) */}
          <div className="absolute inset-4 border border-cyan-500/10 rounded-full">
            <div
              className="w-full h-full rounded-full border-t border-cyan-400/40 animate-spin"
              style={{ animationDuration: "3s" }}
            ></div>
          </div>

          {/* Box Thời gian */}
          <div className="z-10 bg-[#0d2136] border border-cyan-800 p-6 rounded-sm text-center shadow-2xl">
            <div className="text-4xl font-bold text-cyan-400 mb-1">
              {formatTime(seconds)}
            </div>
            <div className="text-[8px] text-cyan-700 tracking-[0.2em] uppercase">
              Elapsed Time
            </div>
          </div>

          {/* Các điểm Blip ngẫu nhiên */}
          <div className="absolute top-1/4 left-1/3 w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse shadow-[0_0_8px_#22d3ee]"></div>
          <div className="absolute bottom-1/3 right-1/4 w-1 h-1 bg-cyan-400/50 rounded-full animate-pulse delay-700"></div>
        </div>

        {/* Player Cards Area */}
        <div className="w-full mt-10 space-y-4">
          {/* Card Bạn (Ally) */}
          <div className="bg-[#0a1a29] border border-cyan-800 p-3 flex items-center gap-4 relative">
            <div className="absolute top-0 right-0 bg-cyan-800 px-2 py-0.5 text-[8px] font-bold text-cyan-200">
              ALLY
            </div>
            <div className="w-12 h-12 border-2 border-cyan-500 rounded-sm overflow-hidden bg-slate-800">
              <img
                src="https://img.icons8.com/officel/80/000000/admiral.png"
                alt="Ally"
              />
            </div>
            <div>
              <div className="text-sm font-bold text-white uppercase">
                Admiral Vance
              </div>
              <div className="flex gap-2 mt-1">
                <span className="text-[8px] bg-cyan-950 border border-cyan-800 px-1.5 text-cyan-400">
                  V-LEVEL 4
                </span>
                <span className="text-[8px] bg-cyan-950 border border-cyan-800 px-1.5 text-cyan-400">
                  ELITE
                </span>
              </div>
            </div>
          </div>

          {/* Card Đối thủ (Hostile - Đang tìm) */}
          <div className="bg-slate-900/40 border border-slate-800 p-3 flex items-center gap-4 opacity-50 relative">
            <div className="absolute top-0 right-0 bg-slate-800 px-2 py-0.5 text-[8px] font-bold text-slate-500 uppercase">
              Hostile
            </div>
            <div className="w-12 h-12 border border-slate-700 border-dashed flex items-center justify-center text-slate-700 text-xl font-bold">
              ?
            </div>
            <div className="space-y-2">
              <div className="w-32 h-3 bg-slate-800 rounded-full animate-pulse"></div>
              <div className="w-20 h-2 bg-slate-800 rounded-full animate-pulse"></div>
            </div>
          </div>
        </div>

        {/* Cancel Button */}
        <button className="w-full mt-6 py-3 border border-cyan-900/50 bg-cyan-950/10 text-cyan-600 text-xs font-bold tracking-[0.2em] uppercase hover:text-red-400 hover:border-red-900 transition-colors">
          ✕ Cancel Search
        </button>
      </div>
    </div>
  );
};

export default MatchmakingPage;
