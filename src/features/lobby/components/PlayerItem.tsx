import { Icon } from "zmp-ui";

export const PlayerItem = ({ player, game, myId, role, teamColor = "border-cyan-400" }: any) => (
    <div className="relative group">
      <div className={`flex items-center justify-between p-3 bg-[#0A262E]/80 border-l-4 ${teamColor}`}>
        <div className="flex items-center gap-3">
          <div className="relative">
            {player.avatar_url && (
              <img
                src={player.avatar_url}
                className="w-12 h-12 rounded bg-slate-800 border border-cyan-800"
              />
            )}
            {player.id === game?.host_id && (
              <span className="absolute -top-2 -left-2 bg-cyan-400 text-black text-[9px] px-1 font-bold">
                HOST
              </span>
            )}
          </div>
          <div>
            <p className="text-white font-bold text-sm uppercase tracking-widest">
              {player.username}
            </p>
            <p className={`text-[10px] font-bold ${teamColor.replace('border', 'text')}`}>READY</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[9px] text-cyan-700 uppercase">{role}</p>
          {player.id === myId && (
            <Icon icon="zi-chat" size={16} className="mt-1 opacity-50" />
          )}
        </div>
      </div>
    </div>
  );