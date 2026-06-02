import {
  users,
  games,
  news,
  chatMessages,
  pickems,
  pickemRules,
  standings,
  playoffMatches,
  changelogs,
  predictions,
  bracketImages,
  streamRequests,
  settings,
  partners,
  userPreferences,
  updatePlans,
  bets,
  parlays,
  playerStats,
  teams,
  players,
  gamePlays,
  type User,
  type UpsertUser,
  type Game,
  type InsertGame,
  type News,
  type InsertNews,
  type ChatMessage,
  type InsertChatMessage,
  type Pickem,
  type InsertPickem,
  type PickemRules,
  type InsertPickemRules,
  type Standings,
  type InsertStandings,
  type PlayoffMatch,
  type InsertPlayoffMatch,
  type Changelog,
  type InsertChangelog,
  type Prediction,
  type InsertPrediction,
  type BracketImage,
  type InsertBracketImage,
  type StreamRequest,
  type InsertStreamRequest,
  type Settings,
  type InsertSettings,
  type Partner,
  type InsertPartners,
  type UserPreference,
  type InsertUserPreferences,
  type UpdatePlan,
  type InsertUpdatePlan,
  type Bet,
  type InsertBet,
  type Parlay,
  type InsertParlay,
  type PlayerStats,
  type InsertPlayerStats,
  type Team,
  type InsertTeam,
  type Player,
  type InsertPlayer,
  type GamePlay,
  type InsertGamePlay,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql } from "drizzle-orm";
import bcrypt from "bcrypt";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  getAllGames(): Promise<Game[]>;
  getGamesByWeek(week: number): Promise<Game[]>;
  getCurrentWeekGames(): Promise<Game[]>;
  getGame(id: string): Promise<Game | undefined>;
  createGame(game: InsertGame): Promise<Game>;
  updateGame(id: string, game: Partial<Game>): Promise<Game>;
  deleteGame(id: string): Promise<void>;
  
  getAllNews(): Promise<News[]>;
  createNews(news: InsertNews): Promise<News>;
  deleteNews(id: string): Promise<void>;
  
  getChatMessages(gameId?: string, limit?: number): Promise<ChatMessage[]>;
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  
  getAllPickems(): Promise<Pickem[]>;
  getPickemByWeek(week: number): Promise<Pickem | undefined>;
  createPickem(pickem: InsertPickem): Promise<Pickem>;
  deletePickem(id: string): Promise<void>;
  
  getPickemRules(): Promise<PickemRules | undefined>;
  upsertPickemRules(rules: InsertPickemRules): Promise<PickemRules>;
  
  getAllStandings(): Promise<Standings[]>;
  upsertStandings(standing: InsertStandings): Promise<Standings>;
  deleteStandings(id: string): Promise<void>;
  
  getAllPlayoffMatches(): Promise<PlayoffMatch[]>;
  getPlayoffMatchesByRound(round: string): Promise<PlayoffMatch[]>;
  createPlayoffMatch(match: InsertPlayoffMatch): Promise<PlayoffMatch>;
  updatePlayoffMatch(id: string, match: Partial<PlayoffMatch>): Promise<PlayoffMatch>;
  deletePlayoffMatch(id: string): Promise<void>;
  
  getAllChangelogs(): Promise<Changelog[]>;
  createChangelog(changelog: InsertChangelog): Promise<Changelog>;
  deleteChangelog(id: string): Promise<void>;
  
  getPredictionsByGameId(gameId: string): Promise<Prediction[]>;
  getUserPredictionForGame(userId: string, gameId: string): Promise<Prediction | undefined>;
  createPrediction(prediction: InsertPrediction): Promise<Prediction>;
  
  getBracketImage(): Promise<BracketImage | undefined>;
  upsertBracketImage(image: InsertBracketImage): Promise<BracketImage>;
  
  getAllStreamRequests(): Promise<StreamRequest[]>;
  getStreamRequestsByUser(userId: string): Promise<StreamRequest[]>;
  getStreamRequestsByGame(gameId: string): Promise<StreamRequest[]>;
  createStreamRequest(request: InsertStreamRequest): Promise<StreamRequest>;
  updateStreamRequest(id: string, request: Partial<StreamRequest>): Promise<StreamRequest>;
  deleteStreamRequest(id: string): Promise<void>;
  
  getAllUsers(): Promise<User[]>;
  updateUserRole(id: string, role: string): Promise<User>;
  updateUserTourStatus(id: string, completed: boolean): Promise<User>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUserWithPassword(username: string, password: string, role: string): Promise<User>;
  deleteUser(id: string): Promise<void>;
  
  getSetting(key: string): Promise<string | null>;
  setSetting(key: string, value: string): Promise<void>;
  getAllSettings(): Promise<{ key: string; value: string }[]>;

  getAllPartners(): Promise<Partner[]>;
  createPartner(partner: InsertPartners): Promise<Partner>;
  updatePartner(id: string, partner: Partial<Partner>): Promise<Partner>;
  deletePartner(id: string): Promise<void>;

  getUserPreferences(userId: string): Promise<UserPreference | undefined>;
  updateUserPreferences(userId: string, prefs: InsertUserPreferences): Promise<UserPreference>;

  getAllUpdatePlans(): Promise<UpdatePlan[]>;
  getUpdatePlans(year: number): Promise<UpdatePlan[]>;
  upsertUpdatePlan(plan: InsertUpdatePlan): Promise<UpdatePlan>;
  deleteUpdatePlan(id: string): Promise<void>;

  getUserBets(userId: string): Promise<Bet[]>;
  placeBet(bet: InsertBet): Promise<Bet>;
  getUserBalance(userId: string): Promise<number>;
  updateUserBalance(userId: string, amount: number): Promise<User>;
  
  getBracketImages(): Promise<BracketImage[]>;
  createBracketImage(image: InsertBracketImage): Promise<BracketImage>;
  deleteBracketImage(id: string): Promise<void>;

  // Roster management
  getAllTeams(): Promise<Team[]>;
  getAllPlayers(): Promise<Player[]>;
  getTeamPlayers(teamId: string): Promise<Player[]>;
  createTeam(team: InsertTeam): Promise<Team>;
  deleteTeam(id: string): Promise<void>;
  createPlayer(player: InsertPlayer): Promise<Player>;
  deletePlayer(id: string): Promise<void>;

  // Bet resolution
  resolveBetsForGame(gameId: string): Promise<void>;
  unresolveBetsForGame(gameId: string): Promise<void>;
}

// Helper function to convert undefined to null (postgres requires explicit null, not undefined)
function cleanObject(obj: any): any {
  if (obj === undefined) {
    return null;
  }
  if (obj === null) {
    return null;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => cleanObject(item));
  }
  
  if (typeof obj === 'object' && obj.constructor === Object) {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      cleaned[key] = cleanObject(value);
    }
    return cleaned;
  }
  
  return obj;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const cleanData = cleanObject(userData);
    
    // If id is null/undefined, remove it so PostgreSQL uses the default gen_random_uuid()
    if (cleanData.id === null || cleanData.id === undefined) {
      delete cleanData.id;
    }
    
    // If no id, just insert (let DB generate id)
    if (!cleanData.id) {
      const [user] = await db
        .insert(users)
        .values(cleanData as UpsertUser)
        .returning();
      return user;
    }
    
    // With id, use upsert
    // Force coins to be a number if it exists
    if (cleanData.coins !== undefined && cleanData.coins !== null) {
      cleanData.coins = Number(cleanData.coins);
    }

    const [user] = await db
      .insert(users)
      .values(cleanData as UpsertUser)
      .onConflictDoUpdate({
        target: users.id,
        set: cleanData,
      })
      .returning();
    return user;
  }

  async getAllGames(): Promise<Game[]> {
    return await db.select().from(games).orderBy(games.gameTime);
  }

  async getCurrentWeekGames(season?: number): Promise<Game[]> {
    const allGames = await db.select().from(games).orderBy(desc(games.week));
    if (allGames.length === 0) return [];
    
    const targetSeason = season ?? 2;
    const seasonGames = allGames.filter(g => (g.season ?? 1) === targetSeason);
    if (seasonGames.length === 0) return [];

    // 1. If there are live games, show those
    const liveGames = seasonGames.filter(g => g.isLive);
    if (liveGames.length > 0) return liveGames;

    // 2. Group games by week and analyze their status
    const weekMap = seasonGames.reduce((acc, game) => {
      const week = game.week;
      if (!acc[week]) acc[week] = [];
      acc[week].push(game);
      return acc;
    }, {} as Record<number, Game[]>);

    const weeks = Object.keys(weekMap).map(Number).sort((a, b) => a - b);
    
    // 3. Find the first week that has at least one game that is NOT final
    for (const week of weeks) {
      const weekGames = weekMap[week];
      const allFinal = weekGames.every(g => g.isFinal);
      if (!allFinal) {
        return weekGames;
      }
    }

    // 4. If all scheduled weeks are final, show the latest one
    const maxWeek = Math.max(...weeks);
    return weekMap[maxWeek] || [];
  }

  async getGamesByWeek(week: number): Promise<Game[]> {
    // Note: This needs to consider the selected season which is usually passed via query param
    // But since this is a storage method, it returns all for that week across seasons unless filtered later
    return await db
      .select()
      .from(games)
      .where(eq(games.week, week))
      .orderBy(games.gameTime);
  }

  async getGame(id: string): Promise<Game | undefined> {
    const [game] = await db.select().from(games).where(eq(games.id, id));
    return game;
  }

  async createGame(gameData: InsertGame): Promise<Game> {
    const cleanData = cleanObject(gameData);
    if (cleanData.season === undefined || cleanData.season === null) {
      cleanData.season = 2;
    }
    const [game] = await db.insert(games).values(cleanData as InsertGame).returning();
    return game;
  }

  async updateGame(id: string, gameData: Partial<Game>): Promise<Game> {
    const updateData = cleanObject(gameData);
    if (updateData.gameTime && typeof updateData.gameTime === 'string') {
      updateData.gameTime = new Date(updateData.gameTime);
    }
    
    // Ensure ballPosition is handled correctly and mapped to the right field name
    const finalUpdate: any = { ...updateData };
    
    // Log what we received
    console.log(`[STORAGE] Updating game ${id} with:`, JSON.stringify(finalUpdate));
    
    // Handle ballPosition mapping from both camelCase and snake_case
    if (gameData.ballPosition !== undefined) {
      finalUpdate.ballPosition = Number(gameData.ballPosition);
    } else if ((gameData as any).ball_position !== undefined) {
      finalUpdate.ballPosition = Number((gameData as any).ball_position);
    }

    // Explicitly delete ball_position from the object if it's there
    delete finalUpdate.ball_position;

    // VERY IMPORTANT: Drizzle might be expecting the snake_case name for the 'set' object
    // if the schema mapping is being bypassed or if we're using a raw-er update.
    // Let's ensure both fields are set to the same value to be safe.
    if (finalUpdate.ballPosition !== undefined) {
      finalUpdate.ball_position = finalUpdate.ballPosition;
      finalUpdate.ballPosition = finalUpdate.ballPosition; // Redundant but safe
    }

    const [game] = await db
      .update(games)
      .set(finalUpdate)
      .where(eq(games.id, id))
      .returning();
      
    if (!game) {
      throw new Error(`Game with id ${id} not found`);
    }
    
    console.log(`[STORAGE] Game ${id} updated in DB. New ballPosition: ${game.ballPosition}`);
    return game;
  }

  async deleteGame(id: string): Promise<void> {
    await db.delete(bets).where(eq(bets.gameId, id));
    await db.delete(games).where(eq(games.id, id));
  }

  async getAllNews(): Promise<News[]> {
    return await db.select().from(news).orderBy(desc(news.createdAt));
  }

  async createNews(newsData: InsertNews): Promise<News> {
    const [newsItem] = await db.insert(news).values(cleanObject(newsData) as InsertNews).returning();
    return newsItem;
  }

  async deleteNews(id: string): Promise<void> {
    await db.delete(news).where(eq(news.id, id));
  }

  async getChatMessages(gameId?: string, limit: number = 100): Promise<ChatMessage[]> {
    if (gameId) {
      return await db
        .select()
        .from(chatMessages)
        .where(eq(chatMessages.gameId, gameId))
        .orderBy(chatMessages.createdAt)
        .limit(limit);
    }
    return await db
      .select()
      .from(chatMessages)
      .orderBy(chatMessages.createdAt)
      .limit(limit);
  }

  async createChatMessage(messageData: InsertChatMessage): Promise<ChatMessage> {
    const [message] = await db.insert(chatMessages).values(cleanObject(messageData) as InsertChatMessage).returning();
    return message;
  }

  async getAllPickems(): Promise<Pickem[]> {
    return await db.select().from(pickems).orderBy(desc(pickems.week));
  }

  async getPickemByWeek(week: number): Promise<Pickem | undefined> {
    const [pickem] = await db.select().from(pickems).where(eq(pickems.week, week));
    return pickem;
  }

  async createPickem(pickemData: InsertPickem): Promise<Pickem> {
    const [pickem] = await db.insert(pickems).values(cleanObject(pickemData) as InsertPickem).returning();
    return pickem;
  }

  async deletePickem(id: string): Promise<void> {
    await db.delete(pickems).where(eq(pickems.id, id));
  }

  async getPickemRules(): Promise<PickemRules | undefined> {
    const [rules] = await db.select().from(pickemRules).limit(1);
    return rules;
  }

  async upsertPickemRules(rulesData: InsertPickemRules): Promise<PickemRules> {
    const existing = await this.getPickemRules();
    const cleanData = cleanObject(rulesData);
    
    if (existing) {
      const [updated] = await db
        .update(pickemRules)
        .set(cleanData)
        .where(eq(pickemRules.id, existing.id))
        .returning();
      return updated;
    }
    
    const [created] = await db.insert(pickemRules).values(cleanData as InsertPickemRules).returning();
    return created;
  }

  async getAllStandings(): Promise<Standings[]> {
    return await db.select().from(standings).orderBy(standings.division);
  }

  async upsertStandings(standingData: InsertStandings): Promise<Standings> {
    const cleanData = cleanObject(standingData);
    // Only search if we have both team and division
    if (!cleanData.team || !cleanData.division) {
      const [created] = await db.insert(standings).values(cleanData as InsertStandings).returning();
      return created;
    }
    
    const existing = await db
      .select()
      .from(standings)
      .where(and(eq(standings.team, cleanData.team as string), eq(standings.division, cleanData.division as string)));
    
    if (existing.length > 0) {
      const [updated] = await db
        .update(standings)
        .set(cleanData)
        .where(eq(standings.id, existing[0].id))
        .returning();
      return updated;
    }

    const [created] = await db.insert(standings).values(cleanData as InsertStandings).returning();
    return created;
  }

  async deleteStandings(id: string): Promise<void> {
    await db.delete(standings).where(eq(standings.id, id));
  }

  async getAllPlayoffMatches(): Promise<PlayoffMatch[]> {
    return await db.select().from(playoffMatches).orderBy(playoffMatches.round, playoffMatches.matchNumber);
  }

  async getPlayoffMatchesByRound(round: string): Promise<PlayoffMatch[]> {
    return await db.select().from(playoffMatches).where(eq(playoffMatches.round, round)).orderBy(playoffMatches.matchNumber);
  }

  async createPlayoffMatch(matchData: InsertPlayoffMatch): Promise<PlayoffMatch> {
    const [match] = await db.insert(playoffMatches).values(cleanObject(matchData) as InsertPlayoffMatch).returning();
    return match;
  }

  async updatePlayoffMatch(id: string, matchData: Partial<PlayoffMatch>): Promise<PlayoffMatch> {
    const cleanData = cleanObject(matchData);
    const [match] = await db
      .update(playoffMatches)
      .set(cleanData)
      .where(eq(playoffMatches.id, id))
      .returning();
    return match;
  }

  async deletePlayoffMatch(id: string): Promise<void> {
    await db.delete(playoffMatches).where(eq(playoffMatches.id, id));
  }

  async getAllChangelogs(): Promise<Changelog[]> {
    return await db.select().from(changelogs).orderBy(desc(changelogs.createdAt));
  }

  async createChangelog(changelogData: InsertChangelog): Promise<Changelog> {
    const [changelog] = await db.insert(changelogs).values(cleanObject(changelogData) as InsertChangelog).returning();
    return changelog;
  }

  async deleteChangelog(id: string): Promise<void> {
    await db.delete(changelogs).where(eq(changelogs.id, id));
  }

  async getPredictionsByGameId(gameId: string): Promise<Prediction[]> {
    return await db.select().from(predictions).where(eq(predictions.gameId, gameId));
  }

  async getUserPredictionForGame(userId: string, gameId: string): Promise<Prediction | undefined> {
    const [prediction] = await db.select().from(predictions).where(and(eq(predictions.userId, userId), eq(predictions.gameId, gameId)));
    return prediction;
  }

  async createPrediction(predictionData: InsertPrediction): Promise<Prediction> {
    const [prediction] = await db.insert(predictions).values(cleanObject(predictionData) as InsertPrediction).returning();
    return prediction;
  }

  async getBracketImage(): Promise<BracketImage | undefined> {
    const [image] = await db.select().from(bracketImages).limit(1);
    return image;
  }

  async upsertBracketImage(imageData: InsertBracketImage): Promise<BracketImage> {
    const cleanData = cleanObject(imageData);
    const existing = await this.getBracketImage();
    if (existing) {
      const [updated] = await db
        .update(bracketImages)
        .set(cleanData)
        .where(eq(bracketImages.id, existing.id))
        .returning();
      return updated;
    }
    const [created] = await db.insert(bracketImages).values(cleanData as InsertBracketImage).returning();
    return created;
  }

  async getAllStreamRequests(): Promise<StreamRequest[]> {
    return await db.select().from(streamRequests).orderBy(desc(streamRequests.createdAt));
  }

  async getStreamRequestsByUser(userId: string): Promise<StreamRequest[]> {
    return await db.select().from(streamRequests).where(eq(streamRequests.userId, userId)).orderBy(desc(streamRequests.createdAt));
  }

  async getStreamRequestsByGame(gameId: string): Promise<StreamRequest[]> {
    return await db.select().from(streamRequests).where(eq(streamRequests.gameId, gameId)).orderBy(desc(streamRequests.createdAt));
  }

  async createStreamRequest(requestData: InsertStreamRequest): Promise<StreamRequest> {
    const [request] = await db.insert(streamRequests).values(cleanObject(requestData) as InsertStreamRequest).returning();
    return request;
  }

  async updateStreamRequest(id: string, requestData: Partial<StreamRequest>): Promise<StreamRequest> {
    const cleanData = cleanObject(requestData);
    const [request] = await db
      .update(streamRequests)
      .set(cleanData)
      .where(eq(streamRequests.id, id))
      .returning();
    return request;
  }

  async deleteStreamRequest(id: string): Promise<void> {
    await db.delete(streamRequests).where(eq(streamRequests.id, id));
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(users.createdAt);
  }

  async updateUserRole(id: string, role: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set(cleanObject({ role }) as any)
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async updateUserTourStatus(id: string, completed: boolean): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ hasCompletedTour: completed })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(sql`lower(${users.username}) = lower(${username})`);
    return user;
  }

  async createUserWithPassword(username: string, password: string, role: string): Promise<User> {
    const hashedPassword = await bcrypt.hash(password, 12);
    const [user] = await db.insert(users).values(cleanObject({
      username,
      password: hashedPassword,
      firstName: username,
      lastName: "",
      role,
      hasCompletedTour: false,
    }) as any).returning();
    return user;
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  async getSetting(key: string): Promise<string | null> {
    const [result] = await db.select().from(settings).where(eq(settings.key, key));
    return result?.value || null;
  }

  async setSetting(key: string, value: string): Promise<void> {
    const cleanData = cleanObject({ key, value });
    await db
      .insert(settings)
      .values(cleanData as any)
      .onConflictDoUpdate({
        target: settings.key,
        set: { value: cleanData.value },
      });
  }

  async getAllSettings(): Promise<{ key: string; value: string }[]> {
    const rows = await db.select().from(settings);
    return rows.map(r => ({ key: r.key, value: r.value || "" }));
  }

  async getAllPartners(): Promise<Partner[]> {
    return await db.select().from(partners).orderBy(partners.createdAt);
  }

  async createPartner(partnerData: InsertPartners): Promise<Partner> {
    const cleanData = cleanObject(partnerData);
    // Explicitly handle null for imageUrl if it's missing or undefined
    const finalData = {
      ...cleanData,
      imageUrl: cleanData.imageUrl || null
    };
    const [partner] = await db.insert(partners).values(finalData as InsertPartners).returning();
    return partner;
  }

  async updatePartner(id: string, partnerData: Partial<Partner>): Promise<Partner> {
    const cleanData = cleanObject(partnerData);
    const [partner] = await db
      .update(partners)
      .set(cleanData)
      .where(eq(partners.id, id))
      .returning();
    return partner;
  }

  async deletePartner(id: string): Promise<void> {
    await db.delete(partners).where(eq(partners.id, id));
  }

  async getUserPreferences(userId: string): Promise<UserPreference | undefined> {
    const [prefs] = await db.select().from(userPreferences).where(eq(userPreferences.userId, userId));
    return prefs;
  }

  async updateUserPreferences(userId: string, prefsData: InsertUserPreferences): Promise<UserPreference> {
    const cleanData = cleanObject(prefsData);
    const existing = await this.getUserPreferences(userId);
    
    if (existing) {
      const [updated] = await db
        .update(userPreferences)
        .set(cleanData)
        .where(eq(userPreferences.userId, userId))
        .returning();
      return updated;
    }
    
    const [created] = await db.insert(userPreferences).values({ userId, ...cleanData } as InsertUserPreferences).returning();
    return created;
  }

  async getAllUpdatePlans(): Promise<UpdatePlan[]> {
    return await db.select().from(updatePlans).orderBy(updatePlans.updateDate);
  }

  async getUpdatePlans(year: number): Promise<UpdatePlan[]> {
    return await db.select().from(updatePlans).where(sql`EXTRACT(YEAR FROM ${updatePlans.createdAt}) = ${year}`);
  }

  async getAllPlayerStats(): Promise<PlayerStats[]> {
    return await db.select().from(playerStats).orderBy(desc(playerStats.week));
  }

  async getPlayerStatsByWeek(week: number): Promise<PlayerStats[]> {
    return await db.select().from(playerStats).where(eq(playerStats.week, week));
  }

  async createPlayerStats(statsData: InsertPlayerStats): Promise<PlayerStats> {
    const [stats] = await db.insert(playerStats).values(cleanObject(statsData) as InsertPlayerStats).returning();
    return stats;
  }

  async deletePlayerStats(id: string): Promise<void> {
    await db.delete(playerStats).where(eq(playerStats.id, id));
  }

  async getBracketImages(): Promise<BracketImage[]> {
    return await db.select().from(bracketImages).orderBy(bracketImages.updatedAt);
  }

  async createBracketImage(imageData: InsertBracketImage): Promise<BracketImage> {
    const cleanData = cleanObject(imageData);
    const [image] = await db.insert(bracketImages).values(cleanData as InsertBracketImage).returning();
    return image;
  }

  async deleteBracketImage(id: string): Promise<void> {
    await db.delete(bracketImages).where(eq(bracketImages.id, id));
  }

  async upsertUpdatePlan(planData: InsertUpdatePlan): Promise<UpdatePlan> {
    const cleanData = cleanObject(planData);
    const existing = await db.select().from(updatePlans).where(eq(updatePlans.updateDate, cleanData.updateDate as string));
    
    if (existing.length > 0) {
      const [updated] = await db
        .update(updatePlans)
        .set(cleanData)
        .where(eq(updatePlans.id, existing[0].id))
        .returning();
      return updated;
    }
    
    const [created] = await db.insert(updatePlans).values(cleanData as InsertUpdatePlan).returning();
    return created;
  }

  async deleteUpdatePlan(id: string): Promise<void> {
    await db.delete(updatePlans).where(eq(updatePlans.id, id));
  }

  async getAllTeams(): Promise<Team[]> {
    return await db.select().from(teams).orderBy(teams.name);
  }

  async getAllPlayers(): Promise<Player[]> {
    return await db.select().from(players).orderBy(players.name);
  }

  async getTeamPlayers(teamId: string): Promise<Player[]> {
    return await db.select().from(players).where(eq(players.teamId, teamId)).orderBy(players.name);
  }

  async createTeam(teamData: InsertTeam): Promise<Team> {
    const [team] = await db.insert(teams).values(cleanObject(teamData) as InsertTeam).returning();
    return team;
  }

  async deleteTeam(id: string): Promise<void> {
    await db.delete(teams).where(eq(teams.id, id));
  }

  async createPlayer(playerData: InsertPlayer): Promise<Player> {
    const [player] = await db.insert(players).values(cleanObject(playerData) as InsertPlayer).returning();
    return player;
  }

  async deletePlayer(id: string): Promise<void> {
    await db.delete(players).where(eq(players.id, id));
  }

  async getUserBets(userId: string): Promise<Bet[]> {
    return await db.select().from(bets).where(eq(bets.userId, userId)).orderBy(desc(bets.createdAt));
  }

  async placeBet(betData: InsertBet): Promise<Bet> {
    console.log("[STORAGE] Placing bet logic start:", JSON.stringify(betData));
    const user = await this.getUser(betData.userId);
    if (!user) throw new Error("User not found");
    
    const betAmount = Number(betData.amount);
    const userCoins = Number(user.coins ?? 0);
    
    console.log(`[STORAGE] User balance: ${userCoins}, Bet amount: ${betAmount}`);

    if (userCoins < betAmount) {
      throw new Error("Insufficient balance");
    }

    const cleanData = cleanObject(betData);
    cleanData.amount = betAmount;

    if (cleanData.multiplier !== undefined && cleanData.multiplier !== null) {
      cleanData.multiplier = Number(cleanData.multiplier);
    }

    const [bet] = await db.insert(bets).values(cleanData as InsertBet).returning();
    
    // Deduct EXACTLY the bet amount from user balance
    const newBalance = userCoins - betAmount;
    await this.updateUserBalance(betData.userId, newBalance);
    
    console.log(`[STORAGE] Bet placed. New user balance: ${newBalance}`);
    return bet;
  }

  async getUserBalance(userId: string): Promise<number> {
    const user = await this.getUser(userId);
    return user?.coins ?? 0;
  }

  async updateUserBalance(userId: string, amount: number): Promise<User> {
    const numericAmount = Number(amount);
    const [user] = await db
      .update(users)
      .set({ coins: numericAmount })
      .where(eq(users.id, userId))
      .returning();
    
    // If the user being updated is popfork1, ensure it's synced
    console.log(`[STORAGE] Updated balance for ${userId} to ${numericAmount}`);
    return user;
  }

  async addCoins(userId: string, amount: number): Promise<User> {
    const user = await this.getUser(userId);
    if (!user) throw new Error("User not found");

    const [updatedUser] = await db
      .update(users)
      .set({ coins: (user.coins || 0) + amount })
      .where(eq(users.id, userId))
      .returning();
    return updatedUser;
  }

  async removeCoins(userId: string, amount: number): Promise<User> {
    const user = await this.getUser(userId);
    if (!user) throw new Error("User not found");

    const [updatedUser] = await db
      .update(users)
      .set({ coins: Math.max(0, (user.coins || 0) - amount) })
      .where(eq(users.id, userId))
      .returning();
    return updatedUser;
  }

  async resolveBetsForGame(gameId: string): Promise<void> {
    try {
      const game = await this.getGame(gameId);
      if (!game || !game.isFinal) return;

      const winningTeam = game.team1Score! > game.team2Score! ? game.team1 : game.team2;
      const gameBets = await db.select().from(bets).where(eq(bets.gameId, gameId));

      for (const bet of gameBets) {
        const currentlyWon = bet.pickedTeam === winningTeam;
        const newStatus = currentlyWon ? "won" : "lost";

        // If the status is changing (e.g. from won to lost or lost to won)
        if (bet.status !== newStatus) {
          const user = await this.getUser(bet.userId);
          if (user) {
            const multiplier = Number(bet.multiplier);
            const oddsMultiplier = multiplier > 0 ? multiplier / 100 : 1;
            // Total payout = wager * odds (e.g., 100 * 1.5 = 150)
            const totalPayout = Math.floor(Number(bet.amount) * oddsMultiplier);
            let newBalance = user.coins ?? 0;

            if (bet.status === "won" && newStatus === "lost") {
              // Was a win, now a loss: Remove the entire payout that was previously added
              newBalance = Math.max(0, newBalance - totalPayout);
              console.log(`[BET RESOLUTION] Reversing payout for bet ${bet.id}: -${totalPayout}`);
            } else if ((bet.status === "lost" || bet.status === "pending") && newStatus === "won") {
              // Was a loss or pending, now a win: Add the entire payout
              newBalance = newBalance + totalPayout;
              console.log(`[BET RESOLUTION] Paying out bet ${bet.id}: +${totalPayout} (Amount: ${bet.amount}, Multiplier: ${multiplier})`);
            }

            await this.updateUserBalance(bet.userId, newBalance);
          }
          await db.update(bets).set({ won: currentlyWon, status: newStatus }).where(eq(bets.id, bet.id));
        }
      }
    } catch (error) {
      console.error("[BET RESOLUTION] Error resolving bets:", error);
    }
  }

  async unresolveBetsForGame(gameId: string): Promise<void> {
    try {
      const gameBets = await db.select().from(bets).where(eq(bets.gameId, gameId));
      for (const bet of gameBets) {
        if (bet.status === "won") {
          const user = await this.getUser(bet.userId);
          if (user) {
            const multiplier = Number(bet.multiplier);
            const oddsMultiplier = multiplier > 0 ? multiplier / 100 : 1;
            const winnings = Math.floor(Number(bet.amount) * oddsMultiplier);
            await this.updateUserBalance(bet.userId, (user.coins ?? 0) - winnings);
          }
        }
        await db.update(bets).set({ won: null, status: "pending" }).where(eq(bets.id, bet.id));
      }
    } catch (error) {
      console.error("[BET UNRESOLVE] Error unresolving bets:", error);
    }
  }
}

export const storage = new DatabaseStorage();