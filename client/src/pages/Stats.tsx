import { Team, Player } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trophy, Zap, Target, BarChart3, Shield, Footprints } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface PlayerStat {
    id: string;
    playerName: string;
    team: string;
    position: string;
    // QB
    passingYards: number;
    passingTouchdowns: number;
    interceptions: number;
    completions: number;
    attempts: number;
    sacks: number;
    // RB
    rushingYards: number;
    rushingTouchdowns: number;
    rushingAttempts: number;
    missedTacklesForced: number;
    // WR
    receivingYards: number;
    receivingTouchdowns: number;
    receptions: number;
    targets: number;
    yardsAfterCatch: number;
    // K
    fieldGoalsMade: number;
    extraPointsMade: number;
    fieldGoalsAttempted: number;
    extraPointsAttempted: number;
    // DB
    defensiveInterceptions: number;
    passesDefended: number;
    completionsAllowed: number;
    targetsAllowed: number;
    swats: number;
    defensiveTouchdowns: number;
    // DEF
    defensiveSacks: number;
    tackles: number;
    defensiveMisses: number;
    safeties: number;
    
    defensivePoints: number;
    week: number;
}

interface TeamStats {
  team: string;
  pointsFor: number;
  pointsAgainst: number;
}

export default function Stats() {
  const { data: playerStats = [] } = useQuery<PlayerStat[]>({
    queryKey: ["/api/player-stats"],
  });

  const { data: teams = [] } = useQuery<Team[]>({
    queryKey: ["/api/teams"],
  });

  const { data: gameStats = [] } = useQuery<any[]>({
    queryKey: ["/api/games/all"],
  });

  // Aggregate team stats from games
  const calculateTeamStats = (): TeamStats[] => {
    const teamMap = new Map<string, { pointsFor: number; pointsAgainst: number }>();

    gameStats.forEach((game) => {
      if (game.isFinal) {
        if (!teamMap.has(game.team1)) {
          teamMap.set(game.team1, { pointsFor: 0, pointsAgainst: 0 });
        }
        if (!teamMap.has(game.team2)) {
          teamMap.set(game.team2, { pointsFor: 0, pointsAgainst: 0 });
        }

        const team1Stats = teamMap.get(game.team1)!;
        const team2Stats = teamMap.get(game.team2)!;

        team1Stats.pointsFor += game.team1Score;
        team1Stats.pointsAgainst += game.team2Score;
        team2Stats.pointsFor += game.team2Score;
        team2Stats.pointsAgainst += game.team1Score;
      }
    });

    return Array.from(teamMap, ([team, stats]) => ({
      team,
      ...stats,
    }));
  };

  // Get player leaderboards by position
  const getLeaderboard = (position: string) => {
    const filtered = playerStats.filter((p) => {
      const pPos = p.position?.toUpperCase();
      const targetPos = position?.toUpperCase();
      return pPos === targetPos;
    });
    return filtered
      .sort((a, b) => {
        const p1Score = (a.passingYards || 0) + (a.rushingYards || 0) + (a.receivingYards || 0);
        const p2Score = (b.passingYards || 0) + (b.rushingYards || 0) + (b.receivingYards || 0);
        
        if (position === "K") {
          return ((b.fieldGoalsMade || 0) * 3 + (b.extraPointsMade || 0)) - ((a.fieldGoalsMade || 0) * 3 + (a.extraPointsMade || 0));
        }
        
        if (["DB", "S", "DE", "LB"].includes(position)) {
           return (b.defensiveInterceptions || 0) * 5 + (b.defensiveSacks || 0) * 3 + (b.tackles || 0) - ((a.defensiveInterceptions || 0) * 5 + (a.defensiveSacks || 0) * 3 + (a.tackles || 0));
        }

        return p2Score - p1Score;
      })
      .slice(0, 10);
  };

  const teamStats = calculateTeamStats();
  const offenseRankings = [...teamStats].sort((a, b) => b.pointsFor - a.pointsFor);
  const defenseRankings = [...teamStats].sort((a, b) => a.pointsAgainst - b.pointsAgainst);

  const recordBook = {
    mostQBPoints: playerStats
      .filter((p) => p.position === "QB")
      .sort((a, b) => ((b.passingYards || 0) + (b.passingTouchdowns || 0) * 6) - ((a.passingYards || 0) + (a.passingTouchdowns || 0) * 6))
      .slice(0, 5),
    mostRBPoints: playerStats
      .filter((p) => p.position === "RB")
      .sort((a, b) => ((b.rushingYards || 0) + (b.rushingTouchdowns || 0) * 6) - ((a.rushingYards || 0) + (a.rushingTouchdowns || 0) * 6))
      .slice(0, 5),
    mostWRPoints: playerStats
      .filter((p) => p.position === "WR")
      .sort((a, b) => ((b.receivingYards || 0) + (b.receivingTouchdowns || 0) * 6) - ((a.receivingYards || 0) + (a.receivingTouchdowns || 0) * 6))
      .slice(0, 5),
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-background to-background">
      <div className="max-w-7xl mx-auto p-6 md:p-10 space-y-12">
        <div className="space-y-4">
          <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-none px-4 py-1.5 text-[11px] font-black uppercase tracking-widest w-fit">
            <BarChart3 className="w-3.5 h-3.5 mr-2" />
            League Analytics
          </Badge>
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-black italic uppercase tracking-tighter leading-[0.9] text-foreground">
            Stats & <span className="text-primary">Data</span>
          </h1>
          <p className="text-base md:text-lg text-muted-foreground font-medium max-w-md leading-relaxed">
            Deep dive into Season 2 performance metrics and rankings.
          </p>
        </div>

        <Tabs defaultValue="leaderboard" className="w-full">
          <TabsList className="flex flex-wrap h-auto gap-2 bg-transparent p-0 mb-8">
            {[
              { value: "leaderboard", label: "Leaders", icon: Trophy },
              { value: "passing", label: "Passing", icon: Zap },
              { value: "rushing", label: "Rushing", icon: Target },
              { value: "receiving", label: "Receiving", icon: BarChart3 },
              { value: "defense", label: "Defense", icon: Shield },
              { value: "kicking", label: "Kicking", icon: Footprints },
              { value: "team", label: "Team", icon: Target },
              { value: "records", label: "Records", icon: Trophy },
            ].map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="h-12 px-6 rounded-2xl font-black uppercase tracking-widest text-[10px] border border-border/40 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"
              >
                <tab.icon className="w-3.5 h-3.5 mr-2" />
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="leaderboard" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              <Card className="p-8 bg-card/40 backdrop-blur-3xl border-border/40 rounded-[40px] overflow-hidden relative">
                <div className="absolute top-0 right-0 p-8 opacity-[0.03]">
                  <Zap className="w-32 h-32 text-primary" />
                </div>
                <h3 className="text-2xl font-black italic uppercase tracking-tighter mb-8 flex items-center gap-3">
                  <div className="w-1.5 h-8 bg-primary rounded-full" />
                  QB Leaders
                </h3>
                <ScrollArea className="h-[500px] pr-6">
                  <div className="space-y-4">
                    {getLeaderboard("QB").map((player, idx) => {
                      const rating = player.attempts > 0 ? (
                        ((8.4 * (player.passingYards || 0)) + (330 * (player.passingTouchdowns || 0)) + (100 * (player.completions || 0)) - (200 * (player.interceptions || 0))) / player.attempts
                      ).toFixed(1) : "0.0";
                      return (
                        <div key={player.id} className="group flex justify-between items-center p-6 bg-white/5 hover:bg-white/10 rounded-3xl border border-white/5 transition-all duration-300">
                          <div className="flex items-center gap-6">
                            <span className="text-3xl font-black italic text-muted-foreground/20 w-8">{idx + 1}</span>
                            <div>
                              <p className="text-xl font-black uppercase tracking-tight group-hover:text-primary transition-colors">{player.playerName}</p>
                              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{player.team}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-black italic tabular-nums">{player.passingYards || 0} <span className="text-[10px] not-italic text-muted-foreground uppercase tracking-widest">YDS</span></p>
                            <p className="text-[10px] font-black uppercase tracking-widest text-primary">RTG: {rating}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </Card>

              <Card className="p-8 bg-card/40 backdrop-blur-3xl border-border/40 rounded-[40px] overflow-hidden relative">
                <div className="absolute top-0 right-0 p-8 opacity-[0.03]">
                  <Target className="w-32 h-32 text-accent" />
                </div>
                <h3 className="text-2xl font-black italic uppercase tracking-tighter mb-8 flex items-center gap-3">
                  <div className="w-1.5 h-8 bg-accent rounded-full" />
                  WR Leaders
                </h3>
                <ScrollArea className="h-[500px] pr-6">
                  <div className="space-y-4">
                    {getLeaderboard("WR").map((player, idx) => (
                      <div key={player.id} className="group flex justify-between items-center p-6 bg-white/5 hover:bg-white/10 rounded-3xl border border-white/5 transition-all duration-300">
                        <div className="flex items-center gap-6">
                          <span className="text-3xl font-black italic text-muted-foreground/20 w-8">{idx + 1}</span>
                          <div>
                            <p className="text-xl font-black uppercase tracking-tight group-hover:text-accent transition-colors">{player.playerName}</p>
                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{player.team}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-black italic tabular-nums">{player.receivingYards || 0} <span className="text-[10px] not-italic text-muted-foreground uppercase tracking-widest">YDS</span></p>
                          <p className="text-[10px] font-black uppercase tracking-widest text-accent">{player.receivingTouchdowns || 0} TD</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="passing" className="space-y-6">
            <Card className="p-8 bg-card/40 backdrop-blur-3xl border-border/40 rounded-[40px]">
              <h3 className="text-2xl font-black italic uppercase tracking-tighter mb-8 flex items-center gap-3">
                <div className="w-1.5 h-8 bg-primary rounded-full" />
                Passing Deep Dive
              </h3>
              <div className="grid gap-4">
                {getLeaderboard("QB").map((player, idx) => (
                  <div key={player.id} className="flex flex-col md:flex-row md:items-center justify-between p-6 bg-white/5 rounded-3xl border border-white/5 gap-6">
                    <div className="flex items-center gap-6">
                      <span className="text-2xl font-black italic text-muted-foreground/20 w-8">{idx + 1}</span>
                      <div>
                        <p className="text-lg font-black uppercase tracking-tight">{player.playerName}</p>
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{player.team}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-8 text-center flex-1 max-w-md">
                      <div>
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Yards</p>
                        <p className="text-xl font-black italic tabular-nums">{player.passingYards || 0}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">TDs</p>
                        <p className="text-xl font-black italic tabular-nums text-primary">{player.passingTouchdowns || 0}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">INT</p>
                        <p className="text-xl font-black italic tabular-nums text-destructive">{player.interceptions || 0}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="team" className="space-y-10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              <Card className="p-8 bg-card/40 backdrop-blur-3xl border-border/40 rounded-[40px]">
                <h3 className="text-2xl font-black italic uppercase tracking-tighter mb-8 flex items-center gap-3">
                  <div className="w-1.5 h-8 bg-primary rounded-full" />
                  Scoring Offense
                </h3>
                <div className="space-y-4">
                  {offenseRankings.map((team, idx) => (
                    <div key={team.team} className="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/5">
                      <div className="flex items-center gap-4">
                        <span className="text-xl font-black italic text-muted-foreground/30 w-6">{idx + 1}</span>
                        <span className="font-black uppercase tracking-tight">{team.team}</span>
                      </div>
                      <span className="text-xl font-black italic text-primary">{team.pointsFor} <span className="text-[10px] not-italic text-muted-foreground uppercase tracking-widest">PTS</span></span>
                    </div>
                  ))}
                </div>
              </Card>
              <Card className="p-8 bg-card/40 backdrop-blur-3xl border-border/40 rounded-[40px]">
                <h3 className="text-2xl font-black italic uppercase tracking-tighter mb-8 flex items-center gap-3">
                  <div className="w-1.5 h-8 bg-accent rounded-full" />
                  Scoring Defense
                </h3>
                <div className="space-y-4">
                  {defenseRankings.map((team, idx) => (
                    <div key={team.team} className="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/5">
                      <div className="flex items-center gap-4">
                        <span className="text-xl font-black italic text-muted-foreground/30 w-6">{idx + 1}</span>
                        <span className="font-black uppercase tracking-tight">{team.team}</span>
                      </div>
                      <span className="text-xl font-black italic text-accent">{team.pointsAgainst} <span className="text-[10px] not-italic text-muted-foreground uppercase tracking-widest">PA</span></span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="rushing" className="space-y-6">
             <Card className="p-8 bg-card/40 backdrop-blur-3xl border-border/40 rounded-[40px]">
              <h3 className="text-2xl font-black italic uppercase tracking-tighter mb-8 flex items-center gap-3">
                <div className="w-1.5 h-8 bg-primary rounded-full" />
                Ground Attack
              </h3>
              <div className="grid gap-4">
                {getLeaderboard("RB").map((player, idx) => (
                  <div key={player.id} className="flex flex-col md:flex-row md:items-center justify-between p-6 bg-white/5 rounded-3xl border border-white/5 gap-6">
                    <div className="flex items-center gap-6">
                      <span className="text-2xl font-black italic text-muted-foreground/20 w-8">{idx + 1}</span>
                      <div>
                        <p className="text-lg font-black uppercase tracking-tight">{player.playerName}</p>
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{player.team}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-8 text-center flex-1 max-w-md">
                      <div>
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Yards</p>
                        <p className="text-xl font-black italic tabular-nums">{player.rushingYards || 0}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">TDs</p>
                        <p className="text-xl font-black italic tabular-nums text-primary">{player.rushingTouchdowns || 0}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Att</p>
                        <p className="text-xl font-black italic tabular-nums">{player.rushingAttempts || 0}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="receiving" className="space-y-6">
             <Card className="p-8 bg-card/40 backdrop-blur-3xl border-border/40 rounded-[40px]">
              <h3 className="text-2xl font-black italic uppercase tracking-tighter mb-8 flex items-center gap-3">
                <div className="w-1.5 h-8 bg-accent rounded-full" />
                Air Raid
              </h3>
              <div className="grid gap-4">
                {getLeaderboard("WR").map((player, idx) => (
                  <div key={player.id} className="flex flex-col md:flex-row md:items-center justify-between p-6 bg-white/5 rounded-3xl border border-white/5 gap-6">
                    <div className="flex items-center gap-6">
                      <span className="text-2xl font-black italic text-muted-foreground/20 w-8">{idx + 1}</span>
                      <div>
                        <p className="text-lg font-black uppercase tracking-tight">{player.playerName}</p>
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{player.team}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-8 text-center flex-1 max-w-md">
                      <div>
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Yards</p>
                        <p className="text-xl font-black italic tabular-nums">{player.receivingYards || 0}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">TDs</p>
                        <p className="text-xl font-black italic tabular-nums text-accent">{player.receivingTouchdowns || 0}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Rec</p>
                        <p className="text-xl font-black italic tabular-nums">{player.receptions || 0}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="records" className="space-y-10">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
              <Card className="p-8 bg-card/40 backdrop-blur-3xl border-border/40 rounded-[40px] relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:scale-110 transition-transform duration-500">
                  <Zap className="w-24 h-24" />
                </div>
                <h3 className="text-xl font-black italic uppercase tracking-tighter mb-6">Pass Records</h3>
                <div className="space-y-4">
                  {recordBook.mostQBPoints.map((player) => (
                    <div key={player.id} className="flex justify-between items-center p-3 bg-white/5 rounded-2xl">
                      <div>
                        <p className="text-sm font-black uppercase tracking-tight">{player.playerName}</p>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{player.team}</p>
                      </div>
                      <span className="text-lg font-black italic text-primary">{(player.passingYards || 0) + (player.passingTouchdowns || 0) * 6}</span>
                    </div>
                  ))}
                </div>
              </Card>
              <Card className="p-8 bg-card/40 backdrop-blur-3xl border-border/40 rounded-[40px] relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:scale-110 transition-transform duration-500">
                  <Target className="w-24 h-24" />
                </div>
                <h3 className="text-xl font-black italic uppercase tracking-tighter mb-6">Rush Records</h3>
                <div className="space-y-4">
                  {recordBook.mostRBPoints.map((player) => (
                    <div key={player.id} className="flex justify-between items-center p-3 bg-white/5 rounded-2xl">
                      <div>
                        <p className="text-sm font-black uppercase tracking-tight">{player.playerName}</p>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{player.team}</p>
                      </div>
                      <span className="text-lg font-black italic text-primary">{(player.rushingYards || 0) + (player.rushingTouchdowns || 0) * 6}</span>
                    </div>
                  ))}
                </div>
              </Card>
              <Card className="p-8 bg-card/40 backdrop-blur-3xl border-border/40 rounded-[40px] relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:scale-110 transition-transform duration-500">
                  <BarChart3 className="w-24 h-24" />
                </div>
                <h3 className="text-xl font-black italic uppercase tracking-tighter mb-6">Rec Records</h3>
                <div className="space-y-4">
                  {recordBook.mostWRPoints.map((player) => (
                    <div key={player.id} className="flex justify-between items-center p-3 bg-white/5 rounded-2xl">
                      <div>
                        <p className="text-sm font-black uppercase tracking-tight">{player.playerName}</p>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{player.team}</p>
                      </div>
                      <span className="text-lg font-black italic text-primary">{(player.receivingYards || 0) + (player.receivingTouchdowns || 0) * 6}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
