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
- **For local SAM CLI** (`sam build` / `sam deploy`): Python 3.8–3.12. Python 3.14 is not supported (SAM uses Pydantic V1). Use [pyenv](https://github.com/pyenv/pyenv) and run `pyenv install 3.12` then `pyenv local 3.12` in this repo, or ensure the `sam` command is run with a compatible Python.

### SAM Build Setup

Ensure all dependencies (Node.js, Python 3.8–3.12, AWS SAM CLI) are installed and backend deps are up to date:

```bash
npm run ensure-sam-deps
```

Then run `sam build`.

### Deploy (two stacks)

Deploy backend first, then frontend (order matters):

```bash
# 1. Build and deploy backend
sam build
sam deploy --config-env prod --resolve-s3 --parameter-overrides \
  JwtSecret=xxx ResendApiKey=xxx RootAdminEmails=xxx FrontendDomain=placeholder

# 2. Get ApiId from backend outputs
API_ID=$(aws cloudformation describe-stacks --stack-name blueberry-pancake-prod \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiId`].OutputValue' --output text)

# 3. Deploy frontend stack
sam deploy --config-env frontend_prod --template-file template-frontend.yaml \
  --parameter-overrides ApiId=$API_ID Environment=prod

# 4. Update backend CORS with real CloudFront domain
FRONTEND_URL=$(aws cloudformation describe-stacks --stack-name blueberry-pancake-frontend-prod \
  --query 'Stacks[0].Outputs[?OutputKey==`FrontendUrl`].OutputValue' --output text)
FRONTEND_DOMAIN=$(echo "$FRONTEND_URL" | sed 's|https://||' | sed 's|/.*||')
sam deploy --config-env prod --parameter-overrides \
  JwtSecret=xxx ResendApiKey=xxx RootAdminEmails=xxx FrontendDomain=$FRONTEND_DOMAIN

# 5. Sync frontend build to S3 and invalidate CloudFront

Or run the full prod deployment script:

```bash
JWT_SECRET=xxx RESEND_API_KEY=re_xxx ROOT_ADMIN_EMAILS="admin@example.com" npm run deploy:prod
```
```

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
