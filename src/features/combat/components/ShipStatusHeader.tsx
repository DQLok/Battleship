// src/features/combat/components/ShipStatusHeader.tsx
import { useCombatStore } from '@/hooks/useCombatStore';
import React from 'react';

const ShipStatusHeader: React.FC = () => {
  // Lấy hull trực tiếp từ store
  const hull = useCombatStore((state) => state.hullIntegrity);

  const getHullColor = (hp: number) => {
    if (hp > 70) return 'text-cyan-400';
    if (hp > 30) return 'text-yellow-400';
    return 'text-red-500 animate-pulse';
  };

  return (
    <div className="flex flex-col items-center gap-1 font-mono">
      <h3 className={`text-xl font-bold uppercase tracking-widest ${getHullColor(hull)} shadow-[0_0_15px_rgba(0,242,255,0.3)] transition-colors duration-500`}>
        HULL INTEGRITY: <span className="font-extrabold">{hull}%</span>
      </h3>
      
      {/* Thanh máu */}
      <div className="w-48 h-1 bg-cyan-950 rounded-full overflow-hidden border border-cyan-800/50 mt-1">
        <div 
          className={`h-full transition-all duration-500 ease-out ${hull > 30 ? 'bg-cyan-400' : 'bg-red-500'}`}
          style={{ width: `${hull}%` }}
        />
      </div>

      {/* Live Dot Status */}
      <div className="flex items-center gap-2 mt-2 text-cyan-700 text-xs uppercase">
        <span>Status:</span>
        <div className="flex items-center gap-1.5">
          <span className={hull > 0 ? "text-cyan-500" : "text-red-600"}>
            {hull > 0 ? "Operational" : "Destroyed"}
          </span>
          {hull > 0 && (
            <div className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400"></span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShipStatusHeader;