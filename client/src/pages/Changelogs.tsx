import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Zap, Bug, Palette, Trash2, Sparkles, Clock } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Changelog } from "@shared/schema";

export default function Changelogs() {
  const { isAuthenticated } = useAuth();

  const { data: dbChangelogs = [], isLoading } = useQuery<Changelog[]>({
    queryKey: ["/api/changelogs"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/changelogs/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/changelogs"] });
    },
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "NEW": return <Plus className="w-3.5 h-3.5" />;
      case "IMPROVED": return <Zap className="w-3.5 h-3.5" />;
      case "FIXED": return <Bug className="w-3.5 h-3.5" />;
      case "DESIGN": return <Palette className="w-3.5 h-3.5" />;
      default: return <Plus className="w-3.5 h-3.5" />;
    }
  };

  const parseStatuses = (statusStr: string): string[] => {
    try {
      const parsed = JSON.parse(statusStr);
      return Array.isArray(parsed) ? parsed : [statusStr];
    } catch {
      return [statusStr];
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-background to-background">
      <div className="max-w-4xl mx-auto p-6 md:p-10 space-y-12">
        <div className="space-y-4">
          <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-none px-4 py-1.5 text-[11px] font-black uppercase tracking-widest">
            <Sparkles className="w-3.5 h-3.5 mr-2" />
            System Updates
          </Badge>
          <h1 className="text-5xl md:text-7xl font-black italic uppercase tracking-tighter leading-[0.9] text-foreground">
            Change<span className="text-primary">logs</span>
          </h1>
          <p className="text-lg text-muted-foreground font-medium max-w-md leading-relaxed">
            Every tweak, fix, and overhaul to the VFG platform.
          </p>
        </div>

        <div className="space-y-10">
          {isLoading ? (
            <div className="space-y-8">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="h-48 rounded-[40px] bg-card/40 animate-pulse" />
              ))}
            </div>
          ) : dbChangelogs.length > 0 ? (
            dbChangelogs.map((changelog) => (
              <Card
                key={changelog.id}
                className="group p-8 md:p-10 bg-card/40 backdrop-blur-3xl border-border/40 hover:bg-card/60 transition-all duration-500 rounded-[40px] relative overflow-hidden"
                data-testid={`card-changelog-${changelog.version}`}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8">
                    <div className="space-y-4">
                      <div className="flex items-center gap-4">
                        <h2 className="text-4xl font-black italic uppercase tracking-tighter text-primary" data-testid={`text-version-${changelog.version}`}>
                          {changelog.version}
                        </h2>
                        <div className="flex flex-wrap gap-2">
                          {parseStatuses(changelog.status).map((s) => (
                            <Badge
                              key={s}
                              variant="outline"
                              className="bg-white/5 border-white/10 text-foreground/70 flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest rounded-full"
                              data-testid={`badge-status-${changelog.version}-${s}`}
                            >
                              {getStatusIcon(s)}
                              {s}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">
                        <Clock className="w-3 h-3" />
                        {changelog.date}
                      </div>
                    </div>
                    {isAuthenticated && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteMutation.mutate(changelog.id)}
                        disabled={deleteMutation.isPending}
                        className="rounded-2xl bg-destructive/10 hover:bg-destructive hover:text-white transition-all"
                        data-testid={`button-delete-${changelog.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>

                  <div className="space-y-6">
                    <div>
                      <h3 className="text-2xl font-black italic uppercase tracking-tight mb-2 group-hover:text-primary transition-colors" data-testid={`text-title-${changelog.version}`}>
                        {changelog.title}
                      </h3>
                      {changelog.description && (
                        <p className="text-muted-foreground font-medium leading-relaxed" data-testid={`text-description-${changelog.version}`}>
                          {changelog.description}
                        </p>
                      )}
                    </div>

                    <div className="p-6 bg-white/5 rounded-3xl border border-white/5">
                      <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground mb-4">What's Included</h4>
                      <ul className="grid gap-3">
                        {JSON.parse(changelog.changes).map((change: string, index: number) => (
                          <li
                            key={index}
                            className="text-sm font-medium flex items-start gap-3"
                            data-testid={`text-change-${changelog.version}-${index}`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5" />
                            <span>{change}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </Card>
            ))
          ) : (
            <Card className="p-20 text-center border-dashed border-2 border-border/40 bg-transparent rounded-[40px]">
              <Sparkles className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
              <p className="text-muted-foreground font-black uppercase tracking-widest text-xs">No updates logged yet</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
