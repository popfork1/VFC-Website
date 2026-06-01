import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { News } from "@shared/schema";
import { format } from "date-fns";
import { ArrowLeft, Newspaper, Clock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function NewsDetail() {
  const [, params] = useRoute("/news/:id");
  const newsId = params?.id;

  const { data: news, isLoading, error } = useQuery<News>({
    queryKey: ["/api/news", newsId],
    enabled: !!newsId,
  });

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="p-12 text-center border-none bg-card/50 backdrop-blur-2xl rounded-[40px] space-y-4">
          <Newspaper className="w-12 h-12 text-destructive mx-auto" />
          <h2 className="text-2xl font-black italic uppercase tracking-tighter">Story Missing</h2>
          <p className="text-muted-foreground font-medium">We couldn't find that intel. Try another story!</p>
          <Link href="/news">
            <Button variant="outline" className="rounded-full font-black uppercase tracking-widest text-[10px]">Back to News</Button>
          </Link>
        </Card>
      </div>
    );
  }

  if (isLoading || !news) {
    return (
      <div className="max-w-4xl mx-auto p-6 md:p-10 space-y-8">
        <Skeleton className="h-10 w-32 rounded-full" />
        <Skeleton className="h-[600px] rounded-[40px]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-background to-background">
      <div className="max-w-4xl mx-auto p-6 md:p-10 space-y-8">
        <Link href="/news">
          <Button variant="ghost" className="group h-10 px-4 rounded-full font-black uppercase tracking-widest text-[10px] border border-border/40 bg-card/40 backdrop-blur-xl hover:bg-card/60 transition-all">
            <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
            Back to News
          </Button>
        </Link>

        <article className="space-y-10">
          <div className="space-y-6">
            <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-none px-4 py-1.5 text-[11px] font-black uppercase tracking-widest">
              <Sparkles className="w-3.5 h-3.5 mr-2" />
              Latest Intel
            </Badge>
            <h1 className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter leading-[0.9] text-foreground" data-testid={`text-detail-title-${news.id}`}>
              {news.title}
            </h1>
            <div className="flex items-center gap-6 text-muted-foreground font-black uppercase tracking-widest text-[10px]">
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5" />
                {format(new Date(news.createdAt!), "MMMM d, yyyy")}
              </div>
              <div className="flex items-center gap-2">
                <Newspaper className="w-3.5 h-3.5" />
                VFG Press
              </div>
            </div>
          </div>

          <Card className="p-8 md:p-12 bg-card/40 backdrop-blur-3xl border-border/40 rounded-[40px] relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div 
              className="prose prose-lg dark:prose-invert max-w-none relative z-10 
                prose-headings:font-black prose-headings:italic prose-headings:uppercase prose-headings:tracking-tighter
                prose-p:font-medium prose-p:leading-relaxed prose-p:text-foreground/80
                prose-strong:text-primary prose-strong:font-black
                dark:text-white" 
              data-testid={`text-detail-content-${news.id}`}
            >
              {news.content}
            </div>
            <div className="absolute -bottom-24 -right-24 text-[300px] opacity-[0.02] select-none font-black italic pointer-events-none">NEWS</div>
          </Card>
        </article>
      </div>
    </div>
  );
}
