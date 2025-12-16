# Audio Capture Studio

## Overview

A professional radio-style podcast recording studio web application. The platform enables hosts to create recording sessions, invite guests via shareable links, and capture high-quality audio with real-time participant management. The interface mimics professional audio applications like Riverside.fm and StreamYard, featuring audio level visualization, recording controls, and music player integration.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite with custom plugins for Replit integration
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state, React hooks for local state
- **Styling**: Tailwind CSS with custom theme configuration supporting light/dark modes
- **UI Components**: Shadcn/ui component library (Radix UI primitives + Tailwind)
- **Form Handling**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript (ESM modules)
- **Real-time Communication**: Socket.IO for WebSocket-based session management
- **Build**: esbuild for server bundling, Vite for client
- **Development**: tsx for TypeScript execution without compilation

### Data Layer
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema Validation**: Drizzle-Zod for type-safe schema definitions
- **Current Storage**: In-memory storage (MemStorage class) with interface ready for database migration
- **Database Schema**: Users table and Sessions table defined in shared/schema.ts

### Key Design Patterns
- **Shared Types**: Schema definitions in `/shared` directory accessible to both client and server
- **Path Aliases**: `@/` for client source, `@shared/` for shared modules
- **API Layer**: RESTful endpoints under `/api/` with Socket.IO on `/ws` path
- **Session-based Architecture**: Sessions contain participants with real-time state synchronization

### Audio Features
- Real-time audio level visualization per participant
- MP3 encoding via lamejs library for downloadable recordings
- Screen audio capture with automatic sharing to all guests via WebRTC
- Recording state management (start/stop/pause)
- Music player integration with track search and playback controls
- Mixed stream recording that captures all participants and screen audio

### Recent Changes (December 2024)
- Added MP3 download support - recordings are now converted to MP3 format using lamejs
- Fixed audio recording with proper MIME type selection for better browser compatibility
- Screen audio sharing now works for all guests including late joiners via WebRTC renegotiation

## External Dependencies

### Database
- **PostgreSQL**: Primary database (configured via DATABASE_URL environment variable)
- **Drizzle Kit**: Database migrations and schema management (`db:push` script)

### Real-time Communication
- **Socket.IO**: WebSocket server for live session updates, participant management, and recording state synchronization

### Audio Processing
- **lamejs**: Client-side MP3 encoding for audio recording

### UI Framework Dependencies
- **Radix UI**: Full suite of accessible, unstyled primitives (dialog, dropdown, tabs, etc.)
- **Embla Carousel**: Carousel/slider functionality
- **Recharts**: Charting library for data visualization
- **Vaul**: Drawer component
- **cmdk**: Command palette component

### Form & Validation
- **React Hook Form**: Form state management
- **Zod**: Schema validation (shared between client and server)

### Development Tools
- **Vite plugins**: Replit-specific plugins for development (cartographer, dev-banner, runtime-error-modal)