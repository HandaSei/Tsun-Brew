# Tsun Brew - Tea Discovery & Tracking App

## Overview

Tsun Brew is a full-stack web application for tea enthusiasts to discover, track, and brew teas. Users can browse a tea library, log their tastings with personal scores, track brewing sessions with a timer, and share brewing guides and reviews. The app features role-based access control with admin, moderator, and user roles.

## Recent Changes
- Mobile background timer fix: Rewrote BrewTimer to use timestamp-based countdown (endTimeRef + Date.now()) instead of interval-based, preventing timer pause when browser is backgrounded on Android/iOS
- Service worker (sw.js) handles background timer notifications with START_TIMER/CANCEL_TIMER messages and scheduled setTimeout
- Wake Lock API prevents screen sleep during active brewing sessions
- Consolidated timer completion into single handleTimerComplete function with completedRef guard to prevent double-completion
- pausedRemainingRef for accurate pause/resume behavior; progress bar uses remaining/totalSeconds ratio
- Trending teas system: trendingTeasCache table, trendingWindowHours/trendingRefreshHours in siteSettings (defaults 48h/24h)
- Trending section on Home page (between Custom Additions and Latest Additions) with TrendingUp icon, shows top 10 most-brewed teas; clickable heading redirects to Browse page with "Trending Now" sort
- Browse page: added "Trending Now" option to Sort by panel (limited to top 36 teas)
- Trending falls back to all-time most brewed teas if recent activity < 5 teas; auto-refresh hourly, recompute based on refresh interval
- Admin Trending controls in Branding tab: window hours, refresh interval, manual "Refresh Trending Now" button
- Server-side validation enforces trendingWindowHours/trendingRefreshHours >= 1
- Flexible tea scoring system: scoringSystems table (name, maxScore, logoUrl, logoPosition, isActive), teaScores table (userId, teaId, scoringSystemId, score), userPreferences table (preferredScoringSystemId)
- ScoreWidget component (compact/full modes): shows user's score, community average (normalized to user's preferred system), submit/edit score dialog
- Community scores only displayed after reaching configurable minimum vote threshold (minCommunityVotes in siteSettings, default 15)
- Admin "Scoring" tab for managing scoring systems (create, edit, delete, toggle active, set logo/position)
- User Settings page (/settings) with preferred scoring system selector, accessible via clickable username in navigation
- ScoreWidget integrated into TeaDetails page (full mode) and MyList page (compact mode)
- Admin Dashboard now has 5 tabs: Users, Tea Types, Branding, Bottom Bar, Scoring
- Collection Phrases system: dynamic badges when visiting another user's collection, based on owner/visitor status combinations (e.g. "I had it first!", "Eyeing mine?", etc.)
- Admin "Collection Phrases" tab to customize phrase text, icon, and color for all 9 status combinations
- collectionPhrases table with ownerStatus, visitorStatus, phrase, color HSL, icon name; seeded with default phrases
- Brewing parameter system overhaul: Added 6 new teas fields (showOriental, showOccidental, orientalTimerEnabled, occidentalTimerEnabled, brewingNote, showBrewingNote)
- Edit Tea Details form: Visibility & Display section with toggles for showing/hiding oriental/occidental in parameters, enabling/disabling in timer, and brewing note with toggle
- Recommended Brewing Parameters display: renamed from "Brewing Parameters", respects visibility toggles, shows brewing note when enabled, shows "No parameters set" when empty
- Brew Timer: respects orientalTimerEnabled/occidentalTimerEnabled flags, "Reset to Recommended" button restores tea defaults, method selector only shows enabled methods
- Added footer/bottom bar system: footerLinks and pages tables, Footer component, DynamicPage for /page/:slug routes
- Admin "Bottom Bar" tab for managing footer links and creating/editing dynamic pages
- Default "About" page and footer link seeded in production data
- Favicon URL field in branding settings with dynamic favicon updates
- Logo and top bar sizing: logo 12x12, top bar 4.5rem, footer logo 1.5x (4.5rem)
- Security: Admin credentials moved from hardcoded values to environment variables (ADMIN_USERNAME, ADMIN_PASSWORD)
- Security: Password recovery changed from sending plaintext temp password + username via email to secure time-limited reset token links (/reset-password page)
- Reworked auth: persistent PostgreSQL sessions (connect-pg-simple), email verification OTP during registration, password reset via secure token link
- Users table now has `email` (unique) and `emailVerified` fields; `verificationCodes` table for OTP codes
- Registration is two-step: enter details → receive 6-digit OTP via email → verify to create account
- One account per email enforced at DB level (unique constraint) and checked during registration
- Forgot password sends a secure time-limited reset link to the user's email via Resend API
- Email sending via Resend SDK (RESEND_API_KEY secret); email utility in server/email.ts
- Sessions stored in PostgreSQL `user_sessions` table with 30-day cookie expiry (connect-pg-simple)
- Build output changed from CJS to ESM (dist/index.mjs) with CJS wrapper for deployment compatibility
- Added database-driven tea types system with custom HSL colors (teaTypes table)
- Admin Dashboard has 4 tabs: Users, Tea Types (add/edit/delete with color sliders), Branding, Bottom Bar
- Three-phase theme system: Light → Dusk → Dark with cycling toggle

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state caching and synchronization
- **Styling**: Tailwind CSS with CSS variables for theming
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Forms**: React Hook Form with Zod validation
- **Charts**: Recharts for radar charts (tea taste profiles)
- **Timer**: react-circular-progressbar for brew timer visualization

### Backend Architecture
- **Runtime**: Node.js with Express 5
- **Language**: TypeScript with ESM modules
- **Build Tool**: esbuild for server bundling, Vite for client
- **API Pattern**: RESTful endpoints defined in `shared/routes.ts` with Zod schemas for type-safe request/response handling

### Authentication & Authorization
- **Strategy**: Passport.js with Local Strategy (username/password)
- **Session Management**: Express sessions stored in memory (MemoryStore)
- **Password Security**: scrypt hashing with random salts
- **Role System**: Three-tier roles (admin, mod, user) for access control

### Data Storage
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM with drizzle-zod for schema-to-validation integration
- **Schema Location**: `shared/schema.ts` (shared between client and server)
- **Migrations**: Drizzle Kit with `db:push` command

### Key Data Models
- **Users**: Authentication and role management
- **Teas**: Main tea catalog with type, origin, cultivar, and photos
- **TeaAttributes**: Flexible key-value pairs for custom tea properties
- **TeaLogs**: User's personal tea list with scores, brew count, and status (drinking/completed/want_to_try)
- **BrewingGuides**: Community-contributed brewing instructions per tea
- **Reviews**: User reviews and ratings for teas

### Project Structure
```
├── client/           # React frontend
│   └── src/
│       ├── components/   # UI components including shadcn/ui
│       ├── hooks/        # Custom React hooks for data fetching
│       ├── pages/        # Route pages (Home, Auth, TeaDetails, MyList, Admin)
│       └── lib/          # Utilities and query client config
├── server/           # Express backend
│   ├── auth.ts       # Passport authentication setup
│   ├── db.ts         # Database connection
│   ├── routes.ts     # API route handlers
│   └── storage.ts    # Database access layer
├── shared/           # Shared code between client/server
│   ├── schema.ts     # Drizzle table definitions and Zod schemas
│   └── routes.ts     # API route contracts and type definitions
└── migrations/       # Database migrations
```

### Development vs Production
- **Development**: Vite dev server with HMR, served through Express middleware
- **Production**: Static files built to `dist/public`, served by Express static middleware

## External Dependencies

### Database
- **PostgreSQL**: Primary database, connection via `DATABASE_URL` environment variable
- **Drizzle ORM**: Type-safe database queries and schema management

### UI Libraries
- **Radix UI**: Headless, accessible component primitives (dialogs, dropdowns, tabs, etc.)
- **Recharts**: Data visualization for tea taste profile radar charts
- **react-circular-progressbar**: Visual timer component for brewing sessions
- **Lucide React**: Icon library

### Authentication
- **Passport.js**: Authentication middleware
- **passport-local**: Username/password authentication strategy
- **express-session**: Session management
- **memorystore**: In-memory session store (development/simple production)

### Build & Development
- **Vite**: Frontend build tool with React plugin
- **esbuild**: Server bundling for production
- **TypeScript**: Type checking across the entire codebase

### Replit-Specific
- **@replit/vite-plugin-runtime-error-modal**: Error overlay for development
- **@replit/vite-plugin-cartographer**: Development tooling
- **@replit/vite-plugin-dev-banner**: Development environment indicator