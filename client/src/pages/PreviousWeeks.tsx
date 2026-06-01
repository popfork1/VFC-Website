import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { GameCard } from "@/components/GameCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import type { Game } from "@shared/schema";
import { useLocation, Link } from "wouter";
import { AlertCircle, Archive, Calendar, Trophy, Zap } from "lucide-react";

export default function PreviousWeeks() {
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [, setLocation] = useLocation();

  const { data: games, isLoading, error } = useQuery<Game[]>({
    queryKey: ["/api/games/week", selectedWeek],
    queryFn: async () => {
      const res = await fetch(`/api/games/week/${selectedWeek}?season=1`);
      if (!res.ok) throw new Error("Failed to fetch games");
      return res.json();
    }
  });

  const { data: allGames, isLoading: allGamesLoading } = useQuery<Game[]>({
    queryKey: ["/api/games/all"],
    queryFn: async () => {
      const res = await fetch(`/api/games/all?season=1`);
      if (!res.ok) throw new Error("Failed to fetch games");
      return res.json();
    }
  });

  const weeks = Array.from({ length: 14 }, (_, i) => i + 1);

  const gamesByWeek = allGames?.reduce((acc, game) => {
    if (!acc[game.week]) {
      acc[game.week] = [];
    }
    acc[game.week].push(game);
    return acc;
  }, {} as Record<number, Game[]>) || {};

  const playoffWeeks = [11, 12, 13, 14].filter(w => gamesByWeek[w]);

  const getRoundName = (week: number) => {
    if (week === 11) return "WILDCARD";
    if (week === 12) return "DIVISIONAL";
    if (week === 13) return "CONFERENCE";
    if (week === 14) return "SUPER BOWL";
    return `Week ${week}`;
  };

  const GameCardCompact = ({ game }: { game: Game }) => {
    return (
      <Link href={`/game/${game.id}`}>
        <Card className="group p-4 bg-card/40 backdrop-blur-xl border-border/40 hover:bg-card/60 transition-all duration-300 rounded-3xl cursor-pointer min-w-44 overflow-hidden relative" data-testid={`card-game-${game.id}`}>
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative z-10 flex flex-col gap-3">
            <Badge
              variant={game.isLive ? "default" : game.isFinal ? "secondary" : "outline"}
              className={`text-[9px] font-black tracking-widest uppercase px-2 py-0.5 rounded-full w-fit ${
                game.isLive ? 'animate-pulse' : 'bg-muted/50 border-none'
              }`}
              data-testid={`badge-status-${game.id}`}
            >
              {game.isLive ? "LIVE" : game.isFinal ? "FINAL" : "Scheduled"}
            </Badge>
            <div className="text-sm font-black italic uppercase tracking-tight" data-testid={`text-matchup-${game.id}`}>
              <div className="truncate group-hover:text-primary transition-colors">{game.team1}</div>
              <div className="text-[10px] text-muted-foreground/30 my-1 not-italic">VS</div>
              <div className="truncate group-hover:text-primary transition-colors">{game.team2}</div>
            </div>
            {game.isFinal && (
              <div className="text-xl font-black italic tabular-nums tracking-tighter border-t border-border/20 pt-2" data-testid={`text-score-${game.id}`}>
                {game.team1Score} - {game.team2Score}
              </div>
            )}
          </div>
        </Card>
      </Link>
    );
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="p-12 text-center border-none bg-card/50 backdrop-blur-2xl rounded-[40px] space-y-4">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
          <h2 className="text-2xl font-black italic uppercase tracking-tighter">Oops!</h2>
          <p className="text-muted-foreground font-medium">Failed to load archival data. Back soon!</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-background to-background">
      <div className="max-w-7xl mx-auto p-6 md:p-10 space-y-12">
        <div className="space-y-4">
          <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-none px-4 py-1.5 text-[11px] font-black uppercase tracking-widest">
            <Archive className="w-3.5 h-3.5 mr-2" />
            League History
          </Badge>
          <h1 className="text-5xl md:text-7xl font-black italic uppercase tracking-tighter leading-[0.9] text-foreground">
            Archives <span className="text-primary">S1</span>
          </h1>
          <p className="text-lg text-muted-foreground font-medium max-w-md leading-relaxed">
            Relive the action from our inaugural season. Full scores and match history.
          </p>
        </div>

        <div className="space-y-6">
          <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground px-4">Timeline Selection</h2>
          <div className="flex flex-wrap gap-2">
            {weeks.map((week) => {
              const roundName = week === 11 ? "Wildcard" : week === 12 ? "Divisional" : week === 13 ? "Conference" : week === 14 ? "Super Bowl" : `Week ${week}`;
              const active = selectedWeek === week;
              return (
                <Button
                  key={week}
                  variant="ghost"
                  onClick={() => setSelectedWeek(week)}
                  className={`h-12 px-6 rounded-2xl font-black uppercase tracking-widest text-[10px] border transition-all ${
                    active 
                      ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20 scale-105" 
                      : "bg-card/40 backdrop-blur-xl border-border/40 hover:bg-card/60"
                  }`}
                  data-testid={`button-week-${week}`}
                >
                  {roundName}
                </Button>
              );
            })}
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-64 rounded-[40px] bg-card/40" />
            ))}
          </div>
        ) : games && games.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {games.map((game) => (
              <GameCard
                key={game.id}
                game={game}
                onClick={() => setLocation(`/game/${game.id}`)}
              />
            ))}
          </div>
        ) : (
          <Card className="p-20 text-center border-dashed border-2 border-border/40 bg-transparent rounded-[40px]">
            <Calendar className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
            <p className="text-muted-foreground font-black uppercase tracking-widest text-xs">
              No archival data found for Week {selectedWeek}
            </p>
          </Card>
        )}

        {playoffWeeks.length > 0 && (
          <div className="space-y-12 pt-12 border-t border-border/20">
            <h2 className="text-4xl font-black italic uppercase tracking-tighter flex items-center gap-4">
              <Trophy className="w-8 h-8 text-primary" />
              Season 1 Playoffs
            </h2>
            {allGamesLoading ? (
              <div className="space-y-10">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-48 rounded-[40px] bg-card/40" />
                ))}
              </div>
            ) : (
              <div className="space-y-16">
                {playoffWeeks.map((week) => (
                  <div key={week} className="space-y-8">
                    <h3 className="text-2xl font-black italic uppercase tracking-tight flex items-center gap-3">
                      <div className="w-1.5 h-8 bg-primary rounded-full" />
                      {getRoundName(week)}
                    </h3>
                    <div className="flex flex-wrap gap-6">
                      {gamesByWeek[week].map((game) => (
                        <GameCardCompact key={game.id} game={game} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
