import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Game, User, Team, Player } from "@shared/schema";
import { useWeekConfig } from "@/hooks/useWeekConfig";
import { useSeasonConfig } from "@/hooks/useSeasonConfig";
import { format } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import {
  Plus, Trash2, Edit, Save, ShieldCheck, Users, Calendar,
  UserPlus, Tv2, BarChart3, Shield, Settings, Trophy
} from "lucide-react";
import { TEAMS } from "@/lib/teams";

const POSITIONS = ["QB", "RB", "WR", "TE", "OL", "DE", "LB", "DB", "S", "K", "DEF"];

const POSITION_COLORS: Record<string, string> = {
  QB: "bg-blue-500/20 text-blue-400",
  RB: "bg-green-500/20 text-green-400",
  WR: "bg-yellow-500/20 text-yellow-400",
  TE: "bg-orange-500/20 text-orange-400",
  K: "bg-purple-500/20 text-purple-400",
  DEF: "bg-red-500/20 text-red-400",
  DB: "bg-pink-500/20 text-pink-400",
  LB: "bg-teal-500/20 text-teal-400",
  DE: "bg-cyan-500/20 text-cyan-400",
  OL: "bg-gray-500/20 text-gray-400",
  S: "bg-indigo-500/20 text-indigo-400",
};

// Stat fields by position group
const STAT_FIELDS: Record<string, { key: string; label: string }[]> = {
  QB: [
    { key: "completions", label: "Completions" },
    { key: "attempts", label: "Attempts" },
    { key: "passingYards", label: "Pass Yards" },
    { key: "passingTouchdowns", label: "Pass TDs" },
    { key: "interceptions", label: "INTs" },
    { key: "sacks", label: "Sacks Taken" },
    { key: "rushingAttempts", label: "Rush Att" },
    { key: "rushingYards", label: "Rush Yards" },
    { key: "rushingTouchdowns", label: "Rush TDs" },
  ],
  RB: [
    { key: "rushingAttempts", label: "Rush Att" },
    { key: "rushingYards", label: "Rush Yards" },
    { key: "rushingTouchdowns", label: "Rush TDs" },
    { key: "missedTacklesForced", label: "MTF" },
    { key: "receptions", label: "Receptions" },
    { key: "receivingYards", label: "Rec Yards" },
    { key: "receivingTouchdowns", label: "Rec TDs" },
  ],
  WR: [
    { key: "targets", label: "Targets" },
    { key: "receptions", label: "Receptions" },
    { key: "receivingYards", label: "Rec Yards" },
    { key: "receivingTouchdowns", label: "Rec TDs" },
    { key: "yardsAfterCatch", label: "YAC" },
  ],
  TE: [
    { key: "targets", label: "Targets" },
    { key: "receptions", label: "Receptions" },
    { key: "receivingYards", label: "Rec Yards" },
    { key: "receivingTouchdowns", label: "Rec TDs" },
    { key: "yardsAfterCatch", label: "YAC" },
  ],
  DB: [
    { key: "defensiveInterceptions", label: "INTs" },
    { key: "passesDefended", label: "PDs" },
    { key: "completionsAllowed", label: "Comp Allowed" },
    { key: "targetsAllowed", label: "Targets Allowed" },
    { key: "swats", label: "Swats" },
    { key: "defensiveTouchdowns", label: "DEF TDs" },
    { key: "tackles", label: "Tackles" },
  ],
  S: [
    { key: "defensiveInterceptions", label: "INTs" },
    { key: "passesDefended", label: "PDs" },
    { key: "completionsAllowed", label: "Comp Allowed" },
    { key: "targetsAllowed", label: "Targets Allowed" },
    { key: "swats", label: "Swats" },
    { key: "defensiveTouchdowns", label: "DEF TDs" },
    { key: "tackles", label: "Tackles" },
  ],
  LB: [
    { key: "tackles", label: "Tackles" },
    { key: "defensiveSacks", label: "Sacks" },
    { key: "defensiveMisses", label: "Misses" },
    { key: "defensiveTouchdowns", label: "DEF TDs" },
    { key: "safeties", label: "Safeties" },
  ],
  DE: [
    { key: "tackles", label: "Tackles" },
    { key: "defensiveSacks", label: "Sacks" },
    { key: "defensiveMisses", label: "Misses" },
    { key: "defensiveTouchdowns", label: "DEF TDs" },
    { key: "safeties", label: "Safeties" },
  ],
  DEF: [
    { key: "tackles", label: "Tackles" },
    { key: "defensiveSacks", label: "Sacks" },
    { key: "defensiveMisses", label: "Misses" },
    { key: "defensiveTouchdowns", label: "DEF TDs" },
    { key: "safeties", label: "Safeties" },
  ],
  K: [
    { key: "defensivePoints", label: "FG Made" },
    { key: "tackles", label: "PAT Made" },
  ],
  OL: [],
};

function getStatFields(position: string) {
  return STAT_FIELDS[position] || [];
}

export default function AdminDashboard() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading } = useAuth();
  const { seasons, currentSeasonId } = useSeasonConfig();
  const [season, setSeason] = useState(currentSeasonId);

  useEffect(() => {
    setSeason(currentSeasonId);
  }, [currentSeasonId]);

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || (user as any)?.role !== "admin")) {
      toast({ title: "Unauthorized", description: "Admin access only.", variant: "destructive" });
      setTimeout(() => { window.location.href = "/"; }, 500);
    }
  }, [isAuthenticated, (user as any)?.role, isLoading, toast]);

  if (!isAuthenticated || (user as any)?.role !== "admin") return null;

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-background to-background">
      <div className="max-w-7xl mx-auto p-6 md:p-10 space-y-10">

        {/* Header */}
        <div className="relative p-8 md:p-12 bg-card/40 backdrop-blur-3xl border border-border/40 rounded-[40px] overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[100px] -mr-32 -mt-32" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-start md:justify-between gap-6">
            <div className="space-y-4">
              <Badge className="bg-primary/10 text-primary border-none px-4 py-1.5 text-[11px] font-black uppercase tracking-widest w-fit">
                <ShieldCheck className="w-3.5 h-3.5 mr-2" />
                League Operations
              </Badge>
              <h1 className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter leading-[0.9]">
                Admin <span className="text-primary">Console</span>
              </h1>
              <p className="text-muted-foreground font-medium max-w-md">
                Manage games, rosters, stats, team owners, and user accounts.
              </p>
            </div>
            <div className="flex-shrink-0">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-2">Editing Season</p>
              <Select value={String(season)} onValueChange={(v) => setSeason(Number(v))}>
                <SelectTrigger className="w-48 h-11 rounded-2xl bg-white/5 border-white/10 font-black text-sm" data-testid="select-editing-season">
                  <SelectValue placeholder="Select season…" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl">
                  {seasons.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)} className="font-bold">
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="absolute -bottom-16 -right-16 text-[200px] opacity-[0.02] select-none font-black italic pointer-events-none">ADMIN</div>
        </div>

        <Tabs defaultValue="games" className="space-y-8">
          <div className="overflow-x-auto pb-2">
            <div className="p-2 bg-card/30 backdrop-blur-xl border border-border/40 rounded-[28px] inline-flex min-w-max">
              <TabsList className="flex h-auto gap-1 bg-transparent p-0">
                {[
                  { value: "games",   label: "Schedule",    icon: Calendar },
                  { value: "scores",  label: "Scores",      icon: Tv2 },
                  { value: "teams",   label: "Teams",       icon: Shield },
                  { value: "roster",  label: "Roster",      icon: Users },
                  { value: "stats",   label: "Player Stats", icon: BarChart3 },
                  { value: "owners",  label: "Team Owners", icon: Users },
                  { value: "users",    label: "Users",    icon: UserPlus },
                  { value: "settings", label: "Settings", icon: Settings },
                ].map((tab) => (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className="h-10 px-5 rounded-2xl font-black uppercase tracking-widest text-[9px] data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all hover:bg-white/5"
                    data-testid={`tab-${tab.value}`}
                  >
                    <tab.icon className="w-3.5 h-3.5 mr-2" />
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
          </div>

          <Card className="p-6 md:p-10 bg-card/40 backdrop-blur-3xl border-border/40 rounded-[40px] shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
            <TabsContent value="games"  className="mt-0 outline-none"><GamesManager season={season} /></TabsContent>
            <TabsContent value="scores" className="mt-0 outline-none"><ScoresManager season={season} /></TabsContent>
            <TabsContent value="teams"  className="mt-0 outline-none"><TeamsManager /></TabsContent>
            <TabsContent value="roster" className="mt-0 outline-none"><RosterManager /></TabsContent>
            <TabsContent value="stats"  className="mt-0 outline-none"><PlayerStatsManager /></TabsContent>
            <TabsContent value="owners" className="mt-0 outline-none"><TeamOwnersManager /></TabsContent>
            <TabsContent value="users"     className="mt-0 outline-none"><UsersManager /></TabsContent>
            <TabsContent value="settings"  className="mt-0 outline-none"><SettingsManager /></TabsContent>
          </Card>
        </Tabs>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────── SECTION HEADER ── */
function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-8 pb-6 border-b border-border/40">
      <h2 className="text-2xl font-black italic uppercase tracking-tighter">{title}</h2>
      {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
    </div>
  );
}

/* ─────────────────────────────────────── GAMES MANAGER ── */
function GamesManager({ season }: { season: number }) {
  const { toast } = useToast();
  const { weekOptions } = useWeekConfig();
  const [week, setWeek] = useState(1);
  const [filterWeek, setFilterWeek] = useState<string>("all");
  const [gamesList, setGamesList] = useState([{ team1: "", team2: "", date: "", time: "", isPrimetime: false }]);
  const [editingGameId, setEditingGameId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("");

  const { data: dbTeams = [] } = useQuery<Team[]>({ queryKey: ["/api/teams"] });
  const teamNames = [...dbTeams].sort((a, b) => a.name.localeCompare(b.name)).map(t => t.name);
  const { data: allGames } = useQuery<Game[]>({ queryKey: ["/api/games/all"] });
  const games = allGames?.filter((g) => (g.season ?? 1) === season);

  const invalidateGames = () => queryClient.invalidateQueries({ predicate: (q) => typeof q.queryKey[0] === "string" && (q.queryKey[0] as string).startsWith("/api/games") });

  const createMutation = useMutation({
    mutationFn: async (items: any[]) => {
      await Promise.all(items.map((g) => {
        const payload: any = { week: g.week, team1: g.team1, team2: g.team2, gameTime: null, isPrimetime: g.isPrimetime, season };
        if (g.date && g.time) payload.gameTime = new Date(`${g.date}T${g.time}`).toISOString();
        return apiRequest("POST", "/api/games", payload);
      }));
    },
    onSuccess: () => { invalidateGames(); toast({ title: "Week scheduled" }); setGamesList([{ team1: "", team2: "", date: "", time: "", isPrimetime: false }]); },
    onError: () => toast({ title: "Error", description: "Failed to schedule", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/games/${id}`, undefined),
    onSuccess: () => { invalidateGames(); toast({ title: "Game deleted" }); },
    onError: () => toast({ title: "Error", variant: "destructive" }),
  });

  const updateTimeMutation = useMutation({
    mutationFn: ({ id, date, time }: { id: string; date: string; time: string }) =>
      apiRequest("PATCH", `/api/games/${id}`, { gameTime: date && time ? new Date(`${date}T${time}`).toISOString() : null }),
    onSuccess: () => { invalidateGames(); toast({ title: "Time updated" }); setEditingGameId(null); },
    onError: () => toast({ title: "Error", variant: "destructive" }),
  });

  return (
    <div className="space-y-8">
      <SectionHeader title="Schedule Manager" subtitle="Create new game matchups for any week" />

      <Card className="p-6 bg-white/5 rounded-3xl border-border/40 space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 items-end">
          <div className="col-span-2 sm:col-span-1">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 block">Week</Label>
            <Select value={String(week)} onValueChange={(v) => setWeek(parseInt(v))}>
              <SelectTrigger className="h-11 rounded-2xl bg-white/5 border-white/10" data-testid="select-week"><SelectValue /></SelectTrigger>
              <SelectContent className="rounded-2xl">
                {weekOptions.map((w) => <SelectItem key={w.value} value={w.value}>{w.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => setGamesList([...gamesList, { team1: "", team2: "", date: "", time: "", isPrimetime: false }])} className="h-11 rounded-2xl gap-2 border-primary/20 hover:bg-primary/5" data-testid="button-add-game-row">
            <Plus className="w-4 h-4" /> Add Matchup
          </Button>
        </div>

        <div className="space-y-3">
          {gamesList.map((game, idx) => (
            <div key={idx} className="grid grid-cols-2 md:grid-cols-6 gap-3 p-4 bg-white/5 rounded-2xl border border-white/5" data-testid={`game-row-${idx}`}>
              <div>
                <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1.5 block">Team 1</Label>
                <Select value={game.team1} onValueChange={(v) => { const u = [...gamesList]; u[idx] = { ...u[idx], team1: v }; setGamesList(u); }}>
                  <SelectTrigger className="h-10 rounded-xl bg-white/5 border-white/10 text-sm" data-testid={`select-team1-${idx}`}><SelectValue placeholder="Team 1" /></SelectTrigger>
                  <SelectContent className="rounded-2xl max-h-60">{teamNames.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1.5 block">Team 2</Label>
                <Select value={game.team2} onValueChange={(v) => { const u = [...gamesList]; u[idx] = { ...u[idx], team2: v }; setGamesList(u); }}>
                  <SelectTrigger className="h-10 rounded-xl bg-white/5 border-white/10 text-sm" data-testid={`select-team2-${idx}`}><SelectValue placeholder="Team 2" /></SelectTrigger>
                  <SelectContent className="rounded-2xl max-h-60">{teamNames.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1.5 block">Date</Label>
                <Input type="date" value={game.date} onChange={(e) => { const u = [...gamesList]; u[idx] = { ...u[idx], date: e.target.value }; setGamesList(u); }} className="h-10 rounded-xl bg-white/5 border-white/10" data-testid={`input-date-${idx}`} />
              </div>
              <div>
                <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1.5 block">Time</Label>
                <Input type="time" value={game.time} onChange={(e) => { const u = [...gamesList]; u[idx] = { ...u[idx], time: e.target.value }; setGamesList(u); }} className="h-10 rounded-xl bg-white/5 border-white/10" data-testid={`input-time-${idx}`} />
              </div>
              <div className="flex items-end gap-2">
                <div className="flex items-center gap-2 h-10">
                  <Switch checked={game.isPrimetime} onCheckedChange={(c) => { const u = [...gamesList]; u[idx] = { ...u[idx], isPrimetime: c }; setGamesList(u); }} data-testid={`switch-primetime-${idx}`} />
                  <Label className="text-xs font-bold">Prime</Label>
                </div>
              </div>
              {gamesList.length > 1 && (
                <Button variant="ghost" size="icon" onClick={() => setGamesList(gamesList.filter((_, i) => i !== idx))} className="h-10 w-10 rounded-xl text-destructive hover:bg-destructive/10" data-testid={`button-remove-game-${idx}`}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))}
        </div>

        <Button onClick={() => {
          const valid = gamesList.filter(g => g.team1 && g.team2);
          if (!valid.length) return toast({ title: "Add at least one complete matchup", variant: "destructive" });
          createMutation.mutate(valid.map(g => ({ week, ...g })));
        }} disabled={createMutation.isPending} className="w-full h-12 rounded-2xl font-black uppercase tracking-widest text-[11px]" data-testid="button-schedule-week">
          <Plus className="w-4 h-4 mr-2" />
          {createMutation.isPending ? "Saving..." : `Save Week ${week} Schedule`}
        </Button>
      </Card>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-black uppercase tracking-widest text-sm">All Games — Season {season}</h3>
          <Select value={filterWeek} onValueChange={setFilterWeek}>
            <SelectTrigger className="w-40 h-9 rounded-xl bg-white/5 border-white/10 text-sm" data-testid="select-filter-week"><SelectValue /></SelectTrigger>
            <SelectContent className="rounded-2xl">
              <SelectItem value="all">All Weeks</SelectItem>
              {weekOptions.map(w => <SelectItem key={w.value} value={w.value}>{w.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          {games?.filter(g => filterWeek === "all" || g.week === parseInt(filterWeek)).map((game) => (
            <div key={game.id} data-testid={`game-item-${game.id}`}>
              {editingGameId === game.id ? (
                <div className="p-4 bg-white/5 rounded-2xl border border-primary/20 space-y-3">
                  <p className="font-black italic uppercase text-sm">{game.team1} vs {game.team2}</p>
                  <div className="grid grid-cols-3 gap-3">
                    <div><Label className="text-[9px] text-muted-foreground uppercase tracking-widest">Date</Label><Input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} className="h-9 mt-1 rounded-xl bg-white/5 border-white/10" /></div>
                    <div><Label className="text-[9px] text-muted-foreground uppercase tracking-widest">Time</Label><Input type="time" value={editTime} onChange={e => setEditTime(e.target.value)} className="h-9 mt-1 rounded-xl bg-white/5 border-white/10" /></div>
                    <div className="flex gap-2 items-end">
                      <Button size="sm" onClick={() => updateTimeMutation.mutate({ id: game.id, date: editDate, time: editTime })} disabled={updateTimeMutation.isPending} className="h-9 rounded-xl"><Save className="w-4 h-4" /></Button>
                      <Button size="sm" variant="destructive" onClick={() => updateTimeMutation.mutate({ id: game.id, date: "", time: "" })} disabled={updateTimeMutation.isPending} className="h-9 rounded-xl">Clear</Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingGameId(null)} className="h-9 rounded-xl">Cancel</Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/[0.08] transition-colors">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className="text-[9px] font-black bg-white/10 text-white border-none">W{game.week}</Badge>
                      {game.isLive && <Badge className="text-[9px] font-black bg-primary animate-pulse">LIVE</Badge>}
                      {game.isFinal && <Badge className="text-[9px] font-black bg-green-500/20 text-green-400 border-none">FINAL</Badge>}
                    </div>
                    <p className="font-black italic uppercase text-sm">{game.team1} vs {game.team2}</p>
                    <p className="text-xs text-muted-foreground/50 mt-0.5">
                      {game.gameTime ? formatInTimeZone(new Date(game.gameTime), "America/New_York", "MMM d, yyyy 'at' h:mm a 'EST'") : "Time TBD"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => { setEditingGameId(game.id); setEditDate(""); setEditTime(""); }} className="h-9 w-9 rounded-xl hover:bg-white/10" data-testid={`button-edit-time-${game.id}`}><Edit className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(game.id)} disabled={deleteMutation.isPending} className="h-9 w-9 rounded-xl hover:bg-destructive/10 text-destructive" data-testid={`button-delete-${game.id}`}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {(!games || games.filter(g => filterWeek === "all" || g.week === parseInt(filterWeek)).length === 0) && (
            <div className="text-center py-10 text-muted-foreground/40 text-sm font-bold uppercase tracking-widest">No games found</div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────── SCORES MANAGER ── */
function ScoresManager({ season }: { season: number }) {
  const { toast } = useToast();
  const { weekOptions } = useWeekConfig();
  const [filterWeek, setFilterWeek] = useState<string>("all");
  const { data: allGames } = useQuery<Game[]>({ queryKey: ["/api/games/all"] });
  const games = allGames?.filter((g) => (g.season ?? 1) === season);

  const invalidateGames = () => queryClient.invalidateQueries({ predicate: (q) => typeof q.queryKey[0] === "string" && (q.queryKey[0] as string).startsWith("/api/games") });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Game> }) => apiRequest("PATCH", `/api/games/${id}`, data),
    onSuccess: () => { invalidateGames(); toast({ title: "Updated" }); },
    onError: () => toast({ title: "Error", variant: "destructive" }),
  });

  const filtered = games?.filter(g => filterWeek === "all" || g.week === parseInt(filterWeek)) || [];

  return (
    <div className="space-y-6">
      <SectionHeader title="Score & Status Manager" subtitle="Update live scores and toggle game status" />
      <div className="flex justify-end">
        <Select value={filterWeek} onValueChange={setFilterWeek}>
          <SelectTrigger className="w-44 h-10 rounded-xl bg-white/5 border-white/10 text-sm" data-testid="select-scores-filter-week"><SelectValue /></SelectTrigger>
          <SelectContent className="rounded-2xl">
            <SelectItem value="all">All Weeks</SelectItem>
            {weekOptions.map(w => <SelectItem key={w.value} value={w.value}>{w.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-3">
        {filtered.map((game) => (
          <Card key={game.id} className="p-5 bg-white/5 border-border/40 rounded-3xl" data-testid={`score-card-${game.id}`}>
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="text-[9px] font-black bg-white/10 text-white border-none">W{game.week}</Badge>
                  <Badge className={`text-[9px] font-black border-none ${game.isLive ? "bg-primary animate-pulse" : game.isFinal ? "bg-green-500/20 text-green-400" : "bg-white/10 text-muted-foreground"}`}>
                    {game.isLive ? "LIVE" : game.isFinal ? "FINAL" : "SCHEDULED"}
                  </Badge>
                </div>
                <p className="font-black italic uppercase tracking-tight">{game.team1} vs {game.team2}</p>
              </div>
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <div className="text-center">
                    <Label className="text-[9px] text-muted-foreground uppercase tracking-widest block mb-1">{game.team1}</Label>
                    <Input type="number" className="w-16 text-center h-10 rounded-xl bg-white/5 border-white/10 font-black text-lg" value={game.team1Score ?? 0} onChange={(e) => updateMutation.mutate({ id: game.id, data: { team1Score: parseInt(e.target.value) || 0 } })} data-testid={`team1Score-${game.id}`} />
                  </div>
                  <span className="font-black text-muted-foreground/30 self-end pb-2">—</span>
                  <div className="text-center">
                    <Label className="text-[9px] text-muted-foreground uppercase tracking-widest block mb-1">{game.team2}</Label>
                    <Input type="number" className="w-16 text-center h-10 rounded-xl bg-white/5 border-white/10 font-black text-lg" value={game.team2Score ?? 0} onChange={(e) => updateMutation.mutate({ id: game.id, data: { team2Score: parseInt(e.target.value) || 0 } })} data-testid={`team2Score-${game.id}`} />
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex items-center gap-2">
                    <Switch checked={game.isLive || false} onCheckedChange={(c) => updateMutation.mutate({ id: game.id, data: { isLive: c, isFinal: c ? false : game.isFinal || false } })} data-testid={`switch-live-${game.id}`} />
                    <Label className="text-xs font-bold uppercase tracking-widest">Live</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={game.isFinal || false} onCheckedChange={(c) => updateMutation.mutate({ id: game.id, data: { isFinal: c, isLive: c ? false : game.isLive || false } })} data-testid={`switch-final-${game.id}`} />
                    <Label className="text-xs font-bold uppercase tracking-widest">Final</Label>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        ))}
        {filtered.length === 0 && <div className="text-center py-10 text-muted-foreground/40 text-sm font-bold uppercase tracking-widest">No games found</div>}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────── TEAMS MANAGER ── */
function TeamsManager() {
  const { toast } = useToast();
  const [teamName, setTeamName] = useState("");
  const [teamLogo, setTeamLogo] = useState("");

  const { data: teams = [], isLoading } = useQuery<Team[]>({ queryKey: ["/api/teams"] });

  const addMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/teams", { name: teamName.trim(), logo: teamLogo.trim() || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      toast({ title: "Team added!" });
      setTeamName("");
      setTeamLogo("");
    },
    onError: (e: any) => toast({ title: "Error adding team", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/teams/${id}`, undefined),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/teams"] }); toast({ title: "Team removed" }); },
    onError: () => toast({ title: "Error removing team", variant: "destructive" }),
  });

  const handleAdd = () => {
    if (!teamName.trim()) return toast({ title: "Team name required", variant: "destructive" });
    addMutation.mutate();
  };

  return (
    <div className="space-y-8">
      <SectionHeader title="Teams Manager" subtitle="Add or remove teams from the league" />

      {/* Add Team Form */}
      <Card className="p-6 bg-white/5 rounded-3xl border-border/40 space-y-5">
        <h3 className="font-black uppercase tracking-widest text-sm flex items-center gap-2">
          <Plus className="w-4 h-4 text-primary" /> Add Team
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1.5 block">Team Name *</Label>
            <Input
              value={teamName}
              onChange={e => setTeamName(e.target.value)}
              placeholder="e.g. Chicago Grizzlies"
              className="h-11 rounded-2xl bg-white/5 border-white/10 font-bold"
              onKeyDown={e => e.key === "Enter" && handleAdd()}
              data-testid="input-team-name"
            />
          </div>
          <div>
            <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1.5 block">Logo URL (optional)</Label>
            <Input
              value={teamLogo}
              onChange={e => setTeamLogo(e.target.value)}
              placeholder="https://... or /logos/my-team.png"
              className="h-11 rounded-2xl bg-white/5 border-white/10 font-bold"
              onKeyDown={e => e.key === "Enter" && handleAdd()}
              data-testid="input-team-logo"
            />
          </div>
        </div>
        {teamLogo && (
          <div className="flex items-center gap-3 p-3 bg-white/5 rounded-2xl border border-white/5">
            <img src={teamLogo} alt="Preview" className="w-10 h-10 object-contain" onError={e => (e.currentTarget.style.display = "none")} />
            <span className="text-xs text-muted-foreground font-bold">Logo preview</span>
          </div>
        )}
        <Button
          onClick={handleAdd}
          disabled={addMutation.isPending || !teamName.trim()}
          className="w-full h-11 rounded-2xl font-black uppercase tracking-widest text-[10px]"
          data-testid="button-add-team"
        >
          <Plus className="w-4 h-4 mr-2" />
          {addMutation.isPending ? "Adding..." : "Add Team"}
        </Button>
      </Card>

      {/* Team List */}
      <div className="space-y-4">
        <h3 className="font-black uppercase tracking-widest text-sm">
          League Teams <span className="text-primary">({teams.length})</span>
        </h3>
        {isLoading ? (
          <div className="text-center py-10 text-muted-foreground/40 text-sm font-bold uppercase tracking-widest">Loading...</div>
        ) : teams.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground/30 text-sm font-bold uppercase tracking-widest border-2 border-dashed border-white/5 rounded-3xl">
            No teams yet — add one above
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-2">
            {[...teams].sort((a, b) => a.name.localeCompare(b.name)).map(team => {
              const fallbackLogo = TEAMS[team.name as keyof typeof TEAMS];
              const logo = team.logo || fallbackLogo;
              return (
                <div
                  key={team.id}
                  className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/[0.08] transition-colors"
                  data-testid={`team-item-${team.id}`}
                >
                  <div className="flex items-center gap-3">
                    {logo ? (
                      <img src={logo} alt={team.name} className="w-10 h-10 object-contain flex-shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                        <Shield className="w-5 h-5 text-muted-foreground/30" />
                      </div>
                    )}
                    <div>
                      <p className="font-black uppercase tracking-tight">{team.name}</p>
                      {team.logo && <p className="text-[9px] text-muted-foreground/40 font-mono truncate max-w-[180px]">{team.logo}</p>}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteMutation.mutate(team.id)}
                    disabled={deleteMutation.isPending}
                    className="h-8 w-8 rounded-lg hover:bg-destructive/10 text-destructive flex-shrink-0"
                    data-testid={`button-delete-team-${team.id}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────── ROSTER MANAGER ── */
function RosterManager() {
  const { toast } = useToast();
  const [selectedTeamName, setSelectedTeamName] = useState<string>("");
  const [playerName, setPlayerName] = useState("");
  const [playerNumber, setPlayerNumber] = useState("");
  const [playerPosition, setPlayerPosition] = useState("");
  const [resolvedTeamId, setResolvedTeamId] = useState<string | null>(null);

  const { data: allTeams = [] } = useQuery<Team[]>({ queryKey: ["/api/teams"] });
  const { data: allPlayers = [], isLoading: playersLoading } = useQuery<Player[]>({ queryKey: ["/api/players"] });

  // Resolve team ID when team name changes
  const ensureTeamMutation = useMutation({
    mutationFn: (name: string) => apiRequest("POST", "/api/teams/ensure", { name }),
    onSuccess: (team: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      setResolvedTeamId(team.id);
    },
    onError: () => toast({ title: "Error finding team", variant: "destructive" }),
  });

  const handleSelectTeam = (name: string) => {
    setSelectedTeamName(name);
    setResolvedTeamId(null);
    const found = allTeams.find(t => t.name.toLowerCase() === name.toLowerCase());
    if (found) {
      setResolvedTeamId(found.id);
    } else {
      ensureTeamMutation.mutate(name);
    }
  };

  const addPlayerMutation = useMutation({
    mutationFn: (data: { name: string; number?: number; position: string; teamId: string }) =>
      apiRequest("POST", "/api/players", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/players"] });
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      toast({ title: "Player added!" });
      setPlayerName("");
      setPlayerNumber("");
      setPlayerPosition("");
    },
    onError: (e: any) => toast({ title: "Error adding player", description: e.message, variant: "destructive" }),
  });

  const deletePlayerMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/players/${id}`, undefined),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/players"] }); toast({ title: "Player removed" }); },
    onError: () => toast({ title: "Error removing player", variant: "destructive" }),
  });

  const handleAddPlayer = () => {
    if (!playerName.trim()) return toast({ title: "Player name required", variant: "destructive" });
    if (!playerPosition) return toast({ title: "Position required", variant: "destructive" });
    if (!resolvedTeamId) return toast({ title: "Team not resolved yet, try again", variant: "destructive" });
    addPlayerMutation.mutate({
      name: playerName.trim(),
      number: playerNumber ? parseInt(playerNumber) : undefined,
      position: playerPosition,
      teamId: resolvedTeamId,
    });
  };

  const teamPlayers = allPlayers.filter(p => p.teamId === resolvedTeamId);

  return (
    <div className="space-y-8">
      <SectionHeader title="Roster Manager" subtitle="Add and manage players for each team" />

      {/* Team Selector */}
      <div className="space-y-2">
        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Select Team</Label>
        <Select value={selectedTeamName} onValueChange={handleSelectTeam}>
          <SelectTrigger className="h-12 rounded-2xl bg-white/5 border-white/10 text-sm font-bold" data-testid="select-roster-team">
            <SelectValue placeholder="Pick a team to manage..." />
          </SelectTrigger>
          <SelectContent className="rounded-2xl max-h-72">
            {[...allTeams].sort((a,b) => a.name.localeCompare(b.name)).map(t => (
              <SelectItem key={t.id} value={t.name}>
                <div className="flex items-center gap-2">
                  {(t.logo || TEAMS[t.name as keyof typeof TEAMS]) && <img src={t.logo || TEAMS[t.name as keyof typeof TEAMS]} className="w-5 h-5 object-contain" alt="" />}
                  {t.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedTeamName && (
        <>
          {/* Add Player Form */}
          <Card className="p-6 bg-white/5 rounded-3xl border-border/40 space-y-5">
            <h3 className="font-black uppercase tracking-widest text-sm flex items-center gap-2">
              <Plus className="w-4 h-4 text-primary" />
              Add Player to {selectedTeamName}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1.5 block">Player Name *</Label>
                <Input
                  value={playerName}
                  onChange={e => setPlayerName(e.target.value)}
                  placeholder="e.g. Patrick Mahomes"
                  className="h-11 rounded-2xl bg-white/5 border-white/10 font-bold"
                  onKeyDown={e => e.key === "Enter" && handleAddPlayer()}
                  data-testid="input-player-name"
                />
              </div>
              <div>
                <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1.5 block">Jersey # </Label>
                <Input
                  type="number"
                  value={playerNumber}
                  onChange={e => setPlayerNumber(e.target.value)}
                  placeholder="#"
                  min={1} max={99}
                  className="h-11 rounded-2xl bg-white/5 border-white/10 font-bold text-center"
                  data-testid="input-player-number"
                />
              </div>
              <div>
                <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1.5 block">Position *</Label>
                <Select value={playerPosition} onValueChange={setPlayerPosition}>
                  <SelectTrigger className="h-11 rounded-2xl bg-white/5 border-white/10 font-bold" data-testid="select-player-position">
                    <SelectValue placeholder="Pos" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    {POSITIONS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button
              onClick={handleAddPlayer}
              disabled={addPlayerMutation.isPending || !resolvedTeamId}
              className="w-full h-11 rounded-2xl font-black uppercase tracking-widest text-[11px]"
              data-testid="button-add-player"
            >
              <Plus className="w-4 h-4 mr-2" />
              {addPlayerMutation.isPending ? "Adding..." : "Add Player"}
            </Button>
          </Card>

          {/* Current Roster */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-black uppercase tracking-widest text-sm">
                {selectedTeamName} Roster
                <span className="ml-2 text-primary">({teamPlayers.length})</span>
              </h3>
              {TEAMS[selectedTeamName as keyof typeof TEAMS] && (
                <img src={TEAMS[selectedTeamName as keyof typeof TEAMS]} className="w-8 h-8 object-contain opacity-60" alt={selectedTeamName} />
              )}
            </div>

            {playersLoading ? (
              <div className="text-center py-8 text-muted-foreground/40 text-sm font-bold uppercase tracking-widest">Loading...</div>
            ) : teamPlayers.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground/30 text-sm font-bold uppercase tracking-widest border-2 border-dashed border-white/5 rounded-3xl">
                No players yet — add one above
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-2">
                {[...teamPlayers]
                  .sort((a, b) => {
                    const order: Record<string, number> = { QB: 0, RB: 1, WR: 2, TE: 3, OL: 4, DE: 5, LB: 6, DB: 7, S: 8, K: 9, DEF: 10 };
                    return (order[a.position || ""] ?? 99) - (order[b.position || ""] ?? 99);
                  })
                  .map((player) => (
                    <div
                      key={player.id}
                      className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/[0.08] transition-colors"
                      data-testid={`player-row-${player.id}`}
                    >
                      <div className="flex items-center gap-3">
                        {player.number && (
                          <span className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center font-black text-sm text-muted-foreground">
                            {player.number}
                          </span>
                        )}
                        <div>
                          <p className="font-black uppercase tracking-tight">{player.name}</p>
                          {player.position && (
                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${POSITION_COLORS[player.position] || "bg-white/10 text-white"}`}>
                              {player.position}
                            </span>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deletePlayerMutation.mutate(player.id)}
                        disabled={deletePlayerMutation.isPending}
                        className="h-8 w-8 rounded-lg hover:bg-destructive/10 text-destructive flex-shrink-0"
                        data-testid={`button-delete-player-${player.id}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </>
      )}

      {!selectedTeamName && (
        <div className="text-center py-20 text-muted-foreground/20 text-sm font-bold uppercase tracking-widest border-2 border-dashed border-white/5 rounded-3xl">
          Select a team above to manage its roster
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────── PLAYER STATS MANAGER ── */
function PlayerStatsManager() {
  const { toast } = useToast();
  const { weekOptions } = useWeekConfig();
  const [selectedTeamName, setSelectedTeamName] = useState<string>("");
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("");
  const [week, setWeek] = useState(1);
  const [resolvedTeamId, setResolvedTeamId] = useState<string | null>(null);
  const [statVals, setStatVals] = useState<Record<string, number>>({});
  const [filterTeam, setFilterTeam] = useState<string>("__all__");
  const [filterWeek, setFilterWeek] = useState<string>("all");

  const { data: allTeams = [] } = useQuery<Team[]>({ queryKey: ["/api/teams"] });
  const { data: allPlayers = [] } = useQuery<Player[]>({ queryKey: ["/api/players"] });
  const { data: allStats = [] } = useQuery<any[]>({ queryKey: ["/api/player-stats"] });

  const ensureTeamMutation = useMutation({
    mutationFn: (name: string) => apiRequest("POST", "/api/teams/ensure", { name }),
    onSuccess: (team: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      setResolvedTeamId(team.id);
    },
    onError: () => toast({ title: "Error finding team", variant: "destructive" }),
  });

  const handleSelectTeam = (name: string) => {
    setSelectedTeamName(name);
    setSelectedPlayerId("");
    setResolvedTeamId(null);
    setStatVals({});
    const found = allTeams.find(t => t.name.toLowerCase() === name.toLowerCase());
    if (found) {
      setResolvedTeamId(found.id);
    } else {
      ensureTeamMutation.mutate(name);
    }
  };

  const teamPlayers = allPlayers.filter(p => p.teamId === resolvedTeamId);
  const selectedPlayer = allPlayers.find(p => p.id === selectedPlayerId);
  const statFields = getStatFields(selectedPlayer?.position || "");

  const handleSelectPlayer = (id: string) => {
    setSelectedPlayerId(id);
    setStatVals({});
  };

  const saveMutation = useMutation({
    mutationFn: () => {
      if (!selectedPlayer) throw new Error("No player selected");
      const payload: Record<string, any> = {
        playerName: selectedPlayer.name,
        team: selectedTeamName,
        position: selectedPlayer.position || "DEF",
        week,
        ...Object.fromEntries(Object.entries(statVals).map(([k, v]) => [k, v])),
      };
      return apiRequest("POST", "/api/player-stats", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/player-stats"] });
      toast({ title: "Stats saved!" });
      setStatVals({});
    },
    onError: () => toast({ title: "Error saving stats", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/player-stats/${id}`, undefined),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/player-stats"] }); toast({ title: "Entry deleted" }); },
    onError: () => toast({ title: "Error deleting entry", variant: "destructive" }),
  });

  const displayStats = allStats.filter(s =>
    (filterTeam === "__all__" || s.team === filterTeam) &&
    (filterWeek === "all" || s.week === parseInt(filterWeek))
  );

  return (
    <div className="space-y-8">
      <SectionHeader title="Player Stats" subtitle="Log game statistics for individual players by week" />

      {/* Entry Form */}
      <Card className="p-6 bg-white/5 rounded-3xl border-border/40 space-y-6">
        <h3 className="font-black uppercase tracking-widest text-sm">Add Stat Entry</h3>

        {/* Step 1: Team + Player + Week */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1.5 block">Team</Label>
            <Select value={selectedTeamName} onValueChange={handleSelectTeam}>
              <SelectTrigger className="h-11 rounded-2xl bg-white/5 border-white/10 font-bold" data-testid="select-stats-team">
                <SelectValue placeholder="Select team..." />
              </SelectTrigger>
              <SelectContent className="rounded-2xl max-h-72">
                {[...allTeams].sort((a,b) => a.name.localeCompare(b.name)).map(t => (
                  <SelectItem key={t.id} value={t.name}>
                    <div className="flex items-center gap-2">
                      {(t.logo || TEAMS[t.name as keyof typeof TEAMS]) && <img src={t.logo || TEAMS[t.name as keyof typeof TEAMS]} className="w-5 h-5 object-contain" alt="" />}
                      {t.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1.5 block">
              Player {teamPlayers.length === 0 && selectedTeamName ? "(add players in Roster tab first)" : ""}
            </Label>
            <Select value={selectedPlayerId} onValueChange={handleSelectPlayer} disabled={teamPlayers.length === 0}>
              <SelectTrigger className="h-11 rounded-2xl bg-white/5 border-white/10 font-bold" data-testid="select-stats-player">
                <SelectValue placeholder={teamPlayers.length === 0 ? "No players yet..." : "Select player..."} />
              </SelectTrigger>
              <SelectContent className="rounded-2xl max-h-72">
                {teamPlayers.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    <div className="flex items-center gap-2">
                      {p.position && (
                        <span className={`text-[8px] font-black px-1 py-0.5 rounded ${POSITION_COLORS[p.position] || "bg-white/10 text-white"}`}>{p.position}</span>
                      )}
                      {p.number ? `#${p.number} ` : ""}{p.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1.5 block">Week</Label>
            <Select value={String(week)} onValueChange={v => setWeek(parseInt(v))}>
              <SelectTrigger className="h-11 rounded-2xl bg-white/5 border-white/10 font-bold" data-testid="select-stats-week">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-2xl">
                {weekOptions.map(w => <SelectItem key={w.value} value={w.value}>{w.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Step 2: Stat Fields (by position) */}
        {selectedPlayer && (
          <>
            {/* Player pill */}
            <div className="flex items-center gap-3 p-3 bg-primary/10 border border-primary/20 rounded-2xl">
              {selectedPlayer.position && (
                <span className={`text-[9px] font-black px-2 py-1 rounded-lg ${POSITION_COLORS[selectedPlayer.position] || "bg-white/10 text-white"}`}>
                  {selectedPlayer.position}
                </span>
              )}
              <div>
                <p className="font-black uppercase tracking-tight">{selectedPlayer.name}</p>
                <p className="text-[10px] text-muted-foreground">{selectedTeamName}{selectedPlayer.number ? ` · #${selectedPlayer.number}` : ""} · Week {week}</p>
              </div>
            </div>

            {statFields.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {statFields.map(field => (
                  <div key={field.key}>
                    <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1.5 block">{field.label}</Label>
                    <Input
                      type="number"
                      value={statVals[field.key] ?? 0}
                      min={0}
                      onChange={e => setStatVals(prev => ({ ...prev, [field.key]: parseInt(e.target.value) || 0 }))}
                      className="h-10 rounded-xl bg-white/5 border-white/10 text-center font-black"
                      data-testid={`input-stat-${field.key}`}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground/40 text-sm font-bold uppercase tracking-widest text-center py-4">
                No stats tracked for {selectedPlayer.position} players
              </p>
            )}

            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || statFields.length === 0}
              className="w-full h-11 rounded-2xl font-black uppercase tracking-widest text-[10px]"
              data-testid="button-save-stats"
            >
              <Save className="w-4 h-4 mr-2" />
              {saveMutation.isPending ? "Saving..." : `Save Week ${week} Stats for ${selectedPlayer.name}`}
            </Button>
          </>
        )}
      </Card>

      {/* Existing Entries */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="font-black uppercase tracking-widest text-sm">{displayStats.length} Entries</h3>
          <div className="flex gap-2">
            <Select value={filterTeam} onValueChange={setFilterTeam}>
              <SelectTrigger className="w-44 h-9 rounded-xl bg-white/5 border-white/10 text-sm">
                <SelectValue placeholder="All Teams" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl max-h-60">
                <SelectItem value="__all__">All Teams</SelectItem>
                {[...allTeams].sort((a,b) => a.name.localeCompare(b.name)).map(t => <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterWeek} onValueChange={setFilterWeek}>
              <SelectTrigger className="w-32 h-9 rounded-xl bg-white/5 border-white/10 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-2xl">
                <SelectItem value="all">All Weeks</SelectItem>
                {weekOptions.map(w => <SelectItem key={w.value} value={w.value}>{w.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          {displayStats.slice(0, 80).map((s) => (
            <div key={s.id} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
              <div className="flex items-center gap-3">
                {TEAMS[s.team as keyof typeof TEAMS] && (
                  <img src={TEAMS[s.team as keyof typeof TEAMS]} className="w-7 h-7 object-contain flex-shrink-0" alt={s.team} />
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-black uppercase tracking-tight text-sm">{s.playerName}</p>
                    {s.position && (
                      <span className={`text-[8px] font-black px-1.5 py-0.5 rounded ${POSITION_COLORS[s.position] || "bg-white/10 text-white"}`}>{s.position}</span>
                    )}
                    <Badge className="text-[8px] font-black bg-white/10 text-white border-none">W{s.week}</Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground/60">{s.team}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => deleteMutation.mutate(s.id)}
                disabled={deleteMutation.isPending}
                className="h-8 w-8 rounded-lg hover:bg-destructive/10 text-destructive flex-shrink-0"
                data-testid={`button-delete-stat-${s.id}`}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
          {displayStats.length === 0 && (
            <div className="text-center py-12 text-muted-foreground/30 text-sm font-bold uppercase tracking-widest border-2 border-dashed border-white/5 rounded-3xl">
              No stat entries yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────── TEAM OWNERS MANAGER ── */
function TeamOwnersManager() {
  const { toast } = useToast();
  const [editingTeam, setEditingTeam] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const { data: owners = {}, isLoading: ownersLoading } = useQuery<Record<string, string>>({
    queryKey: ["/api/team-owners"],
  });
  const { data: dbTeams = [], isLoading: teamsLoading } = useQuery<Team[]>({
    queryKey: ["/api/teams"],
  });
  const isLoading = ownersLoading || teamsLoading;
  const teamList = [...dbTeams].sort((a, b) => a.name.localeCompare(b.name));

  const saveMutation = useMutation({
    mutationFn: ({ team, owner }: { team: string; owner: string }) =>
      apiRequest("POST", "/api/team-owners", { team, owner }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team-owners"] });
      toast({ title: "Owner updated" });
      setEditingTeam(null);
    },
    onError: () => toast({ title: "Error saving owner", variant: "destructive" }),
  });

  const startEdit = (team: string) => {
    setEditingTeam(team);
    setEditValue(owners[team] || "");
  };

  return (
    <div className="space-y-6">
      <SectionHeader title="Team Owners" subtitle="Set the owner username for each team — shown on Home and Team pages" />
      {isLoading ? (
        <div className="text-center py-10 text-muted-foreground/40 text-sm font-bold uppercase tracking-widest">Loading...</div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {teamList.map((t) => {
            const team = t.name;
            const owner = owners[team] || "";
            const isEditing = editingTeam === team;
            const logo = t.logo || TEAMS[team as keyof typeof TEAMS] || "";
            return (
              <div key={t.id} className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/5" data-testid={`owner-row-${team}`}>
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {logo && (
                    <img src={logo} className="w-8 h-8 object-contain flex-shrink-0" alt={team} />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-black uppercase tracking-tight text-sm truncate">{team}</p>
                    {!isEditing && (
                      <p className={`text-xs font-bold italic ${owner ? "text-primary" : "text-muted-foreground/30"}`}>
                        {owner || "No owner set"}
                      </p>
                    )}
                    {isEditing && (
                      <div className="flex gap-2 mt-2">
                        <Input
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          placeholder="Enter owner username..."
                          className="h-8 rounded-lg bg-white/5 border-white/10 text-sm font-bold"
                          onKeyDown={e => { if (e.key === "Enter") saveMutation.mutate({ team, owner: editValue }); if (e.key === "Escape") setEditingTeam(null); }}
                          autoFocus
                          data-testid={`input-owner-${team}`}
                        />
                        <Button size="sm" onClick={() => saveMutation.mutate({ team, owner: editValue })} disabled={saveMutation.isPending} className="h-8 px-3 rounded-lg" data-testid={`button-save-owner-${team}`}>
                          <Save className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingTeam(null)} className="h-8 px-3 rounded-lg">✕</Button>
                      </div>
                    )}
                  </div>
                </div>
                {!isEditing && (
                  <Button variant="ghost" size="icon" onClick={() => startEdit(team)} className="h-8 w-8 rounded-lg hover:bg-white/10 flex-shrink-0" data-testid={`button-edit-owner-${team}`}>
                    <Edit className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────── SETTINGS MANAGER ── */
function SettingsManager() {
  const { toast } = useToast();
  const { seasons: liveSeasonsData, currentSeasonId } = useSeasonConfig();
  const { config: weekConfig } = useWeekConfig();

  // ── Season config local state ────────────────────────────────────────────
  const [draftSeasons, setDraftSeasons] = useState<{ id: number; name: string }[]>([]);
  const [seasonInit, setSeasonInit] = useState(false);
  const [newSeasonName, setNewSeasonName] = useState("");

  // ── Week config local state ──────────────────────────────────────────────
  const [draftTotalWeeks, setDraftTotalWeeks] = useState<number>(19);
  const [draftWeekNames, setDraftWeekNames] = useState<Record<string, string>>({});
  const [weekInit, setWeekInit] = useState(false);

  // Sync seasons from server (only once until user edits)
  useEffect(() => {
    if (!seasonInit && liveSeasonsData.length > 0) {
      setDraftSeasons(liveSeasonsData.map(s => ({ ...s })));
      setSeasonInit(true);
    }
  }, [liveSeasonsData, seasonInit]);

  // Sync week config from server (only once until user edits)
  useEffect(() => {
    if (!weekInit && weekConfig) {
      setDraftTotalWeeks(weekConfig.totalWeeks);
      setDraftWeekNames({ ...weekConfig.weekNames });
      setWeekInit(true);
    }
  }, [weekConfig, weekInit]);

  // ── Mutations ────────────────────────────────────────────────────────────
  const saveSeasonsMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/settings/season-config", { seasons: draftSeasons }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/season-config"] });
      queryClient.invalidateQueries({ queryKey: ["/api/settings/current-season"] });
      toast({ title: "Seasons saved!" });
    },
    onError: () => toast({ title: "Error saving seasons", variant: "destructive" }),
  });

  const setActiveMutation = useMutation({
    mutationFn: (seasonId: number) =>
      apiRequest("POST", "/api/settings/current-season", { seasonId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/current-season"] });
      toast({ title: "Active season updated!" });
    },
    onError: (err: any) =>
      toast({ title: `Failed: ${err?.message ?? "unknown error"}`, variant: "destructive" }),
  });

  const saveWeeksMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", "/api/settings/week-config", {
        totalWeeks: draftTotalWeeks,
        weekNames: draftWeekNames,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/week-config"] });
      toast({ title: "Week config saved!" });
    },
    onError: () => toast({ title: "Error saving week config", variant: "destructive" }),
  });

  // ── Season helpers ────────────────────────────────────────────────────────
  const addSeason = () => {
    const name = newSeasonName.trim() || `Season ${draftSeasons.length + 1}`;
    const maxId = draftSeasons.reduce((m, s) => Math.max(m, s.id), 0);
    setDraftSeasons(prev => [...prev, { id: maxId + 1, name }]);
    setNewSeasonName("");
  };

  const removeSeason = (id: number) => {
    if (draftSeasons.length <= 1) return;
    setDraftSeasons(prev => prev.filter(s => s.id !== id));
  };

  const updateSeasonName = (id: number, name: string) =>
    setDraftSeasons(prev => prev.map(s => s.id === id ? { ...s, name } : s));

  return (
    <div className="space-y-10">
      <SectionHeader title="Settings" subtitle="Configure seasons, week count, and individual week names" />

      {/* ── SEASON CONFIG ─────────────────────────────────── */}
      <Card className="p-6 bg-white/5 rounded-3xl border-border/40 space-y-6">
        <h3 className="font-black uppercase tracking-widest text-sm flex items-center gap-2">
          <Trophy className="w-4 h-4 text-primary" /> Season Configuration
        </h3>

        {/* Active season selector — operates on the SAVED list from the server */}
        <div className="p-4 bg-primary/5 border border-primary/20 rounded-2xl space-y-2">
          <p className="text-[9px] font-black uppercase tracking-widest text-primary/80">Public Active Season</p>
          <p className="text-xs text-muted-foreground/60">This is what the site shows to visitors. Save seasons first, then change this.</p>
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <Select
              value={String(currentSeasonId)}
              onValueChange={(v) => setActiveMutation.mutate(Number(v))}
              disabled={setActiveMutation.isPending}
            >
              <SelectTrigger className="w-52 h-10 rounded-xl bg-white/5 border-white/10 font-bold" data-testid="select-active-season">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-2xl">
                {liveSeasonsData.map(s => (
                  <SelectItem key={s.id} value={String(s.id)} className="font-bold">
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {setActiveMutation.isPending && (
              <span className="text-xs text-muted-foreground animate-pulse font-bold">Saving…</span>
            )}
          </div>
        </div>

        <div className="border-t border-white/5 pt-4 space-y-3">
          <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">Manage Seasons</p>
          {draftSeasons.map((s) => (
            <div key={s.id} className="flex items-center gap-3 p-3 bg-white/5 rounded-2xl border border-white/5">
              <div className="flex-1">
                <Input
                  value={s.name}
                  onChange={e => updateSeasonName(s.id, e.target.value)}
                  className="h-9 rounded-xl bg-white/5 border-white/10 font-bold text-sm"
                  data-testid={`input-season-name-${s.id}`}
                />
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => removeSeason(s.id)}
                disabled={draftSeasons.length <= 1}
                className="h-8 w-8 rounded-xl hover:bg-destructive/20 hover:text-destructive flex-shrink-0"
                data-testid={`button-remove-season-${s.id}`}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
        </div>

        {/* Add season */}
        <div className="flex gap-2">
          <Input
            value={newSeasonName}
            onChange={e => setNewSeasonName(e.target.value)}
            placeholder="New season name (e.g. Season 3, 2025 Season)…"
            className="h-10 rounded-xl bg-white/5 border-white/10 font-bold text-sm"
            onKeyDown={e => { if (e.key === "Enter") addSeason(); }}
            data-testid="input-new-season-name"
          />
          <Button
            onClick={addSeason}
            variant="outline"
            className="h-10 px-4 rounded-xl border-white/10 hover:bg-white/10 font-black uppercase tracking-widest text-[10px] gap-1.5"
            data-testid="button-add-season"
          >
            <Plus className="w-3.5 h-3.5" /> Add
          </Button>
        </div>

        <Button
          onClick={() => saveSeasonsMutation.mutate()}
          disabled={saveSeasonsMutation.isPending}
          className="h-10 px-6 rounded-xl font-black uppercase tracking-widest text-[10px] gap-2"
          data-testid="button-save-seasons"
        >
          <Save className="w-3.5 h-3.5" />
          {saveSeasonsMutation.isPending ? "Saving…" : "Save Seasons"}
        </Button>
      </Card>

      {/* ── WEEK CONFIG ───────────────────────────────────── */}
      <Card className="p-6 bg-white/5 rounded-3xl border-border/40 space-y-6">
        <h3 className="font-black uppercase tracking-widest text-sm flex items-center gap-2">
          <Calendar className="w-4 h-4 text-primary" /> Week Configuration
        </h3>
        <p className="text-xs text-muted-foreground/60 font-medium">
          Set the total number of weeks and give each week a custom name (e.g. "Playoffs", "Championship").
        </p>

        <div>
          <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-2 block">Total Weeks</Label>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setDraftTotalWeeks(w => Math.max(1, w - 1))}
              className="h-9 w-9 rounded-xl border-white/10"
            >−</Button>
            <span className="font-black text-2xl w-10 text-center tabular-nums">{draftTotalWeeks}</span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setDraftTotalWeeks(w => Math.min(52, w + 1))}
              className="h-9 w-9 rounded-xl border-white/10"
            >+</Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1.5 block">
            Week Names <span className="normal-case text-muted-foreground/40">(leave blank to use default "Week N")</span>
          </Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-80 overflow-y-auto pr-1">
            {Array.from({ length: draftTotalWeeks }, (_, i) => i + 1).map(wk => (
              <div key={wk} className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 w-14 flex-shrink-0">
                  Wk {wk}
                </span>
                <Input
                  value={draftWeekNames[String(wk)] ?? ""}
                  onChange={e => {
                    const val = e.target.value;
                    setDraftWeekNames(prev => {
                      const next = { ...prev };
                      if (val) next[String(wk)] = val;
                      else delete next[String(wk)];
                      return next;
                    });
                  }}
                  placeholder={`Week ${wk}`}
                  className="h-8 rounded-lg bg-white/5 border-white/10 font-bold text-xs"
                  data-testid={`input-week-name-${wk}`}
                />
              </div>
            ))}
          </div>
        </div>

        <Button
          onClick={() => saveWeeksMutation.mutate()}
          disabled={saveWeeksMutation.isPending}
          className="h-10 px-6 rounded-xl font-black uppercase tracking-widest text-[10px] gap-2"
          data-testid="button-save-weeks"
        >
          <Save className="w-3.5 h-3.5" />
          {saveWeeksMutation.isPending ? "Saving…" : "Save Week Config"}
        </Button>
      </Card>
    </div>
  );
}

/* ─────────────────────────────────────── USERS MANAGER ── */
function UsersManager() {
  const { toast } = useToast();
  const { data: users = [] } = useQuery<User[]>({ queryKey: ["/api/users/all"] });

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) => apiRequest("PATCH", `/api/users/${id}/role`, { role }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/users/all"] }); toast({ title: "Role updated" }); },
    onError: () => toast({ title: "Error", variant: "destructive" }),
  });

  return (
    <div className="space-y-6">
      <SectionHeader title="User Management" subtitle="View all users and manage their roles" />
      <div className="space-y-3">
        {users.map((u) => (
          <div key={u.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-5 bg-white/5 rounded-3xl border border-white/5 gap-4" data-testid={`user-row-${u.id}`}>
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <p className="font-black uppercase tracking-tight text-lg">{u.username}</p>
                <Badge className={`text-[9px] font-black border-none capitalize ${(u as any).role === "admin" ? "bg-primary/20 text-primary" : (u as any).role === "streamer" ? "bg-accent/20 text-accent" : "bg-white/10 text-white"}`}>{(u as any).role || "guest"}</Badge>
              </div>
              <div className="flex flex-wrap gap-4 text-xs text-muted-foreground/50">
                <span>ID: <span className="font-mono">{u.id.slice(0, 8)}…</span></span>
                <span>Joined: {u.createdAt ? format(new Date(u.createdAt), "MMM d, yyyy") : "N/A"}</span>
              </div>
            </div>
            <Select value={(u as any).role || "guest"} onValueChange={(role) => updateRoleMutation.mutate({ id: u.id, role })} data-testid={`select-role-${u.id}`}>
              <SelectTrigger className="w-40 h-10 rounded-xl bg-white/5 border-white/10"><SelectValue /></SelectTrigger>
              <SelectContent className="rounded-2xl">
                <SelectItem value="guest">Guest</SelectItem>
                <SelectItem value="streamer">Streamer</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
        ))}
        {users.length === 0 && <div className="text-center py-16 text-muted-foreground/40 text-sm font-bold uppercase tracking-widest">No users found</div>}
      </div>
    </div>
  );
}
