import { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, Users, ArrowRight, Shield } from "lucide-react";
import { TEAMS } from "@/lib/teams";
import { Badge } from "@/components/ui/badge";
import type { Team } from "@shared/schema";

export default function Teams() {
  const [searchTerm, setSearchTerm] = useState("");
  const { data: teamList = [], isLoading } = useQuery<Team[]>({ queryKey: ["/api/teams"] });

  const filtered = [...teamList]
    .sort((a, b) => a.name.localeCompare(b.name))
    .filter((team) => team.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const getLogo = (team: Team) => team.logo || TEAMS[team.name as keyof typeof TEAMS] || "";

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-background to-background">
      <div className="max-w-7xl mx-auto p-6 md:p-10 space-y-12">
        <div className="space-y-4">
          <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-none px-4 py-1.5 text-[11px] font-black uppercase tracking-widest">
            <Users className="w-3.5 h-3.5 mr-2" />
            League Roster
          </Badge>
          <h1 className="text-5xl md:text-7xl font-black italic uppercase tracking-tighter leading-[0.9] text-foreground">
            VFC <span className="text-primary">Teams</span>
          </h1>
          <p className="text-lg text-muted-foreground font-medium max-w-md leading-relaxed">
            Explore all VFC teams, their histories, and current active rosters.
          </p>
        </div>

        <div className="relative max-w-xl group">
          <div className="absolute -inset-1 bg-gradient-to-r from-primary to-accent opacity-20 blur-xl group-focus-within:opacity-40 transition-opacity duration-500 rounded-2xl" />
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
            <Input
              placeholder="Search teams by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 h-14 bg-card/40 backdrop-blur-xl border-border/40 rounded-2xl font-medium focus-visible:ring-primary/50 transition-all"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-64 rounded-[40px] bg-card/40 border border-border/40 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filtered.map((team) => {
              const logo = getLogo(team);
              return (
                <Link key={team.id} href={`/teams/${encodeURIComponent(team.name)}`}>
                  <Card className="group p-8 bg-card/40 backdrop-blur-xl border-border/40 hover:bg-card/60 transition-all duration-500 rounded-[40px] cursor-pointer relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative z-10 flex flex-col items-center text-center gap-6">
                      <div className="relative">
                        <div className="absolute -inset-4 bg-primary/10 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                        {logo ? (
                          <img
                            src={logo}
                            alt={team.name}
                            className="w-24 h-24 object-contain relative z-10 group-hover:scale-110 transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-24 h-24 rounded-full bg-white/5 border border-white/10 flex items-center justify-center relative z-10">
                            <Shield className="w-12 h-12 text-muted-foreground/20" />
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <h3 className="font-black italic uppercase tracking-tight text-xl group-hover:text-primary transition-colors">{team.name}</h3>
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">
                          Season 2 Member
                        </p>
                      </div>
                      <div className="pt-4 border-t border-border/20 w-full flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0">
                        View Roster <ArrowRight className="w-3 h-3" />
                      </div>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}

        {!isLoading && filtered.length === 0 && (
          <Card className="p-20 text-center border-dashed border-2 border-border/40 bg-transparent rounded-[40px]">
            <Search className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
            <p className="text-muted-foreground font-black uppercase tracking-widest text-xs">
              {teamList.length === 0 ? "No teams in the league yet — add them in the admin panel." : `No teams found matching "${searchTerm}"`}
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
