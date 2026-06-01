import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TEAMS } from "@/lib/teams";
import { ArrowLeft, Trophy, Calendar, Users, BarChart3, Zap, Target } from "lucide-react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Team, Player } from "@shared/schema";

interface PlayerStat {
  id: string;
  playerName: string;
  team: string;
  position: string;
  passingYards: number;
  passingTouchdowns: number;
  interceptions: number;
  completions: number;
  attempts: number;
  rushingYards: number;
  rushingTouchdowns: number;
  rushingAttempts: number;
  receivingYards: number;
  receivingTouchdowns: number;
  receptions: number;
  targets: number;
  defensiveInterceptions: number;
  defensiveSacks: number;
  tackles: number;
  week: number;
}

interface GameResult {
  id: string;
  team1: string;
  team2: string;
  team1Score: number;
  team2Score: number;
  isFinal: boolean;
  isLive: boolean;
  week: number;
}

const POSITION_ORDER: Record<string, number> = { QB: 0, RB: 1, WR: 2, TE: 3, K: 4, DEF: 5 };
const POSITION_COLORS: Record<string, string> = {
  QB: "bg-blue-500/20 text-blue-400",
  RB: "bg-green-500/20 text-green-400",
  WR: "bg-yellow-500/20 text-yellow-400",
  TE: "bg-orange-500/20 text-orange-400",
  K: "bg-purple-500/20 text-purple-400",
  DEF: "bg-red-500/20 text-red-400",
};

export default function TeamDetail() {
  const [match, params] = useRoute("/teams/:name");

  const teamName = decodeURIComponent(params?.name || "");
  const teamLogo = TEAMS[teamName as keyof typeof TEAMS];

  const { data: standings = [] } = useQuery<any[]>({
    queryKey: ["/api/standings"],
  });

  const { data: games = [] } = useQuery<GameResult[]>({
    queryKey: ["/api/games/all"],
  });

  const { data: allPlayerStats = [] } = useQuery<PlayerStat[]>({
    queryKey: ["/api/player-stats"],
  });

  const { data: allTeams = [] } = useQuery<Team[]>({
    queryKey: ["/api/teams"],
  });

  const { data: owners = {} } = useQuery<Record<string, string>>({
    queryKey: ["/api/team-owners"],
  });
  const teamOwner = owners[teamName] || "";

  const currentTeam = allTeams.find((t: Team) => t.name.toLowerCase() === teamName.toLowerCase());

  const { data: teamPlayers = [] } = useQuery<Player[]>({
    queryKey: ["/api/teams", currentTeam?.id ?? "", "players"],
    queryFn: async () => {
      if (!currentTeam) return [];
      const res = await fetch(`/api/teams/${currentTeam.id}/players`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!currentTeam,
  });

  if (!match) return null;

  const teamStandings = standings.find((s: any) => s.team === teamName);
  const teamGames = games
    .filter(g => g.team1 === teamName || g.team2 === teamName)
    .sort((a, b) => b.week - a.week);

  const wins = teamGames.filter(g => {
    if (!g.isFinal) return false;
    return (g.team1 === teamName && g.team1Score > g.team2Score) ||
           (g.team2 === teamName && g.team2Score > g.team1Score);
  }).length;

  const losses = teamGames.filter(g => {
    if (!g.isFinal) return false;
    return (g.team1 === teamName && g.team1Score < g.team2Score) ||
           (g.team2 === teamName && g.team2Score < g.team1Score);
  }).length;

  const pointsFor = teamGames.filter(g => g.isFinal).reduce((sum, g) => {
    return sum + (g.team1 === teamName ? g.team1Score : g.team2Score);
  }, 0);

  const pointsAgainst = teamGames.filter(g => g.isFinal).reduce((sum, g) => {
    return sum + (g.team1 === teamName ? g.team2Score : g.team1Score);
  }, 0);

  const pd = pointsFor - pointsAgainst;

  const roster = [...teamPlayers].sort((a, b) => {
    const ao = POSITION_ORDER[a.position || ""] ?? 99;
    const bo = POSITION_ORDER[b.position || ""] ?? 99;
    if (ao !== bo) return ao - bo;
    return (a.name || "").localeCompare(b.name || "");
  });

  const teamStats = allPlayerStats.filter(s => s.team === teamName);

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-background to-background">
      <div className="max-w-7xl mx-auto p-6 md:p-10 space-y-10">

        <Link href="/teams">
          <Button variant="ghost" className="group h-10 px-4 rounded-full font-black uppercase tracking-widest text-[10px] border border-border/40 bg-card/40 backdrop-blur-xl hover:bg-card/60 transition-all">
            <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
            Back to Teams
          </Button>
        </Link>

        {/* Team Header */}
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-primary to-accent opacity-20 blur-3xl group-hover:opacity-30 transition-opacity duration-1000" />
          <Card className="relative overflow-hidden border-none bg-card/40 backdrop-blur-3xl p-8 md:p-12 rounded-[40px]">
            <div className="grid lg:grid-cols-[auto,1fr] gap-12 items-center relative z-10">
              <div className="relative">
                <div className="absolute -inset-8 bg-primary/10 blur-[80px] rounded-full animate-pulse" />
                {teamLogo ? (
                  <img src={teamLogo} alt={teamName} className="w-40 h-40 object-contain relative z-10 drop-shadow-2xl hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="w-40 h-40 rounded-full bg-white/5 border border-white/10 flex items-center justify-center relative z-10">
                    <Trophy className="w-20 h-20 text-muted-foreground/20" />
                  </div>
                )}
              </div>

              <div className="space-y-8">
                <div className="space-y-2">
                  <Badge className="bg-primary/10 text-primary border-none px-4 py-1.5 text-[11px] font-black uppercase tracking-widest">
                    <Trophy className="w-3.5 h-3.5 mr-2" />
                    {teamStandings?.division?.replace("_", " ") || "VFC"} — Season 2
                  </Badge>
                  <h1 className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter leading-[0.9] text-foreground">
                    {teamName}
                  </h1>
                  {teamOwner && (
                    <p className="text-muted-foreground font-bold text-sm uppercase tracking-widest flex items-center gap-2">
                      <Users className="w-4 h-4 text-primary" />
                      Owner: <span className="text-primary">{teamOwner}</span>
                    </p>
                  )}
                </div>

                <div className="flex gap-4">
                  <div className="p-5 bg-white/5 backdrop-blur-md rounded-3xl border border-white/5 text-center min-w-[120px]">
                    <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-2">Record</p>
                    <p className="text-3xl font-black italic tabular-nums text-foreground">
                      {teamStandings?.wins ?? wins}-{teamStandings?.losses ?? losses}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>

        <Tabs defaultValue="history" className="w-full">
          <TabsList className="flex flex-wrap h-auto gap-2 bg-transparent p-0 mb-8">
            {[
              { value: "history", label: "Game History", icon: Calendar },
              { value: "roster", label: "Roster", icon: Users },
              { value: "stats", label: "Player Stats", icon: BarChart3 },
            ].map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="h-12 px-8 rounded-2xl font-black uppercase tracking-widest text-[10px] border border-border/40 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"
              >
                <tab.icon className="w-3.5 h-3.5 mr-2" />
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Game History */}
          <TabsContent value="history" className="space-y-4">
            {teamGames.length === 0 ? (
              <Card className="p-16 text-center border-dashed border-2 border-white/5 bg-transparent rounded-3xl">
                <Calendar className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
                <p className="text-muted-foreground font-bold uppercase tracking-widest text-xs">No games found</p>
              </Card>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {teamGames.map((game) => {
                  const isTeam1 = game.team1 === teamName;
                  const opponent = isTeam1 ? game.team2 : game.team1;
                  const teamScore = isTeam1 ? game.team1Score : game.team2Score;
                  const oppScore = isTeam1 ? game.team2Score : game.team1Score;
                  const isWin = game.isFinal && teamScore > oppScore;
                  const isLoss = game.isFinal && teamScore < oppScore;

                  return (
                    <Link key={game.id} href={`/game/${game.id}`}>
                      <Card className="group p-6 bg-card/40 backdrop-blur-3xl border-border/40 hover:bg-card/60 rounded-3xl cursor-pointer transition-all">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-4">
                            {TEAMS[opponent as keyof typeof TEAMS] && (
                              <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center p-2">
                                <img src={TEAMS[opponent as keyof typeof TEAMS]} alt={opponent} className="w-full h-full object-contain" />
                              </div>
                            )}
                            <div>
                              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-0.5">Week {game.week} vs</p>
                              <h4 className="text-base font-black italic uppercase tracking-tighter">{opponent}</h4>
                            </div>
                          </div>
                          <div className="text-right space-y-1">
                            <Badge className={`px-3 py-1 rounded-full font-black uppercase tracking-widest text-[9px] ${
                              !game.isFinal ? 'bg-white/10 text-muted-foreground' :
                              isWin ? 'bg-primary/20 text-primary' :
                              isLoss ? 'bg-destructive/20 text-destructive' : 'bg-white/10 text-white'
                            }`}>
                              {!game.isFinal ? (game.isLive ? 'Live' : 'Sched.') : isWin ? 'W' : isLoss ? 'L' : 'T'}
                            </Badge>
                            {(game.isFinal || game.isLive) && (
                              <p className="text-xl font-black italic tabular-nums">{teamScore} — {oppScore}</p>
                            )}
                          </div>
                        </div>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Roster */}
          <TabsContent value="roster" className="space-y-4">
            {roster.length === 0 ? (
              <Card className="p-16 text-center border-dashed border-2 border-white/5 bg-transparent rounded-3xl">
                <Users className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
                <p className="text-muted-foreground font-bold uppercase tracking-widest text-xs">No roster data available</p>
                <p className="text-muted-foreground/50 text-[10px] mt-2">Admin can add players via the Admin panel</p>
              </Card>
            ) : (
              <Card className="bg-card/40 backdrop-blur-xl border-border/40 rounded-[32px] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-border/40 bg-white/5">
                        <th className="px-6 py-4 text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground">#</th>
                        <th className="px-6 py-4 text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground">Player</th>
                        <th className="px-6 py-4 text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground">Position</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/20">
                      {roster.map((player) => (
                        <tr key={player.id} className="hover:bg-white/5 transition-colors">
                          <td className="px-6 py-4 font-black italic text-muted-foreground/40 text-lg">
                            {player.number ?? "—"}
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-black uppercase tracking-tight">{player.name}</span>
                          </td>
                          <td className="px-6 py-4">
                            <Badge className={`text-[9px] font-black uppercase tracking-widest border-none ${POSITION_COLORS[player.position || ""] || "bg-white/10 text-white"}`}>
                              {player.position || "—"}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </TabsContent>

          {/* Player Stats */}
          <TabsContent value="stats" className="space-y-6">
            {teamStats.length === 0 ? (
              <Card className="p-16 text-center border-dashed border-2 border-white/5 bg-transparent rounded-3xl">
                <BarChart3 className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
                <p className="text-muted-foreground font-bold uppercase tracking-widest text-xs">No player stats available</p>
              </Card>
            ) : (
              <div className="space-y-4">
                {["QB", "RB", "WR", "DEF"].map((pos) => {
                  const posPlayers = teamStats.filter(p => p.position === pos);
                  if (posPlayers.length === 0) return null;
                  return (
                    <Card key={pos} className="p-6 bg-card/40 backdrop-blur-xl border-border/40 rounded-3xl">
                      <h3 className="text-sm font-black uppercase tracking-[0.2em] text-muted-foreground mb-4 flex items-center gap-2">
                        <Badge className={`text-[9px] font-black uppercase tracking-widest border-none ${POSITION_COLORS[pos] || "bg-white/10"}`}>{pos}</Badge>
                      </h3>
                      <div className="space-y-3">
                        {posPlayers.map((p) => (
                          <div key={p.id} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl">
                            <span className="font-black uppercase tracking-tight">{p.playerName}</span>
                            <div className="flex gap-6 text-right">
                              {pos === "QB" && (
                                <>
                                  <div><p className="text-[9px] font-black text-muted-foreground uppercase">YDS</p><p className="font-black italic text-primary">{p.passingYards}</p></div>
                                  <div><p className="text-[9px] font-black text-muted-foreground uppercase">TD</p><p className="font-black italic">{p.passingTouchdowns}</p></div>
                                  <div><p className="text-[9px] font-black text-muted-foreground uppercase">INT</p><p className="font-black italic text-destructive">{p.interceptions}</p></div>
                                </>
                              )}
                              {pos === "RB" && (
                                <>
                                  <div><p className="text-[9px] font-black text-muted-foreground uppercase">YDS</p><p className="font-black italic text-primary">{p.rushingYards}</p></div>
                                  <div><p className="text-[9px] font-black text-muted-foreground uppercase">TD</p><p className="font-black italic">{p.rushingTouchdowns}</p></div>
                                  <div><p className="text-[9px] font-black text-muted-foreground uppercase">ATT</p><p className="font-black italic">{p.rushingAttempts}</p></div>
                                </>
                              )}
                              {pos === "WR" && (
                                <>
                                  <div><p className="text-[9px] font-black text-muted-foreground uppercase">YDS</p><p className="font-black italic text-primary">{p.receivingYards}</p></div>
                                  <div><p className="text-[9px] font-black text-muted-foreground uppercase">TD</p><p className="font-black italic">{p.receivingTouchdowns}</p></div>
                                  <div><p className="text-[9px] font-black text-muted-foreground uppercase">REC</p><p className="font-black italic">{p.receptions}</p></div>
                                </>
                              )}
                              {pos === "DEF" && (
                                <>
                                  <div><p className="text-[9px] font-black text-muted-foreground uppercase">SCK</p><p className="font-black italic text-primary">{p.defensiveSacks}</p></div>
                                  <div><p className="text-[9px] font-black text-muted-foreground uppercase">INT</p><p className="font-black italic">{p.defensiveInterceptions}</p></div>
                                  <div><p className="text-[9px] font-black text-muted-foreground uppercase">TKL</p><p className="font-black italic">{p.tackles}</p></div>
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
