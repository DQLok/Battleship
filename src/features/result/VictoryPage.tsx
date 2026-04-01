import BottomNav from "@/components/BottomNav";
import React from "react";
import { Icon, Button, Page } from "zmp-ui";

const VictoryPage: React.FC = () => {
  return (
    <Page className="h-screen w-full bg-[#061421] text-white flex flex-col font-mono overflow-y-auto pb-10" hideScrollbar>
      {/* Header (Giữ nguyên style đồng bộ) */}
      <div className="p-4 flex justify-between items-center border-b border-cyan-900/30">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 border border-cyan-400 rounded-full bg-slate-800" />
          <span className="text-cyan-400 font-bold text-xs uppercase tracking-widest">Commander</span>
        </div>
        <div className="bg-cyan-950/40 border border-cyan-800 px-3 py-1 rounded text-cyan-300 text-xs font-bold">
          ★ 1,250 XP
        </div>
      </div>

      <div className="flex-grow flex flex-col items-center pt-8 px-6">
        {/* Banner Victory */}
        <div className="text-center mb-8">
          <div className="inline-block px-4 py-1 border border-cyan-800 bg-cyan-950/20 text-[10px] text-cyan-600 tracking-[0.3em] uppercase mb-4">
            Missions - Complete
          </div>
          <h1 className="text-6xl font-black italic text-cyan-400 drop-shadow-[0_0_20px_rgba(34,211,238,0.6)] mb-2">
            VICTORY
          </h1>
          <p className="text-[10px] tracking-[0.2em] text-cyan-700 font-bold uppercase">
            Fleet Command: Sector Secured
          </p>
        </div>

        {/* Stats Grid (Top row) */}
        <div className="grid grid-cols-2 gap-4 w-full mb-4">
          {/* Accuracy Card */}
          <div className="bg-[#0a1a29]/60 border border-slate-800 p-4 rounded-sm flex flex-col items-center">
            <span className="text-[10px] text-slate-500 uppercase mb-3">Accuracy</span>
            <div className="relative w-16 h-16 flex items-center justify-center">
              {/* Circular Progress Simple */}
              <svg className="w-full h-full -rotate-90">
                <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-slate-800" />
                <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="transparent" strokeDasharray={175} strokeDashoffset={175 * (1 - 0.75)} className="text-cyan-400" />
              </svg>
              <span className="absolute text-sm font-bold">75%</span>
            </div>
          </div>

          {/* Ships Sunk Card */}
          <div className="bg-[#0a1a29]/60 border border-slate-800 p-4 rounded-sm flex flex-col items-center">
            <span className="text-[10px] text-slate-500 uppercase mb-2">Ships Sunk</span>
            <span className="text-4xl font-bold text-cyan-400">05</span>
            <div className="flex gap-1 mt-2 text-[10px]">🚢🚢🚢🚢🚢</div>
          </div>
        </div>

        {/* Stats Grid (Bottom row) */}
        <div className="grid grid-cols-2 gap-4 w-full mb-6">
          <div className="bg-[#0a1a29]/60 border border-slate-800 p-4 rounded-sm flex items-center gap-3">
             <div className="w-10 h-10 bg-cyan-950/50 border border-cyan-800 flex items-center justify-center text-cyan-400">📈</div>
             <div>
                <div className="text-[8px] text-slate-500 uppercase">XP Gained</div>
                <div className="text-lg font-bold text-cyan-400">+450</div>
             </div>
          </div>
          <div className="bg-[#0a1a29]/60 border border-slate-800 p-4 rounded-sm flex items-center gap-3">
             <div className="w-10 h-10 bg-cyan-950/50 border border-cyan-800 flex items-center justify-center text-cyan-400">💰</div>
             <div>
                <div className="text-[8px] text-slate-500 uppercase">Credits</div>
                <div className="text-lg font-bold text-cyan-400">2.4K</div>
             </div>
          </div>
        </div>

        {/* Telemetry List */}
        <div className="w-full bg-[#05101a]/80 border border-cyan-900/30 rounded-sm overflow-hidden mb-8">
           <div className="flex justify-between p-3 border-b border-cyan-900/30 bg-cyan-950/20">
              <span className="text-[9px] font-bold text-cyan-600 uppercase">Fleet Telemetry</span>
              <span className="text-[9px] text-cyan-400">02:45 MISSION TIME</span>
           </div>
           <div className="p-4 space-y-4">
              <div className="flex justify-between items-center">
                 <div className="flex items-center gap-3">
                    <span className="text-cyan-500">🚀</span>
                    <span className="text-xs uppercase font-bold text-slate-300">Cruiser Intercepted</span>
                 </div>
                 <span className="text-cyan-400 font-bold">x2</span>
              </div>
              <div className="flex justify-between items-center">
                 <div className="flex items-center gap-3">
                    <span className="text-cyan-500">🌿</span>
                    <span className="text-xs uppercase font-bold text-slate-300">Supply Vessel</span>
                 </div>
                 <span className="text-cyan-400 font-bold">x3</span>
              </div>
           </div>
        </div>

        {/* Action Buttons */}
        <div className="w-full space-y-3">
          <button className="w-full py-4 bg-cyan-400 text-[#061421] font-bold uppercase tracking-[0.2em] rounded-sm shadow-[0_0_20px_rgba(34,211,238,0.4)] active:scale-95 transition-transform">
            Chơi lại
          </button>
          <button className="w-full py-4 bg-transparent border border-cyan-900/50 text-cyan-400 font-bold uppercase tracking-[0.2em] rounded-sm flex items-center justify-center gap-2 active:bg-cyan-950/20 transition-colors">
            <span>🔗</span> Chia sẻ Zalo
          </button>
        </div>
      </div>
      <BottomNav />
    </Page>
  );
};

export default VictoryPage;