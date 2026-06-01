import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import bcrypt from "bcrypt";
import { storage } from "./storage";

interface AdminCredentials {
  username: string;
  password: string;
  role: "admin" | "streamer";
}

function getAdminCredentials(): AdminCredentials[] {
  const credentials: AdminCredentials[] = [];
  
  // Default credentials for development
  const adminUser = process.env.ADMIN_USERNAME || "popfork1";
  const adminPass = process.env.ADMIN_PASSWORD || "dairyqueen12";
  console.log(`[AUTH] Loading admin credentials: username=${adminUser}, password=${adminPass}`);
  credentials.push({
    username: adminUser,
    password: adminPass,
    role: "admin"
  });
  
  if (process.env.STREAMER1_USERNAME && process.env.STREAMER1_PASSWORD) {
    credentials.push({
      username: process.env.STREAMER1_USERNAME,
      password: process.env.STREAMER1_PASSWORD,
      role: "streamer"
    });
  }
  
  if (process.env.STREAMER2_USERNAME && process.env.STREAMER2_PASSWORD) {
    credentials.push({
      username: process.env.STREAMER2_USERNAME,
      password: process.env.STREAMER2_PASSWORD,
      role: "streamer"
    });
  }
  
  return credentials;
}

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000;
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.NEON_DATABASE_URL || process.env.DATABASE_URL,
    createTableIfMissing: true,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: sessionTtl,
    },
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());

  app.post("/api/login", async (req, res) => {
    const { username: rawUsername, password } = req.body;
    const username = String(rawUsername || "").trim();
    console.log(`[AUTH] Login attempt: username=${username}`);
    const credentials = getAdminCredentials();
    
    const matchedEnvUser = credentials.find(
      c => c.username.toLowerCase() === username.toLowerCase() && c.password === password
    );
    console.log(`[AUTH] Matched env user: ${JSON.stringify(matchedEnvUser)}`);

    if (matchedEnvUser) {
      // Always look up by username first (case-insensitive) to avoid duplicate key issues
      let user = await storage.getUserByUsername(matchedEnvUser.username);

      if (!user) {
        // Also try by the legacy ID format
        user = await storage.getUser(`user_${matchedEnvUser.username}`);
      }

      if (!user) {
        user = await storage.upsertUser({
          id: `user_${matchedEnvUser.username}`,
          username: matchedEnvUser.username,
          password: matchedEnvUser.password,
          firstName: matchedEnvUser.username,
          lastName: "",
          role: matchedEnvUser.role,
          hasCompletedTour: true,
          coins: 1000,
        });
      } else {
        user = await storage.upsertUser({
          id: user.id,
          username: user.username ?? matchedEnvUser.username,
          password: user.password,
          firstName: matchedEnvUser.username,
          lastName: user.lastName ?? "",
          role: matchedEnvUser.role,
          hasCompletedTour: true,
          coins: user.coins ?? 1000,
        });
      }

      const sessionUserId = user.id;
      
      (req.session as any).authenticated = true;
      (req.session as any).userId = sessionUserId;
      (req.session as any).username = user.username ?? matchedEnvUser.username;
      (req.session as any).role = matchedEnvUser.role;
      (req.session as any).hasCompletedTour = true;
      
      res.json({ success: true });
      return;
    }
    
    const dbUser = await storage.getUserByUsername(username.toLowerCase());
    if (dbUser && dbUser.password) {
      console.log(`Attempting DB login for: ${username}`);
      const passwordMatch = await bcrypt.compare(password, dbUser.password);
      if (passwordMatch) {
        console.log(`Login successful for: ${username}`);
        (req.session as any).authenticated = true;
        (req.session as any).userId = dbUser.id;
        (req.session as any).username = dbUser.username;
        (req.session as any).role = dbUser.role || "guest";
        (req.session as any).hasCompletedTour = dbUser.hasCompletedTour;
        
        res.json({ success: true });
        return;
      } else {
        console.log(`Password mismatch for: ${username}`);
      }
    } else {
      console.log(`No DB user found for: ${username}`);
    }
    
    res.status(401).json({ message: "Invalid credentials" });
  });

  app.post("/api/signup", async (req, res) => {
    const rawUsername = req.body.username;
    const rawPassword = req.body.password;

    if (!rawUsername || !rawPassword) {
      return res.status(400).json({ message: "Username and password are required" });
    }

    const username = String(rawUsername).trim().toLowerCase();
    const password = String(rawPassword);

    if (username.length < 3) {
      return res.status(400).json({ message: "Username must be at least 3 characters" });
    }

    if (username.length > 30) {
      return res.status(400).json({ message: "Username must be 30 characters or less" });
    }

    if (!/^[a-z0-9_]+$/.test(username)) {
      return res.status(400).json({ message: "Username can only contain letters, numbers, and underscores" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const existingUser = await storage.getUserByUsername(username);
    if (existingUser) {
      return res.status(400).json({ message: "Username already taken" });
    }

    try {
      const hashedPassword = await bcrypt.hash(password, 12);
      const user = await storage.createUserWithPassword(username, password, "guest");
      
      (req.session as any).authenticated = true;
      (req.session as any).userId = user.id;
      (req.session as any).username = user.username;
      (req.session as any).role = "guest";

      res.json({ success: true, user: { id: user.id, username: user.username, role: user.role } });
    } catch (error) {
      console.error("Signup error:", error);
      res.status(500).json({ message: "Failed to create account" });
    }
  });

  app.get("/api/logout", (req, res) => {
    req.session.destroy((err) => {
      res.redirect("/");
    });
  });

  app.get("/api/auth/user", async (req, res) => {
    if ((req.session as any).authenticated) {
      const userId = (req.session as any).userId;
      const username = (req.session as any).username;
      const role = (req.session as any).role;
      
      let user = await storage.getUser(userId);
      if (!user) {
        user = await storage.upsertUser({
          id: userId,
          firstName: username,
          lastName: "",
          role: role,
        });
      }
      
      res.json({ 
        id: user.id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role || role,
        hasCompletedTour: Boolean(user.hasCompletedTour),
        authenticated: true 
      });
    } else {
      res.status(401).json({ message: "Unauthorized" });
    }
  });

}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  if ((req.session as any).authenticated) {
    // Backfill role for old sessions that were created before role was stored in session
    if (!(req.session as any).role) {
      const username = (req.session as any).username;
      const adminUsername = process.env.ADMIN_USERNAME || "popfork1";
      if (username === adminUsername) {
        (req.session as any).role = "admin";
      } else if (username) {
        try {
          const user = await storage.getUserByUsername(username);
          if (user?.role) (req.session as any).role = user.role;
        } catch {}
      }
    }
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
};
