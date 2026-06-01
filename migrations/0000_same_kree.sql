CREATE TABLE "bracket_images" (
        "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "image_url" text NOT NULL,
        "updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "changelogs" (
        "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "version" varchar(20) NOT NULL,
        "title" varchar(200) NOT NULL,
        "description" text,
        "status" text NOT NULL,
        "changes" text NOT NULL,
        "date" varchar(50) NOT NULL,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now(),
        CONSTRAINT "changelogs_version_unique" UNIQUE("version")
);
--> statement-breakpoint
CREATE TABLE "chat_messages" (
        "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "username" varchar(100) NOT NULL,
        "message" text NOT NULL,
        "game_id" varchar,
        "created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "games" (
        "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
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
        "is_primetime" boolean DEFAULT false,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "news" (
        "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "title" varchar(300) NOT NULL,
        "content" text NOT NULL,
        "excerpt" text,
        "author_id" varchar NOT NULL,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "pickem_rules" (
        "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "content" text NOT NULL,
        "updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "pickems" (
        "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "week" integer NOT NULL,
        "pickem_url" text NOT NULL,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now(),
        CONSTRAINT "pickems_week_unique" UNIQUE("week")
);
--> statement-breakpoint
CREATE TABLE "playoff_matches" (
        "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
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
);
--> statement-breakpoint
CREATE TABLE "predictions" (
        "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "game_id" varchar NOT NULL,
        "voted_for" varchar(100) NOT NULL,
        "created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sessions" (
        "sid" varchar PRIMARY KEY NOT NULL,
        "sess" jsonb NOT NULL,
        "expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "standings" (
        "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "team" varchar(100) NOT NULL,
        "division" varchar(10) NOT NULL,
        "wins" integer DEFAULT 0,
        "losses" integer DEFAULT 0,
        "point_differential" integer DEFAULT 0,
        "manual_order" integer,
        "updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "stream_requests" (
        "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "game_id" varchar NOT NULL,
        "user_id" varchar NOT NULL,
        "stream_link" text,
        "status" varchar(20) DEFAULT 'pending',
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
        "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "username" varchar,
        "password" varchar(255),
        "email" varchar,
        "first_name" varchar,
        "last_name" varchar,
        "profile_image_url" varchar,
        "has_completed_tour" boolean DEFAULT false,
        "role" varchar(20) DEFAULT 'admin',
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now(),
        CONSTRAINT "users_email_unique" UNIQUE("email"),
        CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");