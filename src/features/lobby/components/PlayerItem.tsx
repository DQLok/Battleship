import { Box, Icon } from "zmp-ui";

export const PlayerItem = ({
  player,
  game,
  myId,
  role,
  teamColor = "border-cyan-400",
  index,
  ready,
}: any) => (
  <Box className="relative group">
    <Box
      className={`flex items-center justify-between p-3 bg-[#0A262E]/80 border-l-4 ${teamColor} ${
        player?.id && myId && player.id === myId
          ? "ring-1 ring-cyan-300/70 shadow-[0_0_20px_rgba(34,211,238,0.25)]"
          : ""
      }`}
    >
      <Box className="flex items-center gap-3">
        <Box className="relative">
          {player.avatar_url && (
            <img
              src={player.avatar_url}
              className="w-12 h-12 rounded bg-slate-800 border border-cyan-800"
            />
          )}
          {player.id === game?.host_id && (
            <Box className="absolute -top-2 -left-2 bg-cyan-400 text-black text-[9px] px-1 font-bold">
              HOST
            </Box>
          )}
        </Box>
        <Box>
          <Box
            className={`font-bold text-sm uppercase tracking-widest ${
              player?.id && myId && player.id === myId
                ? "text-cyan-300 drop-shadow-[0_0_12px_rgba(34,211,238,0.55)]"
                : "text-white"
            }`}
          >
            {(player.username || player.id || "Player").length > 10
              ? `${(player.username || player.id).toUpperCase().slice(0, 10)}...`
              : (player.username || player.id || "Player")}
          </Box>
          <Box
            className={`text-[10px] font-bold ${teamColor.replace(
              "border",
              "text"
            )}`}
          >
            {index === 0 || index === 4 ? "Caption" : "Member"}
          </Box>
        </Box>
      </Box>
      <Box>
        {(player.id === game?.host_id || ready) && (
          <Icon icon="zi-check-circle" className="text-cyan-500" />
        )}
      </Box>
    </Box>
  </Box>
);
