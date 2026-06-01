import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth } from "date-fns";
import type { UpdatePlan } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarIcon, Wrench, Sparkles, ChevronRight } from "lucide-react";

export default function UpdatePlanner() {
  const { data: plans } = useQuery<UpdatePlan[]>({
    queryKey: ["/api/update-plans"],
  });

  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  const endDate = new Date(2026, 11, 31);
  
  const months: Date[] = [];
  for (let d = new Date(startDate); d <= endDate; d.setMonth(d.getMonth() + 1)) {
    months.push(new Date(d));
  }

  const plansSet = new Set(plans?.map(p => p.updateDate) || []);

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-background to-background">
      <div className="max-w-7xl mx-auto p-6 md:p-10 space-y-12">
        <div className="space-y-4">
          <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-none px-4 py-1.5 text-[11px] font-black uppercase tracking-widest">
            <Wrench className="w-3.5 h-3.5 mr-2" />
            Product Roadmap
          </Badge>
          <h1 className="text-5xl md:text-7xl font-black italic uppercase tracking-tighter leading-[0.9] text-foreground">
            Update <span className="text-primary">Planner</span>
          </h1>
          <p className="text-lg text-muted-foreground font-medium max-w-md leading-relaxed">
            Stay informed about upcoming features, maintenance windows, and league updates.
          </p>
        </div>

        <div className="grid lg:grid-cols-[1fr,350px] gap-12">
          <div className="grid gap-12">
            {months.map((month) => (
              <div key={format(month, "yyyy-MM")} className="space-y-6">
                <h2 className="text-3xl font-black italic uppercase tracking-tighter flex items-center gap-4">
                  <div className="w-1.5 h-8 bg-primary rounded-full" />
                  {format(month, "MMMM yyyy")}
                </h2>
                <Card className="p-8 bg-card/40 backdrop-blur-3xl border-border/40 rounded-[40px]">
                  <div className="grid grid-cols-7 gap-4">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                      <div key={day} className="text-center font-black text-[10px] text-muted-foreground/40 uppercase tracking-widest py-2">
                        {day}
                      </div>
                    ))}
                    {eachDayOfInterval({
                      start: startOfMonth(month),
                      end: endOfMonth(month),
                    }).map((day) => {
                      const dateStr = format(day, "yyyy-MM-dd");
                      const hasUpdate = plansSet.has(dateStr);
                      const isCurrentMonth = isSameMonth(day, month);
                      
                      return (
                        <div
                          key={dateStr}
                          className={`aspect-square flex flex-col items-center justify-center rounded-2xl text-sm font-black transition-all relative group/day ${
                            !isCurrentMonth
                              ? "opacity-10 pointer-events-none"
                              : hasUpdate
                              ? "bg-primary text-primary-foreground shadow-xl shadow-primary/20 scale-105"
                              : "bg-white/5 border border-white/5 hover:border-primary/50 text-foreground/40"
                          }`}
                        >
                          {format(day, "d")}
                          {hasUpdate && (
                            <div className="absolute -top-1 -right-1">
                              <Sparkles className="w-3 h-3 text-white" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </Card>
              </div>
            ))}
          </div>

          <aside className="space-y-8">
            <Card className="p-8 bg-primary rounded-[40px] border-none shadow-2xl shadow-primary/20 overflow-hidden relative group">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white/20 to-transparent" />
              <div className="relative z-10 space-y-6">
                <h3 className="text-2xl font-black italic uppercase tracking-tighter text-white">Planner <br />Legend</h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10">
                    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-white/70">Planned</p>
                      <p className="text-sm font-bold text-white">Update Scheduled</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 p-4 bg-white/5 backdrop-blur-md rounded-2xl border border-white/5">
                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/10" />
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-white/50">Regular</p>
                      <p className="text-sm font-bold text-white/80">Standard Operation</p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            <div className="space-y-4">
              <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground px-4">Latest Notes</h4>
              <Card className="p-6 bg-card/40 backdrop-blur-xl border-border/40 rounded-[32px] space-y-4">
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-primary uppercase tracking-widest">Jan 2026</p>
                  <p className="text-xs font-medium leading-relaxed">Major UI overhaul across all league pages. Deploying performance optimizations for live scores.</p>
                </div>
              </Card>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
