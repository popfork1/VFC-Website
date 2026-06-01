import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { useSeasonConfig } from "@/hooks/useSeasonConfig";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChatComponent } from "@/components/ChatComponent";
import { Skeleton } from "@/components/ui/skeleton";
import { FootballField } from "@/components/FootballField";
import type { Game, ChatMessage, Prediction, Standings, StreamRequest, User, GamePlay } from "@shared/schema";
import { formatInTimeZone } from "date-fns-tz";
import { ArrowLeft, AlertCircle, Video, ExternalLink, Activity, Trophy, Zap, Target, PlayCircle, Calendar } from "lucide-react";
import { Link } from "wouter";
import { useState, useEffect, useRef } from "react";
import { TEAMS } from "@/lib/teams";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { calculateWinProbability, getConferenceRanking, getWinProbabilityFactors } from "@/lib/winProbability";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useUserPreferences } from "@/hooks/useUserPreferences";

export default function GameDetail() {
  const [, params] = useRoute("/game/:id");
  const { currentSeasonName } = useSeasonConfig();
  const gameId = params?.id;
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [celebrationTriggered, setCelebrationTriggered] = useState(false);
  const [streamLinkInput, setStreamLinkInput] = useState("");
  const [selectedTeam, setSelectedTeam] = useState("");
  const wsRef = useRef<WebSocket | null>(null);
  const confettiTimeoutsRef = useRef<number[]>([]);
  const { user } = useAuth();
  const { toast } = useToast();
  const preferences = useUserPreferences();

  const { data: game, isLoading: gameLoading, error: gameError, refetch } = useQuery<Game>({
    queryKey: ["/api/games", gameId],
    enabled: !!gameId,
    refetchInterval: 2000,
    staleTime: 0,
    gcTime: 0,
  });
  
  useEffect(() => {
    if (gameId) {
      refetch();
    }
  }, [gameId, refetch]);

  const { data: initialMessages } = useQuery<ChatMessage[]>({
    queryKey: ["/api/chat", gameId],
    enabled: !!gameId,
  });

  const { data: predictions, refetch: refetchPredictions } = useQuery<Prediction[]>({
    queryKey: ["/api/predictions", gameId],
    enabled: !!gameId,
  });

  const { data: standings } = useQuery<Standings[]>({
    queryKey: ["/api/standings"],
  });

  const { data: allGames } = useQuery<Game[]>({
    queryKey: ["/api/games/all"],
  });

  const { data: streamRequests } = useQuery<StreamRequest[]>({
    queryKey: ["/api/stream-requests/game", gameId],
    enabled: !!gameId,
  });

  const { data: currentUser } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    enabled: !!user,
    retry: false,
  });

  const { data: myStreamRequests } = useQuery<StreamRequest[]>({
    queryKey: ["/api/stream-requests"],
    enabled: !!user,
    retry: false,
  });

  const { data: plays = [] } = useQuery<GamePlay[]>({
    queryKey: ["/api/games", gameId, "plays"],
    enabled: !!gameId,
    refetchInterval: 1000,
  });

  const requestStreamMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/stream-requests", {
        gameId: gameId,
      });
    },
    onSuccess: () => {
      toast({ title: "Stream request submitted", description: "Waiting for admin approval" });
      queryClient.invalidateQueries({ queryKey: ["/api/stream-requests"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to submit stream request", variant: "destructive" });
    },
  });

  const updateStreamLinkMutation = useMutation({
    mutationFn: async ({ requestId, streamLink }: { requestId: string; streamLink: string }) => {
      return await apiRequest("PATCH", `/api/stream-requests/${requestId}`, { streamLink });
    },
    onSuccess: () => {
      toast({ title: "Stream link updated", description: "Your stream link is now live!" });
      setStreamLinkInput("");
      queryClient.invalidateQueries({ queryKey: ["/api/stream-requests"] });
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || error?.message || "Failed to update stream link";
      toast({ title: "Error", description: errorMessage, variant: "destructive" });
    },
  });

  const voteMutation = useMutation({
    mutationFn: async (teamVote: string) => {
      return await apiRequest("POST", "/api/predictions", {
        gameId: gameId,
        votedFor: teamVote,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/predictions", gameId] });
      toast({ 
        title: "Prediction Saved", 
        description: "Your prediction has been recorded!" 
      });
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || error?.message || "Failed to submit prediction";
      toast({ 
        title: "Prediction Failed", 
        description: errorMessage, 
        variant: "destructive" 
      });
    }
  });

  useEffect(() => {
    if (initialMessages) {
      setChatMessages(initialMessages);
    }
  }, [initialMessages]);

  useEffect(() => {
    return () => {
      confettiTimeoutsRef.current.forEach(timeoutId => clearTimeout(timeoutId));
      confettiTimeoutsRef.current = [];
      const containers = document.querySelectorAll('.confetti-container');
      containers.forEach(container => container.remove());
    };
  }, []);

  useEffect(() => {
    if (game?.isFinal && !celebrationTriggered && !preferences.reduceAnimations) {
      setCelebrationTriggered(true);
      createConfetti();
    }
  }, [game?.isFinal, celebrationTriggered, preferences.reduceAnimations]);

  const createConfetti = () => {
    const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];
    const container = document.createElement('div');
    container.className = 'confetti-container';
    document.body.appendChild(container);

    for (let i = 0; i < 400; i++) {
      const timeoutId = window.setTimeout(() => {
        const piece = document.createElement('div');
        piece.className = 'confetti-piece';
        piece.style.left = Math.random() * 100 + '%';
        piece.style.top = -20 + 'px';
        piece.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        const size = Math.random() > 0.8 ? Math.random() * 18 + 10 : Math.random() * 12 + 4;
        piece.style.width = size + 'px';
        piece.style.height = size + 'px';
        piece.style.borderRadius = Math.random() > 0.5 ? '50%' : '20%';
        if (container.parentNode) {
          container.appendChild(piece);
        }
      }, i * 3);
      confettiTimeoutsRef.current.push(timeoutId);
    }

    const cleanupTimeoutId = window.setTimeout(() => {
      if (container.parentNode) {
        container.remove();
      }
    }, 5500);
    confettiTimeoutsRef.current.push(cleanupTimeoutId);
  };

  useEffect(() => {
    if (!gameId) return;
    
    try {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const hostname = window.location.hostname;
      const port = window.location.port || "";
      
      if (!hostname) return;
      
      const wsUrl = port && port !== "" && port !== "undefined" ? `${protocol}//${hostname}:${port}/ws` : `${protocol}//${hostname}/ws`;
      if (wsUrl.includes("undefined") || wsUrl.includes("localhost:")) return;
      
      const socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        console.log("WebSocket connected");
        (window as any).socket = socket;
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "chat" && data.gameId === gameId) {
            setChatMessages((prev) => [...prev, data.message]);
          } else if (data.type === "game_update" && data.gameId === gameId) {
            queryClient.setQueryData(["/api/games", gameId], data.game);
          }
        } catch (err) {
          console.error("Failed to parse WebSocket message:", err);
        }
      };

      socket.onerror = (error) => {
        console.error("WebSocket error:", error);
      };

      socket.onclose = () => {
        console.log("WebSocket disconnected");
      };

      wsRef.current = socket;

      return () => {
        socket.close();
        confettiTimeoutsRef.current.forEach(timeoutId => clearTimeout(timeoutId));
        confettiTimeoutsRef.current = [];
      };
    } catch (err) {
      console.error("Failed to establish WebSocket:", err);
    }
  }, [gameId]);

  const updateQuarterMutation = useMutation({
    mutationFn: async (newQuarter: string) => {
      return await apiRequest("PATCH", `/api/games/${gameId}`, { quarter: newQuarter });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/games", gameId] });
      toast({ title: "Quarter Updated", description: "Game state updated successfully" });
    },
  });

  const handleSendMessage = (username: string, message: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "chat",
          username,
          message,
          gameId,
        })
      );
    }
  };

  if (gameError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-12 border-none bg-card/50 backdrop-blur-2xl shadow-2xl text-center space-y-6">
          <div className="relative inline-block">
            <div className="absolute inset-0 bg-destructive/20 blur-3xl rounded-full" />
            <AlertCircle className="w-20 h-20 text-destructive relative z-10 mx-auto" />
          </div>
          <h1 className="text-4xl font-black italic uppercase tracking-tighter text-foreground">Error</h1>
          <p className="text-muted-foreground font-medium">Failed to load game details. Please try again later.</p>
          <Link href="/scores">
            <Button variant="outline" className="w-full">Back to Scores</Button>
          </Link>
        </Card>
      </div>
    );
  }

  if (gameLoading || !game) {
    return (
      <div className="min-h-screen bg-background p-6 md:p-10 space-y-12">
        <div className="max-w-7xl mx-auto space-y-8">
          <Skeleton className="h-12 w-48 rounded-full" />
          <Skeleton className="h-[400px] w-full rounded-[40px]" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            <Skeleton className="h-[600px] lg:col-span-2 rounded-[40px]" />
            <Skeleton className="h-[600px] rounded-[40px]" />
          </div>
        </div>
      </div>
    );
  }

  const isScheduled = game.quarter === "Scheduled";
  const team1Percent = calculateWinProbability(game, "team1", standings, allGames);
  const team2Percent = calculateWinProbability(game, "team2", standings, allGames);

  const team1Factors = standings ? getWinProbabilityFactors(game, standings, allGames) : null;

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-background to-background">
      <div className="max-w-7xl mx-auto p-6 md:p-10 space-y-12">
        
        {/* Header/Back Button */}
        <div className="flex items-center justify-between">
          <Link href="/scores">
            <Button variant="ghost" className="rounded-full font-black uppercase tracking-widest text-[10px] hover:bg-white/5 gap-2 transition-all">
              <ArrowLeft className="w-4 h-4" />
              Back to Scores
            </Button>
          </Link>
          <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-none px-4 py-1.5 text-[11px] font-black uppercase tracking-widest">
            <Zap className="w-3.5 h-3.5 mr-2" />
            {currentSeasonName} • Week {game.week}
          </Badge>
        </div>

        {/* Hero Scoreboard Section */}
        <section className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-primary to-accent opacity-20 blur-3xl group-hover:opacity-30 transition-opacity duration-1000" />
          <Card className="relative overflow-hidden border-none bg-card/40 backdrop-blur-3xl p-8 md:p-12 lg:p-16 rounded-[40px]">
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-12 text-center md:text-left">
              
                    {/* Team 2 */}
                    <div className="flex-1 flex flex-col items-center md:items-start gap-6 w-full">
                      <div className="relative group/logo">
                        <div className="absolute -inset-4 bg-primary/20 blur-2xl rounded-full scale-0 group-hover/logo:scale-100 transition-transform duration-500" />
                        {preferences.showTeamLogos !== false && TEAMS[game.team2 as keyof typeof TEAMS] ? (
                          <img src={TEAMS[game.team2 as keyof typeof TEAMS]} alt={game.team2} className="w-24 h-24 md:w-32 md:h-32 object-contain relative z-10 drop-shadow-2xl transition-transform group-hover/logo:scale-110" />
                        ) : (
                          <div className="w-24 h-24 md:w-32 md:h-32 bg-white/5 rounded-full flex items-center justify-center relative z-10">
                            <Trophy className="w-12 h-12 text-muted-foreground/20" />
                          </div>
                        )}
                        {/* Prediction Count Badge */}
                        <div className="absolute -top-2 -right-2 z-20 bg-primary text-primary-foreground text-[10px] font-black px-2 py-1 rounded-full shadow-lg border-2 border-background">
                          {predictions?.filter(p => p.votedFor === game.team2).length || 0}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <h2 className={`text-3xl md:text-5xl font-black italic uppercase tracking-tighter ${game.team2Score! > game.team1Score! && game.isFinal ? 'text-primary' : 'text-foreground'}`}>
                          {game.team2}
                        </h2>
                      </div>
                    </div>

                    {/* Score Display */}
                    <div className="flex flex-col items-center gap-6 flex-shrink-0 bg-white/5 backdrop-blur-md px-10 py-8 rounded-[40px] border border-white/10 min-w-[200px]">
                      <div className="flex items-center gap-8">
                        <span className={`text-6xl md:text-8xl font-black italic tabular-nums tracking-tighter ${game.team2Score! > game.team1Score! && game.isFinal ? 'text-primary drop-shadow-[0_0_20px_rgba(var(--primary),0.5)]' : ''}`}>
                          {game.team2Score}
                        </span>
                        <div className="w-1 h-12 bg-white/10 rounded-full" />
                        <span className={`text-6xl md:text-8xl font-black italic tabular-nums tracking-tighter ${game.team1Score! > game.team2Score! && game.isFinal ? 'text-primary drop-shadow-[0_0_20px_rgba(var(--primary),0.5)]' : ''}`}>
                          {game.team1Score}
                        </span>
                      </div>
                      <Badge className={`px-6 py-2 rounded-full font-black uppercase tracking-[0.2em] text-[10px] ${game.isLive ? 'bg-primary text-primary-foreground animate-pulse' : 'bg-white/10 text-muted-foreground'}`}>
                        {game.isLive ? `LIVE • ${game.quarter}` : game.isFinal ? 'FINAL' : 'SCHEDULED'}
                      </Badge>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                        {game.gameTime ? formatInTimeZone(new Date(game.gameTime), "America/New_York", "MMM d • h:mm a") : "Time TBD"}
                      </p>
                    </div>

                    {/* Team 1 */}
                    <div className="flex-1 flex flex-col items-center md:items-end gap-6 w-full text-center md:text-right">
                      <div className="relative group/logo">
                        <div className="absolute -inset-4 bg-primary/20 blur-2xl rounded-full scale-0 group-hover/logo:scale-100 transition-transform duration-500" />
                        {preferences.showTeamLogos !== false && TEAMS[game.team1 as keyof typeof TEAMS] ? (
                          <img src={TEAMS[game.team1 as keyof typeof TEAMS]} alt={game.team1} className="w-24 h-24 md:w-32 md:h-32 object-contain relative z-10 drop-shadow-2xl transition-transform group-hover/logo:scale-110" />
                        ) : (
                          <div className="w-24 h-24 md:w-32 md:h-32 bg-white/5 rounded-full flex items-center justify-center relative z-10">
                            <Trophy className="w-12 h-12 text-muted-foreground/20" />
                          </div>
                        )}
                        {/* Prediction Count Badge */}
                        <div className="absolute -top-2 -left-2 z-20 bg-primary text-primary-foreground text-[10px] font-black px-2 py-1 rounded-full shadow-lg border-2 border-background">
                          {predictions?.filter(p => p.votedFor === game.team1).length || 0}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <h2 className={`text-3xl md:text-5xl font-black italic uppercase tracking-tighter ${game.team1Score! > game.team2Score! && game.isFinal ? 'text-primary' : 'text-foreground'}`}>
                          {game.team1}
                        </h2>
                      </div>
                    </div>

            </div>
            <div className="absolute -bottom-24 -right-24 text-[300px] opacity-[0.02] select-none font-black italic pointer-events-none">GAME</div>
          </Card>
        </section>

        {/* Action Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
          
          {/* Main Content Area */}
          <div className="xl:col-span-2 space-y-12">
            

            {/* Play-by-Play List */}
            {plays.length > 0 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-black italic uppercase tracking-tight flex items-center gap-3">
                  <div className="w-1.5 h-8 bg-accent rounded-full" />
                  Match Recap <span className="text-muted-foreground/30 ml-2">{plays.length} Events</span>
                </h2>
                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-4 custom-scrollbar">
                  {[...plays].reverse().map((play, idx) => (
                    <Card key={play.id} className="p-6 bg-card/40 backdrop-blur-xl border-border/40 hover:bg-card/60 transition-all duration-300 rounded-[32px] group">
                      <div className="flex gap-6 items-center">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                          <p className="text-xs font-black italic text-white/50">{play.quarter}</p>
                        </div>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] font-black uppercase tracking-widest text-primary">{play.team}</span>
                            <div className="w-1 h-1 bg-white/10 rounded-full" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{play.playType}</span>
                          </div>
                          <p className="text-lg font-bold text-foreground/90">{play.description}</p>
                          {play.yardsGained !== 0 && (
                            <p className="text-xs font-black text-accent">{play.yardsGained! > 0 ? '+' : ''}{play.yardsGained} YARDS</p>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Prediction and Stats */}
            {!game.isFinal && (
              <div className="space-y-6">
                <h2 className="text-2xl font-black italic uppercase tracking-tight flex items-center gap-3">
                  <div className="w-1.5 h-8 bg-white/10 rounded-full" />
                  Analysis <span className="text-muted-foreground/30 ml-2">Winning Probability</span>
                </h2>
                <div className="grid md:grid-cols-2 gap-6">
                  {[
                    { team: game.team2, percent: team2Percent, pd: standings?.find(s => s.team === game.team2)?.pointDifferential || 0 },
                    { team: game.team1, percent: team1Percent, pd: standings?.find(s => s.team === game.team1)?.pointDifferential || 0 }
                  ].map((stat, i) => (
                    <Card key={i} className="p-8 bg-card/40 backdrop-blur-xl border-border/40 rounded-[40px] space-y-6">
                      <div className="flex items-center justify-between">
                        <span className="text-xl font-black italic uppercase tracking-tighter">{stat.team}</span>
                        <span className="text-3xl font-black italic text-primary">{stat.percent}%</span>
                      </div>
                      <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
                        <div className="bg-primary h-full transition-all duration-1000" style={{ width: `${stat.percent}%` }} />
                      </div>

                      {team1Factors && (
                        <div className="space-y-4 pt-4 border-t border-white/5">
                          <div className="flex items-center gap-2">
                            <div className="w-1 h-4 bg-primary rounded-full" />
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-white/70">Factor Breakdown</h4>
                          </div>
                          <div className="grid grid-cols-1 gap-2">
                            {[
                              { label: "Record", team1: team1Factors.factors.record.team1Record, team2: team1Factors.factors.record.team2Record, key: 'record' },
                              { label: "Point Diff", team1: (standings?.find(s => s.team === game.team1)?.pointDifferential || 0) > 0 ? `+${standings?.find(s => s.team === game.team1)?.pointDifferential}` : standings?.find(s => s.team === game.team1)?.pointDifferential || 0, team2: (standings?.find(s => s.team === game.team2)?.pointDifferential || 0) > 0 ? `+${standings?.find(s => s.team === game.team2)?.pointDifferential}` : standings?.find(s => s.team === game.team2)?.pointDifferential || 0, key: 'pointDiff' },
                              { label: "Schedule", team1: team1Factors.factors.schedule.team1SOS + "%", team2: team1Factors.factors.schedule.team2SOS + "%", key: 'schedule' },
                            ].map((factor, idx) => (
                              <div key={idx} className="flex justify-between items-center p-3 bg-white/5 rounded-2xl border border-white/5">
                                <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{factor.label}</span>
                                <span className="text-sm font-black italic">{stat.team === game.team1 ? factor.team1 : factor.team2}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <Button 
                        onClick={() => voteMutation.mutate(stat.team)} 
                        disabled={voteMutation.isPending || !!predictions?.find(p => p.userId === user?.id)}
                        className="w-full h-12 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:scale-105 transition-transform"
                      >
                        {predictions?.find(p => p.userId === user?.id)?.votedFor === stat.team 
                          ? "Prediction Placed" 
                          : predictions?.find(p => p.userId === user?.id)
                            ? "Prediction Locked"
                            : "Predict Winner"}
                      </Button>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar Area */}
          <div className="space-y-10">
            
            {/* Watch Section */}
            <Card className="p-8 bg-primary rounded-[40px] border-none shadow-2xl shadow-primary/20 overflow-hidden relative group">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white/20 to-transparent" />
              <div className="relative z-10 space-y-6 text-white">
                <div className="flex items-center gap-3">
                  <Video className="w-6 h-6" />
                  <h3 className="text-2xl font-black italic uppercase tracking-tighter">Live Broadcast</h3>
                </div>
                
                <div className="space-y-4">
                  {game.streamLink ? (
                    <Button 
                      variant="secondary" 
                      onClick={() => window.open(game.streamLink!.startsWith('http') ? game.streamLink! : `https://${game.streamLink}`, '_blank')}
                      className="w-full h-14 rounded-2xl font-black uppercase tracking-widest text-[10px] bg-white text-primary hover:bg-white/90 group/btn"
                    >
                      Watch Stream Now
                      <ExternalLink className="w-4 h-4 ml-2 group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 transition-transform" />
                    </Button>
                  ) : (
                    <div className="p-6 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 text-center">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/70">No active broadcast yet</p>
                    </div>
                  )}

                  {currentUser && (currentUser.role === "streamer" || currentUser.role === "admin") && (
                    <div className="pt-4 border-t border-white/10 space-y-4">
                      {(() => {
                        const myRequest = myStreamRequests?.find(r => r.gameId === gameId);
                        if (!myRequest) return (
                          <Button size="sm" variant="ghost" onClick={() => requestStreamMutation.mutate()} className="w-full text-white/70 hover:text-white hover:bg-white/10">
                            Apply to Broadcast
                          </Button>
                        );
                        if (myRequest.status === "pending") return <Badge className="w-full py-2 bg-white/10 text-white border-none justify-center">PENDING APPROVAL</Badge>;
                        if (myRequest.status === "approved") return (
                          <div className="space-y-3">
                            <Input placeholder="Enter stream URL..." value={streamLinkInput} onChange={(e) => setStreamLinkInput(e.target.value)} className="bg-white/10 border-white/20 text-white placeholder:text-white/30 rounded-xl" />
                            <Button size="sm" onClick={() => updateStreamLinkMutation.mutate({ requestId: myRequest.id, streamLink: streamLinkInput })} className="w-full bg-white text-primary rounded-xl">Update Link</Button>
                          </div>
                        );
                        return null;
                      })()}
                    </div>
                  )}
                </div>
              </div>
            </Card>

            {/* Chat Section */}
            <Card className="p-8 bg-card/40 backdrop-blur-3xl border border-border/40 rounded-[40px] shadow-2xl overflow-hidden relative flex flex-col h-[600px]">
              <div className="flex items-center gap-3 mb-6 relative z-10">
                <Zap className="w-5 h-5 text-primary" />
                <h3 className="text-xl font-black italic uppercase tracking-tight">Live Sideline</h3>
              </div>
              <div className="flex-1 min-h-0 relative z-10">
                <ChatComponent 
                  gameId={gameId}
                  messages={chatMessages}
                  onSendMessage={handleSendMessage}
                  username={user?.username || undefined}
                  isAuthenticated={!!user}
                />
              </div>
            </Card>

            {/* Game Info Quick List */}
            <div className="space-y-4">
              <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground px-4">Game Information</h4>
              <div className="grid gap-3">
                {[
                  { icon: Calendar, label: "Schedule", value: `Week ${game.week}`, bg: "bg-accent/5", text: "text-accent" },
                  { icon: PlayCircle, label: "Quarter", value: game.quarter || "Scheduled", bg: "bg-white/5", text: "text-foreground", isSelect: true },
                ].map((item, i) => (
                  <div key={i} className={`p-6 flex items-center justify-between rounded-[32px] border border-border/40 ${item.bg}`}>
                    <div className="flex items-center gap-4">
                      <item.icon className={`w-5 h-5 ${item.text}`} />
                      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{item.label}</span>
                    </div>
                    {item.isSelect ? (
                      <select 
                        value={game.quarter || "Scheduled"}
                        onChange={(e) => updateQuarterMutation.mutate(e.target.value)}
                        className="bg-transparent text-sm font-black italic uppercase tracking-tighter text-foreground outline-none cursor-pointer"
                      >
                        {["Scheduled", "Q1", "Q2", "Q3", "Q4", "FINAL"].map(q => (
                          <option key={q} value={q} className="bg-background text-foreground">{q}</option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-sm font-black italic uppercase tracking-tighter text-foreground">{item.value}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
