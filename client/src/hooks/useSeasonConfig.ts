import { useQuery } from "@tanstack/react-query";

export interface SeasonEntry {
  id: number;
  name: string;
}

export interface CurrentSeason {
  seasonId: number;
  seasonName: string;
}

const DEFAULT_SEASONS: SeasonEntry[] = [
  { id: 1, name: "Season 1" },
  { id: 2, name: "Season 2" },
];

export function useSeasonConfig() {
  const { data: seasons = DEFAULT_SEASONS } = useQuery<SeasonEntry[]>({
    queryKey: ["/api/settings/season-config"],
    staleTime: 30_000,
  });

  const { data: currentSeasonData } = useQuery<CurrentSeason>({
    queryKey: ["/api/settings/current-season"],
    staleTime: 0,
  });

  const currentSeasonId = currentSeasonData?.seasonId ?? 2;
  const currentSeasonName = currentSeasonData?.seasonName ?? `Season ${currentSeasonId}`;

  return { seasons, currentSeasonId, currentSeasonName };
}
