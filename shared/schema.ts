import { sql } from "drizzle-orm";
import {
  pgTable,
  varchar,
  text,
  integer,
  timestamp,
  boolean,
  jsonb,
  index,
  serial,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (required for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table (required for Replit Auth - admin users)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: varchar("username", { length: 100 }).unique(),
  password: varchar("password", { length: 255 }),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  hasCompletedTour: boolean("has_completed_tour").default(false),
  role: varchar("role", { length: 20 }).default("admin"), // "admin" = full access, "streamer" = stream links only
  coins: integer("coins").default(1000),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Games table
export const games = pgTable("games", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  week: integer("week").notNull(),
  season: integer("season").default(2),
  team1: varchar("team1", { length: 100 }).notNull(),
  team2: varchar("team2", { length: 100 }).notNull(),
  team1Score: integer("team1_score").default(0),
  team2Score: integer("team2_score").default(0),
  quarter: varchar("quarter", { length: 20 }).default("Scheduled"), // "Q1", "Q2", "Q3", "Q4", "FINAL", "Scheduled"
  gameTime: timestamp("game_time"),
  location: varchar("location", { length: 200 }),
  isFinal: boolean("is_final").default(false),
  isLive: boolean("is_live").default(false),
  streamLink: text("stream_link"),
  isPrimetime: boolean("is_primetime").default(false),
  team1Odds: integer("team1_odds").default(150), // 1.5x as decimal (150 = 1.50)
  team2Odds: integer("team2_odds").default(150), // 1.5x as decimal (150 = 1.50)
  lastPlay: text("last_play"),
  ballPosition: integer("ball_position").default(50),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertGameSchema = createInsertSchema(games).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  gameTime: z.union([z.string().datetime().transform(s => new Date(s)), z.null(), z.undefined()]).optional(),
});

export type InsertGame = z.infer<typeof insertGameSchema>;
export type Game = typeof games.$inferSelect;

// News/Posts table
export const news = pgTable("news", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title", { length: 300 }).notNull(),
  content: text("content").notNull(),
  excerpt: text("excerpt"),
  authorId: varchar("author_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertNewsSchema = createInsertSchema(news).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertNews = z.infer<typeof insertNewsSchema>;
export type News = typeof news.$inferSelect;

// Chat messages table
export const chatMessages = pgTable("chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: varchar("username", { length: 100 }).notNull(),
  message: text("message").notNull(),
  gameId: varchar("game_id"), // Optional - for game-specific chats
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({
  id: true,
  createdAt: true,
});

export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;

// Pick'ems table
export const pickems = pgTable("pickems", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  week: integer("week").notNull().unique(),
  pickemUrl: text("pickem_url").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPickemSchema = createInsertSchema(pickems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPickem = z.infer<typeof insertPickemSchema>;
export type Pickem = typeof pickems.$inferSelect;

// Pick'em Rules table (single record for official rules)
export const pickemRules = pgTable("pickem_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  content: text("content").notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPickemRulesSchema = createInsertSchema(pickemRules).omit({
  id: true,
  updatedAt: true,
});

export type InsertPickemRules = z.infer<typeof insertPickemRulesSchema>;
export type PickemRules = typeof pickemRules.$inferSelect;

// Standings table
export const standings = pgTable("standings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  team: varchar("team", { length: 100 }).notNull(),
  season: integer("season").default(2),
  division: varchar("division", { length: 10 }).notNull(),
  wins: integer("wins").default(0),
  losses: integer("losses").default(0),
  pointDifferential: integer("point_differential").default(0),
  manualOrder: integer("manual_order"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertStandingsSchema = createInsertSchema(standings).omit({
  id: true,
  updatedAt: true,
});

export type InsertStandings = z.infer<typeof insertStandingsSchema>;
export type Standings = typeof standings.$inferSelect;

// Playoff bracket table
export const playoffMatches = pgTable("playoff_matches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  round: varchar("round", { length: 50 }).notNull(), // "play_in", "wildcard", "divisional", "conference", "super_bowl"
  matchNumber: integer("match_number").notNull(), // 1-8 for play-in, 1-4 for wildcard, etc.
  seed1: integer("seed1"), // seed number (1-12)
  seed2: integer("seed2"),
  team1: varchar("team1", { length: 100 }), // team name
  team2: varchar("team2", { length: 100 }),
  team1Score: integer("team1_score"),
  team2Score: integer("team2_score"),
  winner: varchar("winner", { length: 100 }), // winning team name
  isComplete: boolean("is_complete").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPlayoffMatchSchema = createInsertSchema(playoffMatches).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPlayoffMatch = z.infer<typeof insertPlayoffMatchSchema>;
export type PlayoffMatch = typeof playoffMatches.$inferSelect;

// Changelogs table
export const changelogs = pgTable("changelogs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  version: varchar("version", { length: 20 }).notNull().unique(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  status: text("status").notNull(), // JSON array of statuses: ["NEW", "IMPROVED", "FIXED", "DESIGN"]
  changes: text("changes").notNull(), // JSON array stringified
  date: varchar("date", { length: 50 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertChangelogSchema = createInsertSchema(changelogs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertChangelog = z.infer<typeof insertChangelogSchema>;
export type Changelog = typeof changelogs.$inferSelect;

// Predictions/Votes table
export const predictions = pgTable("predictions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  gameId: varchar("game_id").notNull(),
  userId: varchar("user_id").notNull(),
  votedFor: varchar("voted_for", { length: 100 }).notNull(), // team name
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPredictionSchema = createInsertSchema(predictions).omit({
  id: true,
  createdAt: true,
});

export type InsertPrediction = z.infer<typeof insertPredictionSchema>;
export type Prediction = typeof predictions.$inferSelect;

// Bracket image table
export const bracketImages = pgTable("bracket_images", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  imageUrl: text("image_url").notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertBracketImageSchema = createInsertSchema(bracketImages).omit({
  id: true,
  updatedAt: true,
});

export type InsertBracketImage = z.infer<typeof insertBracketImageSchema>;
export type BracketImage = typeof bracketImages.$inferSelect;

// Stream requests table (for streamer approval workflow)
export const streamRequests = pgTable("stream_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  gameId: varchar("game_id").notNull(),
  userId: varchar("user_id").notNull(),
  streamLink: text("stream_link"),
  status: varchar("status", { length: 20 }).default("pending"), // "pending", "approved", "rejected"
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertStreamRequestSchema = createInsertSchema(streamRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertStreamRequest = z.infer<typeof insertStreamRequestSchema>;
export type StreamRequest = typeof streamRequests.$inferSelect;

// Settings table (for maintenance mode and other app settings)
export const settings = pgTable("settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: varchar("key", { length: 100 }).notNull().unique(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertSettingsSchema = createInsertSchema(settings).omit({
  id: true,
  updatedAt: true,
});

export type InsertSettings = z.infer<typeof insertSettingsSchema>;
export type Settings = typeof settings.$inferSelect;

// Partners table
export const partners = pgTable("partners", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 200 }).notNull(),
  quote: text("quote").notNull(),
  imageUrl: text("image_url"), // Now optional in Zod schema
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPartnersSchema = createInsertSchema(partners).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  imageUrl: z.string().optional().nullable(),
});

export type InsertPartners = z.infer<typeof insertPartnersSchema>;
export type Partner = typeof partners.$inferSelect;

// User Preferences table
export const userPreferences = pgTable("user_preferences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique(),
  particleEffects: integer("particle_effects").default(100), // 0-100
  darkMode: boolean("dark_mode").default(false),
  compactLayout: boolean("compact_layout").default(false),
  showTeamLogos: boolean("show_team_logos").default(true),
  reduceAnimations: boolean("reduce_animations").default(false),
  favoriteTeam: varchar("favorite_team", { length: 100 }),
  notifyGameLive: boolean("notify_game_live").default(true),
  notifyGameFinal: boolean("notify_game_final").default(true),
  notifyNews: boolean("notify_news").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserPreferencesSchema = createInsertSchema(userPreferences).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertUserPreferences = z.infer<typeof insertUserPreferencesSchema>;
export type UserPreference = typeof userPreferences.$inferSelect;

// Update Plans table
export const updatePlans = pgTable("update_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  updateDate: varchar("update_date").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUpdatePlanSchema = createInsertSchema(updatePlans).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertUpdatePlan = z.infer<typeof insertUpdatePlanSchema>;
export type UpdatePlan = typeof updatePlans.$inferSelect;

// Bets table
export const bets = pgTable("bets", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  gameId: varchar("game_id").notNull(),
  amount: integer("amount").notNull(),
  pickedTeam: varchar("picked_team", { length: 100 }).notNull(),
  multiplier: integer("multiplier"), // Store odds as integer (e.g. 150 for 1.50x)
  parlayId: varchar("parlay_id"),
  won: boolean("won"),
  status: text("status").default("pending"), // pending, won, lost
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertBetSchema = createInsertSchema(bets).omit({
  id: true,
  won: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertBet = z.infer<typeof insertBetSchema>;
export type Bet = typeof bets.$inferSelect;

// Parlays table (grouped bets)
export const parlays = pgTable("parlays", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  totalAmount: integer("total_amount").notNull(),
  totalOdds: integer("total_odds").default(1),
  potentialWinnings: integer("potential_winnings").notNull(),
  won: boolean("won"),
  status: varchar("status", { length: 20 }).default("active"), // "active", "won", "lost"
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertParlaySchema = createInsertSchema(parlays).omit({
  id: true,
  won: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertParlay = z.infer<typeof insertParlaySchema>;
export type Parlay = typeof parlays.$inferSelect;

// Player Stats table
export const playerStats = pgTable("player_stats", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  playerName: varchar("player_name", { length: 100 }).notNull(),
  team: varchar("team", { length: 100 }).notNull(),
  position: varchar("position", { length: 10 }).notNull(), // "QB", "WR", "TE", "OL", "DE", "LB", "DB", "S", "K"
  
  // QB Stats
  passingYards: integer("passing_yards").default(0),
  passingTouchdowns: integer("passing_touchdowns").default(0),
  interceptions: integer("interceptions").default(0),
  completions: integer("completions").default(0),
  attempts: integer("attempts").default(0),
  sacks: integer("sacks").default(0),
  
  // RB Stats
  rushingYards: integer("rushing_yards").default(0),
  rushingTouchdowns: integer("rushing_touchdowns").default(0),
  rushingAttempts: integer("rushing_attempts").default(0),
  missedTacklesForced: integer("missed_tackles_forced").default(0),
  
  // WR Stats
  receivingYards: integer("receiving_yards").default(0),
  receivingTouchdowns: integer("receiving_touchdowns").default(0),
  receptions: integer("receptions").default(0),
  targets: integer("targets").default(0),
  yardsAfterCatch: integer("yards_after_catch").default(0),
  
  // DB Stats
  defensiveInterceptions: integer("defensive_interceptions").default(0),
  passesDefended: integer("passes_defended").default(0),
  completionsAllowed: integer("completions_allowed").default(0),
  targetsAllowed: integer("targets_allowed").default(0),
  swats: integer("swats").default(0),
  defensiveTouchdowns: integer("defensive_touchdowns").default(0),
  
  // DEF Stats
  defensiveSacks: integer("defensive_sacks").default(0),
  tackles: integer("tackles").default(0),
  defensiveMisses: integer("defensive_misses").default(0),
  safeties: integer("safeties").default(0),
  
  defensivePoints: integer("defensive_points").default(0),
  week: integer("week").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPlayerStatsSchema = createInsertSchema(playerStats).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPlayerStats = z.infer<typeof insertPlayerStatsSchema>;
export type PlayerStats = typeof playerStats.$inferSelect;

// Teams table
export const teams = pgTable("teams", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 100 }).notNull().unique(),
  logo: text("logo"),
  colors: varchar("colors", { length: 100 }), // e.g., "red,white,blue"
  description: text("description"),
  foundedYear: integer("founded_year"),
  city: varchar("city", { length: 100 }),
  division: varchar("division", { length: 10 }), // "AFC_D1", "AFC_D2", "NFC_D1", "NFC_D2"
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertTeamSchema = createInsertSchema(teams).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertTeam = z.infer<typeof insertTeamSchema>;
export type Team = typeof teams.$inferSelect;

// Players table (for rosters)
export const players = pgTable("players", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 100 }).notNull(),
  number: integer("number"),
  position: varchar("position", { length: 10 }),
  teamId: varchar("team_id").notNull().references(() => teams.id, { onDelete: 'cascade' }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPlayerSchema = createInsertSchema(players).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPlayer = z.infer<typeof insertPlayerSchema>;
export type Player = typeof players.$inferSelect;

// Game Plays table (play-by-play tracking)
export const gamePlays = pgTable("game_plays", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  gameId: varchar("game_id").notNull(),
  quarter: varchar("quarter", { length: 20 }).notNull(), // "Q1", "Q2", "Q3", "Q4"
  playType: varchar("play_type", { length: 50 }).notNull(), // "pass", "rush", "sack", "interception", "touchdown", etc.
  team: varchar("team", { length: 100 }).notNull(), // team that made the play
  playerName: varchar("player_name", { length: 100 }),
  description: text("description").notNull(), // e.g., "Pass completion for 50 yards"
  yardsGained: integer("yards_gained").default(0),
  pointsAdded: integer("points_added").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertGamePlaySchema = createInsertSchema(gamePlays).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertGamePlay = z.infer<typeof insertGamePlaySchema>;
export type GamePlay = typeof gamePlays.$inferSelect;
