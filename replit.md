# URFL Fan Hub

## Overview

URFL Fan Hub is a fantasy football league web application with a Christmas-themed design. It provides live game scores, news updates, pick'em predictions, standings, playoff brackets, and real-time chat functionality. The platform supports both public viewing and admin/streamer authentication for content management.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom Christmas theme (forest green, red, gold color palette)
- **Build Tool**: Vite with React plugin

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript (ESM modules)
- **API Design**: RESTful endpoints under `/api/*` prefix
- **Real-time**: WebSocket server for live chat functionality
- **Authentication**: Session-based auth with PostgreSQL session store (supports admin and streamer roles)

### Data Storage
- **Database**: PostgreSQL via Drizzle ORM
- **Driver**: postgres-js (works with both Neon serverless and standard PostgreSQL)
- **Schema Location**: `shared/schema.ts` contains all table definitions
- **Migrations**: Drizzle Kit for schema management (`npm run db:push`)

### Key Data Models
- **Games**: Week-based matchups with scores, live status, quarters, and stream links
- **Standings**: Team records organized by conference divisions (AFC/NFC)
- **News**: Article posts with title, content, author
- **Pick'ems**: Weekly prediction contests with external form links
- **Chat Messages**: Real-time game-specific chat
- **Predictions**: Fan voting on game outcomes
- **Changelogs**: Version-tracked feature updates

### Build and Deployment
- **Development**: `npm run dev` runs Vite dev server with HMR
- **Production Build**: Vite builds client to `dist/public`, esbuild bundles server to `dist/index.js`
- **Deployment Target**: Render.com (builds via GitHub integration)

## External Dependencies

### Database
- PostgreSQL database (configured via `DATABASE_URL` environment variable)
- Neon serverless PostgreSQL compatible

### Session Management
- `connect-pg-simple`: PostgreSQL session store for Express sessions
- Sessions stored in `sessions` table

### Authentication
- Simple username/password authentication (not OAuth)
- **Password Hashing**: bcrypt with 12 rounds for secure password storage
- Primary admin credentials via environment variables: `ADMIN_USERNAME`, `ADMIN_PASSWORD` (defaults: popfork1/dairyqueen12)
- Additional streamers can be created via the admin panel and stored in the database
- **Guest Signup**: Users can create their own accounts via `/api/signup` endpoint
- Roles: "admin" (full access), "streamer" (stream links only), or "guest" (personal settings only)

### User Management API (Admin Only)
- `GET /api/users` - List all users
- `POST /api/users` - Create new user with username, password, and role
- `PATCH /api/users/:id/role` - Update user role
- `DELETE /api/users/:id` - Delete a user

### Public Authentication API
- `POST /api/signup` - Create a guest account (requires username, email, password)
  - Username: 3-30 characters, alphanumeric and underscores only
  - Email: Valid email format required
  - Password: Minimum 6 characters
- `POST /api/login` - Authenticate existing user
- `GET /api/logout` - End current session

### User Preferences
- All authenticated users (including guests) can save preferences
- `GET /api/user/preferences` - Get current user's preferences
- `POST /api/user/preferences` - Update preferences (favorite team, dark mode, logos, animations, notifications)

### Third-Party UI Libraries
- Radix UI primitives for accessible components
- Lucide React for icons
- React Icons for additional icon sets (Discord, etc.)

### Date/Time
- date-fns and date-fns-tz for timezone-aware date formatting (displays in EST)

### External Links
- Discord server integration
- YouTube channel links
- External Google Forms for pick'em submissions