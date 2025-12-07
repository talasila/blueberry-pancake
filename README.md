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

## Development

See `specs/001-baseline-setup/quickstart.md` for detailed setup instructions.

## License

ISC
