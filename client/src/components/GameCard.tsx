import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Game } from "@shared/schema";
import { formatInTimeZone } from "date-fns-tz";
import { TEAMS } from "@/lib/teams";
import { Video } from "lucide-react";
import { useUserPreferences } from "@/hooks/useUserPreferences";

interface GameCardProps {
  game: Game;
  onClick?: () => void;
}

const TeamLogo = ({ teamName, className }: { teamName: string; className?: string }) => {
  const logo = TEAMS[teamName as keyof typeof TEAMS];
  if (!logo) return <div className={`${className} bg-muted rounded-full flex items-center justify-center text-[10px] font-bold`}>{teamName.substring(0, 2)}</div>;
  return <img src={logo} alt={teamName} className={`${className} object-contain`} />;
};

export function GameCard({ game, onClick }: GameCardProps) {
  const preferences = useUserPreferences();

  return (
    <Card 
      className={`group relative overflow-hidden transition-all duration-500 hover:shadow-[0_20px_50px_rgba(var(--primary),0.15)] border-border/40 bg-card/40 backdrop-blur-3xl rounded-[40px] cursor-pointer ${
        game.isLive ? 'ring-2 ring-primary/50 bg-primary/5' : ''
      }`}
      onClick={onClick}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      <div className="p-8 space-y-8 relative z-10">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Badge 
              variant={game.isLive ? "default" : "secondary"}
              className={`text-[10px] font-black tracking-widest uppercase px-4 py-1.5 rounded-full ${
                game.isLive ? 'animate-pulse bg-primary shadow-lg shadow-primary/20' : 'bg-muted/50 border-none'
              }`}
            >
              {game.isLive ? (
                <span className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                  Live • {game.quarter}
                </span>
              ) : game.isFinal ? 'Final' : 'Scheduled'}
            </Badge>
            {game.isPrimetime && (
              <Badge className="bg-amber-500/10 text-amber-500 border-none px-3 py-1 text-[9px] font-black uppercase tracking-widest">
                Primetime
              </Badge>
            )}
          </div>
          <span className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.3em] italic">Week {game.week}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-[1fr,auto,1fr] items-center gap-4 sm:gap-8">
          <div className="text-center space-y-4">
            <div className="relative inline-block group-hover:scale-110 transition-transform duration-700">
              <div className="absolute -inset-4 bg-primary/10 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
              <TeamLogo teamName={game.team1} className="w-16 h-16 sm:w-20 sm:h-20 relative z-10 drop-shadow-2xl" />
            </div>
            <p className="font-black italic text-sm uppercase tracking-tighter text-foreground/90 leading-none">{game.team1}</p>
          </div>

          <div className="text-center flex flex-col items-center gap-2">
            {game.isLive || game.isFinal ? (
              <div className="text-3xl sm:text-4xl font-black italic tracking-tighter tabular-nums flex items-center gap-4">
                <span className={game.team1Score! > game.team2Score! ? 'text-primary scale-110' : 'text-foreground/40'}>{game.team1Score}</span>
                <span className="text-muted-foreground/10 text-xl not-italic font-light">-</span>
                <span className={game.team2Score! > game.team1Score! ? 'text-primary scale-110' : 'text-foreground/40'}>{game.team2Score}</span>
              </div>
            ) : (
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border border-border/40 flex items-center justify-center bg-white/5">
                <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/40 font-black not-italic">VS</span>
              </div>
            )}
          </div>

          <div className="text-center space-y-4">
            <div className="relative inline-block group-hover:scale-110 transition-transform duration-700">
              <div className="absolute -inset-4 bg-primary/10 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
              <TeamLogo teamName={game.team2} className="w-16 h-16 sm:w-20 sm:h-20 relative z-10 drop-shadow-2xl" />
            </div>
            <p className="font-black italic text-sm uppercase tracking-tighter text-foreground/90 leading-none">{game.team2}</p>
          </div>
        </div>

        <div className="pt-8 flex flex-col items-center gap-4 border-t border-border/10">
          {!game.isFinal && !game.isLive ? (
             <div className="flex flex-col items-center gap-1">
               <p className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-[0.25em]">
                 {game.gameTime ? formatInTimeZone(new Date(game.gameTime), "America/New_York", "EEE, MMM d") : "Date TBD"}
               </p>
               <p className="text-[10px] font-black text-primary uppercase tracking-widest">
                 {game.gameTime ? formatInTimeZone(new Date(game.gameTime), "America/New_York", "h:mm a 'EST'") : "Time TBD"}
               </p>
             </div>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
