# Quickstart Guide: Baseline Project Setup

**Date**: 2025-01-27  
**Feature**: Baseline Project Setup

## Prerequisites

- Node.js 22.12.0 or higher (see `.nvmrc` file)
- npm or yarn package manager
- Git

**Note**: If using nvm, run `nvm use` to automatically switch to the correct Node.js version.

## Initial Setup

### 1. Clone and Navigate

```bash
git clone <repository-url>
cd blueberry-pancake
git checkout 001-baseline-setup
```

### 2. Install Dependencies

```bash
# Install root workspace dependencies (if any)
npm install

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 3. Configure Application

Create `config/app-config.json` in the project root:

```json
{
  "environment": "development",
  "dataDirectory": "./data",
  "server": {
    "port": 3000,
    "host": "localhost"
  },
  "cache": {
    "enabled": true,
    "ttl": 3600,
    "maxSize": 100
  },
  "security": {
    "jwtSecret": "CHANGE_THIS_IN_PRODUCTION",
    "jwtExpiration": "24h",
    "xsrfEnabled": true
  },
  "frontend": {
    "apiBaseUrl": "http://localhost:3000/api"
  }
}
```

**Important**: Set `JWT_SECRET` environment variable in production (never commit secrets).

### 4. Create Data Directory Structure

```bash
mkdir -p data/events
```

The application will create event-specific directories automatically when events are created.

### 5. Environment Variables

Create `.env` file in backend directory (if needed):

```bash
# Backend .env
JWT_SECRET=your-secret-key-here
NODE_ENV=development
```

## Running the Application

### Development Mode

**Terminal 1 - Backend**:
```bash
cd backend
npm run dev
```

Backend should start on `http://localhost:3000`

**Terminal 2 - Frontend**:
```bash
cd frontend
npm run dev
```

Frontend should start on `http://localhost:5173` (or configured port)

### Production Build

**Backend**:
```bash
cd backend
npm run build
npm start
```

**Frontend**:
```bash
cd frontend
npm run build
npm run preview  # or serve with static file server
```

## Running Tests

### Unit Tests (Vitest)

**Backend**:
```bash
cd backend
npm test
```

**Frontend**:
```bash
cd frontend
npm test
```

### E2E Tests (Playwright + Cucumber)

```bash
# From project root
cd frontend
npm run test:e2e
```

**Note**: E2E tests require both backend and frontend to be running.

## Project Structure Verification

After setup, verify the structure:

```
blueberry-pancake/
├── backend/
│   ├── src/
│   │   ├── config/          ✅ Configuration management
│   │   ├── data/             ✅ Data access layer
│   │   ├── services/         ✅ Business logic
│   │   ├── api/              ✅ API routes
│   │   ├── middleware/       ✅ Express middleware
│   │   └── cache/           ✅ Caching layer
│   └── tests/
│       ├── unit/             ✅ Unit tests
│       └── integration/      ✅ Integration tests
├── frontend/
│   ├── src/
│   │   ├── components/       ✅ React components
│   │   ├── pages/            ✅ Page components
│   │   ├── services/         ✅ API client
│   │   ├── hooks/            ✅ Custom hooks
│   │   ├── utils/            ✅ Utilities
│   │   └── styles/          ✅ Centralized styles
│   └── tests/
│       └── e2e/              ✅ E2E tests
│           ├── features/     ✅ Gherkin .feature files
│           └── specs/        ✅ Generated .spec files
├── data/                     ✅ Event data directory
│   └── events/
├── config/                   ✅ Application configuration
│   └── app-config.json
└── specs/                    ✅ Feature specifications
    └── 001-baseline-setup/
```

## Verification Checklist

After setup, verify:

- [ ] Backend starts without errors
- [ ] Frontend starts without errors
- [ ] Configuration file is read correctly
- [ ] Data directory structure exists
- [ ] Unit tests run successfully
- [ ] E2E test infrastructure is configured
- [ ] Application renders on mobile viewport (320px-768px)

## Common Issues

### Port Already in Use

If port 3000 is in use, update `config/app-config.json`:
```json
{
  "server": {
    "port": 3001
  }
}
```

### Module Resolution Errors

Ensure you're using Node.js 18+ and all dependencies are installed:
```bash
node --version  # Should be 18+
npm install     # In both backend and frontend
```

### Configuration Not Found

Ensure `config/app-config.json` exists in project root and contains valid JSON.

### Cache Issues

Clear cache if experiencing stale data:
```bash
# Restart the application to clear in-memory cache
```

## Next Steps

After baseline setup is complete:

1. Verify all success criteria from spec.md are met
2. Run full test suite
3. Proceed to feature development using `/speckit.specify` and `/speckit.plan`

## Development Workflow

1. **Create Feature Spec**: `/speckit.specify "Feature description"`
2. **Plan Implementation**: `/speckit.plan`
3. **Generate Tasks**: `/speckit.tasks`
4. **Implement**: Follow tasks.md
5. **Test**: Run unit and E2E tests
6. **Review**: Ensure constitution compliance

## Support

For issues or questions:
- Check `specs/001-baseline-setup/` documentation
- Review constitution at `.specify/memory/constitution.md`
- Consult research.md for technology decisions
