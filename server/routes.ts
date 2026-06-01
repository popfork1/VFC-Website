import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./simpleAuth";
import { censorProfanity } from "./profanityFilter";
import { eq, desc, and, sql } from "drizzle-orm";
import {
  insertGameSchema,
  insertNewsSchema,
  insertChatMessageSchema,
  insertPickemSchema,
  insertPickemRulesSchema,
  insertStandingsSchema,
  insertPlayoffMatchSchema,
  insertChangelogSchema,
  insertPredictionSchema,
  insertBracketImageSchema,
  insertStreamRequestSchema,
  insertBetSchema,
  insertPlayerStatsSchema,
  insertGamePlaySchema,
  insertPlayerSchema,
  insertPartnersSchema,
} from "@shared/schema";
import { playerStats, gamePlays, players, teams } from "@shared/schema";
import { db } from "./db";

import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";

export async function registerRoutes(app: Express): Promise<Server> {
  await setupAuth(app);

  // Configure multer for file uploads
  const storage_disk = multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadPath = path.join(process.cwd(), "dist/public/uploads");
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }
      cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
  });
  const upload = multer({ storage: storage_disk });

  // Serve uploads statically
  app.use("/uploads", express.static(path.join(process.cwd(), "dist/public/uploads")));

  app.post("/api/admin/upload-bracket", isAuthenticated, upload.single("file"), async (req: any, res) => {
    try {
      if (req.session?.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      const url = `/uploads/${req.file.filename}`;
      res.json({ url });
    } catch (error) {
      console.error("Error uploading file:", error);
      res.status(500).json({ message: "Upload failed" });
    }
  });

  // Note: /api/auth/user is handled in simpleAuth.ts

  app.get("/api/games", async (req, res) => {
    try {
      const seasonStr = req.query.season as string;
      const season = seasonStr ? parseInt(seasonStr) : 2;
      const games = await storage.getAllGames();
      res.json(games.filter(g => (g.season ?? 1) === season));
    } catch (error) {
      console.error("Error fetching all games:", error);
      res.status(500).json({ message: "Failed to fetch games" });
    }
  });

  app.get("/api/games/all", async (req, res) => {
    try {
      const seasonStr = req.query.season as string;
      const season = seasonStr ? parseInt(seasonStr) : 2;
      const games = await storage.getAllGames();
      res.json(games.filter(g => (g.season ?? 1) === season));
    } catch (error) {
      console.error("Error fetching all games:", error);
      res.status(500).json({ message: "Failed to fetch games" });
    }
  });

  app.get("/api/games/week/:week", async (req, res) => {
    try {
      const week = parseInt(req.params.week);
      const seasonStr = req.query.season as string;
      const season = seasonStr ? parseInt(seasonStr) : 2;
      const games = await storage.getGamesByWeek(week);
      res.json(games.filter(g => (g.season ?? 1) === season));
    } catch (error) {
      console.error("Error fetching games by week:", error);
      res.status(500).json({ message: "Failed to fetch games" });
    }
  });

  app.get("/api/games/current", async (req, res) => {
    try {
      const seasonStr = req.query.season as string;
      const season = seasonStr ? parseInt(seasonStr) : 2;
      const games = await storage.getCurrentWeekGames();
      res.json(games.filter(g => (g.season ?? 1) === season));
    } catch (error) {
      console.error("Error fetching current week games:", error);
      res.status(500).json({ message: "Failed to fetch games" });
    }
  });

  app.get("/api/games/:id", async (req, res) => {
    try {
      const game = await storage.getGame(req.params.id);
      if (!game) {
        return res.status(404).json({ message: "Game not found" });
      }
      res.json(game);
    } catch (error) {
      console.error("Error fetching game:", error);
      res.status(500).json({ message: "Failed to fetch game" });
    }
  });

  app.post("/api/games", isAuthenticated, async (req, res) => {
    try {
      const gameData = insertGameSchema.parse(req.body);
      const game = await storage.createGame(gameData);
      res.json(game);
    } catch (error) {
      console.error("Error creating game:", error);
      res.status(400).json({ message: "Failed to create game" });
    }
  });

  app.patch("/api/games/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const gameToUpdate = await storage.getGame(id);
      if (!gameToUpdate) {
        return res.status(404).json({ message: "Game not found" });
      }

      const wasFinal = gameToUpdate.isFinal ?? false;
      const wasNotFinal = !wasFinal;
      
      // Update the game
      console.log(`[API] PATCH /api/games/${id} body:`, JSON.stringify(req.body));
      const updatedGame = await storage.updateGame(id, req.body);
      if (!updatedGame) {
        return res.status(404).json({ message: "Game not found" });
      }
      
      // Broadcast update to all connected clients
      const wss = (app as any).wss;
      if (wss) {
        const updateMessage = JSON.stringify({
          type: "game_update",
          gameId: id,
          game: updatedGame
        });
        wss.clients.forEach((client: any) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(updateMessage);
          }
        });
      }
      
      // If game is final, always (re)resolve bets to handle score/winner changes
      if (req.body.isFinal === true || updatedGame.isFinal) {
        console.log(`[BET RESOLUTION] Game ${id} is final. (Re)resolving bets...`);
        await storage.resolveBetsForGame(id);
      }
      
      // If game is being marked as not final (transition from final to not final), unresolve bets
      if (req.body.isFinal === false && wasFinal) {
        console.log(`[BET UNRESOLVE] Game ${id} unmarked as final. Unresolving bets...`);
        if (updatedGame) {
          await storage.unresolveBetsForGame(id);
        }
      }
      
      res.json(updatedGame);
    } catch (error) {
      console.error("Error updating game:", error);
      res.status(400).json({ message: "Failed to update game" });
    }
  });

  app.delete("/api/games/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteGame(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting game:", error);
      res.status(400).json({ message: "Failed to delete game" });
    }
  });

  app.get("/api/news", async (req, res) => {
    try {
      const news = await storage.getAllNews();
      res.json(news);
    } catch (error) {
      console.error("Error fetching news:", error);
      res.status(500).json({ message: "Failed to fetch news" });
    }
  });

  app.get("/api/news/:id", async (req, res) => {
    try {
      const allNews = await storage.getAllNews();
      const news = allNews.find(n => n.id === req.params.id);
      if (!news) {
        return res.status(404).json({ message: "News not found" });
      }
      res.json(news);
    } catch (error) {
      console.error("Error fetching news:", error);
      res.status(500).json({ message: "Failed to fetch news" });
    }
  });

  app.post("/api/news", isAuthenticated, async (req, res) => {
    try {
      const newsData = insertNewsSchema.parse(req.body);
      const news = await storage.createNews(newsData);
      res.json(news);
    } catch (error) {
      console.error("Error creating news:", error);
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to create news" });
    }
  });

  app.delete("/api/news/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteNews(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting news:", error);
      res.status(400).json({ message: "Failed to delete news" });
    }
  });

  app.get("/api/chat/:gameId?", async (req, res) => {
    try {
      const messages = await storage.getChatMessages(req.params.gameId);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching chat messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.get("/api/pickems", async (req, res) => {
    try {
      const pickems = await storage.getAllPickems();
      res.json(pickems);
    } catch (error) {
      console.error("Error fetching pickems:", error);
      res.status(500).json({ message: "Failed to fetch pickems" });
    }
  });

  app.post("/api/pickems", isAuthenticated, async (req, res) => {
    try {
      const pickemData = insertPickemSchema.parse(req.body);
      const pickem = await storage.createPickem(pickemData);
      res.json(pickem);
    } catch (error) {
      console.error("Error creating pickem:", error);
      res.status(400).json({ message: "Failed to create pickem" });
    }
  });

  app.delete("/api/pickems/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deletePickem(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting pickem:", error);
      res.status(400).json({ message: "Failed to delete pickem" });
    }
  });

  app.get("/api/pickems/rules", async (req, res) => {
    try {
      const rules = await storage.getPickemRules();
      res.json(rules);
    } catch (error) {
      console.error("Error fetching pickem rules:", error);
      res.status(500).json({ message: "Failed to fetch rules" });
    }
  });

  app.post("/api/pickems/rules", isAuthenticated, async (req, res) => {
    try {
      const rulesData = insertPickemRulesSchema.parse(req.body);
      const rules = await storage.upsertPickemRules(rulesData);
      res.json(rules);
    } catch (error) {
      console.error("Error updating pickem rules:", error);
      res.status(400).json({ message: "Failed to update rules" });
    }
  });

  app.get("/api/standings", async (req, res) => {
    try {
      const seasonStr = req.query.season as string;
      const season = seasonStr ? parseInt(seasonStr) : 2;
      const standings = await storage.getAllStandings();
      res.json(standings.filter(s => (s.season ?? 1) === season));
    } catch (error) {
      console.error("Error fetching standings:", error);
      res.status(500).json({ message: "Failed to fetch standings" });
    }
  });

  app.post("/api/standings", isAuthenticated, async (req: any, res) => {
    try {
      const role = req.session?.role;
      if (role !== "admin") {
        return res.status(403).json({ message: "Failed to save standings. You do not have the proper roles to edit the standings." });
      }
      
      const standingData = insertStandingsSchema.parse(req.body);
      const standing = await storage.upsertStandings(standingData);
      res.json(standing);
    } catch (error) {
      console.error("Error upserting standing:", error);
      res.status(400).json({ message: "Failed to save standings. You do not have the proper roles to edit the standings." });
    }
  });

  app.delete("/api/standings/:id", isAuthenticated, async (req: any, res) => {
    try {
      const role = req.session?.role;
      if (role !== "admin") {
        return res.status(403).json({ message: "Failed to save standings. You do not have the proper roles to edit the standings." });
      }
      
      await storage.deleteStandings(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting standing:", error);
      res.status(400).json({ message: "Failed to save standings. You do not have the proper roles to edit the standings." });
    }
  });

  app.get("/api/player-stats", async (req, res) => {
    try {
      const stats = await storage.getAllPlayerStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching player stats:", error);
      res.status(500).json({ message: "Failed to fetch player stats" });
    }
  });

  app.post("/api/player-stats", isAuthenticated, async (req: any, res) => {
    try {
      if (req.session?.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }
      const statsData = insertPlayerStatsSchema.parse(req.body);
      const stats = await storage.createPlayerStats(statsData);
      res.json(stats);
    } catch (error) {
      console.error("Error creating player stats:", error);
      res.status(400).json({ message: "Failed to create player stats" });
    }
  });

  app.delete("/api/player-stats/:id", isAuthenticated, async (req: any, res) => {
    try {
      if (req.session?.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }
      await storage.deletePlayerStats(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting player stats:", error);
      res.status(400).json({ message: "Failed to delete player stats" });
    }
  });

  app.get("/api/teams", async (req, res) => {
    try {
      const allTeams = await storage.getAllTeams();
      if (allTeams.length === 0) {
        // Seed teams if none exist
        const defaultTeams = [
          { name: "Green Bay Packers", city: "Green Bay", division: "NFC_East" },
          { name: "New York Cobras", city: "New York", division: "AFC_East" },
          { name: "Chicago Grizzlies", city: "Chicago", division: "NFC_West" },
          { name: "Pittsburgh Steelers", city: "Pittsburgh", division: "AFC_East" },
          { name: "Baltimore Ravens", city: "Baltimore", division: "AFC_East" },
          { name: "Miami Gators", city: "Miami", division: "NFC_East" },
          { name: "Denver Broncos", city: "Denver", division: "AFC_West" },
          { name: "Tennessee Titans", city: "Tennessee", division: "AFC_West" },
          { name: "San Francisco 49ers", city: "San Francisco", division: "NFC_West" },
          { name: "Tampa Bay Buccaneers", city: "Tampa Bay", division: "NFC_West" },
          { name: "Dallas Cowboys", city: "Dallas", division: "NFC_East" },
          { name: "Minnesota Vikings", city: "Minnesota", division: "NFC_East" },
          { name: "Jacksonville Ironbacks", city: "Jacksonville", division: "NFC_West" },
          { name: "Indianapolis Colts", city: "Indianapolis", division: "AFC_West" },
          { name: "Cleveland Browns", city: "Cleveland", division: "AFC_East" },
          { name: "Philadelphia Eagles", city: "Philadelphia", division: "NFC_East" },
          { name: "Los Angeles Rams", city: "Los Angeles", division: "NFC_West" },
          { name: "Carolina Panthers", city: "Carolina", division: "NFC_East" },
          { name: "San Antonio Brahmas", city: "San Antonio", division: "NFC_West" },
          { name: "Buffalo Bills", city: "Buffalo", division: "AFC_East" },
          { name: "New England Patriots", city: "New England", division: "AFC_East" },
          { name: "Nevada Nighthawks", city: "Nevada", division: "AFC_West" },
          { name: "Houston Texans", city: "Houston", division: "AFC_West" },
          { name: "Las Vegas Raiders", city: "Las Vegas", division: "AFC_West" },
        ];
        
        for (const team of defaultTeams) {
          await storage.createTeam(team);
        }
        const seededTeams = await storage.getAllTeams();
        return res.json(seededTeams);
      }
      res.json(allTeams);
    } catch (error) {
      console.error("Error fetching teams:", error);
      res.status(500).json({ message: "Failed to fetch teams" });
    }
  });

  app.post("/api/teams/ensure", isAuthenticated, async (req: any, res) => {
    try {
      const { name } = req.body;
      if (!name) return res.status(400).json({ message: "name required" });
      const allTeams = await storage.getAllTeams();
      let team = allTeams.find(t => t.name.toLowerCase() === name.toLowerCase());
      if (!team) {
        team = await storage.createTeam({ name: name.trim() });
      }
      res.json(team);
    } catch (error) {
      console.error("Error ensuring team:", error);
      res.status(500).json({ message: "Failed to ensure team" });
    }
  });

  app.post("/api/teams", isAuthenticated, async (req: any, res) => {
    try {
      if (req.session?.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }
      const { name, logo } = req.body;
      if (!name || typeof name !== "string" || !name.trim()) {
        return res.status(400).json({ message: "Team name is required" });
      }
      const team = await storage.createTeam({ name: name.trim(), logo: logo || null });
      res.json(team);
    } catch (error) {
      console.error("Error creating team:", error);
      res.status(500).json({ message: "Failed to create team" });
    }
  });

  app.delete("/api/teams/:id", isAuthenticated, async (req: any, res) => {
    try {
      if (req.session?.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }
      await storage.deleteTeam(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting team:", error);
      res.status(500).json({ message: "Failed to delete team" });
    }
  });

  app.get("/api/teams/:teamId/players", async (req, res) => {
    try {
      const teamPlayers = await storage.getTeamPlayers(req.params.teamId);
      res.json(teamPlayers);
    } catch (error) {
      console.error("Error fetching team players:", error);
      res.status(500).json({ message: "Failed to fetch players" });
    }
  });

  app.get("/api/players", async (req, res) => {
    try {
      const allPlayers = await storage.getAllPlayers();
      res.json(allPlayers);
    } catch (error) {
      console.error("Error fetching players:", error);
      res.status(500).json({ message: "Failed to fetch players" });
    }
  });

  app.post("/api/players", isAuthenticated, async (req: any, res) => {
    try {
      if (req.session?.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }
      console.log("[API] POST /api/players request body:", JSON.stringify(req.body));
      const playerData = insertPlayerSchema.parse(req.body);
      const player = await storage.createPlayer(playerData);
      console.log("[API] Player created successfully:", player.id);
      res.json(player);
    } catch (error) {
      console.error("Error creating player:", error);
      res.status(400).json({ message: "Failed to create player", error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.delete("/api/players/:id", isAuthenticated, async (req: any, res) => {
    try {
      if (req.session?.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }
      await storage.deletePlayer(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting player:", error);
      res.status(400).json({ message: "Failed to delete player" });
    }
  });

  app.post("/api/playoffs/init", async (req, res) => {
    try {
      const existing = await storage.getAllPlayoffMatches();
      if (existing.length > 0) {
        return res.json({ success: true, message: "Bracket already initialized" });
      }

      // Initialize wildcard round (4 matches - 2 left, 2 right)
      await storage.createPlayoffMatch({ round: "wildcard", matchNumber: 1 });
      await storage.createPlayoffMatch({ round: "wildcard", matchNumber: 2 });
      await storage.createPlayoffMatch({ round: "wildcard", matchNumber: 3 });
      await storage.createPlayoffMatch({ round: "wildcard", matchNumber: 4 });

      // Initialize divisional round (4 matches)
      await storage.createPlayoffMatch({ round: "divisional", matchNumber: 1 });
      await storage.createPlayoffMatch({ round: "divisional", matchNumber: 2 });
      await storage.createPlayoffMatch({ round: "divisional", matchNumber: 3 });
      await storage.createPlayoffMatch({ round: "divisional", matchNumber: 4 });

      // Initialize conference round (2 matches - 1 left, 1 right)
      await storage.createPlayoffMatch({ round: "conference", matchNumber: 1 });
      await storage.createPlayoffMatch({ round: "conference", matchNumber: 2 });

      // Initialize super bowl (1 match)
      await storage.createPlayoffMatch({ round: "super_bowl", matchNumber: 1 });

      res.json({ success: true, message: "Bracket initialized" });
    } catch (error) {
      console.error("Error initializing playoff bracket:", error);
      res.status(400).json({ message: "Failed to initialize bracket" });
    }
  });

  app.get("/api/playoffs", async (req, res) => {
    try {
      const matches = await storage.getAllPlayoffMatches();
      res.json(matches);
    } catch (error) {
      console.error("Error fetching playoff matches:", error);
      res.status(500).json({ message: "Failed to fetch playoff matches" });
    }
  });

  app.get("/api/playoffs/round/:round", async (req, res) => {
    try {
      const matches = await storage.getPlayoffMatchesByRound(req.params.round);
      res.json(matches);
    } catch (error) {
      console.error("Error fetching playoff round:", error);
      res.status(500).json({ message: "Failed to fetch playoff round" });
    }
  });

  app.get("/api/bracket-image", async (req, res) => {
    try {
      const image = await storage.getBracketImage();
      res.json(image || null);
    } catch (error) {
      console.error("Error fetching bracket image:", error);
      res.status(500).json({ message: "Failed to fetch bracket image" });
    }
  });

  app.get("/api/bracket-images", async (req, res) => {
    try {
      // @ts-ignore
      const images = await storage.getBracketImages();
      res.json(images);
    } catch (error) {
      console.error("Error fetching bracket images:", error);
      res.status(500).json({ message: "Failed to fetch bracket images" });
    }
  });

  app.post("/api/bracket-images", isAuthenticated, async (req: any, res) => {
    try {
      const role = req.session?.role;
      if (role !== "admin") {
        return res.status(403).json({ message: "Only admins can add bracket images" });
      }
      
      // @ts-ignore
      const image = await storage.createBracketImage(req.body);
      
      // Also update the singleton 'bracket-image' used by the playoffs page
      await storage.upsertBracketImage({ imageUrl: req.body.imageUrl });
      
      res.json(image);
    } catch (error) {
      console.error("Error creating bracket image:", error);
      res.status(400).json({ message: "Failed to create bracket image" });
    }
  });

  app.delete("/api/bracket-images/:id", isAuthenticated, async (req: any, res) => {
    try {
      const role = req.session?.role;
      if (role !== "admin") {
        return res.status(403).json({ message: "Only admins can delete bracket images" });
      }
      // @ts-ignore
      await storage.deleteBracketImage(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting bracket image:", error);
      res.status(400).json({ message: "Failed to delete bracket image" });
    }
  });

  app.post("/api/playoffs", isAuthenticated, async (req, res) => {
    try {
      const matchData = insertPlayoffMatchSchema.parse(req.body);
      const match = await storage.createPlayoffMatch(matchData);
      res.json(match);
    } catch (error) {
      console.error("Error creating playoff match:", error);
      res.status(400).json({ message: "Failed to create playoff match" });
    }
  });

  app.patch("/api/playoffs/:id", isAuthenticated, async (req, res) => {
    try {
      const match = await storage.updatePlayoffMatch(req.params.id, req.body);
      res.json(match);
    } catch (error) {
      console.error("Error updating playoff match:", error);
      res.status(400).json({ message: "Failed to update playoff match" });
    }
  });

  app.delete("/api/playoffs/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deletePlayoffMatch(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting playoff match:", error);
      res.status(400).json({ message: "Failed to delete playoff match" });
    }
  });

  app.post("/api/playoffs/reset", isAuthenticated, async (req, res) => {
    try {
      const matches = await storage.getAllPlayoffMatches();
      for (const match of matches) {
        await storage.updatePlayoffMatch(match.id, {
          team1: null,
          team2: null,
          winner: null,
          isComplete: false,
        });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error resetting playoff bracket:", error);
      res.status(400).json({ message: "Failed to reset bracket" });
    }
  });

  // Changelogs routes
  app.get("/api/changelogs", async (req, res) => {
    try {
      const changelogs = await storage.getAllChangelogs();
      res.json(changelogs);
    } catch (error) {
      console.error("Error fetching changelogs:", error);
      res.status(500).json({ message: "Failed to fetch changelogs" });
    }
  });

  app.post("/api/changelogs", isAuthenticated, async (req, res) => {
    try {
      const changelogData = insertChangelogSchema.parse(req.body);
      const changelog = await storage.createChangelog(changelogData);
      res.json(changelog);
    } catch (error) {
      console.error("Error creating changelog:", error);
      res.status(400).json({ message: "Failed to create changelog" });
    }
  });

  app.delete("/api/changelogs/:id", isAuthenticated, async (req, res) => {
    try {
      await storage.deleteChangelog(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting changelog:", error);
      res.status(400).json({ message: "Failed to delete changelog" });
    }
  });

  app.get("/api/predictions/:gameId", async (req, res) => {
    try {
      const predictions = await storage.getPredictionsByGameId(req.params.gameId);
      res.json(predictions);
    } catch (error) {
      console.error("Error fetching predictions:", error);
      res.status(500).json({ message: "Failed to fetch predictions" });
    }
  });

  app.post("/api/predictions", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.userId;
      const predictionData = insertPredictionSchema.parse({ ...req.body, userId });
      
      // Check if user already has a prediction for this game
      const existing = await storage.getUserPredictionForGame(userId, req.body.gameId);
      if (existing) {
        return res.status(400).json({ message: "You can only make one prediction per game" });
      }
      
      const prediction = await storage.createPrediction(predictionData);
      res.json(prediction);
    } catch (error) {
      console.error("Error creating prediction:", error);
      res.status(400).json({ message: "Failed to create prediction" });
    }
  });

  // Betting endpoints
  app.get("/api/bets", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ message: "User not identified" });
      }
      console.log(`[API] Fetching bets for userId: ${userId}`);
      const userBets = await storage.getUserBets(userId);
      console.log(`[API] Found ${userBets.length} bets for ${userId}`);
      res.json(userBets);
    } catch (error) {
      console.error("Error fetching bets:", error);
      res.status(500).json({ message: "Failed to fetch bets" });
    }
  });

  app.post("/api/bets", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ message: "User not identified" });
      }

      const betData = insertBetSchema.parse({
        ...req.body,
        userId,
      });

      // placeBet handles balance check and deduction internally now
      const bet = await storage.placeBet(betData);
      
      const user = await storage.getUser(userId);
      const newBalance = Number(user?.coins ?? 0);
      
      console.log(`[API] Bet placed. User: ${userId}, New Balance: ${newBalance}`);

      // Broadcast balance update
      const wss = (app as any).wss;
      if (wss) {
        wss.clients.forEach((client: any) => {
          if (client.readyState === 1) { // WebSocket.OPEN
            client.send(JSON.stringify({
              type: "balance_update",
              userId,
              balance: newBalance
            }));
          }
        });
      }
      
      res.json(bet);
    } catch (error) {
      console.error("Error placing bet:", error);
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to place bet" });
    }
  });

  app.get("/api/balance", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ message: "User not identified" });
      }
      const user = await storage.getUser(userId);
      console.log(`[API] Balance check for ${userId}: ${user?.coins}`);
      res.json({ balance: user?.coins ?? 0 });
    } catch (error) {
      console.error("Error fetching balance:", error);
      res.status(500).json({ message: "Failed to fetch balance" });
    }
  });

  app.get("/api/leaderboard", async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      const sorted = users.sort((a, b) => (b.coins || 0) - (a.coins || 0)).slice(0, 10);
      res.json(sorted);
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
      res.status(500).json({ message: "Failed to fetch leaderboard" });
    }
  });

  // Admin endpoints for coins management
  app.post("/api/admin/add-coins", isAuthenticated, async (req: any, res) => {
    try {
      // Verify user is admin
      if (req.session?.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { userId, amount } = req.body;
      if (!userId || !amount || amount <= 0) {
        return res.status(400).json({ message: "Invalid userId or amount" });
      }

      const currentBalance = await storage.getUserBalance(userId);
      const newBalance = currentBalance + amount;
      await storage.updateUserBalance(userId, newBalance);

      res.json({ success: true, newBalance });
    } catch (error) {
      console.error("Error adding coins:", error);
      res.status(400).json({ message: "Failed to add coins" });
    }
  });

  app.post("/api/admin/remove-coins", isAuthenticated, async (req: any, res) => {
    try {
      // Verify user is admin
      if (req.session?.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { userId, amount } = req.body;
      if (!userId || !amount || amount <= 0) {
        return res.status(400).json({ message: "Invalid userId or amount" });
      }

      const currentBalance = await storage.getUserBalance(userId);
      const newBalance = Math.max(0, currentBalance - amount);
      await storage.updateUserBalance(userId, newBalance);

      res.json({ success: true, newBalance });
    } catch (error) {
      console.error("Error removing coins:", error);
      res.status(400).json({ message: "Failed to remove coins" });
    }
  });

  // Stream requests endpoints
  app.get("/api/stream-requests", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.userId;
      const role = req.session?.role;
      
      // Full admins can see all requests, streamers can only see their own
      if (role === "admin") {
        const requests = await storage.getAllStreamRequests();
        res.json(requests);
      } else {
        const requests = await storage.getStreamRequestsByUser(userId);
        res.json(requests);
      }
    } catch (error) {
      console.error("Error fetching stream requests:", error);
      res.status(500).json({ message: "Failed to fetch stream requests" });
    }
  });

  app.get("/api/stream-requests/game/:gameId", async (req, res) => {
    try {
      const requests = await storage.getStreamRequestsByGame(req.params.gameId);
      // Only return approved requests with stream links for public view
      const approved = requests.filter(r => r.status === "approved" && r.streamLink);
      res.json(approved);
    } catch (error) {
      console.error("Error fetching stream requests for game:", error);
      res.status(500).json({ message: "Failed to fetch stream requests" });
    }
  });

  app.post("/api/stream-requests", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ message: "User not identified" });
      }
      
      const requestData = insertStreamRequestSchema.parse({
        ...req.body,
        userId,
        status: "pending",
      });
      const request = await storage.createStreamRequest(requestData);
      res.json(request);
    } catch (error) {
      console.error("Error creating stream request:", error);
      res.status(400).json({ message: "Failed to create stream request" });
    }
  });

  app.patch("/api/stream-requests/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.userId;
      const role = req.session?.role;
      
      // Only full admins can approve/reject, or the owner can update stream link
      const allRequests = await storage.getAllStreamRequests();
      const existingRequest = allRequests.find(r => r.id === req.params.id);
      
      if (!existingRequest) {
        return res.status(404).json({ message: "Stream request not found" });
      }
      
      // Admin can approve/reject and update anything
      if (role === "admin") {
        const request = await storage.updateStreamRequest(req.params.id, req.body);
        
        // If approved and has stream link, update game
        if (req.body.status === "approved" && (req.body.streamLink || existingRequest.streamLink)) {
          await storage.updateGame(existingRequest.gameId, { 
            streamLink: req.body.streamLink || existingRequest.streamLink 
          });
        }
        
        return res.json(request);
      }
      
      // Streamer can only update their own approved requests (add stream link)
      if (existingRequest.userId !== userId) {
        return res.status(403).json({ message: "Not authorized" });
      }
      if (existingRequest.status !== "approved") {
        return res.status(403).json({ message: "Can only update approved requests" });
      }
      // Streamers can only update the stream link
      const { streamLink } = req.body;
      const request = await storage.updateStreamRequest(req.params.id, { streamLink });
      
      // Also update the game's stream link
      if (streamLink) {
        await storage.updateGame(existingRequest.gameId, { streamLink });
      }
      
      res.json(request);
    } catch (error) {
      console.error("Error updating stream request:", error);
      res.status(400).json({ message: "Failed to update stream request" });
    }
  });

  app.delete("/api/stream-requests/:id", isAuthenticated, async (req: any, res) => {
    try {
      const role = req.session?.role;
      if (role !== "admin") {
        return res.status(403).json({ message: "Only admins can delete stream requests" });
      }
      
      await storage.deleteStreamRequest(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting stream request:", error);
      res.status(400).json({ message: "Failed to delete stream request" });
    }
  });

  // User management endpoints (admin only)
  app.patch("/api/users/:id/coins", isAuthenticated, async (req: any, res) => {
    try {
      if (req.session?.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }
      const { id } = req.params;
      const { amount, action } = req.body;
      
      let user;
      if (action === "add") {
        user = await storage.addCoins(id, amount);
      } else if (action === "remove") {
        user = await storage.removeCoins(id, amount);
      } else {
        user = await storage.updateUserBalance(id, amount);
      }
      
      res.json(user);
    } catch (error) {
      console.error("Error updating user coins:", error);
      res.status(400).json({ message: "Failed to update user coins" });
    }
  });

  app.get("/api/users/all", isAuthenticated, async (req: any, res) => {
    try {
      const role = req.session?.role;
      if (role !== "admin") {
        return res.status(403).json({ message: "Only admins can view users" });
      }
      
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.get("/api/users", isAuthenticated, async (req: any, res) => {
    try {
      const role = req.session?.role;
      if (role !== "admin") {
        return res.status(403).json({ message: "Only admins can view users" });
      }
      
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.patch("/api/users/:id/role", isAuthenticated, async (req: any, res) => {
    try {
      const sessionRole = req.session?.role;
      if (sessionRole !== "admin") {
        return res.status(403).json({ message: "Only admins can change roles" });
      }
      
      const user = await storage.getUser(req.params.id);
      if (user?.username === "popfork1") {
        return res.status(400).json({ message: "Cannot change the role of the popfork1 account" });
      }
      
      const { role } = req.body;
      if (!["admin", "streamer"].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }
      
      const updatedUser = await storage.updateUserRole(req.params.id, role);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(400).json({ message: "Failed to update user role" });
    }
  });

  app.post("/api/users", isAuthenticated, async (req: any, res) => {
    try {
      const sessionRole = req.session?.role;
      if (sessionRole !== "admin") {
        return res.status(403).json({ message: "Only admins can create users" });
      }
      
      const { username, password, role } = req.body;
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }
      if (!["admin", "streamer"].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }
      
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }
      
      const user = await storage.createUserWithPassword(username, password, role);
      res.json(user);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(400).json({ message: "Failed to create user" });
    }
  });

  app.delete("/api/users/:id", isAuthenticated, async (req: any, res) => {
    try {
      const sessionRole = req.session?.role;
      if (sessionRole !== "admin") {
        return res.status(403).json({ message: "Only admins can delete users" });
      }
      
      const currentUserId = req.session?.userId;
      if (req.params.id === currentUserId) {
        return res.status(400).json({ message: "Cannot delete yourself" });
      }
      
      const user = await storage.getUser(req.params.id);
      if (user?.username === "popfork1") {
        return res.status(400).json({ message: "Cannot delete the popfork1 account" });
      }
      
      await storage.deleteUser(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(400).json({ message: "Failed to delete user" });
    }
  });

  // Team owners endpoints
  app.get("/api/team-owners", async (req, res) => {
    try {
      const all = await storage.getAllSettings();
      const owners: Record<string, string> = {};
      for (const s of all) {
        if (s.key.startsWith("owner_")) {
          owners[s.key.slice("owner_".length)] = s.value;
        }
      }
      res.json(owners);
    } catch {
      res.status(500).json({ message: "Failed to get team owners" });
    }
  });

  app.post("/api/team-owners", isAuthenticated, async (req: any, res) => {
    try {
      const { team, owner } = req.body;
      if (!team || typeof owner !== "string") return res.status(400).json({ message: "team and owner required" });
      await storage.setSetting(`owner_${team}`, owner);
      res.json({ success: true });
    } catch {
      res.status(500).json({ message: "Failed to save team owner" });
    }
  });

  // Generic settings endpoints (get all, upsert by key)
  app.get("/api/settings", async (req, res) => {
    try {
      const all = await storage.getAllSettings();
      res.json(all);
    } catch (error) {
      res.status(500).json({ message: "Failed to get settings" });
    }
  });

  app.post("/api/settings", isAuthenticated, async (req: any, res) => {
    try {
      if (req.session?.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }
      const { key, value } = req.body;
      if (!key || value === undefined) {
        return res.status(400).json({ message: "key and value required" });
      }
      await storage.setSetting(key, value);
      res.json({ success: true, key, value });
    } catch (error) {
      res.status(500).json({ message: "Failed to save setting" });
    }
  });

  // Maintenance mode endpoints
  app.get("/api/settings/maintenance-mode", async (req, res) => {
    try {
      const value = await storage.getSetting("maintenance_mode");
      res.json({ enabled: value === "true" });
    } catch (error) {
      console.error("Error getting maintenance mode:", error);
      res.status(500).json({ message: "Failed to get maintenance mode" });
    }
  });

  app.post("/api/settings/maintenance-mode", isAuthenticated, async (req: any, res) => {
    try {
      const sessionRole = req.session?.role;
      if (sessionRole !== "admin") {
        return res.status(403).json({ message: "Only admins can change maintenance mode" });
      }
      
      const { enabled } = req.body;
      await storage.setSetting("maintenance_mode", enabled ? "true" : "false");
      res.json({ success: true, enabled });
    } catch (error) {
      console.error("Error setting maintenance mode:", error);
      res.status(400).json({ message: "Failed to set maintenance mode" });
    }
  });

  // Breaking news endpoints
  app.get("/api/settings/breaking-news", async (req, res) => {
    try {
      const message = await storage.getSetting("breaking_news_message");
      const expiresAt = await storage.getSetting("breaking_news_expires_at");
      const active = await storage.getSetting("breaking_news_active");
      
      let isActive = active === "true";
      if (expiresAt && isActive) {
        const expiryTime = new Date(expiresAt).getTime();
        if (Date.now() > expiryTime) {
          isActive = false;
          await storage.setSetting("breaking_news_active", "false");
        }
      }
      
      console.log(`[API] GET /api/settings/breaking-news: message="${message}", active=${isActive}, expiresAt=${expiresAt}`);
      
      res.json({ 
        message: message || "",
        active: isActive,
        expiresAt: expiresAt || null
      });
    } catch (error) {
      console.error("Error getting breaking news:", error);
      res.status(500).json({ message: "Failed to get breaking news" });
    }
  });

  app.post("/api/settings/breaking-news", isAuthenticated, async (req: any, res) => {
    try {
      const sessionRole = req.session?.role;
      if (sessionRole !== "admin") {
        return res.status(403).json({ message: "Only admins can set breaking news" });
      }
      
      const { message, active, durationMinutes } = req.body;
      console.log(`[API] POST /api/settings/breaking-news: body=`, JSON.stringify(req.body));
      
      await storage.setSetting("breaking_news_message", message || "");
      await storage.setSetting("breaking_news_active", active ? "true" : "false");
      
      if (active && durationMinutes && durationMinutes > 0) {
        const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000).toISOString();
        await storage.setSetting("breaking_news_expires_at", expiresAt);
      } else {
        await storage.setSetting("breaking_news_expires_at", "");
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error setting breaking news:", error);
      res.status(400).json({ message: "Failed to set breaking news" });
    }
  });

  // Week config endpoints
  app.get("/api/settings/week-config", async (req, res) => {
    try {
      const raw = await storage.getSetting("week_config");
      if (raw) {
        res.json(JSON.parse(raw));
      } else {
        res.json({
          totalWeeks: 19,
          weekNames: {
            "16": "Wildcard",
            "17": "Divisional",
            "18": "Conference Championship",
            "19": "Super Bowl",
          },
        });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to get week config" });
    }
  });

  app.post("/api/settings/week-config", isAuthenticated, async (req: any, res) => {
    try {
      if (req.session?.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }
      const { totalWeeks, weekNames } = req.body;
      if (typeof totalWeeks !== "number" || totalWeeks < 1 || totalWeeks > 52) {
        return res.status(400).json({ message: "totalWeeks must be between 1 and 52" });
      }
      await storage.setSetting("week_config", JSON.stringify({ totalWeeks, weekNames: weekNames || {} }));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to save week config" });
    }
  });

  // Season config endpoints
  app.get("/api/settings/season-config", async (req, res) => {
    try {
      const raw = await storage.getSetting("season_config");
      if (raw) return res.json(JSON.parse(raw));
      return res.json([{ id: 1, name: "Season 1" }, { id: 2, name: "Season 2" }]);
    } catch (error) {
      res.status(500).json({ message: "Failed to get season config" });
    }
  });

  app.post("/api/settings/season-config", isAuthenticated, async (req: any, res) => {
    try {
      if (req.session?.role !== "admin") return res.status(403).json({ message: "Admin access required" });
      const { seasons } = req.body;
      if (!Array.isArray(seasons)) return res.status(400).json({ message: "seasons must be an array" });
      await storage.setSetting("season_config", JSON.stringify(seasons));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to save season config" });
    }
  });

  app.get("/api/settings/current-season", async (req, res) => {
    try {
      const raw = await storage.getSetting("current_season");
      const seasonConfigRaw = await storage.getSetting("season_config");
      const seasons = seasonConfigRaw ? JSON.parse(seasonConfigRaw) : [{ id: 1, name: "Season 1" }, { id: 2, name: "Season 2" }];
      const seasonId = raw ? parseInt(raw) : 2;
      const season = seasons.find((s: any) => Number(s.id) === seasonId) ?? { id: seasonId, name: `Season ${seasonId}` };
      res.json({ seasonId: season.id, seasonName: season.name });
    } catch (error) {
      res.status(500).json({ message: "Failed to get current season" });
    }
  });

  app.post("/api/settings/current-season", isAuthenticated, async (req: any, res) => {
    try {
      if (req.session?.role !== "admin") return res.status(403).json({ message: "Admin access required" });
      const { seasonId } = req.body;
      if (typeof seasonId !== "number") return res.status(400).json({ message: "seasonId must be a number" });
      await storage.setSetting("current_season", String(seasonId));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to save current season" });
    }
  });

  // Division config endpoints
  const DEFAULT_DIVISION_CONFIG = [
    { id: "AFC", name: "AFC", color: "blue", divisions: [{ id: "AFC_East", label: "East" }, { id: "AFC_West", label: "West" }] },
    { id: "NFC", name: "NFC", color: "red", divisions: [{ id: "NFC_East", label: "East" }, { id: "NFC_West", label: "West" }] },
  ];

  app.get("/api/settings/division-config", async (req, res) => {
    try {
      const raw = await storage.getSetting("division_config");
      if (raw) return res.json(JSON.parse(raw));
      return res.json(DEFAULT_DIVISION_CONFIG);
    } catch (error) {
      res.status(500).json({ message: "Failed to get division config" });
    }
  });

  app.post("/api/settings/division-config", isAuthenticated, async (req: any, res) => {
    try {
      if (req.session?.role !== "admin") return res.status(403).json({ message: "Admin access required" });
      const config = req.body;
      if (!Array.isArray(config)) return res.status(400).json({ message: "Config must be an array" });
      await storage.setSetting("division_config", JSON.stringify(config));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to save division config" });
    }
  });

  // Update Plans endpoints
  app.get("/api/update-plans", async (req, res) => {
    try {
      const plans = await storage.getAllUpdatePlans();
      res.json(plans);
    } catch (error) {
      console.error("Error fetching update plans:", error);
      res.status(500).json({ message: "Failed to fetch update plans" });
    }
  });

  app.post("/api/update-plans", isAuthenticated, async (req: any, res) => {
    try {
      const sessionRole = req.session?.role;
      if (sessionRole !== "admin") {
        return res.status(403).json({ message: "Only admins can manage update plans" });
      }
      
      const { updateDate } = req.body;
      const plan = await storage.upsertUpdatePlan({ updateDate });
      res.json(plan);
    } catch (error) {
      console.error("Error creating/updating update plan:", error);
      res.status(400).json({ message: "Failed to save update plan" });
    }
  });

  app.delete("/api/update-plans/:date", isAuthenticated, async (req: any, res) => {
    try {
      const sessionRole = req.session?.role;
      if (sessionRole !== "admin") {
        return res.status(403).json({ message: "Only admins can delete update plans" });
      }
      
      await storage.deleteUpdatePlan(req.params.date);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting update plan:", error);
      res.status(400).json({ message: "Failed to delete update plan" });
    }
  });

  // User Preferences endpoints
  app.get("/api/user/preferences", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ message: "User not identified" });
      }
      const prefs = await storage.getUserPreferences(userId);
      res.json(prefs || {});
    } catch (error) {
      console.error("Error fetching user preferences:", error);
      res.status(500).json({ message: "Failed to fetch preferences" });
    }
  });

  app.post("/api/user/preferences", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ message: "User not identified" });
      }
      const prefs = await storage.updateUserPreferences(userId, req.body);
      res.json(prefs);
    } catch (error) {
      console.error("Error updating user preferences:", error);
      res.status(400).json({ message: "Failed to update preferences" });
    }
  });

  // Partners endpoints
  app.get("/api/partners", async (req, res) => {
    try {
      const partnersList = await storage.getAllPartners();
      res.json(partnersList);
    } catch (error) {
      console.error("Error fetching partners:", error);
      res.status(500).json({ message: "Failed to fetch partners" });
    }
  });

  app.post("/api/partners", isAuthenticated, upload.single("image"), async (req: any, res) => {
    try {
      const role = req.session?.role;
      if (role !== "admin") {
        return res.status(403).json({ message: "Only admins can create partners" });
      }

      // Log full request details for debugging
      console.log("[PARTNERS] req.body content:", req.body);
      console.log("[PARTNERS] Request file:", req.file ? `File: ${req.file.originalname}` : "No file");

      // Use a more robust extraction method
      const body = req.body || {};
      const name = body.name || body['name'] || req.query.name;
      const quote = body.quote || body['quote'] || req.query.quote;

      console.log("[PARTNERS] Extracted name:", name);
      console.log("[PARTNERS] Extracted quote:", quote);

      const imageUrl = req.file ? `/uploads/${req.file.filename}` : (body.imageUrl || null);

      if (!name || !quote) {
        return res.status(400).json({ 
          message: "Name and quote are required.",
          received: { body: req.body, query: req.query, file: !!req.file }
        });
      }

      const partnerData = insertPartnersSchema.parse({
        name: String(name).trim(),
        quote: String(quote).trim(),
        imageUrl: imageUrl ? String(imageUrl) : null,
      });

      const partner = await storage.createPartner(partnerData);
      res.json(partner);
    } catch (error) {
      console.error("Error creating partner:", error);
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to create partner" });
    }
  });

  app.patch("/api/partners/:id", isAuthenticated, async (req: any, res) => {
    try {
      const role = req.session?.role;
      if (role !== "admin") {
        return res.status(403).json({ message: "Only admins can update partners" });
      }
      
      const partner = await storage.updatePartner(req.params.id, req.body);
      res.json(partner);
    } catch (error) {
      console.error("Error updating partner:", error);
      res.status(400).json({ message: "Failed to update partner" });
    }
  });

  app.delete("/api/partners/:id", isAuthenticated, async (req: any, res) => {
    try {
      const role = req.session?.role;
      if (role !== "admin") {
        return res.status(403).json({ message: "Only admins can delete partners" });
      }
      
      await storage.deletePartner(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting partner:", error);
      res.status(400).json({ message: "Failed to delete partner" });
    }
  });

  app.patch("/api/user/tour", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      const user = await storage.updateUserTourStatus(userId, true);
      res.json(user);
    } catch (error) {
      console.error("Error updating tour status:", error);
      res.status(500).json({ message: "Failed to update tour status" });
    }
  });


  // Game Plays endpoints (for play-by-play updates)
  app.get("/api/games/:gameId/plays", async (req, res) => {
    try {
      const plays = await db.select().from(gamePlays).where(eq(gamePlays.gameId, req.params.gameId));
      res.json(plays);
    } catch (error) {
      console.error("Error fetching game plays:", error);
      res.status(500).json({ message: "Failed to fetch game plays" });
    }
  });

  app.post("/api/games/:gameId/plays", isAuthenticated, async (req: any, res) => {
    try {
      const role = req.session?.role;
      if (role !== "admin" && role !== "streamer") {
        return res.status(403).json({ message: "Only admins and streamers can add plays" });
      }

      const playData = insertGamePlaySchema.parse({
        ...req.body,
        gameId: req.params.gameId,
      });

      const play = await db.insert(gamePlays).values(playData).returning();
      
      // Update game scores based on play points
      if (play[0].pointsAdded > 0) {
        const game = await storage.getGame(req.params.gameId);
        if (game) {
          const currentTeam1Score = game.team1Score ?? 0;
          const currentTeam2Score = game.team2Score ?? 0;
          
          if (play[0].team === game.team1) {
            await storage.updateGame(req.params.gameId, {
              team1Score: (currentTeam1Score as number) + play[0].pointsAdded,
            });
          } else if (play[0].team === game.team2) {
            await storage.updateGame(req.params.gameId, {
              team2Score: (currentTeam2Score as number) + play[0].pointsAdded,
            });
          }
        }
      }

      res.json(play[0]);
    } catch (error) {
      console.error("Error creating game play:", error);
      res.status(400).json({ message: "Failed to create game play" });
    }
  });

  const httpServer = createServer(app);

  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws: WebSocket) => {
    console.log('New WebSocket connection');

    ws.on('message', async (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        
        // Handle real-time ball dragging
        if (message.type === 'ball_move' && message.gameId && message.ballPosition !== undefined) {
          // Broadcast to all other clients immediately
          const updateMessage = JSON.stringify({
            type: 'game_update',
            gameId: message.gameId,
            game: { id: message.gameId, ballPosition: message.ballPosition }
          });
          
          wss.clients.forEach((client) => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
              client.send(updateMessage);
            }
          });
          return;
        }

        if (message.type === 'chat') {
          const censoredMessage = censorProfanity(message.message);
          const chatMessage = await storage.createChatMessage({
            username: message.username,
            message: censoredMessage,
            gameId: message.gameId || null,
          });

          const broadcastData = JSON.stringify({
            type: 'chat',
            message: chatMessage,
            gameId: message.gameId,
          });

          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(broadcastData);
            }
          });
        }
      } catch (error) {
        console.error('Error handling WebSocket message:', error);
      }
    });

    ws.on('close', () => {
      console.log('WebSocket connection closed');
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });

  return httpServer;
}
