import { Profile } from "@/types/supabase/Profile";
import { PlayerItem } from "./PlayerItem";
import { Box } from "zmp-ui";

export const renderTeamSlots = (
  teamPlayers: Profile[],
  teamType: "alpha" | "bravo",
  game: any,
  myId: string,
  maxSlots: number // Nhận tham số động,
) => {
  const slots: React.ReactNode[] = [];

  for (let i = 0; i < maxSlots; i++) {
    if (teamPlayers[i]) {
      slots.push(
        <PlayerItem
          key={teamPlayers[i].id}
          player={teamPlayers[i]}
          game={game}
          myId={myId}
          role={i === 0 && game?.game_mode === "team" ? "Commander" : "Units"}
          teamColor={
            teamType === "alpha" ? "border-cyan-400" : "border-red-500"
          }
          index={i}
          ready={(game?.ready_members || []).includes(teamPlayers[i].id)}
        />
      );
    } else {
      slots.push(
        <Box key={`empty-${teamType}-${i}`} className="relative group">
          <Box
            className={`flex items-center justify-between p-3 bg-slate-900/10 border-l-4 border-dashed ${
              teamType === "alpha" ? "border-cyan-900/30" : "border-red-900/30"
            } opacity-40`}
          >
            {/* ... Nội dung slot trống giữ nguyên */}
          </Box>
        </Box>
      );
    }
  }
  return slots;
};
