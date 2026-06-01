import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Star, Trophy, Shield, Zap, Edit2, Check, X } from "lucide-react";
import { TEAMS } from "@/lib/teams";
import { useSeasonConfig } from "@/hooks/useSeasonConfig";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface Award {
  key: string;
  category: string;
  label: string;
  description: string;
  icon: typeof Trophy;
  color: string;
  accentColor: string;
}

const AWARD_DEFS: Award[] = [
  {
    key: "award_mvp",
    category: "MVP",
    label: "Most Valuable Player",
    description: "The player who had the greatest overall impact on the league this season.",
    icon: Trophy,
    color: "from-yellow-500/20 to-amber-500/10",
    accentColor: "text-yellow-400",
  },
  {
    key: "award_opoy",
    category: "OPOY",
    label: "Offensive Player of the Year",
    description: "The top offensive performer across the entire season.",
    icon: Zap,
    color: "from-primary/20 to-blue-500/10",
    accentColor: "text-primary",
  },
  {
    key: "award_dpoy",
    category: "DPOY",
    label: "Defensive Player of the Year",
    description: "The dominant defensive force who shut down opponents all season.",
    icon: Shield,
    color: "from-red-500/20 to-rose-500/10",
    accentColor: "text-red-400",
  },
];

interface AwardData {
  playerName: string;
  team: string;
  description: string;
}

function AwardCard({ award, data, isAdmin }: { award: Award; data?: AwardData; isAdmin: boolean }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<AwardData>({
    playerName: data?.playerName || "",
    team: data?.team || "",
    description: data?.description || "",
  });
  const { toast } = useToast();

  const Icon = award.icon;
  const teamLogo = form.team ? TEAMS[form.team as keyof typeof TEAMS] : null;

  const saveMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/settings", {
        key: award.key,
        value: JSON.stringify(form),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      setEditing(false);
      toast({ title: `${award.category} updated!` });
    },
    onError: () => {
      toast({ title: "Failed to save", variant: "destructive" });
    },
  });

  const hasWinner = data?.playerName;

  return (
    <div className="relative group">
      <div className={`absolute -inset-1 bg-gradient-to-br ${award.color} blur-2xl opacity-50 group-hover:opacity-80 transition-opacity duration-700`} />
      <Card className="relative bg-card/50 backdrop-blur-3xl border-border/40 rounded-[40px] overflow-hidden p-8 md:p-10 space-y-8">
        {/* Award Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <Badge className={`${award.accentColor} bg-white/5 border-none font-black uppercase tracking-[0.2em] text-[10px] px-4 py-1.5`}>
              <Icon className="w-3.5 h-3.5 mr-2" />
              {award.category}
            </Badge>
            <h2 className="text-2xl md:text-3xl font-black italic uppercase tracking-tighter">{award.label}</h2>
            <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">{award.description}</p>
          </div>
          {isAdmin && !editing && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setForm({ playerName: data?.playerName || "", team: data?.team || "", description: data?.description || "" });
                setEditing(true);
              }}
              className="w-10 h-10 rounded-xl hover:bg-white/10 flex-shrink-0"
            >
              <Edit2 className="w-4 h-4 text-muted-foreground" />
            </Button>
          )}
        </div>

        {editing ? (
          <div className="space-y-4 p-6 bg-white/5 rounded-3xl border border-white/10">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Player Name</Label>
              <Input
                value={form.playerName}
                onChange={(e) => setForm({ ...form, playerName: e.target.value })}
                placeholder="e.g. John Smith"
                className="bg-white/5 border-white/10 rounded-2xl h-11"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Team</Label>
              <Select value={form.team} onValueChange={(v) => setForm({ ...form, team: v })}>
                <SelectTrigger className="bg-white/5 border-white/10 rounded-2xl h-11">
                  <SelectValue placeholder="Select team..." />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-border/40">
                  {Object.keys(TEAMS).sort().map((t) => (
                    <SelectItem key={t} value={t} className="rounded-xl">
                      <div className="flex items-center gap-3">
                        <img src={TEAMS[t as keyof typeof TEAMS]} className="w-5 h-5 object-contain" alt={t} />
                        <span className="font-bold">{t}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Citation / Notes</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Why this player won..."
                className="bg-white/5 border-white/10 rounded-2xl resize-none"
                rows={2}
              />
            </div>
            <div className="flex gap-3">
              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="h-11 rounded-2xl font-black uppercase tracking-widest text-[10px] flex-1">
                <Check className="w-4 h-4 mr-2" />
                Save Award
              </Button>
              <Button variant="ghost" onClick={() => setEditing(false)} className="h-11 rounded-2xl font-black uppercase tracking-widest text-[10px] border border-white/10">
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
            </div>
          </div>
        ) : hasWinner ? (
          <div className="flex items-center gap-6 p-6 bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10">
            {teamLogo && (
              <div className="relative flex-shrink-0">
                <div className={`absolute -inset-3 bg-gradient-to-br ${award.color} blur-xl opacity-60`} />
                <img src={teamLogo} alt={data?.team} className="w-20 h-20 object-contain relative z-10 drop-shadow-2xl" />
              </div>
            )}
            <div className="space-y-2 min-w-0">
              <p className={`text-3xl md:text-4xl font-black italic uppercase tracking-tighter ${award.accentColor}`}>
                {data?.playerName}
              </p>
              <p className="text-sm font-black uppercase tracking-widest text-muted-foreground">{data?.team}</p>
              {data?.description && (
                <p className="text-sm text-muted-foreground leading-relaxed mt-2 italic">"{data.description}"</p>
              )}
            </div>
            <div className="ml-auto flex-shrink-0">
              <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${award.color} border border-white/10 flex items-center justify-center`}>
                <Icon className={`w-8 h-8 ${award.accentColor}`} />
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-4 p-10 bg-white/5 rounded-3xl border-2 border-dashed border-white/10">
            <Icon className={`w-10 h-10 ${award.accentColor} opacity-30`} />
            <div>
              <p className="font-black uppercase tracking-widest text-muted-foreground/50 text-sm">Not Yet Announced</p>
              {isAdmin && (
                <p className="text-[10px] text-muted-foreground/30 mt-1 uppercase tracking-widest">Click edit to set the winner</p>
              )}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

export default function Awards() {
  const { user, isAuthenticated } = useAuth();
  const isAdmin = isAuthenticated && (user as any)?.role === "admin";
  const { currentSeasonName } = useSeasonConfig();

  const { data: settingsArr = [] } = useQuery<{ key: string; value: string }[]>({
    queryKey: ["/api/settings"],
  });

  const settingsMap = settingsArr.reduce((acc: Record<string, string>, s) => {
    acc[s.key] = s.value;
    return acc;
  }, {});

  const parseAward = (key: string): AwardData | undefined => {
    const raw = settingsMap[key];
    if (!raw) return undefined;
    try {
      return JSON.parse(raw);
    } catch {
      return undefined;
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-background to-background">
      <div className="max-w-5xl mx-auto p-6 md:p-10 space-y-12">

        <div className="space-y-4">
          <Badge className="bg-primary/10 text-primary border-none font-black uppercase tracking-[0.2em] text-[10px] px-4 py-1.5 rounded-full w-fit">
            <Star className="w-3.5 h-3.5 mr-2" />
            {currentSeasonName} Honours
          </Badge>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black italic uppercase tracking-tighter leading-[0.9]">
            League <span className="text-primary">Awards</span>
          </h1>
          <p className="text-muted-foreground font-medium max-w-md leading-relaxed">
            The best players in the VFG recognized for their outstanding performance this season.
          </p>
        </div>

        <div className="space-y-8">
          {AWARD_DEFS.map((award) => (
            <AwardCard
              key={award.key}
              award={award}
              data={parseAward(award.key)}
              isAdmin={isAdmin}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
