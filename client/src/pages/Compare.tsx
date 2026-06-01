import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GitCompare, Trophy, Target, Zap, BarChart3, Shield } from "lucide-react";
import { TEAMS } from "@/lib/teams";
import { useState } from "react";
import { useSeasonConfig } from "@/hooks/useSeasonConfig";

interface GameResult {
  id: string;
  team1: string;
  team2: string;
  team1Score: number;
  team2Score: number;
  isFinal: boolean;
  week: number;
}

interface Standing {
  team: string;
  wins: number;
  losses: number;
  pointDifferential: number;
  division: string;
}

interface PlayerStat {
  playerName: string;
  team: string;
  position: string;
  passingYards: number;
  passingTouchdowns: number;
  interceptions: number;
  rushingYards: number;
  rushingTouchdowns: number;
  receivingYards: number;
  receivingTouchdowns: number;
  defensiveSacks: number;
  tackles: number;
  defensiveInterceptions: number;
}

interface TeamStats {
  team: string;
  wins: number;
  losses: number;
  pointDifferential: number;
  pointsFor: number;
  pointsAgainst: number;
  passingYards: number;
  passingTouchdowns: number;
  rushingYards: number;
  rushingTouchdowns: number;
  receivingYards: number;
  totalTouchdowns: number;
  defensiveSacks: number;
  totalTackles: number;
  defensiveInterceptions: number;
  gamesPlayed: number;
  winPct: number;
}

function buildTeamStats(
  teamName: string,
  games: GameResult[],
  playerStats: PlayerStat[],
  standings: Standing[]
): TeamStats {
  const teamGames = games.filter(g => (g.team1 === teamName || g.team2 === teamName) && g.isFinal);
  const wins = teamGames.filter(g =>
    (g.team1 === teamName && g.team1Score > g.team2Score) ||
    (g.team2 === teamName && g.team2Score > g.team1Score)
  ).length;
  const losses = teamGames.length - wins;
  const pointsFor = teamGames.reduce((s, g) => s + (g.team1 === teamName ? g.team1Score : g.team2Score), 0);
  const pointsAgainst = teamGames.reduce((s, g) => s + (g.team1 === teamName ? g.team2Score : g.team1Score), 0);
  const standing = standings.find(s => s.team === teamName);

  const tStats = playerStats.filter(p => p.team === teamName);
  const sum = (field: keyof PlayerStat) => tStats.reduce((s, p) => s + ((p[field] as number) || 0), 0);

  return {
    team: teamName,
    wins: standing?.wins ?? wins,
    losses: standing?.losses ?? losses,
    pointDifferential: standing?.pointDifferential ?? (pointsFor - pointsAgainst),
    pointsFor,
    pointsAgainst,
    passingYards: sum("passingYards"),
    passingTouchdowns: sum("passingTouchdowns"),
    rushingYards: sum("rushingYards"),
    rushingTouchdowns: sum("rushingTouchdowns"),
    receivingYards: sum("receivingYards"),
    totalTouchdowns: sum("passingTouchdowns") + sum("rushingTouchdowns") + sum("receivingTouchdowns"),
    defensiveSacks: sum("defensiveSacks"),
    totalTackles: sum("tackles"),
    defensiveInterceptions: sum("defensiveInterceptions"),
    gamesPlayed: teamGames.length,
    winPct: teamGames.length > 0 ? Math.round((wins / teamGames.length) * 100) : 0,
  };
}

interface StatRowProps {
  label: string;
  a: number | string;
  b: number | string;
  higherIsBetter?: boolean;
  format?: (v: number) => string;
  icon?: typeof Trophy;
}

function StatRow({ label, a, b, higherIsBetter = true, icon: Icon }: StatRowProps) {
  const aNum = typeof a === "number" ? a : parseFloat(a as string) || 0;
  const bNum = typeof b === "number" ? b : parseFloat(b as string) || 0;

  const aWins = higherIsBetter ? aNum > bNum : aNum < bNum;
  const bWins = higherIsBetter ? bNum > aNum : bNum < aNum;
  const tie = aNum === bNum;

  const barMax = Math.max(aNum, bNum, 1);
  const aBar = Math.round((aNum / barMax) * 100);
  const bBar = Math.round((bNum / barMax) * 100);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className={`text-xl font-black italic tabular-nums ${aWins ? 'text-primary' : tie ? 'text-foreground' : 'text-muted-foreground'}`}>
          {typeof a === "number" ? a.toLocaleString() : a}
        </span>
        <div className="flex items-center gap-2 text-center">
          {Icon && <Icon className="w-3.5 h-3.5 text-muted-foreground/40" />}
          <span className="text-[9px] font-black uppercase tracking-[0.25em] text-muted-foreground/60">{label}</span>
        </div>
        <span className={`text-xl font-black italic tabular-nums ${bWins ? 'text-primary' : tie ? 'text-foreground' : 'text-muted-foreground'}`}>
          {typeof b === "number" ? b.toLocaleString() : b}
        </span>
      </div>
      <div className="flex gap-1 items-center h-2">
        <div className="flex-1 flex justify-end">
          <div
            className={`h-full rounded-full transition-all duration-700 ${aWins ? 'bg-primary' : 'bg-white/20'}`}
            style={{ width: `${aBar}%` }}
          />
        </div>
        <div className="w-px h-3 bg-border/40 flex-shrink-0" />
        <div className="flex-1">
          <div
            className={`h-full rounded-full transition-all duration-700 ${bWins ? 'bg-primary' : 'bg-white/20'}`}
            style={{ width: `${bBar}%` }}
          />
        </div>
      </div>
    </div>
  );
}

const TEAM_LIST = Object.keys(TEAMS).sort();

export default function Compare() {
  const [teamA, setTeamA] = useState<string>("");
  const [teamB, setTeamB] = useState<string>("");
  const { currentSeasonId } = useSeasonConfig();

  const { data: games = [] } = useQuery<GameResult[]>({
    queryKey: ["/api/games/all", currentSeasonId],
    queryFn: async () => {
      const res = await fetch(`/api/games/all?season=${currentSeasonId}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    }
  });

  const { data: standings = [] } = useQuery<Standing[]>({
    queryKey: ["/api/standings", currentSeasonId],
    queryFn: async () => {
      const res = await fetch(`/api/standings?season=${currentSeasonId}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    }
  });

  const { data: playerStats = [] } = useQuery<PlayerStat[]>({
    queryKey: ["/api/player-stats"],
  });

  const statsA = teamA ? buildTeamStats(teamA, games, playerStats, standings) : null;
  const statsB = teamB ? buildTeamStats(teamB, games, playerStats, standings) : null;

  const h2hGames = games.filter(g =>
    g.isFinal &&
    ((g.team1 === teamA && g.team2 === teamB) || (g.team1 === teamB && g.team2 === teamA))
  );

  const TeamSelector = ({ value, onChange, exclude }: { value: string; onChange: (v: string) => void; exclude: string }) => (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="bg-white/5 border-white/10 rounded-2xl h-14 font-black uppercase tracking-widest text-sm">
        <SelectValue placeholder="Select Team..." />
      </SelectTrigger>
      <SelectContent className="rounded-2xl border-border/40 max-h-72">
        {TEAM_LIST.filter(t => t !== exclude).map((t) => (
          <SelectItem key={t} value={t} className="rounded-xl">
            <div className="flex items-center gap-3">
              <img src={TEAMS[t as keyof typeof TEAMS]} className="w-6 h-6 object-contain" alt={t} />
              <span className="font-bold">{t}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-background to-background">
      <div className="max-w-5xl mx-auto p-6 md:p-10 space-y-10">

        <div className="space-y-4">
          <Badge className="bg-primary/10 text-primary border-none font-black uppercase tracking-[0.2em] text-[10px] px-4 py-1.5 rounded-full w-fit">
            <GitCompare className="w-3.5 h-3.5 mr-2" />
            Head to Head
          </Badge>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black italic uppercase tracking-tighter leading-[0.9]">
            Team <span className="text-primary">Compare</span>
          </h1>
          <p className="text-muted-foreground font-medium max-w-md leading-relaxed">
            Pick two teams to compare their stats, records, and head-to-head matchups side by side.
          </p>
        </div>

        {/* Team Selectors */}
        <div className="grid grid-cols-2 gap-6 items-center">
          <div className="space-y-3">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground ml-1">Team A</p>
            <TeamSelector value={teamA} onChange={setTeamA} exclude={teamB} />
          </div>
          <div className="space-y-3">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground ml-1">Team B</p>
            <TeamSelector value={teamB} onChange={setTeamB} exclude={teamA} />
          </div>
        </div>

        {/* Team Headers */}
        {teamA && teamB && statsA && statsB ? (
          <div className="space-y-8">
            {/* Team banners */}
            <Card className="bg-card/40 backdrop-blur-xl border-border/40 rounded-[32px] overflow-hidden p-6">
              <div className="grid grid-cols-2 gap-4 items-center">
                {[{ name: teamA, stats: statsA }, { name: teamB, stats: statsB }].map(({ name, stats }, i) => (
                  <div key={i} className={`flex items-center gap-4 ${i === 1 ? 'justify-end flex-row-reverse' : ''}`}>
                    {TEAMS[name as keyof typeof TEAMS] && (
                      <img src={TEAMS[name as keyof typeof TEAMS]} alt={name} className="w-16 h-16 object-contain drop-shadow-lg" />
                    )}
                    <div className={i === 1 ? 'text-right' : ''}>
                      <h2 className="text-lg font-black italic uppercase tracking-tighter leading-tight">{name}</h2>
                      <p className="text-3xl font-black italic text-primary tabular-nums">{stats.wins}-{stats.losses}</p>
                      <p className={`text-sm font-black ${stats.pointDifferential >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        PD: {stats.pointDifferential >= 0 ? '+' : ''}{stats.pointDifferential}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Stat Comparisons */}
            <Card className="p-8 bg-card/40 backdrop-blur-xl border-border/40 rounded-[40px] space-y-8">
              <h3 className="text-xl font-black italic uppercase tracking-tighter flex items-center gap-3">
                <div className="w-1.5 h-7 bg-primary rounded-full" />
                Season Stats
              </h3>
              <div className="space-y-6">
                <StatRow label="Win %" a={statsA.winPct} b={statsB.winPct} icon={Trophy} />
                <StatRow label="Points For" a={statsA.pointsFor} b={statsB.pointsFor} icon={Target} />
                <StatRow label="Points Against" a={statsA.pointsAgainst} b={statsB.pointsAgainst} higherIsBetter={false} icon={Shield} />
                <StatRow label="Pt Differential" a={statsA.pointDifferential} b={statsB.pointDifferential} icon={BarChart3} />
                <StatRow label="Total TDs" a={statsA.totalTouchdowns} b={statsB.totalTouchdowns} icon={Zap} />
              </div>
            </Card>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Offense */}
              <Card className="p-8 bg-card/40 backdrop-blur-xl border-border/40 rounded-[40px] space-y-6">
                <h3 className="text-xl font-black italic uppercase tracking-tighter flex items-center gap-3">
                  <div className="w-1.5 h-7 bg-primary rounded-full" />
                  Offense
                </h3>
                <StatRow label="Pass Yards" a={statsA.passingYards} b={statsB.passingYards} />
                <StatRow label="Pass TDs" a={statsA.passingTouchdowns} b={statsB.passingTouchdowns} />
                <StatRow label="Rush Yards" a={statsA.rushingYards} b={statsB.rushingYards} />
                <StatRow label="Rush TDs" a={statsA.rushingTouchdowns} b={statsB.rushingTouchdowns} />
                <StatRow label="Rec Yards" a={statsA.receivingYards} b={statsB.receivingYards} />
              </Card>

              {/* Defense */}
              <Card className="p-8 bg-card/40 backdrop-blur-xl border-border/40 rounded-[40px] space-y-6">
                <h3 className="text-xl font-black italic uppercase tracking-tighter flex items-center gap-3">
                  <div className="w-1.5 h-7 bg-red-500 rounded-full" />
                  Defense
                </h3>
                <StatRow label="Sacks" a={statsA.defensiveSacks} b={statsB.defensiveSacks} />
                <StatRow label="Interceptions" a={statsA.defensiveInterceptions} b={statsB.defensiveInterceptions} />
                <StatRow label="Total Tackles" a={statsA.totalTackles} b={statsB.totalTackles} />
                <StatRow label="Points Allowed" a={statsA.pointsAgainst} b={statsB.pointsAgainst} higherIsBetter={false} />
                <StatRow label="Avg PA/Game" a={statsA.gamesPlayed > 0 ? Math.round(statsA.pointsAgainst / statsA.gamesPlayed) : 0} b={statsB.gamesPlayed > 0 ? Math.round(statsB.pointsAgainst / statsB.gamesPlayed) : 0} higherIsBetter={false} />
              </Card>
            </div>

            {/* Head to Head */}
            <Card className="p-8 bg-card/40 backdrop-blur-xl border-border/40 rounded-[40px] space-y-6">
              <h3 className="text-xl font-black italic uppercase tracking-tighter flex items-center gap-3">
                <div className="w-1.5 h-7 bg-accent rounded-full" />
                Head to Head
              </h3>
              {h2hGames.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground/40">
                  <GitCompare className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-black uppercase tracking-widest">These teams haven't played yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {h2hGames.map((game) => {
                    const aIsT1 = game.team1 === teamA;
                    const aScore = aIsT1 ? game.team1Score : game.team2Score;
                    const bScore = aIsT1 ? game.team2Score : game.team1Score;
                    const aWon = aScore > bScore;
                    return (
                      <div key={game.id} className="flex items-center justify-between p-5 bg-white/5 rounded-3xl border border-white/5">
                        <div className="flex items-center gap-3">
                          {TEAMS[teamA as keyof typeof TEAMS] && (
                            <img src={TEAMS[teamA as keyof typeof TEAMS]} className="w-8 h-8 object-contain" alt={teamA} />
                          )}
                          <span className={`text-xl font-black italic tabular-nums ${aWon ? 'text-primary' : 'text-muted-foreground'}`}>{aScore}</span>
                        </div>
                        <div className="text-center">
                          <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">Week {game.week}</p>
                          <p className="text-xs font-black uppercase tracking-widest text-muted-foreground/30">Final</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`text-xl font-black italic tabular-nums ${!aWon ? 'text-primary' : 'text-muted-foreground'}`}>{bScore}</span>
                          {TEAMS[teamB as keyof typeof TEAMS] && (
                            <img src={TEAMS[teamB as keyof typeof TEAMS]} className="w-8 h-8 object-contain" alt={teamB} />
                          )}
                        </div>
                      </div>
                    );
                  })}
                  <div className="flex justify-between items-center pt-4 px-2">
                    <div className="text-center">
                      <p className="text-3xl font-black italic text-primary">{h2hGames.filter(g => {
                        const aIsT1 = g.team1 === teamA;
                        const aScore = aIsT1 ? g.team1Score : g.team2Score;
                        const bScore = aIsT1 ? g.team2Score : g.team1Score;
                        return aScore > bScore;
                      }).length}</p>
                      <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50">{teamA} wins</p>
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/30">vs</p>
                    <div className="text-center">
                      <p className="text-3xl font-black italic text-primary">{h2hGames.filter(g => {
                        const aIsT1 = g.team1 === teamA;
                        const aScore = aIsT1 ? g.team1Score : g.team2Score;
                        const bScore = aIsT1 ? g.team2Score : g.team1Score;
                        return bScore > aScore;
                      }).length}</p>
                      <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/50">{teamB} wins</p>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          </div>
        ) : (
          <Card className="p-24 text-center border-dashed border-2 border-white/5 bg-transparent rounded-[40px]">
            <GitCompare className="w-16 h-16 text-muted-foreground/10 mx-auto mb-6" />
            <h3 className="text-2xl font-black italic uppercase tracking-tighter text-muted-foreground/40">Select Two Teams</h3>
            <p className="text-muted-foreground/30 text-[10px] font-black uppercase tracking-widest mt-2">
              Choose teams above to compare their stats head to head
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
