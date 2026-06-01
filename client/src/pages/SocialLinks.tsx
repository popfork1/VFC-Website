import React from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link2, Youtube, MessageSquare, Share2, Sparkles, MessageCircle } from "lucide-react";
import { SiDiscord } from "react-icons/si";

interface SocialLink {
  title: string;
  description: string;
  icon: React.ReactNode;
  url: string;
  color: string;
  accent: string;
}

export default function SocialLinks() {
  const socialLinks: SocialLink[] = [
    {
      title: "Discord",
      description: "Join our official community hub to chat with fans and get instant updates.",
      icon: <SiDiscord className="w-10 h-10" />,
      url: "https://discord.gg/xTt9BrCaZF",
      color: "group-hover:text-[#5865F2]",
      accent: "bg-[#5865F2]/10",
    },
    {
      title: "YouTube",
      description: "Catch full game highlights, top plays, and exclusive interviews.",
      icon: <Youtube className="w-10 h-10" />,
      url: "https://www.youtube.com/channel/UC6SHPaaTEucLm6F9PDBjm7Q",
      color: "group-hover:text-[#FF0000]",
      accent: "bg-[#FF0000]/10",
    },
  ];

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-background to-background">
      <div className="max-w-7xl mx-auto p-6 md:p-10 space-y-12">
        
        {/* Header */}
        <div className="space-y-4">
          <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-none px-4 py-1.5 text-[11px] font-black uppercase tracking-widest">
            <Share2 className="w-3.5 h-3.5 mr-2" />
            Stay Connected
          </Badge>
          <h1 className="text-5xl md:text-7xl font-black italic uppercase tracking-tighter leading-[0.9] text-foreground">
            Social <span className="text-primary">Hub</span>
          </h1>
          <p className="text-lg text-muted-foreground font-medium max-w-md leading-relaxed">
            Follow VFG across the web and never miss a single play.
          </p>
        </div>

        {/* Social Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {socialLinks.map((link) => (
            <Card
              key={link.title}
              className="group relative overflow-hidden p-8 md:p-10 bg-card/40 backdrop-blur-3xl border-border/40 hover:bg-card/60 transition-all duration-500 rounded-[40px] cursor-pointer"
              onClick={() => window.open(link.url, "_blank")}
              data-testid={`card-social-${link.title.toLowerCase()}`}
            >
              <div className={`absolute top-0 right-0 w-32 h-32 ${link.accent} blur-[80px] -mr-16 -mt-16 group-hover:blur-[100px] transition-all`} />
              
              <div className="relative z-10 flex flex-col h-full">
                <div className={`mb-8 p-4 w-fit rounded-2xl bg-background/50 border border-border/40 transition-colors ${link.color}`}>
                  {link.icon}
                </div>
                
                <div className="space-y-4 flex-1">
                  <h3 className="text-3xl font-black italic uppercase tracking-tighter" data-testid={`text-${link.title.toLowerCase()}`}>
                    {link.title}
                  </h3>
                  <p className="text-muted-foreground font-medium leading-relaxed max-w-xs">
                    {link.description}
                  </p>
                </div>

                <div className="mt-8 flex items-center justify-between">
                  <Button variant="ghost" className="px-0 font-black uppercase tracking-widest text-[10px] text-primary group-hover:gap-3 transition-all">
                    Visit Channel <Link2 className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Feedback Section */}
        <section className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-primary to-accent opacity-20 blur-3xl group-hover:opacity-30 transition-opacity duration-1000" />
          <Card 
            className="relative overflow-hidden p-8 md:p-12 bg-card/40 backdrop-blur-3xl border-none rounded-[40px] cursor-pointer"
            onClick={() => window.open("https://docs.google.com/forms/d/e/1FAIpQLSeACYEIlsdu900cuQY8REcZXPgI01XQdVJDDR3d-g3r96GO9Q/viewform?usp=dialog", "_blank")}
            data-testid="card-feedback"
          >
            <div className="grid md:grid-cols-2 gap-10 items-center">
              <div className="space-y-6">
                <Badge className="bg-accent/10 text-accent border-none px-4 py-1.5 text-[11px] font-black uppercase tracking-widest">
                  <Sparkles className="w-3.5 h-3.5 mr-2" />
                  We value your input
                </Badge>
                <h2 className="text-4xl font-black italic uppercase tracking-tighter leading-tight">
                  Help us <span className="text-accent">Improve</span>
                </h2>
                <p className="text-muted-foreground font-medium leading-relaxed">
                  Have an idea for a feature or found a bug? Your feedback helps us build the ultimate fan experience.
                </p>
                <Button variant="outline" className="h-12 px-8 rounded-2xl font-black uppercase tracking-widest text-[10px] border-accent/20 hover:bg-accent/5">
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Open Feedback Form
                </Button>
              </div>
              
              <div className="hidden md:flex justify-end">
                <div className="w-48 h-48 bg-accent/20 rounded-full blur-[100px] absolute" />
                <MessageSquare className="w-40 h-40 text-accent/20 relative z-10 -rotate-12" />
              </div>
            </div>
          </Card>
        </section>

      </div>
    </div>
  );
}
