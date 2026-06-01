import { useQuery } from "@tanstack/react-query";

export interface WeekConfig {
  totalWeeks: number;
  weekNames: Record<string, string>;
}

const DEFAULT_CONFIG: WeekConfig = {
  totalWeeks: 19,
  weekNames: {
    "16": "Wildcard",
    "17": "Divisional",
    "18": "Conference Championship",
    "19": "Super Bowl",
  },
};

export function useWeekConfig() {
  const { data } = useQuery<WeekConfig>({
    queryKey: ["/api/settings/week-config"],
    staleTime: 60_000,
  });

  const config = data ?? DEFAULT_CONFIG;

  const weekOptions = [...Array(config.totalWeeks)].map((_, i) => {
    const num = i + 1;
    const label = config.weekNames[String(num)] ?? `Week ${num}`;
    return { value: String(num), label };
  });

  const getWeekLabel = (w: number) =>
    config.weekNames[String(w)] ?? `Week ${w}`;

  return { config, weekOptions, getWeekLabel };
}
