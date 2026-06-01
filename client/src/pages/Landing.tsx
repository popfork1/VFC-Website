import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { Game, Team } from "@shared/schema";
import { useLocation } from "wouter";
import { Zap, Calendar, ExternalLink, User } from "lucide-react";
import { TEAMS } from "@/lib/teams";
import { SiDiscord } from "react-icons/si";
import { useSeasonConfig } from "@/hooks/useSeasonConfig";

export default function Landing() {
  const [, setLocation] = useLocation();
  const { currentSeasonId, currentSeasonName } = useSeasonConfig();

  const { data: games, isLoading: gamesLoading } = useQuery<Game[]>({
    queryKey: ["/api/games/current", currentSeasonId],
    queryFn: async () => {
      const res = await fetch(`/api/games/current?season=${currentSeasonId}`);
      if (!res.ok) throw new Error("Failed to fetch games");
      return res.json();
    }
  });

  const { data: owners = {} } = useQuery<Record<string, string>>({
    queryKey: ["/api/team-owners"],
  });

  const { data: dbTeams = [] } = useQuery<Team[]>({ queryKey: ["/api/teams"] });
  const allTeamsSorted = [...dbTeams].sort((a, b) => a.name.localeCompare(b.name));

  const currentWeek = games && games.length > 0 ? games[0].week : 1;
  const liveGames = games?.filter(g => g.isLive) || [];

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-background to-background">
      <div className="max-w-7xl mx-auto p-6 md:p-10 space-y-12">

        {/* Welcome Banner */}
        <section className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-primary to-accent opacity-20 blur-3xl group-hover:opacity-30 transition-opacity duration-1000" />
          <Card className="relative overflow-hidden border-none bg-card/40 backdrop-blur-3xl p-8 md:p-12 lg:p-16">
            <div className="grid lg:grid-cols-2 gap-12 items-center relative z-10">
              <div className="space-y-8">
                <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-none px-4 py-1.5 text-[11px] font-black uppercase tracking-widest">
                  <Zap className="w-3.5 h-3.5 mr-2" />
                  {currentSeasonName} — League Tracker
                </Badge>
                <div className="space-y-2">
                  <h1 className="text-4xl sm:text-5xl md:text-7xl font-black italic uppercase tracking-tighter leading-[0.9] text-foreground">
                    Welcome to <br /><span className="text-primary">VFC</span>
                  </h1>
                  <p className="text-muted-foreground font-bold text-sm uppercase tracking-widest">
                    Owned by <span className="text-foreground">n1gg4tr0n._.</span>
                  </p>
                </div>
                <p className="text-base md:text-lg text-muted-foreground font-medium max-w-md leading-relaxed">
                  Live scores, team rosters, and everything you need to follow the league.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button size="lg" onClick={() => setLocation("/scores")} className="h-14 px-8 rounded-full font-black uppercase tracking-widest text-xs bg-primary hover:scale-105 transition-transform w-full sm:w-auto">
                    <Zap className="w-4 h-4 mr-2" />
                    Live Scores
                  </Button>
                  <a href="https://discord.gg/vfcff" target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto">
                    <Button size="lg" variant="outline" className="h-14 px-8 rounded-full font-black uppercase tracking-widest text-xs border-[#5865F2]/40 text-[#5865F2] hover:bg-[#5865F2]/10 transition-all w-full">
                      <SiDiscord className="w-4 h-4 mr-2" />
                      Join Discord
                    </Button>
                  </a>
                </div>
              </div>

              <div className="hidden lg:block relative">
                <div className="absolute -inset-20 bg-primary/10 blur-[120px] rounded-full animate-pulse" />
                <div className="relative grid grid-cols-2 gap-4">
                  <Card className="p-8 bg-white/5 backdrop-blur-md border-white/10 rotate-3 translate-y-8">
                    <Calendar className="w-12 h-12 text-accent mb-4" />
                    <p className="text-3xl font-black italic">W{currentWeek}</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Current Week</p>
                  </Card>
                  <Card className="p-8 bg-white/5 backdrop-blur-md border-white/10 -rotate-3">
                    <Zap className="w-12 h-12 text-primary mb-4" />
                    <p className="text-3xl font-black italic">{liveGames.length}</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Live Games</p>
                  </Card>
                </div>
              </div>
            </div>
            <div className="absolute -bottom-24 -right-24 text-[300px] opacity-[0.02] select-none font-black italic pointer-events-none">VFC</div>
          </Card>
        </section>

        {/* Current Week Matchups */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black italic uppercase tracking-tight flex items-center gap-3">
              <div className="w-1.5 h-8 bg-primary rounded-full" />
              Matchups <span className="text-muted-foreground/30 ml-2">W{currentWeek}</span>
            </h2>
            <Button variant="ghost" size="sm" onClick={() => setLocation("/scores")} className="font-bold text-[10px] uppercase tracking-widest text-primary hover:bg-primary/5">
              All Scores <ExternalLink className="w-3.5 h-3.5 ml-2" />
            </Button>
          </div>

          {gamesLoading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-32 rounded-3xl bg-card/50" />
              ))}
            </div>
          ) : games && games.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {games.slice(0, 6).map((game) => (
                <Card key={game.id} className="p-6 bg-card/40 backdrop-blur-xl border-border/40 hover:bg-card/60 transition-all duration-300 rounded-3xl">
                  <div className="flex items-center justify-between mb-4">
                    <Badge className={`text-[9px] font-black uppercase tracking-widest h-5 ${game.isLive ? 'bg-primary' : game.isFinal ? 'bg-white/10 text-white' : 'bg-muted/50 border-none text-muted-foreground'}`}>
                      {game.isLive ? '● Live' : game.isFinal ? 'Final' : 'Scheduled'}
                    </Badge>
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">W{game.week}</span>
                  </div>
                  <div className="space-y-3">
                    {[{ team: game.team1, score: game.team1Score }, { team: game.team2, score: game.team2Score }].map((t, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {TEAMS[t.team as keyof typeof TEAMS] && (
                            <img src={TEAMS[t.team as keyof typeof TEAMS]} className="w-7 h-7 object-contain" alt={t.team} />
                          )}
                          <span className="font-black uppercase tracking-tight text-sm">{t.team}</span>
                        </div>
                        {(game.isFinal || game.isLive) && (
                          <span className={`text-xl font-black italic tabular-nums ${game.isFinal && ((i === 0 && game.team1Score! > game.team2Score!) || (i === 1 && game.team2Score! > game.team1Score!)) ? 'text-primary' : ''}`}>
                            {t.score}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-16 text-center border-dashed border-2 border-white/5 bg-transparent rounded-3xl">
              <Calendar className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
              <p className="text-muted-foreground font-bold uppercase tracking-widest text-xs">No Games Scheduled</p>
            </Card>
          )}
        </section>

        {/* Team Owners */}
        <section className="space-y-6">
          <h2 className="text-2xl font-black italic uppercase tracking-tight flex items-center gap-3">
            <div className="w-1.5 h-8 bg-accent rounded-full" />
            Team Owners
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {allTeamsSorted.map((team) => {
              const owner = owners[team.name] || "";
              const logo = team.logo || TEAMS[team.name as keyof typeof TEAMS] || "";
              return (
                <Card key={team.id} className="p-5 bg-card/40 backdrop-blur-xl border-border/40 hover:bg-card/60 transition-all duration-300 rounded-2xl flex flex-col items-center gap-3 text-center">
                  {logo && (
                    <img src={logo} className="w-10 h-10 object-contain" alt={team.name} />
                  )}
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground leading-tight mb-1">{team.name}</p>
                    <p className={`text-sm font-black italic flex items-center gap-1 justify-center ${!owner ? "text-muted-foreground/30" : "text-primary"}`}>
                      {owner ? (
                        <><User className="w-3 h-3" />{owner}</>
                      ) : (
                        "TBD"
                      )}
                    </p>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>

        {/* Discord CTA */}
        <section>
          <a href="https://discord.gg/vfcff" target="_blank" rel="noopener noreferrer">
            <Card className="p-8 md:p-12 bg-[#5865F2]/10 border-[#5865F2]/20 hover:bg-[#5865F2]/20 transition-all rounded-3xl cursor-pointer group">
              <div className="flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
                <div className="p-5 bg-[#5865F2]/20 rounded-2xl group-hover:scale-110 transition-transform flex-shrink-0">
                  <SiDiscord className="w-10 h-10 text-[#5865F2]" />
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-black italic uppercase tracking-tighter text-foreground mb-1">Join the VFC Discord</h3>
                  <p className="text-muted-foreground font-medium text-sm">Connect with the community, get updates, and talk league at <span className="text-[#5865F2] font-bold">discord.gg/vfcff</span></p>
                </div>
                <Button className="bg-[#5865F2] hover:bg-[#4752c4] text-white font-black uppercase tracking-widest text-xs h-12 px-8 rounded-full flex-shrink-0">
                  Join Now
                </Button>
              </div>
            </Card>
          </a>
        </section>

      </div>
    </div>
  );
}
