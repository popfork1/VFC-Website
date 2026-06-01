import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings, Palette, Bell, Heart, Sparkles, Layout, Eye, Zap } from "lucide-react";
import { TEAMS } from "@/lib/teams";
import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";

const AVAILABLE_TEAMS = Object.keys(TEAMS).sort();

interface UserPreferences {
  id?: string;
  darkMode?: boolean;
  compactLayout?: boolean;
  showTeamLogos?: boolean;
  reduceAnimations?: boolean;
  favoriteTeam?: string;
  notifyGameLive?: boolean;
  notifyGameFinal?: boolean;
  notifyNews?: boolean;
}

export default function UserSettings() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [darkMode, setDarkMode] = useState(false);
  const [showLogos, setShowLogos] = useState(true);
  const [reduceAnimations, setReduceAnimations] = useState(false);
  const [favoriteTeam, setFavoriteTeam] = useState("");
  const [notifyLive, setNotifyLive] = useState(true);
  const [notifyFinal, setNotifyFinal] = useState(true);
  const [notifyNews, setNotifyNews] = useState(true);

  const { data: preferences, isLoading } = useQuery<UserPreferences>({
    queryKey: ["/api/user/preferences"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/user/preferences");
      return response.json();
    },
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (preferences) {
      setDarkMode(preferences.darkMode || false);
      setShowLogos(preferences.showTeamLogos !== false);
      setReduceAnimations(preferences.reduceAnimations || false);
      setFavoriteTeam(preferences.favoriteTeam || "");
      setNotifyLive(preferences.notifyGameLive !== false);
      setNotifyFinal(preferences.notifyGameFinal !== false);
      setNotifyNews(preferences.notifyNews !== false);
    }
  }, [preferences]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/user/preferences", {
        darkMode,
        showTeamLogos: showLogos,
        reduceAnimations,
        favoriteTeam: favoriteTeam || null,
        notifyGameLive: notifyLive,
        notifyGameFinal: notifyFinal,
        notifyNews,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/preferences"] });
      toast({ title: "Success", description: "Settings locked in" });
    },
  });

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-background to-background">
      <div className="max-w-4xl mx-auto p-6 md:p-10 space-y-12">
        <div className="space-y-4">
          <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-none px-4 py-1.5 text-[11px] font-black uppercase tracking-widest">
            <Settings className="w-3.5 h-3.5 mr-2" />
            Personalization
          </Badge>
          <h1 className="text-5xl md:text-7xl font-black italic uppercase tracking-tighter leading-[0.9] text-foreground">
            User <span className="text-primary">Settings</span>
          </h1>
          <p className="text-lg text-muted-foreground font-medium max-w-md leading-relaxed">
            Tailor the hub to your viewing preferences and team loyalty.
          </p>
        </div>

        <div className="grid gap-8">
          <Card className="p-8 bg-card/40 backdrop-blur-3xl border-border/40 rounded-[40px] space-y-8">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-6 bg-primary rounded-full" />
              <h2 className="text-xl font-black italic uppercase tracking-tight flex items-center gap-3">
                <Palette className="w-5 h-5" />
                Display Intel
              </h2>
            </div>
            <div className="grid gap-6">
              {[
                { label: "Dark Interface", desc: "Sleek low-light visuals", state: darkMode, setter: setDarkMode },
                { label: "Team Graphics", desc: "Display official logos in feeds", state: showLogos, setter: setShowLogos },
                { label: "High Performance", desc: "Reduce animations for better speed", state: reduceAnimations, setter: setReduceAnimations },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-6 bg-white/5 rounded-3xl border border-white/5">
                  <div>
                    <Label className="font-black uppercase tracking-tight text-sm">{item.label}</Label>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{item.desc}</p>
                  </div>
                  <Switch checked={item.state} onCheckedChange={item.setter} className="data-[state=checked]:bg-primary" />
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-8 bg-card/40 backdrop-blur-3xl border-border/40 rounded-[40px] space-y-8">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-6 bg-primary rounded-full" />
              <h2 className="text-xl font-black italic uppercase tracking-tight flex items-center gap-3">
                <Heart className="w-5 h-5 text-destructive" />
                Allegiance
              </h2>
            </div>
            <div className="space-y-4">
              <Select value={favoriteTeam || "none"} onValueChange={(val) => setFavoriteTeam(val === "none" ? "" : val)}>
                <SelectTrigger className="h-14 bg-white/5 border-none rounded-2xl font-black uppercase tracking-widest text-[10px]">
                  <SelectValue placeholder="Select Your Favorite Team" />
                </SelectTrigger>
                <SelectContent className="bg-card backdrop-blur-3xl border-border/40 rounded-2xl">
                  <SelectItem value="none" className="font-black uppercase tracking-widest text-[10px]">None</SelectItem>
                  {AVAILABLE_TEAMS.map((team) => (
                    <SelectItem key={team} value={team} className="font-black uppercase tracking-widest text-[10px]">
                      {team}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </Card>

          <Button
            size="lg"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="h-16 rounded-[32px] bg-primary text-primary-foreground font-black uppercase tracking-widest text-sm shadow-2xl shadow-primary/20 hover:scale-[1.02] transition-transform"
          >
            {saveMutation.isPending ? "Locking..." : "Lock Settings"}
          </Button>
        </div>
      </div>
    </div>
  );
}
