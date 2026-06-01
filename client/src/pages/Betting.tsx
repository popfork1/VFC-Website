import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Coins, Trophy, History, TrendingUp, Lock, CheckCircle, XCircle, Clock, Crown } from "lucide-react";
import { Link } from "wouter";
import { formatInTimeZone } from "date-fns-tz";
import type { Game, Bet, User, Standings } from "@shared/schema";
import { TEAMS } from "@/lib/teams";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useSeasonConfig } from "@/hooks/useSeasonConfig";
import { calculateWinProbability, calculateOdds } from "@/lib/winProbability";

const QUICK_AMOUNTS = [50, 100, 250, 500];

function formatCoins(n: number) {
  return n.toLocaleString();
}

function OddsDisplay({ odds }: { odds: number }) {
  const mult = (odds / 100).toFixed(2);
  return <span className="text-accent font-black italic text-sm">{mult}x</span>;
}

function BetCard({
  game,
  userBalance,
  standings,
  allGames,
}: {
  game: Game;
  userBalance: number;
  standings: Standings[];
  allGames: Game[];
}) {
  const { toast } = useToast();
  const [amount, setAmount] = useState("");
  const [pickedTeam, setPickedTeam] = useState<string | null>(null);

  // Derive odds from win probability so favorites pay less, underdogs pay more
  const team1Prob = calculateWinProbability(game, "team1", standings, allGames);
  const team2Prob = calculateWinProbability(game, "team2", standings, allGames);
  const team1OddsFloat = calculateOdds(team1Prob);   // e.g. 1.43
  const team2OddsFloat = calculateOdds(team2Prob);   // e.g. 3.33
  // Store as integer (×100) to match the DB multiplier format
  const team1OddsInt = Math.round(team1OddsFloat * 100);
  const team2OddsInt = Math.round(team2OddsFloat * 100);

  const numAmount = parseInt(amount) || 0;
  const oddsInt = pickedTeam === game.team1 ? team1OddsInt : team2OddsInt;
  const oddsFloat = pickedTeam === game.team1 ? team1OddsFloat : team2OddsFloat;
  const potentialPayout = numAmount > 0 ? Math.floor(numAmount * oddsFloat) : 0;
  const potentialProfit = potentialPayout - numAmount;

  const betMutation = useMutation({
    mutationFn: async () =>
      apiRequest("POST", "/api/bets", {
        gameId: game.id,
        amount: numAmount,
        pickedTeam,
        multiplier: oddsInt,
        status: "pending",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/balance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bets"] });
      toast({
        title: "Bet placed!",
        description: `${formatCoins(numAmount)} coins on ${pickedTeam}. Potential payout: ${formatCoins(potentialPayout)} coins.`,
      });
      setAmount("");
      setPickedTeam(null);
    },
    onError: (e: any) => {
      toast({
        title: "Bet failed",
        description: e?.message || "Something went wrong.",
        variant: "destructive",
      });
    },
  });

  const canBet = !!pickedTeam && numAmount >= 1 && numAmount <= userBalance;

  return (
    <Card
      data-testid={`bet-card-${game.id}`}
      className="bg-card/40 backdrop-blur-xl border-border/40 rounded-[28px] overflow-hidden"
    >
      {/* Header */}
      <div className="px-6 py-3 border-b border-white/5 flex items-center justify-between">
        <Badge className="text-[9px] font-black uppercase tracking-widest h-5 bg-muted/50 border-none text-muted-foreground">
          {game.isLive ? (
            <><span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse mr-1.5" />Live · {game.quarter}</>
          ) : (
            game.gameTime
              ? formatInTimeZone(new Date(game.gameTime), "America/New_York", "MMM d · h:mm a") + " EST"
              : "Time TBD"
          )}
        </Badge>
        <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">W{game.week}</span>
      </div>

      {/* Teams & Odds */}
      <div className="p-6 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {[
            { team: game.team1, prob: team1Prob, oddsFloat: team1OddsFloat, oddsInt: team1OddsInt },
            { team: game.team2, prob: team2Prob, oddsFloat: team2OddsFloat, oddsInt: team2OddsInt },
          ].map(({ team, prob, oddsFloat: tOddsFloat }) => {
            const selected = pickedTeam === team;
            const isFavorite = prob > 50;
            return (
              <button
                key={team}
                data-testid={`pick-${team.replace(/\s+/g, "-").toLowerCase()}-${game.id}`}
                onClick={() => setPickedTeam(selected ? null : team)}
                className={`flex flex-col items-center gap-3 p-4 rounded-2xl border transition-all duration-200 ${
                  selected
                    ? "bg-primary/15 border-primary/50 shadow-lg shadow-primary/10"
                    : "bg-white/3 border-white/8 hover:bg-white/8 hover:border-white/20"
                }`}
              >
                {TEAMS[team as keyof typeof TEAMS] ? (
                  <img src={TEAMS[team as keyof typeof TEAMS]} alt={team} className="w-10 h-10 object-contain drop-shadow" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-white/5" />
                )}
                <p className={`text-[10px] font-black uppercase tracking-tight text-center leading-tight ${selected ? "text-primary" : "text-foreground"}`}>
                  {team}
                </p>
                <div className="flex flex-col items-center gap-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className={`font-black italic text-sm ${isFavorite ? "text-muted-foreground/60" : "text-accent"}`}>
                      {tOddsFloat.toFixed(2)}x
                    </span>
                    {selected && <CheckCircle className="w-3.5 h-3.5 text-primary" />}
                  </div>
                  <span className={`text-[8px] font-black uppercase tracking-widest ${isFavorite ? "text-primary/50" : "text-accent/50"}`}>
                    {prob}% · {isFavorite ? "Favorite" : "Underdog"}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Amount Input */}
        <div className="space-y-3">
          <div className="flex gap-2">
            {QUICK_AMOUNTS.map((q) => (
              <button
                key={q}
                data-testid={`quick-amount-${q}`}
                onClick={() => setAmount(String(q))}
                disabled={q > userBalance}
                className={`flex-1 h-8 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border ${
                  amount === String(q)
                    ? "bg-primary/15 border-primary/40 text-primary"
                    : q > userBalance
                    ? "bg-white/3 border-white/5 text-muted-foreground/20 cursor-not-allowed"
                    : "bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10 hover:text-foreground"
                }`}
              >
                {q}
              </button>
            ))}
            <button
              data-testid="quick-amount-allin"
              onClick={() => setAmount(String(userBalance))}
              disabled={userBalance <= 0}
              className={`flex-1 h-8 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border ${
                amount === String(userBalance)
                  ? "bg-accent/15 border-accent/40 text-accent"
                  : "bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10 hover:text-foreground"
              }`}
            >
              All in
            </button>
          </div>

          <div className="relative">
            <Coins className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
            <Input
              data-testid={`bet-amount-${game.id}`}
              type="number"
              min={1}
              max={userBalance}
              placeholder="Enter amount..."
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="pl-9 bg-white/5 border-white/10 rounded-xl h-10 font-bold text-sm focus:border-primary/40"
            />
          </div>
        </div>

        {/* Payout Preview */}
        {pickedTeam && numAmount > 0 && (
          <div className="flex items-center justify-between p-3 bg-white/5 rounded-2xl border border-white/5">
            <div className="space-y-0.5">
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50">Potential Payout</p>
              <p className="text-lg font-black italic text-accent">
                {formatCoins(potentialPayout)} <span className="text-[10px] text-muted-foreground/40">coins</span>
              </p>
            </div>
            <div className="text-right space-y-0.5">
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50">Net Profit</p>
              <p className={`text-sm font-black italic ${potentialProfit > 0 ? "text-green-400" : "text-muted-foreground"}`}>
                +{formatCoins(potentialProfit)}
              </p>
            </div>
          </div>
        )}

        {/* Place Bet Button */}
        <Button
          data-testid={`place-bet-${game.id}`}
          onClick={() => betMutation.mutate()}
          disabled={!canBet || betMutation.isPending}
          className="w-full h-11 rounded-2xl font-black uppercase tracking-widest text-[10px] disabled:opacity-30"
        >
          {betMutation.isPending ? (
            "Placing..."
          ) : !pickedTeam ? (
            "Select a team to bet on"
          ) : numAmount < 1 ? (
            "Enter an amount"
          ) : numAmount > userBalance ? (
            "Not enough coins"
          ) : (
            <>
              <Coins className="w-3.5 h-3.5 mr-2" />
              Bet {formatCoins(numAmount)} on {pickedTeam.split(" ").pop()}
            </>
          )}
        </Button>
      </div>
    </Card>
  );
}

function BetHistoryRow({ bet, games }: { bet: Bet; games: Game[] }) {
  const game = games.find((g) => g.id === bet.gameId);
  const odds = (bet.multiplier ?? 150) / 100;
  const payout = Math.floor(bet.amount * odds);

  const statusConfig = {
    won: { icon: CheckCircle, color: "text-green-400", bg: "bg-green-400/10", label: "Won" },
    lost: { icon: XCircle, color: "text-red-400", bg: "bg-red-400/10", label: "Lost" },
    pending: { icon: Clock, color: "text-yellow-400", bg: "bg-yellow-400/10", label: "Pending" },
  };
  const s = statusConfig[(bet.status as keyof typeof statusConfig) ?? "pending"] ?? statusConfig.pending;
  const Icon = s.icon;

  return (
    <div className="flex items-center gap-4 p-4 bg-white/3 rounded-2xl border border-white/5">
      {/* Status Icon */}
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${s.bg}`}>
        <Icon className={`w-5 h-5 ${s.color}`} />
      </div>

      {/* Game Info */}
      <div className="flex-1 min-w-0 space-y-0.5">
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">
          {game ? `${game.team1} vs ${game.team2}` : "Unknown Game"} · W{bet.gameId}
        </p>
        <p className="font-black italic uppercase tracking-tight text-sm truncate">
          {bet.pickedTeam}
        </p>
      </div>

      {/* Amount & Payout */}
      <div className="text-right flex-shrink-0 space-y-0.5">
        <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">
          {formatCoins(bet.amount)} → {formatCoins(payout)}
        </p>
        <Badge className={`text-[9px] font-black uppercase tracking-widest border-none h-5 ${s.bg} ${s.color}`}>
          {s.label}
        </Badge>
      </div>
    </div>
  );
}

export default function Betting() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const { currentSeasonId, currentSeasonName } = useSeasonConfig();

  const { data: balanceData, isLoading: balanceLoading } = useQuery<{ balance: number }>({
    queryKey: ["/api/balance"],
    enabled: isAuthenticated,
    refetchInterval: 15000,
  });

  const { data: allGames = [], isLoading: gamesLoading } = useQuery<Game[]>({
    queryKey: ["/api/games/all", currentSeasonId],
    queryFn: async () => {
      const res = await fetch(`/api/games/all?season=${currentSeasonId}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    refetchInterval: 15000,
  });

  const { data: standings = [] } = useQuery<Standings[]>({
    queryKey: ["/api/standings", currentSeasonId],
    queryFn: async () => {
      const res = await fetch(`/api/standings?season=${currentSeasonId}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const { data: myBets = [], isLoading: betsLoading } = useQuery<Bet[]>({
    queryKey: ["/api/bets"],
    enabled: isAuthenticated,
  });

  const { data: leaderboard = [] } = useQuery<User[]>({
    queryKey: ["/api/leaderboard"],
    refetchInterval: 30000,
  });

  const bettableGames = allGames.filter((g) => !g.isFinal);
  const balance = balanceData?.balance ?? 0;

  const wonBets = myBets.filter((b) => b.status === "won");
  const lostBets = myBets.filter((b) => b.status === "lost");
  const pendingBets = myBets.filter((b) => b.status === "pending");
  const totalWon = wonBets.reduce((s, b) => s + Math.floor(b.amount * ((b.multiplier ?? 150) / 100)), 0);
  const totalWagered = myBets.reduce((s, b) => s + b.amount, 0);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-background to-background flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-8">
          <div className="relative inline-block">
            <div className="absolute -inset-4 bg-primary/20 blur-3xl rounded-full animate-pulse" />
            <Coins className="w-20 h-20 text-primary relative mx-auto" />
          </div>
          <div className="space-y-3">
            <h1 className="text-4xl font-black italic uppercase tracking-tighter">VFG Coins</h1>
            <p className="text-muted-foreground font-medium">
              Sign in to bet on games. Every new account starts with <span className="text-primary font-black">1,000 coins</span>.
            </p>
          </div>
          <Link href="/login">
            <Button className="h-12 px-8 rounded-full font-black uppercase tracking-widest text-[11px]">
              Login to Bet
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-background to-background">
      <div className="max-w-5xl mx-auto p-6 md:p-10 space-y-10">

        {/* Header */}
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div className="space-y-1">
            <h1 className="text-3xl md:text-4xl font-black italic uppercase tracking-tighter">Betting</h1>
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/50">
              VFG {currentSeasonName} · Coin Sportsbook
            </p>
          </div>

          {/* Balance Card */}
          <Card className="px-6 py-4 bg-primary rounded-[20px] border-none shadow-xl shadow-primary/20 flex items-center gap-4">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Coins className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-white/60">Your Balance</p>
              {balanceLoading ? (
                <Skeleton className="h-6 w-20 bg-white/20 mt-0.5" />
              ) : (
                <p data-testid="coin-balance" className="text-xl font-black italic text-white">{formatCoins(balance)}</p>
              )}
            </div>
          </Card>
        </div>

        {/* Stats Row */}
        {myBets.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Total Bets", value: myBets.length, icon: TrendingUp, color: "text-primary" },
              { label: "Pending", value: pendingBets.length, icon: Clock, color: "text-yellow-400" },
              { label: "Won", value: wonBets.length, icon: CheckCircle, color: "text-green-400" },
              { label: "Lost", value: lostBets.length, icon: XCircle, color: "text-red-400" },
            ].map((s) => (
              <Card key={s.label} className="p-4 bg-card/40 backdrop-blur-xl border-border/40 rounded-2xl flex items-center gap-3">
                <s.icon className={`w-5 h-5 ${s.color} flex-shrink-0`} />
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50">{s.label}</p>
                  <p className="text-xl font-black italic">{s.value}</p>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Tabs */}
        <Tabs defaultValue="bet">
          <TabsList className="bg-white/5 border border-white/10 rounded-2xl p-1 h-auto gap-1">
            <TabsTrigger
              value="bet"
              className="rounded-xl font-black uppercase tracking-widest text-[10px] px-5 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg"
            >
              <TrendingUp className="w-3.5 h-3.5 mr-2" />
              Place Bets
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="rounded-xl font-black uppercase tracking-widest text-[10px] px-5 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg"
            >
              <History className="w-3.5 h-3.5 mr-2" />
              My Bets {myBets.length > 0 && `(${myBets.length})`}
            </TabsTrigger>
            <TabsTrigger
              value="leaderboard"
              className="rounded-xl font-black uppercase tracking-widest text-[10px] px-5 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg"
            >
              <Trophy className="w-3.5 h-3.5 mr-2" />
              Leaderboard
            </TabsTrigger>
          </TabsList>

          {/* Place Bets Tab */}
          <TabsContent value="bet" className="mt-6 space-y-4">
            {gamesLoading ? (
              <div className="grid sm:grid-cols-2 gap-4">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-72 rounded-[28px] bg-card/50" />
                ))}
              </div>
            ) : bettableGames.length === 0 ? (
              <Card className="p-16 text-center border-dashed border-2 border-white/5 bg-transparent rounded-[28px]">
                <Lock className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
                <p className="text-muted-foreground font-bold uppercase tracking-widest text-xs">No Games Available</p>
                <p className="text-muted-foreground/40 text-[10px] font-bold uppercase tracking-widest mt-1">
                  Betting opens when games are scheduled
                </p>
              </Card>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {bettableGames.map((game) => (
                  <BetCard key={game.id} game={game} userBalance={balance} standings={standings} allGames={allGames} />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Bet History Tab */}
          <TabsContent value="history" className="mt-6">
            {betsLoading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-16 rounded-2xl bg-card/50" />
                ))}
              </div>
            ) : myBets.length === 0 ? (
              <Card className="p-16 text-center border-dashed border-2 border-white/5 bg-transparent rounded-[28px]">
                <History className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
                <p className="text-muted-foreground font-bold uppercase tracking-widest text-xs">No Bets Yet</p>
                <p className="text-muted-foreground/40 text-[10px] font-bold uppercase tracking-widest mt-1">
                  Place your first bet on the "Place Bets" tab
                </p>
              </Card>
            ) : (
              <div className="space-y-6">
                {/* Summary */}
                <Card className="p-6 bg-card/40 backdrop-blur-xl border-border/40 rounded-[28px]">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50">Total Wagered</p>
                      <p className="text-2xl font-black italic mt-1">{formatCoins(totalWagered)}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50">Total Won</p>
                      <p className="text-2xl font-black italic mt-1 text-green-400">{formatCoins(totalWon)}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50">Win Rate</p>
                      <p className="text-2xl font-black italic mt-1">
                        {myBets.filter(b => b.status !== "pending").length > 0
                          ? Math.round((wonBets.length / myBets.filter(b => b.status !== "pending").length) * 100)
                          : 0}%
                      </p>
                    </div>
                  </div>
                </Card>

                <div className="space-y-2">
                  {[...myBets].reverse().map((bet) => (
                    <BetHistoryRow key={bet.id} bet={bet} games={allGames} />
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* Leaderboard Tab */}
          <TabsContent value="leaderboard" className="mt-6">
            <Card className="bg-card/40 backdrop-blur-xl border-border/40 rounded-[28px] overflow-hidden">
              <div className="p-6 border-b border-white/5">
                <h3 className="text-lg font-black italic uppercase tracking-tighter flex items-center gap-3">
                  <Crown className="w-5 h-5 text-accent" />
                  Richest Players
                </h3>
              </div>
              <div className="divide-y divide-white/5">
                {leaderboard.map((u, idx) => {
                  const isMe = u.id === (user as any)?.id;
                  const medals = ["🥇", "🥈", "🥉"];
                  return (
                    <div
                      key={u.id}
                      data-testid={`leaderboard-row-${idx}`}
                      className={`flex items-center gap-4 px-6 py-4 transition-colors ${isMe ? "bg-primary/8 border-l-2 border-primary" : "hover:bg-white/3"}`}
                    >
                      <span className="text-lg w-8 text-center flex-shrink-0">
                        {idx < 3 ? medals[idx] : <span className="text-muted-foreground/40 font-black text-sm">{idx + 1}</span>}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className={`font-black uppercase tracking-tight text-sm truncate ${isMe ? "text-primary" : ""}`}>
                          {u.username} {isMe && <span className="text-[9px] text-primary/60">(you)</span>}
                        </p>
                        <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">
                          {u.role}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <Coins className="w-4 h-4 text-accent" />
                        <span className={`font-black italic text-lg ${isMe ? "text-primary" : "text-foreground"}`}>
                          {formatCoins(u.coins ?? 0)}
                        </span>
                      </div>
                    </div>
                  );
                })}
                {leaderboard.length === 0 && (
                  <div className="p-12 text-center text-muted-foreground/40 font-bold uppercase tracking-widest text-xs">
                    No players yet
                  </div>
                )}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
