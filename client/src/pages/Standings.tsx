import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useSeasonConfig } from "@/hooks/useSeasonConfig";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, GripVertical, Trophy, Shield, Star, Plus, Pencil, Check, X, Layers } from "lucide-react";
import { TEAMS } from "@/lib/teams";
import { Badge } from "@/components/ui/badge";

interface StandingsEntry {
  id: string;
  rank: number;
  team: string;
  wins: number;
  losses: number;
  pointDifferential?: number;
  division: string;
  manualOrder?: number;
}

interface DivisionItem {
  id: string;
  label: string;
}

interface ConferenceConfig {
  id: string;
  name: string;
  color: string;
  divisions: DivisionItem[];
}

interface DropZone {
  divisionId: string;
  position: "above" | "below";
  targetId: string;
}

const AVAILABLE_TEAMS = Object.keys(TEAMS).sort();

const COLOR_OPTIONS = [
  { value: "blue",   label: "Blue",   cls: "bg-blue-500" },
  { value: "red",    label: "Red",    cls: "bg-red-500" },
  { value: "green",  label: "Green",  cls: "bg-green-500" },
  { value: "purple", label: "Purple", cls: "bg-purple-500" },
  { value: "orange", label: "Orange", cls: "bg-orange-500" },
  { value: "yellow", label: "Yellow", cls: "bg-yellow-500" },
  { value: "pink",   label: "Pink",   cls: "bg-pink-500" },
  { value: "cyan",   label: "Cyan",   cls: "bg-cyan-500" },
];

function confColor(color: string): { text: string; bg: string } {
  const map: Record<string, { text: string; bg: string }> = {
    blue:   { text: "text-blue-500",   bg: "bg-blue-500/5" },
    red:    { text: "text-red-500",    bg: "bg-red-500/5" },
    green:  { text: "text-green-500",  bg: "bg-green-500/5" },
    purple: { text: "text-purple-500", bg: "bg-purple-500/5" },
    orange: { text: "text-orange-500", bg: "bg-orange-500/5" },
    yellow: { text: "text-yellow-500", bg: "bg-yellow-500/5" },
    pink:   { text: "text-pink-500",   bg: "bg-pink-500/5" },
    cyan:   { text: "text-cyan-500",   bg: "bg-cyan-500/5" },
  };
  return map[color] ?? { text: "text-primary", bg: "bg-primary/5" };
}

function makeId(name: string): string {
  return name.trim().replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_]/g, "").toUpperCase();
}

const DEFAULT_CONFIG: ConferenceConfig[] = [
  { id: "AFC", name: "AFC", color: "blue", divisions: [{ id: "AFC_East", label: "East" }, { id: "AFC_West", label: "West" }] },
  { id: "NFC", name: "NFC", color: "red",  divisions: [{ id: "NFC_East", label: "East" }, { id: "NFC_West", label: "West" }] },
];

export default function Standings() {
  const { isAuthenticated, user } = useAuth();
  const { toast } = useToast();
  const { currentSeasonId } = useSeasonConfig();
  const isAdmin = isAuthenticated && (user as any)?.role === "admin";

  const [standings, setStandings] = useState<StandingsEntry[]>([]);
  const [newTeam, setNewTeam] = useState("");
  const [newDivision, setNewDivision] = useState("");
  const [editingPD, setEditingPD] = useState<Record<string, string | number>>({});
  const [draggedTeam, setDraggedTeam] = useState<string | null>(null);
  const [dropZone, setDropZone] = useState<DropZone | null>(null);

  // Division management state
  const [divConfig, setDivConfig] = useState<ConferenceConfig[]>(DEFAULT_CONFIG);
  const [editingConf, setEditingConf] = useState<Record<string, { name?: string; color?: string }>>({});
  const [editingDiv, setEditingDiv] = useState<Record<string, string>>({});
  const [newConfName, setNewConfName] = useState("");
  const [newConfColor, setNewConfColor] = useState("blue");
  const [newDivLabels, setNewDivLabels] = useState<Record<string, string>>({});

  // ── Queries ──────────────────────────────────────────────────────────────
  const { data: dbStandings, isLoading } = useQuery({
    queryKey: ["/api/standings", currentSeasonId],
    queryFn: async () => {
      const res = await fetch(`/api/standings?season=${currentSeasonId}`);
      if (!res.ok) throw new Error("Failed to fetch standings");
      return res.json();
    },
  });

  const { data: rawDivConfig } = useQuery<ConferenceConfig[]>({
    queryKey: ["/api/settings/division-config"],
    queryFn: async () => {
      const res = await fetch("/api/settings/division-config");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  useEffect(() => {
    if (dbStandings) {
      setStandings(
        dbStandings.map((s: any) => ({
          id: s.id,
          rank: 0,
          team: s.team,
          wins: s.wins,
          losses: s.losses,
          pointDifferential: s.pointDifferential,
          division: s.division,
          manualOrder: s.manualOrder,
        }))
      );
    }
  }, [dbStandings]);

  useEffect(() => {
    if (rawDivConfig) setDivConfig(rawDivConfig);
  }, [rawDivConfig]);

  // ── Mutations ─────────────────────────────────────────────────────────────
  const upsertMutation = useMutation({
    mutationFn: async (entry: StandingsEntry) => {
      await apiRequest("POST", "/api/standings", {
        team: entry.team,
        division: entry.division,
        wins: entry.wins,
        losses: entry.losses,
        pointDifferential: entry.pointDifferential,
        manualOrder: entry.manualOrder,
        season: currentSeasonId,
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/standings"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/standings/${id}`, undefined),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/standings"] }),
  });

  const saveDivConfigMutation = useMutation({
    mutationFn: async (config: ConferenceConfig[]) =>
      apiRequest("POST", "/api/settings/division-config", config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/division-config"] });
      toast({ title: "Divisions saved" });
    },
  });

  // ── Helpers ───────────────────────────────────────────────────────────────
  const getDivisionStandings = (division: string) =>
    [...standings]
      .filter((e) => e.division === division)
      .sort((a, b) => (a.manualOrder ?? 999) - (b.manualOrder ?? 999));

  const teamsInConf = (conf: ConferenceConfig) =>
    conf.divisions.reduce((n, d) => n + standings.filter((s) => s.division === d.id).length, 0);

  const addTeam = () => {
    if (!isAdmin || !newTeam.trim() || !newDivision) return;
    const divTeams = standings.filter((s) => s.division === newDivision);
    const maxOrder = divTeams.length > 0 ? Math.max(...divTeams.map((s) => s.manualOrder ?? -1)) : -1;
    const entry: StandingsEntry = {
      id: Date.now().toString(),
      rank: standings.length + 1,
      team: newTeam,
      wins: 0,
      losses: 0,
      pointDifferential: 0,
      division: newDivision,
      manualOrder: maxOrder + 1,
    };
    setStandings([...standings, entry]);
    upsertMutation.mutate(entry);
    setNewTeam("");
  };

  const updateEntry = (id: string, field: string, value: any) => {
    if (!isAdmin) return;
    const updated = standings.map((e) => (e.id === id ? { ...e, [field]: value } : e));
    setStandings(updated);
    const entry = updated.find((e) => e.id === id);
    if (entry) upsertMutation.mutate(entry);
  };

  const deleteEntry = (id: string) => {
    if (!isAdmin) return;
    setStandings(standings.filter((e) => e.id !== id));
    deleteMutation.mutate(id);
  };

  // ── Drag & Drop ───────────────────────────────────────────────────────────
  const handleDragStart = (e: React.DragEvent, teamId: string) => {
    setDraggedTeam(teamId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedTeam || draggedTeam === targetId) return;
    const target = standings.find((s) => s.id === targetId);
    if (!target) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setDropZone({
      divisionId: target.division,
      position: e.clientY < rect.top + rect.height / 2 ? "above" : "below",
      targetId,
    });
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (draggedTeam === targetId || !draggedTeam) return;
    const dragged = standings.find((s) => s.id === draggedTeam);
    const target = standings.find((s) => s.id === targetId);
    if (!dragged || !target || dragged.division !== target.division) { setDropZone(null); return; }
    const items = getDivisionStandings(dragged.division).filter((s) => s.id !== draggedTeam);
    const idx = items.findIndex((s) => s.id === targetId);
    const insert = dropZone?.position === "below" ? idx + 1 : idx;
    items.splice(insert, 0, dragged);
    const reordered = items.map((s, i) => ({ ...s, manualOrder: i }));
    setStandings(standings.map((e) => reordered.find((r) => r.id === e.id) || e));
    reordered.forEach((s) => upsertMutation.mutate(s));
    setDropZone(null);
  };

  // ── Division config helpers ───────────────────────────────────────────────
  const saveConfig = (next: ConferenceConfig[]) => {
    setDivConfig(next);
    saveDivConfigMutation.mutate(next);
  };

  const addConference = () => {
    const name = newConfName.trim();
    if (!name) return;
    const id = makeId(name);
    if (divConfig.some((c) => c.id === id)) {
      toast({ title: "A conference with that name already exists", variant: "destructive" });
      return;
    }
    saveConfig([...divConfig, { id, name, color: newConfColor, divisions: [] }]);
    setNewConfName("");
    setNewConfColor("blue");
  };

  const deleteConference = (confId: string) => {
    const conf = divConfig.find((c) => c.id === confId);
    if (!conf) return;
    if (teamsInConf(conf) > 0) {
      toast({ title: "Remove all teams in this conference first", variant: "destructive" });
      return;
    }
    saveConfig(divConfig.filter((c) => c.id !== confId));
  };

  const commitConfEdit = (confId: string) => {
    const patch = editingConf[confId];
    if (!patch) return;
    saveConfig(divConfig.map((c) => (c.id === confId ? { ...c, ...patch } : c)));
    setEditingConf((prev) => { const n = { ...prev }; delete n[confId]; return n; });
  };

  const addDivision = (confId: string) => {
    const label = (newDivLabels[confId] ?? "").trim();
    if (!label) return;
    const divId = `${confId}_${makeId(label)}`;
    const conf = divConfig.find((c) => c.id === confId);
    if (!conf) return;
    if (conf.divisions.some((d) => d.id === divId)) {
      toast({ title: "Division already exists", variant: "destructive" });
      return;
    }
    saveConfig(divConfig.map((c) => c.id === confId ? { ...c, divisions: [...c.divisions, { id: divId, label }] } : c));
    setNewDivLabels((prev) => ({ ...prev, [confId]: "" }));
  };

  const deleteDivision = (confId: string, divId: string) => {
    if (standings.filter((s) => s.division === divId).length > 0) {
      toast({ title: "Remove all teams in this division first", variant: "destructive" });
      return;
    }
    saveConfig(divConfig.map((c) => c.id === confId ? { ...c, divisions: c.divisions.filter((d) => d.id !== divId) } : c));
  };

  const commitDivEdit = (confId: string, divId: string) => {
    const label = editingDiv[divId];
    if (!label?.trim()) return;
    saveConfig(divConfig.map((c) => c.id === confId
      ? { ...c, divisions: c.divisions.map((d) => d.id === divId ? { ...d, label: label.trim() } : d) }
      : c
    ));
    setEditingDiv((prev) => { const n = { ...prev }; delete n[divId]; return n; });
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 md:p-10 max-w-7xl mx-auto space-y-8 sm:space-y-12">
      <div className="space-y-4">
        <Badge className="bg-primary/10 text-primary border-none font-black uppercase tracking-[0.2em] text-[10px] px-4 py-1.5 rounded-full w-fit">
          League Rankings
        </Badge>
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-black italic uppercase tracking-tighter leading-[0.9]">
          Standings <span className="text-muted-foreground/20">S2</span>
        </h1>
      </div>

      {/* ── Manage Conferences & Divisions (admin) ── */}
      {isAdmin && (
        <Card className="p-8 bg-card/40 backdrop-blur-xl border-border/40 rounded-[32px] space-y-8 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <Layers className="w-24 h-24" />
          </div>
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-6 bg-primary rounded-full" />
            <h2 className="text-xl font-black italic uppercase tracking-tight">Manage Conferences & Divisions</h2>
          </div>

          <div className="space-y-6">
            {divConfig.map((conf) => {
              const { text: confText } = confColor(conf.color);
              const isEditingConf = !!editingConf[conf.id];
              return (
                <div key={conf.id} className="rounded-2xl border border-white/8 bg-white/3 overflow-hidden">
                  {/* Conference header */}
                  <div className="flex items-center gap-3 px-5 py-4 bg-white/3 border-b border-white/8">
                    {isEditingConf ? (
                      <>
                        <Input
                          data-testid={`input-conf-name-${conf.id}`}
                          value={editingConf[conf.id]?.name ?? conf.name}
                          onChange={(e) => setEditingConf((p) => ({ ...p, [conf.id]: { ...p[conf.id], name: e.target.value } }))}
                          className="h-8 w-36 bg-white/5 border-white/10 rounded-xl font-black text-sm"
                        />
                        <Select
                          value={editingConf[conf.id]?.color ?? conf.color}
                          onValueChange={(v) => setEditingConf((p) => ({ ...p, [conf.id]: { ...p[conf.id], color: v } }))}
                        >
                          <SelectTrigger className="h-8 w-28 bg-white/5 border-white/10 rounded-xl text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-2xl border-border/40">
                            {COLOR_OPTIONS.map((c) => (
                              <SelectItem key={c.value} value={c.value}>
                                <div className="flex items-center gap-2">
                                  <div className={`w-3 h-3 rounded-full ${c.cls}`} />
                                  <span>{c.label}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-green-400 hover:text-green-300" onClick={() => commitConfEdit(conf.id)}>
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => setEditingConf((p) => { const n = { ...p }; delete n[conf.id]; return n; })}>
                          <X className="w-4 h-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <span className={`font-black italic uppercase tracking-tight ${confText}`}>{conf.name}</span>
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 ml-1">
                          {conf.divisions.length} division{conf.divisions.length !== 1 ? "s" : ""} · {teamsInConf(conf)} team{teamsInConf(conf) !== 1 ? "s" : ""}
                        </span>
                        <div className="ml-auto flex items-center gap-2">
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-foreground" data-testid={`btn-edit-conf-${conf.id}`} onClick={() => setEditingConf((p) => ({ ...p, [conf.id]: { name: conf.name, color: conf.color } }))}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive" data-testid={`btn-delete-conf-${conf.id}`} onClick={() => deleteConference(conf.id)} disabled={teamsInConf(conf) > 0}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Divisions list */}
                  <div className="p-4 space-y-2">
                    {conf.divisions.map((div) => {
                      const teamCount = standings.filter((s) => s.division === div.id).length;
                      const isEditingThisDiv = div.id in editingDiv;
                      return (
                        <div key={div.id} className="flex items-center gap-3 px-4 py-2 rounded-xl bg-white/3 border border-white/5">
                          <Star className={`w-3 h-3 ${confText} fill-current flex-shrink-0`} />
                          {isEditingThisDiv ? (
                            <>
                              <Input
                                data-testid={`input-div-label-${div.id}`}
                                value={editingDiv[div.id]}
                                onChange={(e) => setEditingDiv((p) => ({ ...p, [div.id]: e.target.value }))}
                                className="h-7 w-28 bg-white/5 border-white/10 rounded-lg font-bold text-xs"
                                onKeyDown={(e) => e.key === "Enter" && commitDivEdit(conf.id, div.id)}
                              />
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-green-400 hover:text-green-300" onClick={() => commitDivEdit(conf.id, div.id)}>
                                <Check className="w-3.5 h-3.5" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground" onClick={() => setEditingDiv((p) => { const n = { ...p }; delete n[div.id]; return n; })}>
                                <X className="w-3.5 h-3.5" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <span className="font-bold text-sm flex-1">{div.label}</span>
                              <span className="text-[10px] text-muted-foreground/40 font-black uppercase tracking-widest">{teamCount} team{teamCount !== 1 ? "s" : ""}</span>
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-foreground" data-testid={`btn-edit-div-${div.id}`} onClick={() => setEditingDiv((p) => ({ ...p, [div.id]: div.label }))}>
                                <Pencil className="w-3 h-3" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive" data-testid={`btn-delete-div-${div.id}`} onClick={() => deleteDivision(conf.id, div.id)} disabled={teamCount > 0} title={teamCount > 0 ? "Remove all teams first" : "Delete division"}>
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </>
                          )}
                        </div>
                      );
                    })}

                    {/* Add division row */}
                    <div className="flex items-center gap-2 pt-1">
                      <Input
                        data-testid={`input-new-div-${conf.id}`}
                        placeholder="New division name…"
                        value={newDivLabels[conf.id] ?? ""}
                        onChange={(e) => setNewDivLabels((p) => ({ ...p, [conf.id]: e.target.value }))}
                        onKeyDown={(e) => e.key === "Enter" && addDivision(conf.id)}
                        className="h-8 bg-white/5 border-white/10 rounded-xl text-sm flex-1"
                      />
                      <Button size="sm" variant="ghost" className="h-8 px-3 text-xs font-black gap-1.5 text-primary hover:text-primary hover:bg-primary/10" data-testid={`btn-add-div-${conf.id}`} onClick={() => addDivision(conf.id)}>
                        <Plus className="w-3.5 h-3.5" />
                        Add
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Add new conference */}
            <div className="flex items-center gap-3 p-4 rounded-2xl border border-dashed border-white/10 bg-white/2">
              <Input
                data-testid="input-new-conf-name"
                placeholder="New conference name…"
                value={newConfName}
                onChange={(e) => setNewConfName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addConference()}
                className="h-10 bg-white/5 border-white/10 rounded-xl flex-1"
              />
              <Select value={newConfColor} onValueChange={setNewConfColor}>
                <SelectTrigger className="h-10 w-32 bg-white/5 border-white/10 rounded-xl text-xs" data-testid="select-new-conf-color">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-border/40">
                  {COLOR_OPTIONS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${c.cls}`} />
                        <span>{c.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button className="h-10 px-5 font-black uppercase tracking-widest text-xs rounded-xl gap-2" data-testid="btn-add-conference" onClick={addConference}>
                <Plus className="w-4 h-4" />
                Add Conference
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* ── Add Team (admin) ── */}
      {isAdmin && (
        <Card className="p-8 bg-card/40 backdrop-blur-xl border-border/40 rounded-[32px] space-y-8 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <Shield className="w-24 h-24" />
          </div>
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-6 bg-accent rounded-full" />
            <h2 className="text-xl font-black italic uppercase tracking-tight">Add Team to Rank</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Team Selection</Label>
              <Select value={newTeam} onValueChange={setNewTeam}>
                <SelectTrigger className="h-12 bg-white/5 border-white/10 rounded-2xl" data-testid="select-new-team">
                  <SelectValue placeholder="Select Team" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-border/40">
                  {AVAILABLE_TEAMS.map((team) => (
                    <SelectItem key={team} value={team} className="rounded-xl">
                      <div className="flex items-center gap-3">
                        <img src={TEAMS[team as keyof typeof TEAMS]} className="w-5 h-5 object-contain" />
                        <span className="font-bold">{team}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Conference Division</Label>
              <Select value={newDivision} onValueChange={setNewDivision}>
                <SelectTrigger className="h-12 bg-white/5 border-white/10 rounded-2xl" data-testid="select-new-division">
                  <SelectValue placeholder="Select Division" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-border/40">
                  {divConfig.map((conf) => {
                    const { text } = confColor(conf.color);
                    return (
                      <div key={conf.id}>
                        <div className={`text-[10px] font-black uppercase tracking-[0.2em] px-4 py-3 ${text}`}>{conf.name}</div>
                        {conf.divisions.map((div) => (
                          <SelectItem key={div.id} value={div.id} className="rounded-xl">{div.label}</SelectItem>
                        ))}
                      </div>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button data-testid="btn-add-team" onClick={addTeam} className="w-full h-12 bg-primary hover:scale-105 transition-transform rounded-2xl font-black uppercase tracking-widest text-xs">
                Add to Rankings
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* ── Standings tables ── */}
      <div className="grid gap-16">
        {divConfig.map((conference) => {
          const { text: confText } = confColor(conference.color);
          return (
            <div key={conference.id} className="space-y-8">
              <div className="flex items-center gap-6">
                <h2 className={`text-4xl font-black italic uppercase tracking-tighter ${confText}`}>
                  {conference.name} <span className="text-foreground/20">Conference</span>
                </h2>
                <div className="flex-1 h-px bg-gradient-to-r from-border/50 to-transparent" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {conference.divisions.map((division) => {
                  const divStandings = getDivisionStandings(division.id);
                  return (
                    <div key={division.id} className="space-y-4">
                      <div className="flex items-center gap-3 px-4">
                        <Star className={`w-4 h-4 ${confText} fill-current`} />
                        <h3 className="text-sm font-black uppercase tracking-[0.3em] text-muted-foreground">{division.label}</h3>
                      </div>

                      <Card className="bg-card/30 backdrop-blur-xl border-border/40 rounded-[32px] overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left">
                            <thead>
                              <tr className="border-b border-border/40 text-[12px] font-black uppercase tracking-[0.2em] text-white bg-white/5">
                                <th className="px-6 py-4 w-16 text-center">#</th>
                                <th className="px-6 py-4">Team</th>
                                <th className="px-6 py-4 text-center">W-L</th>
                                <th className="px-6 py-4 text-center">PD</th>
                                {isAdmin && <th className="px-6 py-4 text-center">Ops</th>}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border/20">
                              {divStandings.length === 0 ? (
                                <tr>
                                  <td colSpan={isAdmin ? 5 : 4} className="px-6 py-8 text-center text-xs font-black uppercase tracking-widest text-muted-foreground/30">
                                    No teams yet
                                  </td>
                                </tr>
                              ) : (
                                divStandings.map((entry, idx) => (
                                  <tr
                                    key={entry.id}
                                    draggable={isAdmin}
                                    onDragStart={(e) => handleDragStart(e, entry.id)}
                                    onDragOver={(e) => handleDragOver(e, entry.id)}
                                    onDrop={(e) => handleDrop(e, entry.id)}
                                    data-testid={`row-standings-${entry.id}`}
                                    className={`group hover:bg-white/5 transition-colors relative ${dropZone?.targetId === entry.id ? "bg-primary/5" : ""}`}
                                  >
                                    <td className="px-6 py-5 text-center font-black italic text-xl text-white/40">
                                      {isAdmin ? (
                                        <div className="flex flex-col items-center gap-1">
                                          <span className="text-sm not-italic text-white">{idx + 1}</span>
                                          <GripVertical className="w-4 h-4 mx-auto opacity-0 group-hover:opacity-100 transition-opacity cursor-grab text-white" />
                                        </div>
                                      ) : (
                                        <span className="text-white">{idx + 1}</span>
                                      )}
                                    </td>
                                    <td className="px-6 py-5">
                                      <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center p-2 group-hover:scale-110 transition-transform">
                                          <img src={TEAMS[entry.team as keyof typeof TEAMS]} className="w-full h-full object-contain drop-shadow-lg" />
                                        </div>
                                        <span className="font-black italic uppercase tracking-tight text-base text-white">{entry.team}</span>
                                      </div>
                                    </td>
                                    <td className="px-6 py-5 text-center">
                                      {isAdmin ? (
                                        <div className="flex items-center justify-center gap-2">
                                          <Input type="number" value={entry.wins} onChange={(e) => updateEntry(entry.id, "wins", parseInt(e.target.value) || 0)} className="w-12 h-8 text-center bg-white/5 border-none font-bold p-0 text-white" data-testid={`input-wins-${entry.id}`} />
                                          <span className="text-white opacity-30">/</span>
                                          <Input type="number" value={entry.losses} onChange={(e) => updateEntry(entry.id, "losses", parseInt(e.target.value) || 0)} className="w-12 h-8 text-center bg-white/5 border-none font-bold p-0 text-white" data-testid={`input-losses-${entry.id}`} />
                                        </div>
                                      ) : (
                                        <span className="font-black tabular-nums text-lg text-white">{entry.wins}-{entry.losses}</span>
                                      )}
                                    </td>
                                    <td className="px-6 py-5 text-center">
                                      {isAdmin ? (
                                        <Input
                                          type="text"
                                          value={editingPD[entry.id] ?? entry.pointDifferential ?? 0}
                                          onChange={(e) => setEditingPD({ ...editingPD, [entry.id]: e.target.value })}
                                          onBlur={(e) => {
                                            const val = parseInt(e.target.value) || 0;
                                            updateEntry(entry.id, "pointDifferential", val);
                                            const n = { ...editingPD };
                                            delete n[entry.id];
                                            setEditingPD(n);
                                          }}
                                          className="w-14 h-8 mx-auto text-center bg-white/5 border-none font-bold p-0 text-white"
                                          data-testid={`input-pd-${entry.id}`}
                                        />
                                      ) : (
                                        <span className={`font-bold tabular-nums text-sm ${(entry.pointDifferential ?? 0) >= 0 ? "text-green-500" : "text-red-500"}`}>
                                          {(entry.pointDifferential ?? 0) > 0 ? "+" : ""}{entry.pointDifferential ?? 0}
                                        </span>
                                      )}
                                    </td>
                                    {isAdmin && (
                                      <td className="px-6 py-5 text-center">
                                        <Button variant="ghost" size="icon" data-testid={`btn-delete-team-${entry.id}`} onClick={() => deleteEntry(entry.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                                          <Trash2 className="w-4 h-4" />
                                        </Button>
                                      </td>
                                    )}
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </Card>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
