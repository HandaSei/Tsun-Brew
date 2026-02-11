# Tsun Brew - Tea Discovery & Tracking App

## Overview

Tsun Brew is a full-stack web application for tea enthusiasts to discover, track, and brew teas. Users can browse a tea library, log their tastings with personal scores, track brewing sessions with a timer, and share brewing guides and reviews. The app features role-based access control with admin, moderator, and user roles.

## Recent Changes
- Added database-driven tea types system with custom HSL colors (teaTypes table)
- Admin Dashboard now has 3 tabs: Users, Tea Types (add/edit/delete with color sliders), Branding
- Site branding controls: site name, status tag, logo URL, font family — stored in siteSettings table
- Navigation dynamically displays site name, logo, and status tag badge from DB
- Three-phase theme system: Light (warm cream) → Dusk (matte green-dark) → Dark (true black with smoky accents)
- Theme toggle cycles through Sun/Sunset/Moon icons; localStorage migration from old "dark" to "dusk"
- CSS uses .dusk (adds both .dusk and .dark classes) and .dark:not(.dusk) for true dark theme
- Moved Brewing Parameters from Details tab into Brew Timer tab
- Formatted leaf/water amounts as "Xg of leaves for Yml of water" when both values present
- Tea type colors stored as HSL (colorHue, colorSaturation, colorLightness) integers
- TeaCard, TeaDetails badges, and CreateTeaForm type select all use DB-driven tea types

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