# Data Model: Baseline Project Setup

**Date**: 2025-01-27  
**Feature**: Baseline Project Setup

## Overview

This document defines the data structures for the baseline project setup. Since this is infrastructure setup (not feature implementation), the focus is on configuration data structures and the abstraction layer for future data entities.

## Configuration Data Structures

### Application Configuration (`config/app-config.json`)

**Purpose**: System-wide application settings

**Structure**:
```json
{
  "environment": "development|staging|production",
  "dataDirectory": "/path/to/data/directory",
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
    "jwtSecret": "environment-variable-reference",
    "jwtExpiration": "24h",
    "xsrfEnabled": true
  },
  "frontend": {
    "apiBaseUrl": "http://localhost:3000/api"
  }
}
```

**Fields**:
- `environment`: Current environment identifier
- `dataDirectory`: Absolute or relative path to event data directory
- `server`: Backend server configuration
- `cache`: Caching layer configuration (TTL in seconds, max cache entries)
- `security`: JWT and XSRF configuration
- `frontend`: Frontend API endpoint configuration

**Validation Rules**:
- `dataDirectory` must be a valid path (absolute or relative to app root)
- `server.port` must be a valid port number (1-65535)
- `cache.ttl` must be positive integer (seconds)
- `security.jwtSecret` should reference environment variable, not hardcoded value

### Event Configuration (`data/events/[event-id]/config.json`)

**Purpose**: Event-specific settings and structure (for future feature development)

**Structure** (example for future use):
```json
{
  "eventId": "event-001",
  "name": "Blind Tasting Event",
  "createdAt": "2025-01-27T00:00:00Z",
  "items": [
    {
      "itemId": "item-001",
      "name": "Wine A",
      "category": "red"
    }
  ],
  "ratingCriteria": {
    "scale": 1-10,
    "categories": ["aroma", "taste", "finish"]
  }
}
```

**Note**: This structure is documented for future feature development. The baseline setup only ensures the directory structure exists.

### Event Data (`data/events/[event-id]/data.csv`)

**Purpose**: Participant ratings and responses (for future feature development)

**Structure** (example for future use):
```csv
participantId,timestamp,itemId,rating,notes
user-001,2025-01-27T10:00:00Z,item-001,8,"Great aroma"
user-002,2025-01-27T10:05:00Z,item-001,7,"Smooth finish"
```

**Note**: CSV format per DS-003. Structure will be defined when event features are implemented.

## Data Access Abstraction Layer

### Repository Interface

**Purpose**: Abstract data access to support future database migration (DS-005, DS-006)

**Interface Structure**:
```javascript
// Abstract base class
class DataRepository {
  // Event configuration operations
  async readEventConfig(eventId) {
    throw new Error('Not implemented');
  }
  
  async writeEventConfig(eventId, config) {
    throw new Error('Not implemented');
  }
  
  async listEvents() {
    throw new Error('Not implemented');
  }
  
  // Event data operations (for future)
  async readEventData(eventId) {
    throw new Error('Not implemented');
  }
  
  async appendEventData(eventId, data) {
    throw new Error('Not implemented');
  }
}
```

### File-Based Implementation

**Class**: `FileDataRepository extends DataRepository`

**Responsibilities**:
- Read/write JSON configuration files
- Read/write CSV data files
- Manage event directory structure
- Integrate with caching layer

**File Operations**:
- `readFile(path)` - Read file with cache check
- `writeFile(path, data)` - Write file and invalidate cache
- `ensureDirectory(path)` - Create directory if not exists
- `listDirectories(path)` - List event directories

### Future Database Implementation

**Class**: `DatabaseDataRepository extends DataRepository` (future)

**Responsibilities**:
- Same interface as FileDataRepository
- Database operations instead of file operations
- Maintains compatibility with existing code

## Data Directory Structure

```
data/
└── events/
    ├── event-001/
    │   ├── config.json
    │   └── data.csv
    ├── event-002/
    │   ├── config.json
    │   └── data.csv
    └── ...
```

**Rules**:
- Each event has its own directory named by `eventId`
- Directory names must be valid filesystem identifiers (no special chars)
- Config and data files are always in event subdirectories
- Root data directory path comes from application configuration

## Caching Strategy

**Cache Keys**:
- `config:app` - Application configuration
- `config:event:{eventId}` - Event configuration
- `data:event:{eventId}` - Event data (if cached)

**Cache Invalidation**:
- Write operations invalidate related cache entries
- TTL-based expiration for read-heavy scenarios
- Manual invalidation API for administrative operations

## Validation and Error Handling

**Configuration Validation**:
- JSON schema validation for application config
- Required fields must be present
- Type validation (numbers, strings, booleans)
- Path validation for directory references

**Error Scenarios**:
- Missing configuration file → Default configuration or error
- Invalid JSON → Parse error with clear message
- Missing event directory → Create on first access
- File permission errors → Clear error message

## Notes

- This data model focuses on infrastructure (configuration, abstraction layer)
- Event-specific data structures are placeholders for future feature development
- Repository pattern ensures clean migration path to database storage
- All file operations go through abstraction layer (no direct fs calls in business logic)
