import { useEffect, useRef } from "react";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";

export function useNotifications() {
  const preferences = useUserPreferences();
  const { toast } = useToast();
  const lastCheckRef = useRef<{
    liveGames: Set<string>;
    finalGames: Set<string>;
    gameStates: Map<string, { isLive: boolean; isFinal: boolean }>;
    newsIds: Set<string>;
  }>({ liveGames: new Set(), finalGames: new Set(), gameStates: new Map(), newsIds: new Set() });

  // Fetch games for live/final notifications
  const { data: games = [] } = useQuery({
    queryKey: ["/api/games/all"],
    refetchInterval: 30000, // Check every 30 seconds
  });

  // Fetch news for news notifications
  const { data: news = [] } = useQuery({
    queryKey: ["/api/news"],
    refetchInterval: 30000,
  });

  useEffect(() => {
    if (!games.length) return;

    games.forEach((game: any) => {
      const quarter = game.quarter || "";
      const quarterUpper = quarter.toUpperCase();
      
      // Check if game is final
      const isFinal = game.isFinal || quarterUpper.includes("FINAL") || quarterUpper === "FINAL";
      
      // Check if game is live - has a quarter (1st, 2nd, 3rd, 4th) but NOT final
      const isLive = game.isLive || (
        quarter && 
        !isFinal && 
        (quarter.includes("1st") || quarter.includes("2nd") || quarter.includes("3rd") || quarter.includes("4th"))
      );

      const previousState = lastCheckRef.current.gameStates.get(game.id) || { isLive: false, isFinal: false };
      
      console.log(`[Notification Check] Game: ${game.team1} vs ${game.team2}, Quarter: "${quarter}", isFinal: ${isFinal}, isLive: ${isLive}, Previous: isFinal=${previousState.isFinal}, isLive=${previousState.isLive}`);

      // Notify when game BECOMES final (transition from not final to final)
      if (preferences.notifyGameFinal && isFinal && !previousState.isFinal) {
        console.log(`[FINAL NOTIFICATION] Sending for ${game.team1} vs ${game.team2}`);
        const score = `${game.team1} ${game.team1Score} - ${game.team2} ${game.team2Score}`;
        toast({
          title: "Game Final",
          description: score,
        });
        lastCheckRef.current.finalGames.add(game.id);
      }

      // Notify when game BECOMES live (transition from not live to live)
      if (preferences.notifyGameLive && isLive && !previousState.isLive) {
        console.log(`[LIVE NOTIFICATION] Sending for ${game.team1} vs ${game.team2}`);
        toast({
          title: "Game Live!",
          description: `${game.team1} vs ${game.team2} is now live!`,
        });
        lastCheckRef.current.liveGames.add(game.id);
      }

      // Update the previous state for next check
      lastCheckRef.current.gameStates.set(game.id, { isLive, isFinal });
    });
  }, [games, preferences.notifyGameLive, preferences.notifyGameFinal, toast]);

  useEffect(() => {
    if (!news.length || !preferences.notifyNews) return;

    news.forEach((item: any) => {
      if (!lastCheckRef.current.newsIds.has(item.id)) {
        toast({
          title: "Breaking News",
          description: item.title,
        });
        lastCheckRef.current.newsIds.add(item.id);
      }
    });
  }, [news, preferences.notifyNews, toast]);
}
