import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import type { News as NewsType } from "@shared/schema";
import { format } from "date-fns";
import { Plus, AlertCircle, Newspaper, Calendar, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { Badge } from "@/components/ui/badge";

export default function News() {
  const { user } = useAuth();
  const preferences = useUserPreferences();
  const isAdmin = user?.role === "admin";

  const { data: news, isLoading, error } = useQuery<NewsType[]>({
    queryKey: ["/api/news"],
  });

  const sortedNews = news ? [...news].sort((a, b) => {
    if (preferences.favoriteTeam) {
      const aHasFavorite = a.title.includes(preferences.favoriteTeam) || (a.excerpt && a.excerpt.includes(preferences.favoriteTeam));
      const bHasFavorite = b.title.includes(preferences.favoriteTeam) || (b.excerpt && b.excerpt.includes(preferences.favoriteTeam));
      if (aHasFavorite && !bHasFavorite) return -1;
      if (!aHasFavorite && bHasFavorite) return 1;
    }
    return 0;
  }) : [];

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
          <p className="text-xl font-black uppercase tracking-tighter italic">Newsfeed Broken</p>
          <Button onClick={() => window.location.reload()} variant="outline" className="rounded-full">Reload News</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6 md:p-10 max-w-7xl mx-auto space-y-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-4">
          <Badge className="bg-accent/10 text-accent border-none font-black uppercase tracking-[0.2em] text-[10px] px-4 py-1.5 rounded-full w-fit">
            League Press
          </Badge>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black italic uppercase tracking-tighter leading-[0.9]">
            Latest <span className="text-muted-foreground/20">Updates</span>
          </h1>
        </div>
        {isAdmin && (
          <Link href="/admin">
            <Button size="lg" className="h-14 px-8 rounded-full font-black uppercase tracking-widest text-xs bg-accent text-accent-foreground hover:scale-105 transition-transform">
              <Plus className="w-4 h-4 mr-2" />
              Publish Story
            </Button>
          </Link>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-80 rounded-[32px] bg-card/50" />
          ))}
        </div>
      ) : sortedNews.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {sortedNews.map((post) => (
            <Link key={post.id} href={`/news/${post.id}`}>
              <Card className="group p-8 bg-card/40 backdrop-blur-xl border-border/40 hover:bg-card/60 transition-all duration-300 rounded-[32px] h-full flex flex-col cursor-pointer overflow-hidden relative">
                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Newspaper className="w-24 h-24" />
                </div>
                
                <div className="relative z-10 space-y-4 flex-1">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-3 h-3 text-muted-foreground/40" />
                    <span className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-widest">
                      {format(new Date(post.createdAt!), "MMMM d, yyyy")}
                    </span>
                  </div>
                  
                  <h3 className="text-2xl font-black italic uppercase tracking-tight group-hover:text-primary transition-colors leading-[1.1]">
                    {post.title}
                  </h3>
                  
                  {post.excerpt && (
                    <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed opacity-70">
                      {post.excerpt}
                    </p>
                  )}
                </div>

                <div className="pt-8 mt-auto flex items-center justify-between group-hover:translate-x-2 transition-transform">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Read Full Story</span>
                  <ArrowRight className="w-4 h-4 text-primary" />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-32 bg-card/10 rounded-[40px] border border-dashed border-white/5">
          <Newspaper className="w-16 h-16 text-muted-foreground/10 mx-auto mb-6" />
          <h3 className="text-2xl font-black italic uppercase tracking-tighter text-muted-foreground/40">No Stories Published</h3>
          <p className="text-muted-foreground/30 text-[10px] font-black uppercase tracking-widest mt-2">Checking for updates...</p>
        </div>
      )}
    </div>
  );
}
