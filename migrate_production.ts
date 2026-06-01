import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('DATABASE_URL not found');
  process.exit(1);
}

const sql = postgres(connectionString);

async function createTables() {
  try {
    console.log('Creating sessions table...');
    await sql`
      CREATE TABLE IF NOT EXISTS "sessions" (
        "sid" varchar PRIMARY KEY,
        "sess" jsonb NOT NULL,
        "expire" timestamp NOT NULL
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "sessions" ("expire")`;
    console.log('✓ Sessions table created');

    console.log('Creating users table...');
    await sql`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        "username" varchar(100) UNIQUE,
        "password" varchar(255),
        "email" varchar UNIQUE,
        "first_name" varchar,
        "last_name" varchar,
        "profile_image_url" varchar,
        "role" varchar(20) DEFAULT 'admin',
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now()
      )
    `;
    console.log('✓ Users table created');

    console.log('Creating games table...');
    await sql`
      CREATE TABLE IF NOT EXISTS "games" (
        "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        "week" integer NOT NULL,
        "team1" varchar(100) NOT NULL,
        "team2" varchar(100) NOT NULL,
        "team1_score" integer DEFAULT 0,
        "team2_score" integer DEFAULT 0,
        "quarter" varchar(20) DEFAULT 'Scheduled',
        "game_time" timestamp,
        "location" varchar(200),
        "is_final" boolean DEFAULT false,
        "is_live" boolean DEFAULT false,
        "stream_link" text,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now()
      )
    `;
    console.log('✓ Games table created');

    console.log('Creating news table...');
    await sql`
      CREATE TABLE IF NOT EXISTS "news" (
        "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        "title" varchar(300) NOT NULL,
        "content" text NOT NULL,
        "excerpt" text,
        "author_id" varchar NOT NULL,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now()
      )
    `;
    console.log('✓ News table created');

    console.log('Creating chat_messages table...');
    await sql`
      CREATE TABLE IF NOT EXISTS "chat_messages" (
        "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        "username" varchar(100) NOT NULL,
        "message" text NOT NULL,
        "game_id" varchar,
        "created_at" timestamp DEFAULT now()
      )
    `;
    console.log('✓ Chat messages table created');

    console.log('Creating pickems table...');
    await sql`
      CREATE TABLE IF NOT EXISTS "pickems" (
        "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        "week" integer NOT NULL UNIQUE,
        "pickem_url" text NOT NULL,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now()
      )
    `;
    console.log('✓ Pickems table created');

    console.log('Creating pickem_rules table...');
    await sql`
      CREATE TABLE IF NOT EXISTS "pickem_rules" (
        "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        "content" text NOT NULL,
        "updated_at" timestamp DEFAULT now()
      )
    `;
    console.log('✓ Pickem rules table created');

    console.log('Creating standings table...');
    await sql`
      CREATE TABLE IF NOT EXISTS "standings" (
        "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        "team" varchar(100) NOT NULL,
        "division" varchar(10) NOT NULL,
        "wins" integer DEFAULT 0,
        "losses" integer DEFAULT 0,
        "point_differential" integer DEFAULT 0,
        "manual_order" integer,
        "updated_at" timestamp DEFAULT now()
      )
    `;
    console.log('✓ Standings table created');

    console.log('Creating playoff_matches table...');
    await sql`
      CREATE TABLE IF NOT EXISTS "playoff_matches" (
        "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        "round" varchar(50) NOT NULL,
        "match_number" integer NOT NULL,
        "seed1" integer,
        "seed2" integer,
        "team1" varchar(100),
        "team2" varchar(100),
        "team1_score" integer,
        "team2_score" integer,
        "winner" varchar(100),
        "is_complete" boolean DEFAULT false,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now()
      )
    `;
    console.log('✓ Playoff matches table created');

    console.log('Creating changelogs table...');
    await sql`
      CREATE TABLE IF NOT EXISTS "changelogs" (
        "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        "version" varchar(20) NOT NULL UNIQUE,
        "title" varchar(200) NOT NULL,
        "description" text,
        "status" text NOT NULL,
        "changes" text NOT NULL,
        "date" varchar(50) NOT NULL,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now()
      )
    `;
    console.log('✓ Changelogs table created');

    console.log('Creating predictions table...');
    await sql`
      CREATE TABLE IF NOT EXISTS "predictions" (
        "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        "game_id" varchar NOT NULL,
        "user_id" varchar NOT NULL,
        "voted_for" varchar(100) NOT NULL,
        "created_at" timestamp DEFAULT now()
      )
    `;
    console.log('✓ Predictions table created');

    // Add user_id column to existing predictions tables
    try {
      await sql`
        ALTER TABLE "predictions"
        ADD COLUMN user_id varchar NOT NULL DEFAULT 'unknown'
      `;
      console.log('✓ Predictions user_id column added');
    } catch (err) {
      // Column already exists, continue
      console.log('✓ Predictions user_id column already exists');
    }

    console.log('Creating bracket_images table...');
    await sql`
      CREATE TABLE IF NOT EXISTS "bracket_images" (
        "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        "image_url" text NOT NULL,
        "updated_at" timestamp DEFAULT now()
      )
    `;
    console.log('✓ Bracket images table created');

    console.log('Creating stream_requests table...');
    await sql`
      CREATE TABLE IF NOT EXISTS "stream_requests" (
        "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        "game_id" varchar NOT NULL,
        "user_id" varchar NOT NULL,
        "stream_link" text,
        "status" varchar(20) DEFAULT 'pending',
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now()
      )
    `;
    console.log('✓ Stream requests table created');

    console.log('Creating settings table...');
    await sql`
      CREATE TABLE IF NOT EXISTS "settings" (
        "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        "key" varchar(100) NOT NULL UNIQUE,
        "value" text NOT NULL,
        "updated_at" timestamp DEFAULT now()
      )
    `;
    console.log('✓ Settings table created');

    console.log('Creating partners table...');
    await sql`
      CREATE TABLE IF NOT EXISTS "partners" (
        "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" varchar(200) NOT NULL,
        "quote" text NOT NULL,
        "image_url" text,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now()
      )
    `;
    console.log('✓ Partners table created');

    console.log('Creating user_preferences table...');
    await sql`
      CREATE TABLE IF NOT EXISTS "user_preferences" (
        "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" varchar NOT NULL UNIQUE,
        "particle_effects" integer DEFAULT 100,
        "dark_mode" boolean DEFAULT false,
        "compact_layout" boolean DEFAULT false,
        "show_team_logos" boolean DEFAULT true,
        "reduce_animations" boolean DEFAULT false,
        "favorite_team" varchar(100),
        "notify_game_live" boolean DEFAULT true,
        "notify_game_final" boolean DEFAULT true,
        "notify_news" boolean DEFAULT true,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now()
      )
    `;
    console.log('✓ User preferences table created');

    console.log('\n✓ All tables created successfully!');
    await sql.end();
  } catch (err) {
    console.error('Error creating tables:', err);
    await sql.end();
    process.exit(1);
  }
}

createTables();
