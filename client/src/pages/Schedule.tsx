import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useSeasonConfig } from "@/hooks/useSeasonConfig";
import type { Game } from "@shared/schema";
import { isFuture } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { Calendar, MapPin, AlertCircle, Search, Clock, ChevronRight } from "lucide-react";
import { TEAMS } from "@/lib/teams";
import { useState } from "react";
import { Link } from "wouter";
import { useWeekConfig } from "@/hooks/useWeekConfig";

export default function Schedule() {
  const [searchQuery, setSearchQuery] = useState("");
  const { currentSeasonId } = useSeasonConfig();

  const { data: allGames, isLoading, error } = useQuery<Game[]>({
    queryKey: ["/api/games/all", currentSeasonId],
    queryFn: async () => {
      const res = await fetch(`/api/games/all?season=${currentSeasonId}`);
      if (!res.ok) throw new Error("Failed to fetch games");
      return res.json();
    }
  });

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
          <p className="text-xl font-black uppercase tracking-tighter italic">Schedule Offline</p>
          <Button onClick={() => window.location.reload()} variant="outline" className="rounded-full">Retry</Button>
        </div>
      </div>
    );
  }

  const filteredGames = allGames ? allGames.filter(game =>
    game.team1.toLowerCase().includes(searchQuery.toLowerCase()) ||
    game.team2.toLowerCase().includes(searchQuery.toLowerCase())
  ) : [];

  const gamesByWeek = filteredGames.reduce((acc, game) => {
    if (!acc[game.week]) acc[game.week] = [];
    acc[game.week].push(game);
    return acc;
  }, {} as Record<number, Game[]>);

  const { getWeekLabel } = useWeekConfig();
  const weeks = Object.keys(gamesByWeek).map(Number).sort((a, b) => a - b);

  return (
    <div className="min-h-screen bg-background p-6 md:p-10 max-w-7xl mx-auto space-y-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-4">
          <Badge className="bg-primary/10 text-primary border-none font-black uppercase tracking-[0.2em] text-[10px] px-4 py-1.5 rounded-full w-fit">
            Season Itinerary
          </Badge>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black italic uppercase tracking-tighter leading-[0.9]">
            Schedule <span className="text-muted-foreground/20">S2</span>
          </h1>
        </div>

        <div className="relative group w-full md:w-72">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search matchups..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-12 pl-12 bg-white/5 border-white/10 rounded-2xl font-bold text-sm"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-12">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="space-y-6">
              <Skeleton className="h-8 w-40 bg-card/50 rounded-full" />
              <div className="grid gap-4">
                {[...Array(3)].map((_, j) => (
                  <Skeleton key={j} className="h-28 bg-card/50 rounded-[32px]" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : weeks.length > 0 ? (
        <div className="space-y-16">
          {weeks.map((week) => (
            <div key={week} className="space-y-6">
              <div className="flex items-center gap-6">
                <h2 className="text-3xl font-black italic uppercase tracking-tighter text-primary">{getWeekLabel(week)}</h2>
                <div className="flex-1 h-px bg-gradient-to-r from-primary/20 to-transparent" />
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">{gamesByWeek[week].length} games</span>
              </div>

              <div className="grid gap-3">
                {gamesByWeek[week].map((game) => {
                  const gameDate = game.gameTime ? new Date(game.gameTime) : null;
                  const isUpcoming = gameDate ? isFuture(gameDate) : false;
                  const team1Wins = game.isFinal && game.team1Score! > game.team2Score!;
                  const team2Wins = game.isFinal && game.team2Score! > game.team1Score!;

                  return (
                    <Link key={game.id} href={`/game/${game.id}`}>
                      <Card className="group p-5 bg-card/40 backdrop-blur-xl border-border/40 hover:bg-card/70 hover:border-primary/20 transition-all duration-300 rounded-[28px] cursor-pointer">
                        <div className="flex items-center gap-4">

                          {/* Status */}
                          <div className="w-20 flex-shrink-0 text-center">
                            <Badge className={`text-[8px] font-black uppercase tracking-widest w-full justify-center ${
                              game.isLive ? 'bg-primary animate-pulse' :
                              game.isFinal ? 'bg-white/10 text-white border-none' :
                              'bg-muted/30 text-muted-foreground border-none'
                            }`}>
                              {game.isLive ? '● Live' : game.isFinal ? 'Final' : isUpcoming ? 'Soon' : 'Sched.'}
                            </Badge>
                          </div>

                          {/* Teams + Scores */}
                          <div className="flex-1 space-y-2">
                            {[
                              { team: game.team1, score: game.team1Score, wins: team1Wins },
                              { team: game.team2, score: game.team2Score, wins: team2Wins },
                            ].map((t, i) => (
                              <div key={i} className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  {TEAMS[t.team as keyof typeof TEAMS] && (
                                    <img src={TEAMS[t.team as keyof typeof TEAMS]} className="w-6 h-6 object-contain" alt={t.team} />
                                  )}
                                  <span className={`font-black uppercase tracking-tight text-sm ${t.wins ? 'text-foreground' : game.isFinal ? 'text-muted-foreground' : 'text-foreground'}`}>
                                    {t.team}
                                  </span>
                                </div>
                                {(game.isFinal || game.isLive) && (
                                  <span className={`text-lg font-black italic tabular-nums ${t.wins ? 'text-primary' : ''}`}>
                                    {t.score}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>

                          {/* Date / Time */}
                          <div className="hidden sm:flex flex-col items-end gap-1 flex-shrink-0 min-w-[120px]">
                            {gameDate ? (
                              <>
                                <span className="text-sm font-black text-foreground/70">
                                  {formatInTimeZone(gameDate, "America/New_York", "MMM d, yyyy")}
                                </span>
                                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">
                                  {formatInTimeZone(gameDate, "America/New_York", "h:mm a 'EST'")}
                                </span>
                              </>
                            ) : (
                              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/30">TBD</span>
                            )}
                            {game.location && (
                              <div className="flex items-center gap-1 text-muted-foreground/30">
                                <MapPin className="w-3 h-3" />
                                <span className="text-[9px] font-bold uppercase tracking-widest truncate max-w-[100px]">{game.location}</span>
                              </div>
                            )}
                          </div>

                          {/* Arrow */}
                          <ChevronRight className="w-4 h-4 text-muted-foreground/20 group-hover:text-primary group-hover:translate-x-1 transition-all flex-shrink-0" />
                        </div>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-32 bg-card/10 rounded-[40px] border border-dashed border-white/5">
          <Calendar className="w-16 h-16 text-muted-foreground/10 mx-auto mb-6" />
          <h3 className="text-2xl font-black italic uppercase tracking-tighter text-muted-foreground/40">No Games Found</h3>
          <p className="text-muted-foreground/30 text-[10px] font-black uppercase tracking-widest mt-2">
            {searchQuery ? "Try a different search" : "Schedule coming soon"}
          </p>
        </div>
      )}
    </div>
  );
}
