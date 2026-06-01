import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation } from "wouter";
import { Zap, Calendar, Trophy, ChevronRight, Users, Star } from "lucide-react";
import { formatInTimeZone } from "date-fns-tz";
import type { Game, Standings, Prediction } from "@shared/schema";
import { TEAMS } from "@/lib/teams";
import { calculateWinProbability } from "@/lib/winProbability";
import { useWeekConfig } from "@/hooks/useWeekConfig";
import { useSeasonConfig } from "@/hooks/useSeasonConfig";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

function GameCard({ game, standings, allGames }: { game: Game; standings: Standings[]; allGames: Game[] }) {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: predictions = [] } = useQuery<Prediction[]>({
    queryKey: ["/api/predictions", game.id],
    enabled: !!game.id,
  });

  const voteMutation = useMutation({
    mutationFn: async (teamVote: string) => {
      return await apiRequest("POST", "/api/predictions", {
        gameId: game.id,
        votedFor: teamVote,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/predictions", game.id] });
      toast({ title: "Prediction placed!", description: "Your pick has been locked in." });
    },
    onError: () => {
      toast({ title: "Login required", description: "Sign in to make predictions.", variant: "destructive" });
    },
  });

  const team1Prob = calculateWinProbability(game, "team1", standings, allGames);
  const team2Prob = calculateWinProbability(game, "team2", standings, allGames);

  const myPrediction = predictions.find((p: Prediction) => p.userId === (user as any)?.id);
  const team1Votes = predictions.filter((p: Prediction) => p.votedFor === game.team1).length;
  const team2Votes = predictions.filter((p: Prediction) => p.votedFor === game.team2).length;
  const totalVotes = team1Votes + team2Votes;

  const isScheduled = !game.isFinal && !game.isLive;
  const leadingTeam = game.isLive || game.isFinal
    ? (game.team1Score ?? 0) > (game.team2Score ?? 0) ? "team1"
    : (game.team2Score ?? 0) > (game.team1Score ?? 0) ? "team2"
    : null
    : null;

  return (
    <Card
      data-testid={`game-card-${game.id}`}
      onClick={() => setLocation(`/game/${game.id}`)}
      className="group p-0 bg-card/40 backdrop-blur-xl border-border/40 hover:bg-card/60 hover:border-border/70 transition-all duration-300 rounded-[28px] cursor-pointer overflow-hidden"
    >
      {/* Status bar */}
      <div className={`px-6 py-3 flex items-center justify-between border-b border-white/5 ${game.isLive ? 'bg-primary/10' : ''}`}>
        <div className="flex items-center gap-2">
          {game.isPrimetime && (
            <Badge className="bg-amber-500/20 text-amber-400 border-none text-[9px] font-black uppercase tracking-widest h-5 gap-1">
              <Star className="w-2.5 h-2.5" />
              Primetime
            </Badge>
          )}
          <Badge
            className={`text-[9px] font-black uppercase tracking-widest h-5 gap-1.5 ${
              game.isLive
                ? 'bg-primary text-primary-foreground'
                : game.isFinal
                ? 'bg-white/10 text-white border-none'
                : 'bg-muted/50 border-none text-muted-foreground'
            }`}
          >
            {game.isLive && <span className="w-1.5 h-1.5 rounded-full bg-primary-foreground animate-pulse" />}
            {game.isLive ? `Live · ${game.quarter || ""}` : game.isFinal ? "Final" : "Upcoming"}
          </Badge>
        </div>
        {isScheduled && game.gameTime ? (
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">
            {formatInTimeZone(new Date(game.gameTime), "America/New_York", "MMM d · h:mm a")} EST
          </span>
        ) : (
          <div className="flex items-center gap-2">
            <Users className="w-3 h-3 text-muted-foreground/30" />
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">{totalVotes} picks</span>
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/20 group-hover:text-muted-foreground/50 group-hover:translate-x-0.5 transition-all" />
          </div>
        )}
      </div>

      {/* Scoreboard */}
      <div className="p-5 flex items-center gap-3">
        {/* Team 1 */}
        <div className={`flex-1 flex items-center gap-2.5 min-w-0 ${leadingTeam === "team2" && game.isFinal ? "opacity-40" : ""}`}>
          {TEAMS[game.team1 as keyof typeof TEAMS] ? (
            <img
              src={TEAMS[game.team1 as keyof typeof TEAMS]}
              alt={game.team1}
              className="w-9 h-9 object-contain flex-shrink-0 drop-shadow"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-white/5 flex-shrink-0" />
          )}
          <div className="min-w-0">
            <p className={`font-black italic uppercase tracking-tight text-xs leading-tight line-clamp-2 ${leadingTeam === "team1" && game.isFinal ? "text-primary" : ""}`}>
              {game.team1}
            </p>
            {myPrediction?.votedFor === game.team1 && (
              <span className="text-[9px] font-black uppercase tracking-widest text-primary/70">Your pick</span>
            )}
          </div>
        </div>

        {/* Score / VS */}
        <div className="flex-shrink-0 flex flex-col items-center gap-1 min-w-[72px]">
          {game.isLive || game.isFinal ? (
            <div className="flex items-center gap-2.5">
              <span className={`text-2xl font-black italic tabular-nums ${leadingTeam === "team1" ? "text-primary" : ""}`}>
                {game.team1Score ?? 0}
              </span>
              <span className="text-muted-foreground/20 font-black text-lg">·</span>
              <span className={`text-2xl font-black italic tabular-nums ${leadingTeam === "team2" ? "text-primary" : ""}`}>
                {game.team2Score ?? 0}
              </span>
            </div>
          ) : (
            <span className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/30">VS</span>
          )}
        </div>

        {/* Team 2 */}
        <div className={`flex-1 flex items-center gap-2.5 justify-end min-w-0 ${leadingTeam === "team1" && game.isFinal ? "opacity-40" : ""}`}>
          <div className="min-w-0 text-right">
            <p className={`font-black italic uppercase tracking-tight text-xs leading-tight line-clamp-2 ${leadingTeam === "team2" && game.isFinal ? "text-primary" : ""}`}>
              {game.team2}
            </p>
            {myPrediction?.votedFor === game.team2 && (
              <span className="text-[9px] font-black uppercase tracking-widest text-primary/70">Your pick</span>
            )}
          </div>
          {TEAMS[game.team2 as keyof typeof TEAMS] ? (
            <img
              src={TEAMS[game.team2 as keyof typeof TEAMS]}
              alt={game.team2}
              className="w-9 h-9 object-contain flex-shrink-0 drop-shadow"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-white/5 flex-shrink-0" />
          )}
        </div>
      </div>

      {/* Win Probability Bar + Predictions — only for non-final games */}
      {!game.isFinal && (
        <div className="px-5 pb-4 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black uppercase tracking-widest text-primary">{team1Prob}%</span>
            <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">Win Probability</span>
            <span className="text-[9px] font-black uppercase tracking-widest text-primary">{team2Prob}%</span>
          </div>
          <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden flex">
            <div
              className="bg-primary/70 h-full transition-all duration-700 rounded-l-full"
              style={{ width: `${team1Prob}%` }}
            />
            <div className="bg-primary/40 h-full transition-all duration-700 rounded-r-full flex-1" />
          </div>

          {/* Fan predictions row + vote buttons */}
          <div className="flex items-center justify-between pt-2" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-1.5">
              {team1Votes > 0 && (
                <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">
                  {team1Votes} fan{team1Votes !== 1 ? "s" : ""}
                </span>
              )}
            </div>
            {user ? (
              myPrediction ? (
                <Badge className="bg-primary/10 text-primary border-none text-[9px] font-black uppercase tracking-widest">
                  ✓ {myPrediction.votedFor}
                </Badge>
              ) : (
                <div className="flex gap-1.5">
                  <Button
                    size="sm"
                    variant="ghost"
                    data-testid={`predict-team1-${game.id}`}
                    onClick={(e) => { e.stopPropagation(); voteMutation.mutate(game.team1); }}
                    disabled={voteMutation.isPending}
                    className="h-6 px-3 text-[9px] font-black uppercase tracking-widest rounded-full bg-white/5 hover:bg-primary/10 hover:text-primary"
                  >
                    {game.team1.split(" ").pop()}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    data-testid={`predict-team2-${game.id}`}
                    onClick={(e) => { e.stopPropagation(); voteMutation.mutate(game.team2); }}
                    disabled={voteMutation.isPending}
                    className="h-6 px-3 text-[9px] font-black uppercase tracking-widest rounded-full bg-white/5 hover:bg-primary/10 hover:text-primary"
                  >
                    {game.team2.split(" ").pop()}
                  </Button>
                </div>
              )
            ) : (
              <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/30">Login to predict</span>
            )}
            <div className="flex items-center gap-1.5">
              {team2Votes > 0 && (
                <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">
                  {team2Votes} fan{team2Votes !== 1 ? "s" : ""}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

export default function Scores() {
  const { weekOptions, getWeekLabel } = useWeekConfig();
  const { currentSeasonId, currentSeasonName } = useSeasonConfig();

  const { data: allGames = [], isLoading: allGamesLoading } = useQuery<Game[]>({
    queryKey: ["/api/games/all", currentSeasonId],
    queryFn: async () => {
      const res = await fetch(`/api/games/all?season=${currentSeasonId}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    refetchInterval: 10000,
  });

  const { data: standings = [] } = useQuery<Standings[]>({
    queryKey: ["/api/standings", currentSeasonId],
    queryFn: async () => {
      const res = await fetch(`/api/standings?season=${currentSeasonId}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const activeWeeks = [...new Set(allGames.map((g) => g.week))].sort((a, b) => a - b);
  const liveOrFinalWeeks = [...new Set(allGames.filter((g) => g.isLive || g.isFinal).map((g) => g.week))];
  const defaultWeek =
    liveOrFinalWeeks.length > 0
      ? Math.max(...liveOrFinalWeeks)
      : activeWeeks.length > 0
      ? activeWeeks[0]
      : 1;

  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const week = selectedWeek ?? defaultWeek;

  const liveGames = allGames.filter((g) => g.isLive);
  const weekGames = allGames.filter((g) => g.week === week);

  const ongoingGames = weekGames.filter((g) => g.isLive);
  const scheduledGames = weekGames.filter((g) => !g.isFinal && !g.isLive);
  const finalGames = weekGames.filter((g) => g.isFinal);

  // Split scheduled into primetime and regular
  const primetimeScheduled = scheduledGames.filter((g) => g.isPrimetime);
  const regularScheduled = scheduledGames.filter((g) => !g.isPrimetime);

  const weeksWithGames = weekOptions.filter((opt) =>
    allGames.some((g) => g.week === Number(opt.value))
  );

  const hasAnyGames = ongoingGames.length > 0 || scheduledGames.length > 0 || finalGames.length > 0;

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-background to-background">
      <div className="max-w-5xl mx-auto p-6 md:p-10 space-y-10">

        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl md:text-4xl font-black italic uppercase tracking-tighter">Scores</h1>
              {liveGames.length > 0 && (
                <Badge className="bg-primary text-primary-foreground text-[9px] font-black uppercase tracking-widest gap-1.5 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary-foreground" />
                  {liveGames.length} Live
                </Badge>
              )}
            </div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/50">
              VFG {currentSeasonName} · {getWeekLabel(week)}
            </p>
          </div>
          <Badge className="bg-primary/10 text-primary border-none px-4 py-2 text-[10px] font-black uppercase tracking-widest">
            <Zap className="w-3 h-3 mr-1.5" />
            {currentSeasonName}
          </Badge>
        </div>

        {/* Week Selector */}
        {weeksWithGames.length > 1 && (
          <div className="overflow-x-auto no-scrollbar -mx-2 px-2">
            <div className="flex gap-2 min-w-max pb-1">
              {weeksWithGames.map((opt) => {
                const wNum = Number(opt.value);
                const hasLive = allGames.some((g) => g.week === wNum && g.isLive);
                const isSelected = wNum === week;
                return (
                  <button
                    key={opt.value}
                    data-testid={`week-tab-${opt.value}`}
                    onClick={() => setSelectedWeek(wNum)}
                    className={`h-9 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 flex-shrink-0 ${
                      isSelected
                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                        : "bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-foreground border border-white/5"
                    }`}
                  >
                    {hasLive && <span className="w-1.5 h-1.5 rounded-full bg-primary-foreground animate-pulse" />}
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Games Grid */}
        {allGamesLoading ? (
          <div className="grid sm:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-[28px] bg-card/50" />
            ))}
          </div>
        ) : hasAnyGames ? (
          <div className="space-y-8">

            {/* Live Now */}
            {ongoingGames.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  Live Now
                </h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  {ongoingGames.map((game) => (
                    <GameCard key={game.id} game={game} standings={standings} allGames={allGames} />
                  ))}
                </div>
              </div>
            )}

            {/* Primetime */}
            {primetimeScheduled.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-xs font-black uppercase tracking-widest text-amber-400 flex items-center gap-2">
                  <Star className="w-3 h-3 fill-amber-400" />
                  Primetime
                </h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  {primetimeScheduled.map((game) => (
                    <GameCard key={game.id} game={game} standings={standings} allGames={allGames} />
                  ))}
                </div>
              </div>
            )}

            {/* Regular Games */}
            {regularScheduled.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-xs font-black uppercase tracking-widest text-muted-foreground/50 flex items-center gap-2">
                  <Calendar className="w-3 h-3" />
                  {primetimeScheduled.length > 0 ? "Regular Games" : "Upcoming"}
                </h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  {regularScheduled.map((game) => (
                    <GameCard key={game.id} game={game} standings={standings} allGames={allGames} />
                  ))}
                </div>
              </div>
            )}

            {/* Final */}
            {finalGames.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-xs font-black uppercase tracking-widest text-muted-foreground/50 flex items-center gap-2">
                  <Trophy className="w-3 h-3" />
                  Final
                </h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  {finalGames.map((game) => (
                    <GameCard key={game.id} game={game} standings={standings} allGames={allGames} />
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <Card className="p-16 text-center border-dashed border-2 border-white/5 bg-transparent rounded-[28px]">
            <Calendar className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
            <p className="text-muted-foreground font-bold uppercase tracking-widest text-xs">No Games This Week</p>
            <p className="text-muted-foreground/40 text-[10px] font-bold uppercase tracking-widest mt-1">
              {weeksWithGames.length > 0 ? "Select another week above" : "Check back later"}
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
