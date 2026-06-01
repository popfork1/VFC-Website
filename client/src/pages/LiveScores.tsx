import { useQuery } from "@tanstack/react-query";
import { GameCard } from "@/components/GameCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useSeasonConfig } from "@/hooks/useSeasonConfig";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { Game } from "@shared/schema";
import { useLocation } from "wouter";
import { AlertCircle, Search, Zap, Trophy, Target } from "lucide-react";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { useState } from "react";

export default function LiveScores() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [primetimeFilter, setPrimetimeFilter] = useState<"all" | "primetime" | "regular">("all");
  const preferences = useUserPreferences();
  const { currentSeasonId } = useSeasonConfig();
  
  const { data: games, isLoading, error } = useQuery<Game[]>({
    queryKey: ["/api/games/current", currentSeasonId],
    queryFn: async () => {
      const res = await fetch(`/api/games/current?season=${currentSeasonId}`);
      if (!res.ok) throw new Error("Failed to fetch games");
      return res.json();
    },
    refetchInterval: 30000,
  });

  const filteredGames = games ? games.filter(game => {
    const matchesSearch = game.team1.toLowerCase().includes(searchQuery.toLowerCase()) ||
      game.team2.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPrimetime = 
      primetimeFilter === "all" ||
      (primetimeFilter === "primetime" && game.isPrimetime) ||
      (primetimeFilter === "regular" && !game.isPrimetime);
    return matchesSearch && matchesPrimetime;
  }) : [];

  const sortedGames = filteredGames ? [...filteredGames].sort((a, b) => {
    if (preferences.favoriteTeam) {
      const aHasFavorite = a.team1 === preferences.favoriteTeam || a.team2 === preferences.favoriteTeam;
      const bHasFavorite = b.team1 === preferences.favoriteTeam || b.team2 === preferences.favoriteTeam;
      if (aHasFavorite && !bHasFavorite) return -1;
      if (!aHasFavorite && bHasFavorite) return 1;
    }
    return 0;
  }) : [];

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
          <p className="text-xl font-black uppercase tracking-tighter italic">Signal Lost</p>
          <Button onClick={() => window.location.reload()} variant="outline" className="rounded-full">Retry Connection</Button>
        </div>
      </div>
    );
  }

  const currentWeek = games && games.length > 0 ? games[0].week : 1;

  return (
    <div className="min-h-screen bg-background p-6 md:p-10 max-w-7xl mx-auto space-y-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-4">
          <Badge className="bg-primary/10 text-primary border-none font-black uppercase tracking-[0.2em] text-[10px] px-4 py-1.5 rounded-full w-fit">
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              Live Broadcast Network
            </span>
          </Badge>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black italic uppercase tracking-tighter leading-[0.9]">
            Gameday <span className="text-muted-foreground/20">S2</span>
          </h1>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
          <div className="relative group flex-1 md:w-72">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              placeholder="Filter teams..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-12 pl-12 bg-white/5 border-white/10 rounded-2xl focus:ring-primary/20 transition-all font-bold text-sm"
            />
          </div>
          <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10">
            {["all", "primetime", "regular"].map((f) => (
              <Button
                key={f}
                variant="ghost"
                size="sm"
                onClick={() => setPrimetimeFilter(f as any)}
                className={`flex-1 sm:px-6 rounded-xl font-black uppercase tracking-widest text-[9px] h-10 transition-all ${
                  primetimeFilter === f ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-muted-foreground"
                }`}
              >
                {f}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-[32px] bg-card/50" />
          ))}
        </div>
      ) : sortedGames.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {sortedGames.map((game) => (
            <GameCard key={game.id} game={game} onClick={() => setLocation(`/game/${game.id}`)} />
          ))}
        </div>
      ) : (
        <Card className="p-24 text-center border-dashed border-2 border-white/5 bg-transparent rounded-[40px]">
          <Zap className="w-16 h-16 text-muted-foreground/10 mx-auto mb-6" />
          <h3 className="text-2xl font-black italic uppercase tracking-tighter text-muted-foreground/40">No Matchups Found</h3>
          <p className="text-muted-foreground/30 text-[10px] font-black uppercase tracking-widest mt-2">Check the filters or search query</p>
        </Card>
      )}

      <section className="grid md:grid-cols-3 gap-6 pt-12 border-t border-white/5">
        {[
          { icon: Trophy, label: "Playoff Bracket", desc: "View the road to the bowl", path: "/playoffs" },
          { icon: Target, label: "Active Bets", desc: "Check your prediction history", path: "/betting" },
          { icon: Zap, label: "Team Intel", desc: "Deep dive into team statistics", path: "/teams" },
        ].map((item, i) => (
          <Button key={i} variant="ghost" onClick={() => setLocation(item.path)} className="h-32 flex flex-col items-center justify-center gap-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-[32px] group">
            <item.icon className="w-6 h-6 text-primary group-hover:scale-110 transition-transform" />
            <div className="text-center">
              <p className="text-[10px] font-black uppercase tracking-widest leading-none">{item.label}</p>
              <p className="text-[9px] text-muted-foreground mt-1 opacity-50">{item.desc}</p>
            </div>
          </Button>
        ))}
      </section>
    </div>
  );
}
