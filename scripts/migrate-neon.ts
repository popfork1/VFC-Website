import postgres from 'postgres';

const url = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
if (!url) throw new Error('No database URL found');

const sql = postgres(url);

async function migrate() {
  console.log('Running Neon schema migrations...');

  const migrations = [
    // games table
    `ALTER TABLE games ADD COLUMN IF NOT EXISTS season integer DEFAULT 2`,
    `ALTER TABLE games ADD COLUMN IF NOT EXISTS is_primetime boolean DEFAULT false`,
    `ALTER TABLE games ADD COLUMN IF NOT EXISTS team1_odds integer DEFAULT 150`,
    `ALTER TABLE games ADD COLUMN IF NOT EXISTS team2_odds integer DEFAULT 150`,
    `ALTER TABLE games ADD COLUMN IF NOT EXISTS last_play text`,
    `ALTER TABLE games ADD COLUMN IF NOT EXISTS ball_position integer DEFAULT 50`,
    // standings table
    `ALTER TABLE standings ADD COLUMN IF NOT EXISTS season integer DEFAULT 2`,
    `ALTER TABLE standings ADD COLUMN IF NOT EXISTS manual_order integer`,
    // users table
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS has_completed_tour boolean DEFAULT false`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS coins integer DEFAULT 1000`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS role varchar(20) DEFAULT 'admin'`,
  ];

  // Create teams/players/player_stats if missing
  const tableStatements = [
    `CREATE TABLE IF NOT EXISTS teams (id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(), name VARCHAR(100) NOT NULL UNIQUE, logo TEXT, colors VARCHAR(100), description TEXT, founded_year INTEGER, city VARCHAR(100), division VARCHAR(10), created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS players (id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(), name VARCHAR(100) NOT NULL, number INTEGER, position VARCHAR(10), team_id VARCHAR NOT NULL REFERENCES teams(id) ON DELETE CASCADE, created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW())`,
    `CREATE TABLE IF NOT EXISTS player_stats (id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(), player_name VARCHAR(100) NOT NULL, team VARCHAR(100) NOT NULL, position VARCHAR(10) NOT NULL, passing_yards INTEGER DEFAULT 0, passing_touchdowns INTEGER DEFAULT 0, interceptions INTEGER DEFAULT 0, completions INTEGER DEFAULT 0, attempts INTEGER DEFAULT 0, sacks INTEGER DEFAULT 0, rushing_yards INTEGER DEFAULT 0, rushing_touchdowns INTEGER DEFAULT 0, rushing_attempts INTEGER DEFAULT 0, missed_tackles_forced INTEGER DEFAULT 0, receiving_yards INTEGER DEFAULT 0, receiving_touchdowns INTEGER DEFAULT 0, receptions INTEGER DEFAULT 0, targets INTEGER DEFAULT 0, yards_after_catch INTEGER DEFAULT 0, defensive_interceptions INTEGER DEFAULT 0, passes_defended INTEGER DEFAULT 0, completions_allowed INTEGER DEFAULT 0, targets_allowed INTEGER DEFAULT 0, swats INTEGER DEFAULT 0, defensive_touchdowns INTEGER DEFAULT 0, defensive_sacks INTEGER DEFAULT 0, tackles INTEGER DEFAULT 0, defensive_misses INTEGER DEFAULT 0, safeties INTEGER DEFAULT 0, defensive_points INTEGER DEFAULT 0, week INTEGER NOT NULL, created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW())`,
  ];
  for (const stmt of tableStatements) {
    try {
      await sql.unsafe(stmt);
      console.log(`✓ ${stmt.slice(0, 60)}...`);
    } catch (e: any) {
      console.error(`✗ ${stmt.slice(0, 60)}... — ${e.message}`);
    }
  }

  for (const stmt of migrations) {
    try {
      await sql.unsafe(stmt);
      console.log(`✓ ${stmt.slice(0, 60)}...`);
    } catch (e: any) {
      console.error(`✗ ${stmt.slice(0, 60)}... — ${e.message}`);
    }
  }

  await sql.end();
  console.log('Done.');
}

migrate().catch(console.error);
