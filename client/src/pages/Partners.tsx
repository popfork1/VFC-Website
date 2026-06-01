import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import type { Partner } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Heart, Globe, Quote, ArrowUpRight } from "lucide-react";

export default function Partners() {
  const { data: partners = [] } = useQuery<Partner[]>({
    queryKey: ["/api/partners"],
  });

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-background to-background">
      <div className="max-w-7xl mx-auto p-6 md:p-10 space-y-12">
        <div className="space-y-4">
          <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-none px-4 py-1.5 text-[11px] font-black uppercase tracking-widest">
            <Heart className="w-3.5 h-3.5 mr-2" />
            League Sponsors
          </Badge>
          <h1 className="text-5xl md:text-7xl font-black italic uppercase tracking-tighter leading-[0.9] text-foreground">
            Our <span className="text-primary">Partners</span>
          </h1>
          <p className="text-lg text-muted-foreground font-medium max-w-md leading-relaxed">
            The organizations that make VFG football possible.
          </p>
        </div>

        {partners.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {partners.map((partner) => (
              <Card key={partner.id} className="group p-8 bg-card/40 backdrop-blur-xl border-border/40 hover:bg-card/60 transition-all duration-500 rounded-[40px] relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10 space-y-8">
                  {partner.imageUrl && (
                    <div className="relative h-56 rounded-3xl overflow-hidden">
                      <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors duration-500 z-10" />
                      <img 
                        src={partner.imageUrl} 
                        alt={partner.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      />
                    </div>
                  )}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-3xl font-black italic uppercase tracking-tighter group-hover:text-primary transition-colors">{partner.name}</h2>
                      <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all">
                        <ArrowUpRight className="w-5 h-5" />
                      </div>
                    </div>
                    <div className="relative p-6 bg-white/5 rounded-3xl border border-white/5 italic">
                      <Quote className="absolute -top-3 -left-2 w-8 h-8 text-primary/20" />
                      <p className="text-muted-foreground font-medium leading-relaxed relative z-10">
                        {partner.quote}
                      </p>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-20 text-center border-dashed border-2 border-border/40 bg-transparent rounded-[40px]">
            <Globe className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
            <p className="text-muted-foreground font-black uppercase tracking-widest text-xs">
              Partnership applications opening soon
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
