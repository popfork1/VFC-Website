import { type Server } from "node:http";

import express, {
  type Express,
  type Request,
  Response,
  NextFunction,
} from "express";

import { registerRoutes } from "./routes";
import { db, rawSql } from "./db";
import { games, news, chatMessages, pickems, pickemRules, standings, playoffMatches, sessions } from "@shared/schema";

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export const app = express();

declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown
  }
}
app.use(express.json({
  limit: '50mb',
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

export default async function runApp(
  setup: (app: Express, server: Server) => Promise<void>,
) {
  // Auto-initialize database schema if tables don't exist (for Render compatibility)
  try {
    // Run migrations in both dev and production
    console.log('Initializing database schema...');
      
      // Create sessions table
      await rawSql`
        CREATE TABLE IF NOT EXISTS sessions (
          sid VARCHAR PRIMARY KEY,
          sess JSONB NOT NULL,
          expire TIMESTAMP NOT NULL
        )
      `;
      
      // Create users table
      await rawSql`
        CREATE TABLE IF NOT EXISTS users (
          id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
          username VARCHAR(100) UNIQUE,
          password VARCHAR(255),
          email VARCHAR UNIQUE,
          first_name VARCHAR,
          last_name VARCHAR,
          profile_image_url VARCHAR,
          has_completed_tour BOOLEAN DEFAULT false,
          has_seen_christmas_popup BOOLEAN DEFAULT false,
          has_seen_new_year_popup BOOLEAN DEFAULT false,
          role VARCHAR(20) DEFAULT 'admin',
          coins INTEGER DEFAULT 1000,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `;
      
      // Create games table
      await rawSql`
        CREATE TABLE IF NOT EXISTS games (
          id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
          week INTEGER NOT NULL,
          team1 VARCHAR(100) NOT NULL,
          team2 VARCHAR(100) NOT NULL,
          team1_score INTEGER DEFAULT 0,
          team2_score INTEGER DEFAULT 0,
          quarter VARCHAR(20) DEFAULT 'Scheduled',
          game_time TIMESTAMP,
          location VARCHAR(200),
          is_final BOOLEAN DEFAULT false,
          is_live BOOLEAN DEFAULT false,
          stream_link TEXT,
          is_primetime BOOLEAN DEFAULT false,
          team1_odds INTEGER DEFAULT 150,
          team2_odds INTEGER DEFAULT 150,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `;
      
      // Create news table
      await rawSql`
        CREATE TABLE IF NOT EXISTS news (
          id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
          title VARCHAR(300) NOT NULL,
          content TEXT NOT NULL,
          excerpt TEXT,
          author_id VARCHAR NOT NULL,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `;
      
      // Create chat_messages table
      await rawSql`
        CREATE TABLE IF NOT EXISTS chat_messages (
          id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
          username VARCHAR(100) NOT NULL,
          message TEXT NOT NULL,
          game_id VARCHAR,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `;
      
      // Create pickems table
      await rawSql`
        CREATE TABLE IF NOT EXISTS pickems (
          id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
          week INTEGER NOT NULL UNIQUE,
          pickem_url TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `;
      
      // Create pickem_rules table
      await rawSql`
        CREATE TABLE IF NOT EXISTS pickem_rules (
          id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
          content TEXT NOT NULL,
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `;
      
      // Create standings table
      await rawSql`
        CREATE TABLE IF NOT EXISTS standings (
          id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
          team VARCHAR(100) NOT NULL,
          division VARCHAR(10) NOT NULL,
          wins INTEGER DEFAULT 0,
          losses INTEGER DEFAULT 0,
          point_differential INTEGER DEFAULT 0,
          manual_order INTEGER,
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `;
      
      // Migrate standings table: rename ties to point_differential if needed
      try {
        await rawSql`
          ALTER TABLE standings RENAME COLUMN ties TO point_differential
        `;
        console.log('Migrated standings table: ties → point_differential');
      } catch (err: any) {
        // Column already renamed or doesn't exist - that's fine, ignore silently
      }
      
      // Add manual_order column if it doesn't exist
      try {
        await rawSql`
          ALTER TABLE standings ADD COLUMN manual_order INTEGER
        `;
        console.log('Added manual_order column to standings table');
      } catch (err: any) {
        // Column might already exist - that's fine, ignore silently
      }
      
      // Create playoff_matches table
      await rawSql`
        CREATE TABLE IF NOT EXISTS playoff_matches (
          id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
          round VARCHAR(50) NOT NULL,
          match_number INTEGER NOT NULL,
          seed1 INTEGER,
          seed2 INTEGER,
          team1 VARCHAR(100),
          team2 VARCHAR(100),
          team1_score INTEGER,
          team2_score INTEGER,
          winner VARCHAR(100),
          is_complete BOOLEAN DEFAULT false,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `;
      
      // Create changelogs table
      await rawSql`
        CREATE TABLE IF NOT EXISTS changelogs (
          id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
          version VARCHAR(20) NOT NULL UNIQUE,
          title VARCHAR(200) NOT NULL,
          description TEXT,
          status TEXT NOT NULL,
          changes TEXT NOT NULL,
          date VARCHAR(50) NOT NULL,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `;
      
      // Create predictions table
      await rawSql`
        CREATE TABLE IF NOT EXISTS predictions (
          id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
          game_id VARCHAR NOT NULL,
          user_id VARCHAR NOT NULL,
          voted_for VARCHAR(100) NOT NULL,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `;
      
      // Add user_id column to existing predictions tables (if table exists but column doesn't)
      try {
        await rawSql`
          ALTER TABLE predictions
          ADD COLUMN user_id VARCHAR NOT NULL DEFAULT 'unknown'
        `;
      } catch (err) {
        // Column likely already exists, continue
      }
      
      // Add coins column to users table if it doesn't exist
      try {
        await rawSql`
          ALTER TABLE users
          ADD COLUMN coins INTEGER DEFAULT 1000
        `;
        console.log('Added coins column to users table');
      } catch (err) {
        // Column likely already exists, continue
      }
      
      // Add team1_odds and team2_odds columns to games table if they don't exist
      try {
        await rawSql`
          ALTER TABLE games
          ADD COLUMN team1_odds INTEGER DEFAULT 150
        `;
        console.log('Added team1_odds column to games table');
      } catch (err) {
        // Column likely already exists, continue
      }
      
      try {
        await rawSql`
          ALTER TABLE games
          ADD COLUMN team2_odds INTEGER DEFAULT 150
        `;
        console.log('Added team2_odds column to games table');
      } catch (err) {
        // Column likely already exists, continue
      }
      
      // Create bracket_images table
      await rawSql`
        CREATE TABLE IF NOT EXISTS bracket_images (
          id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
          image_url TEXT NOT NULL,
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `;
      
      // Create stream_requests table
      await rawSql`
        CREATE TABLE IF NOT EXISTS stream_requests (
          id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
          game_id VARCHAR NOT NULL,
          user_id VARCHAR NOT NULL,
          stream_link TEXT,
          status VARCHAR(20) DEFAULT 'pending',
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `;
      
      // Create settings table
      await rawSql`
        CREATE TABLE IF NOT EXISTS settings (
          id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
          key VARCHAR(100) NOT NULL UNIQUE,
          value TEXT NOT NULL,
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `;
      
      // Create partners table
      await rawSql`
        CREATE TABLE IF NOT EXISTS partners (
          id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(200) NOT NULL,
          quote TEXT NOT NULL,
          image_url TEXT,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `;
      
      // Create user_preferences table
      await rawSql`
        CREATE TABLE IF NOT EXISTS user_preferences (
          id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id VARCHAR NOT NULL UNIQUE,
          particle_effects INTEGER DEFAULT 100,
          dark_mode BOOLEAN DEFAULT false,
          compact_layout BOOLEAN DEFAULT false,
          show_team_logos BOOLEAN DEFAULT true,
          reduce_animations BOOLEAN DEFAULT false,
          favorite_team VARCHAR(100),
          notify_game_live BOOLEAN DEFAULT true,
          notify_game_final BOOLEAN DEFAULT true,
          notify_news BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `;
      
      // Create update_plans table
      await rawSql`
        CREATE TABLE IF NOT EXISTS update_plans (
          id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
          update_date DATE NOT NULL UNIQUE,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `;
      
      // Create bets table
      await rawSql`
        CREATE TABLE IF NOT EXISTS bets (
          id SERIAL PRIMARY KEY,
          user_id VARCHAR NOT NULL,
          game_id VARCHAR NOT NULL,
          amount INTEGER NOT NULL,
          picked_team VARCHAR(100) NOT NULL,
          multiplier INTEGER,
          parlay_id VARCHAR,
          won BOOLEAN,
          status TEXT DEFAULT 'pending',
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `;
      
      // Create parlays table
      await rawSql`
        CREATE TABLE IF NOT EXISTS parlays (
          id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id VARCHAR NOT NULL,
          total_amount INTEGER NOT NULL,
          total_odds INTEGER DEFAULT 1,
          potential_winnings INTEGER NOT NULL,
          won BOOLEAN,
          status VARCHAR(20) DEFAULT 'active',
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `;
    
      // Create teams table
      await rawSql`
        CREATE TABLE IF NOT EXISTS teams (
          id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(100) NOT NULL UNIQUE,
          logo TEXT,
          colors VARCHAR(100),
          description TEXT,
          founded_year INTEGER,
          city VARCHAR(100),
          division VARCHAR(10),
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `;

      // Create players table
      await rawSql`
        CREATE TABLE IF NOT EXISTS players (
          id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(100) NOT NULL,
          number INTEGER,
          position VARCHAR(10),
          team_id VARCHAR NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `;

      // Create player_stats table
      await rawSql`
        CREATE TABLE IF NOT EXISTS player_stats (
          id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
          player_name VARCHAR(100) NOT NULL,
          team VARCHAR(100) NOT NULL,
          position VARCHAR(10) NOT NULL,
          passing_yards INTEGER DEFAULT 0,
          passing_touchdowns INTEGER DEFAULT 0,
          interceptions INTEGER DEFAULT 0,
          completions INTEGER DEFAULT 0,
          attempts INTEGER DEFAULT 0,
          sacks INTEGER DEFAULT 0,
          rushing_yards INTEGER DEFAULT 0,
          rushing_touchdowns INTEGER DEFAULT 0,
          rushing_attempts INTEGER DEFAULT 0,
          missed_tackles_forced INTEGER DEFAULT 0,
          receiving_yards INTEGER DEFAULT 0,
          receiving_touchdowns INTEGER DEFAULT 0,
          receptions INTEGER DEFAULT 0,
          targets INTEGER DEFAULT 0,
          yards_after_catch INTEGER DEFAULT 0,
          defensive_interceptions INTEGER DEFAULT 0,
          passes_defended INTEGER DEFAULT 0,
          completions_allowed INTEGER DEFAULT 0,
          targets_allowed INTEGER DEFAULT 0,
          swats INTEGER DEFAULT 0,
          defensive_touchdowns INTEGER DEFAULT 0,
          defensive_sacks INTEGER DEFAULT 0,
          tackles INTEGER DEFAULT 0,
          defensive_misses INTEGER DEFAULT 0,
          safeties INTEGER DEFAULT 0,
          defensive_points INTEGER DEFAULT 0,
          week INTEGER NOT NULL,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `;

    console.log('Database schema initialized successfully');
  } catch (error: any) {
    // Tables may already exist - that's fine
    if (!error.message?.includes('already exists')) {
      console.warn('Database initialization warning:', error.message);
    }
  }

  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly run the final setup after setting up all the other routes so
  // the catch-all route doesn't interfere with the other routes
  await setup(app, server);

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
}
