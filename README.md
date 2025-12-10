# Blueberry Pancake - Blind Tasting Event Management

A mobile-first web application for managing blind tasting events where users can create events and rate items.

## Project Structure

```
blueberry-pancake/
├── backend/          # Node.js backend (Express)
├── frontend/         # React frontend (Vite)
├── data/            # Event data storage (JSON/CSV)
├── config/          # Application configuration
└── specs/           # Feature specifications
```

## Prerequisites

- Node.js 22.12.0 or higher (upgraded from 18+ for latest package compatibility)
- npm or yarn

## Quick Start

### 1. Install Dependencies

```bash
# Install root workspace dependencies
npm install

# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install
```

### 2. Configure Application

Create `config/default.json` (already provided) and set environment variables:

```bash
# Backend .env (optional, can use config files)
JWT_SECRET=your-secret-key-here
NODE_ENV=development
```

### 3. Run Application

**Terminal 1 - Backend**:
```bash
cd backend
npm run dev
```

Backend runs on `http://localhost:3000`

**Terminal 2 - Frontend**:
```bash
cd frontend
npm run dev
```

Frontend runs on `http://localhost:5173`

## Technology Stack

- **Backend**: Node.js, Express, JWT, CSRF protection (csrf package), node-cache
- **Frontend**: React, Vite, Tailwind CSS, shadcn UI
- **Testing**: Vitest (unit), Playwright + Cucumber (E2E)
- **Data Storage**: File-based (JSON/CSV) with database abstraction layer

## Features

### Event Rating Page (009-event-rating-page)

Users can rate items in events with the following features:
- **Dialpad-style item buttons**: Items displayed as numbered buttons (iPhone dialpad style)
- **Rating drawer**: Slide-out drawer with state-based content
- **Rating submission**: Submit ratings with optional notes (500 char limit)
- **Rating colors**: Buttons colored based on user's rating
- **Bookmarks**: Bookmark items for later review (session-only)
- **State-based messages**: Appropriate messages for created/paused/completed states
- **Caching**: In-memory caching with periodic refresh and invalidation
- **Error handling**: Retry logic, error boundaries, loading states

See `specs/009-event-rating-page/` for detailed specification and implementation guide.

## Development

See `specs/001-baseline-setup/quickstart.md` for detailed setup instructions.

## License

ISC
