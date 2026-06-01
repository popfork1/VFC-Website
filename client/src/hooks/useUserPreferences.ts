import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export interface UserPreferences {
  id?: string;
  particleEffects?: number;
  darkMode?: boolean;
  compactLayout?: boolean;
  showTeamLogos?: boolean;
  reduceAnimations?: boolean;
  favoriteTeam?: string;
  notifyGameLive?: boolean;
  notifyGameFinal?: boolean;
  notifyNews?: boolean;
}

export function useUserPreferences() {
  const { data: preferences = {} } = useQuery<UserPreferences>({
    queryKey: ["/api/user/preferences"],
    queryFn: async () => {
      try {
        const response = await apiRequest("GET", "/api/user/preferences");
        const data: UserPreferences = await response.json();
        return data;
      } catch (error) {
        return {};
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return preferences;
}
