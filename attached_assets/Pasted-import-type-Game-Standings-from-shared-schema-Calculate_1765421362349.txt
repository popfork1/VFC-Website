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
  if (!standings || standings.length === 0) {
    return 50;
  }
  
  const games = allGames || [];
  const rankings = calculateRankings(standings);
  
  const team1Analysis = analyzeTeam(game.team1, standings, games, rankings);
  const team2Analysis = analyzeTeam(game.team2, standings, games, rankings);
  
  let probability = 50;
  
  const totalTeams = standings.length;
  const team1RankScore = (totalTeams - team1Analysis.ranking + 1) / totalTeams;
  const team2RankScore = (totalTeams - team2Analysis.ranking + 1) / totalTeams;
  const rankingDiff = team1RankScore - team2RankScore;
  const rankingImpact = rankingDiff * 25;
  
  const pdDifference = team1Analysis.pointDifferential - team2Analysis.pointDifferential;
  const pdImpact = pdDifference / 15;
  
  const winPctDiff = team1Analysis.winPercentage - team2Analysis.winPercentage;
  const recordImpact = winPctDiff * 30;
  
  const team1SOS = team1Analysis.scheduleStrength;
  const team2SOS = team2Analysis.scheduleStrength;
  
  const team1AdjustedStrength = team1Analysis.winPercentage * (0.8 + team1SOS * 0.4);
  const team2AdjustedStrength = team2Analysis.winPercentage * (0.8 + team2SOS * 0.4);
  const sosAdjustedDiff = team1AdjustedStrength - team2AdjustedStrength;
  const sosImpact = sosAdjustedDiff * 15;
  
  const hasGames1 = team1Analysis.totalGamesPlayed > 0;
  const hasGames2 = team2Analysis.totalGamesPlayed > 0;
  
  if (hasGames1 && hasGames2) {
    probability += rankingImpact * 0.25;
    probability += pdImpact * 0.25;
    probability += recordImpact * 0.25;
    probability += sosImpact * 0.25;
  } else if (hasGames1 || hasGames2) {
    probability += rankingImpact * 0.4;
    probability += pdImpact * 0.3;
    probability += recordImpact * 0.3;
  } else {
    probability += rankingImpact * 0.5;
    probability += pdImpact * 0.5;
  }
  
  if (game.quarter && game.quarter !== "Scheduled") {
    const scoreDifference = (game.team1Score || 0) - (game.team2Score || 0);
    
    const quarterMap: { [key: string]: number } = {
      "1st": 0.25,
      "2nd": 0.45,
      "3rd": 0.7,
      "4th": 0.9,
      "OT": 0.95,
      "Q1": 0.25,
      "Q2": 0.45,
      "Q3": 0.7,
      "Q4": 0.9,
    };
    
    const quarterWeight = quarterMap[game.quarter] || 0.5;
    
    const scoreImpact = (scoreDifference / 7) * 12 * quarterWeight;
    
    const preGameWeight = 1 - quarterWeight;
    probability = (probability * preGameWeight) + (50 + scoreImpact) * quarterWeight;
  }
  
  probability = Math.max(1, Math.min(99, Math.round(probability)));
  
  if (team === "team1") {
    return probability;
  } else {
    return 100 - probability;
  }
}

export function getWinProbabilityFactors(
  game: Game,
  standings?: Standings[],
  allGames?: Game[]
): {
  team1: TeamAnalysis;
  team2: TeamAnalysis;
  factors: {
    ranking: { team1Rank: number; team2Rank: number; advantage: string };
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
      ranking: {
        team1Rank: team1Analysis.ranking,
        team2Rank: team2Analysis.ranking,
        advantage: team1Analysis.ranking < team2Analysis.ranking ? game.team1 :
                   team2Analysis.ranking < team1Analysis.ranking ? game.team2 : "Even"
      },
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
      schedule: {
        team1SOS: Math.round(team1Analysis.scheduleStrength * 100),
        team2SOS: Math.round(team2Analysis.scheduleStrength * 100),
        advantage: team1Analysis.scheduleStrength > team2Analysis.scheduleStrength ? game.team1 :
                   team2Analysis.scheduleStrength > team1Analysis.scheduleStrength ? game.team2 : "Even"
      }
    }
  };
}