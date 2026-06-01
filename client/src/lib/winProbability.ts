import type { Game, Standings } from "@shared/schema";

/**
 * Calculate win probability for a team based on multiple factors:
 * - Rankings (derived from standings order)
 * - Point Differential
 * - Schedule Strength (quality of opponents faced)
 * - Win/Loss Record
 * - Current score (during live games)
 * - Quarter progress (game momentum)
 */

interface TeamAnalysis {
  ranking: number;
  winPercentage: number;
  pointDifferential: number;
  scheduleStrength: number;
  totalGamesPlayed: number;
}

function calculateRankings(standings: Standings[]): Map<string, number> {
  const rankings = new Map<string, number>();

  const sortedStandings = [...standings].sort((a, b) => {
    if (a.manualOrder !== null && b.manualOrder !== null && 
        a.manualOrder !== undefined && b.manualOrder !== undefined) {
      return a.manualOrder - b.manualOrder;
    }

    const aWins = a.wins || 0;
    const bWins = b.wins || 0;
    const aLosses = a.losses || 0;
    const bLosses = b.losses || 0;

    const aWinPct = aWins + aLosses > 0 ? aWins / (aWins + aLosses) : 0;
    const bWinPct = bWins + bLosses > 0 ? bWins / (bWins + bLosses) : 0;

    if (bWinPct !== aWinPct) return bWinPct - aWinPct;

    const aPD = a.pointDifferential || 0;
    const bPD = b.pointDifferential || 0;
    return bPD - aPD;
  });

  sortedStandings.forEach((standing, index) => {
    rankings.set(standing.team, index + 1);
  });

  return rankings;
}

function calculateScheduleStrength(
  teamName: string,
  games: Game[],
  standings: Standings[]
): number {
  const completedGames = games.filter(
    g => g.isFinal && (g.team1 === teamName || g.team2 === teamName)
  );
  
  if (completedGames.length === 0) return 0.5;
  
  let totalOpponentWinPct = 0;
  
  completedGames.forEach(game => {
    const opponent = game.team1 === teamName ? game.team2 : game.team1;
    const opponentStanding = standings.find(s => s.team === opponent);
    
    if (opponentStanding) {
      const wins = opponentStanding.wins || 0;
      const losses = opponentStanding.losses || 0;
      const totalGames = wins + losses;
      
      if (totalGames > 0) {
        totalOpponentWinPct += wins / totalGames;
      } else {
        totalOpponentWinPct += 0.5;
      }
    } else {
      totalOpponentWinPct += 0.5;
    }
  });
  
  // Normalize SOS between 0 and 1
  return totalOpponentWinPct / completedGames.length;
}

function analyzeTeam(
  teamName: string,
  standings: Standings[],
  games: Game[],
  rankings: Map<string, number>
): TeamAnalysis {
  const standing = standings.find(s => s.team === teamName);
  const wins = standing?.wins || 0;
  const losses = standing?.losses || 0;
  const totalGames = wins + losses;

  return {
    ranking: rankings.get(teamName) || standings.length,
    winPercentage: totalGames > 0 ? wins / totalGames : 0.5,
    pointDifferential: standing?.pointDifferential || 0,
    scheduleStrength: calculateScheduleStrength(teamName, games, standings),
    totalGamesPlayed: totalGames
  };
}

export function calculateWinProbability(
  game: Game,
  team: "team1" | "team2",
  standings?: Standings[],
  allGames?: Game[]
): number {
  let probability = 50;
  const hasStandings = standings && standings.length > 0;

  if (hasStandings) {
    const games = allGames || [];
    const rankings = calculateRankings(standings!);
    const team1Analysis = analyzeTeam(game.team1, standings!, games, rankings);
    const team2Analysis = analyzeTeam(game.team2, standings!, games, rankings);

    const totalTeams = standings!.length;
    // Ranking Score (normalized 0 to 1)
    const team1RankScore = (totalTeams - team1Analysis.ranking + 1) / totalTeams;
    const team2RankScore = (totalTeams - team2Analysis.ranking + 1) / totalTeams;
    const rankingDiff = team1RankScore - team2RankScore;
    const rankingImpact = rankingDiff * 25; // Weighted 25%

    // Point Differential Score (normalized)
    const pdDifference = team1Analysis.pointDifferential - team2Analysis.pointDifferential;
    const cappedPdDiff = Math.max(-200, Math.min(200, pdDifference));
    const pdImpact = (cappedPdDiff / 200) * 25; // Weighted 25%

    // Record Score (normalized)
    const winPctDiff = team1Analysis.winPercentage - team2Analysis.winPercentage;
    const recordImpact = winPctDiff * 25; // Weighted 25%

    // Schedule Strength Score (normalized)
    const team1SOS = team1Analysis.scheduleStrength;
    const team2SOS = team2Analysis.scheduleStrength;
    let sosImpact = 0;
    if (team1SOS >= 0 && team2SOS >= 0) {
      const sosDiff = team1SOS - team2SOS;
      sosImpact = sosDiff * 25; // Weighted 25%
    }

    // Head-to-Head factor: past completed matchups between these exact two teams
    const h2hGames = games.filter(g =>
      g.isFinal && (
        (g.team1 === game.team1 && g.team2 === game.team2) ||
        (g.team1 === game.team2 && g.team2 === game.team1)
      ) && g.id !== game.id
    );
    let h2hImpact = 0;
    if (h2hGames.length > 0) {
      const team1Wins = h2hGames.filter(g =>
        (g.team1 === game.team1 && (g.team1Score ?? 0) > (g.team2Score ?? 0)) ||
        (g.team2 === game.team1 && (g.team2Score ?? 0) > (g.team1Score ?? 0))
      ).length;
      const team2Wins = h2hGames.length - team1Wins;
      // Each win/loss in H2H is worth up to ±15 total, normalized by games played
      h2hImpact = ((team1Wins - team2Wins) / h2hGames.length) * 15;
    }

    probability = 50 + rankingImpact + pdImpact + recordImpact + sosImpact + h2hImpact;
  }

  // Live game score impact
  const scoreDifference = (game.team1Score || 0) - (game.team2Score || 0);
  const isScheduled = game.quarter === "Scheduled" || !game.quarter;

  if (scoreDifference !== 0 || !isScheduled) {
    const quarterMap: { [key: string]: number } = {
      "1st": 0.2, "Q1": 0.2,
      "2nd": 0.4, "Q2": 0.4,
      "3rd": 0.65, "Q3": 0.65,
      "4th": 0.85, "Q4": 0.85,
      "OT": 0.95, "FINAL": 1.0,
      "Scheduled": 0.1
    };

    const quarterWeight = quarterMap[game.quarter || "Scheduled"] || (isScheduled ? 0.1 : 0.5);
    
    const baseScoreImpact = (scoreDifference / 7) * 35; 
    const blowoutMultiplier = Math.abs(scoreDifference) > 14 ? 1.8 : 1.0;
    const scoreImpact = baseScoreImpact * blowoutMultiplier;
    
    const weightedScoreProb = 50 + scoreImpact;
    probability = (probability * (1 - quarterWeight)) + (weightedScoreProb * quarterWeight);
  }

  probability = Math.max(1, Math.min(99, Math.round(probability)));
  return team === "team1" ? probability : 100 - probability;
}

export function calculateOdds(probability: number): number {
  // Formula: 100 / probability
  // Capped between 1.1x and 10x
  const rawOdds = 100 / Math.max(probability, 1);
  // Ensure we round to 2 decimal places to match display and user expectations
  return Math.max(1.1, Math.min(10, Math.round(rawOdds * 100) / 100));
}


export function getConferenceRanking(teamName: string, standings?: Standings[]): string {
  if (!standings || standings.length === 0) {
    return "N/A";
  }

  const teamStanding = standings.find(s => s.team === teamName);
  if (!teamStanding) {
    return "N/A";
  }

  const allTeams = [...standings].sort((a, b) => {
    if (a.manualOrder !== null && b.manualOrder !== null && 
        a.manualOrder !== undefined && b.manualOrder !== undefined) {
      return a.manualOrder - b.manualOrder;
    }

    const aWins = a.wins || 0;
    const bWins = b.wins || 0;
    const aLosses = a.losses || 0;
    const bLosses = b.losses || 0;

    const aWinPct = aWins + aLosses > 0 ? aWins / (aWins + aLosses) : 0;
    const bWinPct = bWins + bLosses > 0 ? bWins / (bWins + bLosses) : 0;

    if (bWinPct !== aWinPct) return bWinPct - aWinPct;

    const aPD = a.pointDifferential || 0;
    const bPD = b.pointDifferential || 0;
    return bPD - aPD;
  });

  const rank = allTeams.findIndex(s => s.team === teamName) + 1;
  const ordinals = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th", "11th", "12th", "13th", "14th", "15th", "16th"];
  const ordinal = ordinals[rank - 1] || `${rank}th`;

  return `${ordinal} Overall`;
}

export function getWinProbabilityFactors(
  game: Game,
  standings?: Standings[],
  allGames?: Game[]
): {
  team1: TeamAnalysis;
  team2: TeamAnalysis;
  factors: {
    record: { team1Record: string; team2Record: string; advantage: string };
    pointDiff: { team1PD: number; team2PD: number; advantage: string };
    schedule: { team1SOS: number; team2SOS: number; advantage: string };
  };
} | null {
  if (!standings || standings.length === 0) {
    return null;
  }

  const games = allGames || [];
  const rankings = calculateRankings(standings);

  const team1Analysis = analyzeTeam(game.team1, standings, games, rankings);
  const team2Analysis = analyzeTeam(game.team2, standings, games, rankings);

  const standing1 = standings.find(s => s.team === game.team1);
  const standing2 = standings.find(s => s.team === game.team2);

  return {
    team1: team1Analysis,
    team2: team2Analysis,
    factors: {
      record: {
        team1Record: `${standing1?.wins || 0}-${standing1?.losses || 0}`,
        team2Record: `${standing2?.wins || 0}-${standing2?.losses || 0}`,
        advantage: team1Analysis.winPercentage > team2Analysis.winPercentage ? game.team1 :
                   team2Analysis.winPercentage > team1Analysis.winPercentage ? game.team2 : "Even"
      },
      pointDiff: {
        team1PD: team1Analysis.pointDifferential,
        team2PD: team2Analysis.pointDifferential,
        advantage: team1Analysis.pointDifferential > team2Analysis.pointDifferential ? game.team1 :
                   team2Analysis.pointDifferential > team1Analysis.pointDifferential ? game.team2 : "Even"
      },
      schedule: (() => {
        const team1SOS = Math.round(team1Analysis.scheduleStrength * 100);
        const team2SOS = Math.round(team2Analysis.scheduleStrength * 100);
        
        return {
          team1SOS,
          team2SOS,
          advantage: team1Analysis.scheduleStrength > team2Analysis.scheduleStrength ? game.team1 :
                     team2Analysis.scheduleStrength > team1Analysis.scheduleStrength ? game.team2 : "Even"
        };
      })()
    }
  };
}