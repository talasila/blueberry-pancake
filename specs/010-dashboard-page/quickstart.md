# Quickstart Guide: Event Dashboard Page

**Feature**: 010-dashboard-page  
**Date**: 2025-01-27

## Overview

This guide provides a quick start for implementing the Event Dashboard Page feature. It covers the key components, API endpoints, and implementation steps.

## Feature Summary

The Event Dashboard Page allows users to:
- View summary statistics (Total Users, Total Bottles, Total Ratings, Average Ratings per Bottle)
- View detailed item rating summaries in a sortable table
- See rating progression as visual progress bars
- See average ratings and Bayesian-weighted averages for each item
- Access dashboard based on role and event state (admins anytime, regular users only when completed)
- Manually refresh dashboard data

## Architecture Overview

```
Frontend (React)
├── DashboardPage.jsx (main dashboard page)
├── StatisticsCard.jsx (reusable statistics card component)
├── ItemRatingsTable.jsx (sortable table component)
├── ProgressBar.jsx (visual progress bar component)
├── DashboardRoute.jsx (route protection component)
└── dashboardService.js (API client)

Backend (Express)
├── dashboard.js (API routes)
├── DashboardService.js (statistics aggregation, Bayesian calculation)
└── bayesianAverage.js (Bayesian average utility)
```

## Implementation Steps

### Phase 1: Backend API

#### 1.1 Create Bayesian Average Utility

**File**: `backend/src/utils/bayesianAverage.js`

```javascript
/**
 * Calculate Bayesian weighted average
 * Formula: (C × global_avg + Σ(ratings)) / (C + n)
 * @param {number} globalAvg - Average rating across all items
 * @param {number} totalUsers - Total number of users in event
 * @param {number} numberOfRaters - Number of users who rated this item
 * @param {number} sumOfRatings - Sum of all rating values for this item
 * @returns {number|null} Weighted average or null if cannot calculate
 */
export function calculateWeightedAverage(globalAvg, totalUsers, numberOfRaters, sumOfRatings) {
  // C = 40% of total_users
  const C = Math.floor(totalUsers * 0.4);
  
  // Edge case: C = 0 (no users)
  if (C === 0) {
    return null; // Will display as "N/A"
  }
  
  // Edge case: global_avg undefined (no ratings exist)
  if (globalAvg === undefined || globalAvg === null) {
    return null; // Will display as "N/A"
  }
  
  // Calculate: (C × global_avg + Σ(ratings)) / (C + n)
  const numerator = (C * globalAvg) + sumOfRatings;
  const denominator = C + numberOfRaters;
  
  return parseFloat((numerator / denominator).toFixed(2));
}
```

**Key Requirements**:
- Handle edge cases (C=0, global_avg undefined)
- Return null for invalid calculations (displayed as "N/A")
- Format to 2 decimal places

#### 1.2 Create Dashboard Service

**File**: `backend/src/services/DashboardService.js`

```javascript
import eventService from './EventService.js';
import ratingService from './RatingService.js';
import { calculateWeightedAverage } from '../utils/bayesianAverage.js';
import cacheService from '../cache/CacheService.js';

class DashboardService {
  async getDashboardData(eventId) {
    // Check cache first
    const cacheKey = `dashboard:${eventId}`;
    const cached = cacheService.get(cacheKey);
    if (cached) {
      return cached;
    }
    
    // Get event configuration
    const event = await eventService.getEvent(eventId);
    
    // Get ratings
    const ratings = await ratingService.getRatings(eventId);
    
    // Calculate statistics
    const statistics = this.calculateStatistics(event, ratings);
    
    // Calculate global average
    const globalAverage = this.calculateGlobalAverage(ratings);
    
    // Calculate item summaries
    const itemSummaries = this.calculateItemSummaries(
      event,
      ratings,
      globalAverage
    );
    
    // Build response
    const dashboardData = {
      statistics,
      itemSummaries,
      globalAverage
    };
    
    // Cache result (30 seconds TTL)
    cacheService.set(cacheKey, dashboardData, 30);
    
    return dashboardData;
  }
  
  calculateStatistics(event, ratings) {
    const totalUsers = Object.keys(event.users || {}).length;
    const totalBottles = event.itemConfiguration.numberOfItems - 
                         (event.itemConfiguration.excludedItemIds?.length || 0);
    const totalRatings = ratings.length;
    const averageRatingsPerBottle = totalBottles > 0 
      ? parseFloat((totalRatings / totalBottles).toFixed(2))
      : 0.00;
    
    return {
      totalUsers,
      totalBottles,
      totalRatings,
      averageRatingsPerBottle
    };
  }
  
  calculateGlobalAverage(ratings) {
    if (ratings.length === 0) {
      return null;
    }
    
    const sum = ratings.reduce((acc, r) => acc + r.rating, 0);
    return parseFloat((sum / ratings.length).toFixed(2));
  }
  
  calculateItemSummaries(event, ratings, globalAverage) {
    const totalUsers = Object.keys(event.users || {}).length;
    const excludedItemIds = new Set(event.itemConfiguration.excludedItemIds || []);
    const numberOfItems = event.itemConfiguration.numberOfItems;
    
    const summaries = [];
    
    // Process each item (excluding excluded items)
    for (let itemId = 1; itemId <= numberOfItems; itemId++) {
      if (excludedItemIds.has(itemId)) {
        continue; // Skip excluded items
      }
      
      // Filter ratings for this item
      const itemRatings = ratings.filter(r => r.itemId === itemId);
      
      // Calculate metrics
      const numberOfRaters = new Set(itemRatings.map(r => r.email)).size;
      const sumOfRatings = itemRatings.reduce((acc, r) => acc + r.rating, 0);
      const averageRating = numberOfRaters > 0
        ? parseFloat((sumOfRatings / numberOfRaters).toFixed(2))
        : null;
      
      const weightedAverage = calculateWeightedAverage(
        globalAverage,
        totalUsers,
        numberOfRaters,
        sumOfRatings
      );
      
      const ratingProgression = totalUsers > 0
        ? parseFloat(((numberOfRaters / totalUsers) * 100).toFixed(2))
        : 0.0;
      
      summaries.push({
        itemId,
        numberOfRaters,
        averageRating,
        weightedAverage,
        ratingProgression
      });
    }
    
    return summaries;
  }
}

export default new DashboardService();
```

**Key Requirements**:
- Cache dashboard data for 30 seconds
- Calculate statistics from event config and ratings
- Calculate global average from all ratings
- Calculate item summaries with Bayesian averages
- Handle edge cases (no users, no ratings, excluded items)

#### 1.3 Create API Routes

**File**: `backend/src/api/dashboard.js`

```javascript
import { Router } from 'express';
import dashboardService from '../services/DashboardService.js';
import eventService from '../services/EventService.js';
import requireAuth from '../middleware/requireAuth.js';
import requirePIN from '../middleware/requirePIN.js';
import loggerService from '../logging/Logger.js';

const router = Router();

/**
 * GET /api/events/:eventId/dashboard
 * Get dashboard statistics and item rating summaries
 * Access control:
 * - Administrators: access at any time
 * - Regular users: access only when event is "completed"
 */
router.get('/:eventId/dashboard', requireAuth, requirePIN, async (req, res) => {
  try {
    const { eventId } = req.params;
    const userEmail = req.user?.email;
    
    // Validate event ID format
    if (!eventId || !/^[A-Za-z0-9]{8}$/.test(eventId)) {
      return res.status(400).json({
        error: 'Invalid event ID format'
      });
    }
    
    // Get event to check state and user role
    const event = await eventService.getEvent(eventId);
    if (!event) {
      return res.status(404).json({
        error: 'Event not found'
      });
    }
    
    // Check access control
    const isAdmin = eventService.isAdministrator(event, userEmail);
    if (!isAdmin && event.state !== 'completed') {
      return res.status(403).json({
        error: 'Dashboard access is only available when the event is completed'
      });
    }
    
    // Get dashboard data
    const dashboardData = await dashboardService.getDashboardData(eventId);
    
    res.json(dashboardData);
  } catch (error) {
    loggerService.error(`Dashboard error: ${error.message}`, error);
    res.status(500).json({
      error: 'Failed to retrieve dashboard data'
    });
  }
});

export default router;
```

**Key Requirements**:
- Validate event ID format
- Check access control (admin OR event completed)
- Return 403 for unauthorized access
- Handle errors gracefully

#### 1.4 Register API Routes

**File**: `backend/src/server.js`

Add dashboard routes:
```javascript
import dashboardRoutes from './api/dashboard.js';

// ... existing code ...

app.use('/api/events', dashboardRoutes);
```

### Phase 2: Frontend Components

#### 2.1 Create Dashboard Service (API Client)

**File**: `frontend/src/services/dashboardService.js`

```javascript
import apiClient from './apiClient.js';

class DashboardService {
  async getDashboardData(eventId) {
    try {
      const response = await apiClient.get(`/events/${eventId}/dashboard`);
      return response;
    } catch (error) {
      if (error.status === 403) {
        throw new Error('Dashboard access is only available when the event is completed');
      }
      throw error;
    }
  }
}

export default new DashboardService();
```

#### 2.2 Create Progress Bar Component

**File**: `frontend/src/components/ProgressBar.jsx`

```javascript
/**
 * ProgressBar Component
 * Visual-only progress bar without text labels
 */
function ProgressBar({ value, max = 100, className = '' }) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  
  return (
    <div 
      className={`w-full bg-gray-200 rounded-full h-2 ${className}`}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={`${percentage.toFixed(1)}% complete`}
    >
      <div
        className="bg-primary h-2 rounded-full transition-all duration-300"
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}

export default ProgressBar;
```

#### 2.3 Create Statistics Card Component

**File**: `frontend/src/components/StatisticsCard.jsx`

```javascript
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

function StatisticsCard({ title, value, className = '' }) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">
          {value !== null && value !== undefined ? value : 'N/A'}
        </div>
      </CardContent>
    </Card>
  );
}

export default StatisticsCard;
```

#### 2.4 Create Item Ratings Table Component

**File**: `frontend/src/components/ItemRatingsTable.jsx`

```javascript
import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import ProgressBar from './ProgressBar';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

function ItemRatingsTable({ itemSummaries }) {
  const [sortColumn, setSortColumn] = useState('itemId');
  const [sortDirection, setSortDirection] = useState('asc');
  
  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };
  
  const sortedSummaries = [...itemSummaries].sort((a, b) => {
    let aVal, bVal;
    
    switch (sortColumn) {
      case 'itemId':
        aVal = a.itemId;
        bVal = b.itemId;
        break;
      case 'ratingProgression':
        aVal = a.ratingProgression;
        bVal = b.ratingProgression;
        break;
      case 'averageRating':
        aVal = a.averageRating ?? 0;
        bVal = b.averageRating ?? 0;
        break;
      case 'weightedAverage':
        aVal = a.weightedAverage ?? 0;
        bVal = b.weightedAverage ?? 0;
        break;
      default:
        return 0;
    }
    
    if (sortDirection === 'asc') {
      return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
    } else {
      return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
    }
  });
  
  const SortIcon = ({ column }) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="h-4 w-4 ml-1" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="h-4 w-4 ml-1" />
      : <ArrowDown className="h-4 w-4 ml-1" />;
  };
  
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead 
            className="cursor-pointer hover:bg-accent"
            onClick={() => handleSort('itemId')}
          >
            ID <SortIcon column="itemId" />
          </TableHead>
          <TableHead 
            className="cursor-pointer hover:bg-accent"
            onClick={() => handleSort('ratingProgression')}
          >
            Rating Progression <SortIcon column="ratingProgression" />
          </TableHead>
          <TableHead 
            className="cursor-pointer hover:bg-accent"
            onClick={() => handleSort('averageRating')}
          >
            Average Rating <SortIcon column="averageRating" />
          </TableHead>
          <TableHead 
            className="cursor-pointer hover:bg-accent"
            onClick={() => handleSort('weightedAverage')}
          >
            Weighted Average <SortIcon column="weightedAverage" />
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sortedSummaries.map((item) => (
          <TableRow key={item.itemId}>
            <TableCell>{item.itemId}</TableCell>
            <TableCell>
              <ProgressBar value={item.ratingProgression} max={100} />
            </TableCell>
            <TableCell>
              {item.averageRating !== null ? item.averageRating.toFixed(2) : 'N/A'}
            </TableCell>
            <TableCell>
              {item.weightedAverage !== null ? item.weightedAverage.toFixed(2) : 'N/A'}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default ItemRatingsTable;
```

#### 2.5 Create Dashboard Page Component

**File**: `frontend/src/pages/DashboardPage.jsx`

```javascript
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import StatisticsCard from '@/components/StatisticsCard';
import ItemRatingsTable from '@/components/ItemRatingsTable';
import LoadingSpinner from '@/components/LoadingSpinner';
import dashboardService from '@/services/dashboardService';
import { useEventContext } from '@/contexts/EventContext';

function DashboardPage() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { event } = useEventContext();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  
  const loadDashboardData = async (showRefreshing = false) => {
    try {
      if (showRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      
      const data = await dashboardService.getDashboardData(eventId);
      setDashboardData(data);
    } catch (err) {
      setError(err.message || 'Failed to load dashboard data');
      if (err.message.includes('only available when the event is completed')) {
        // Redirect to event page if access denied
        navigate(`/event/${eventId}`);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  useEffect(() => {
    loadDashboardData();
  }, [eventId]);
  
  const handleRefresh = () => {
    loadDashboardData(true);
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Error</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-destructive">{error}</p>
              <Button onClick={handleRefresh} className="mt-4">
                Retry
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }
  
  if (!dashboardData) {
    return null;
  }
  
  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header with refresh button */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <Button 
            onClick={handleRefresh} 
            disabled={refreshing}
            variant="outline"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
        
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <StatisticsCard 
            title="Total Users" 
            value={dashboardData.statistics.totalUsers}
          />
          <StatisticsCard 
            title="Total Bottles" 
            value={dashboardData.statistics.totalBottles}
          />
          <StatisticsCard 
            title="Total Ratings" 
            value={dashboardData.statistics.totalRatings}
          />
          <StatisticsCard 
            title="Average Ratings per Bottle" 
            value={dashboardData.statistics.averageRatingsPerBottle}
          />
        </div>
        
        {/* Item Ratings Table */}
        <Card>
          <CardHeader>
            <CardTitle>Item Ratings</CardTitle>
          </CardHeader>
          <CardContent>
            <ItemRatingsTable itemSummaries={dashboardData.itemSummaries} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default DashboardPage;
```

#### 2.6 Create Dashboard Route Protection Component

**File**: `frontend/src/components/DashboardRoute.jsx`

```javascript
import { Navigate, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import apiClient from '@/services/apiClient';
import useEvent from '@/hooks/useEvent';
import eventService from '@/services/eventService'; // Assuming this exists or use EventService pattern

function DashboardRoute({ children }) {
  const { eventId } = useParams();
  const { event, isLoading: eventLoading } = useEvent();
  const [hasAccess, setHasAccess] = useState(null);
  const [isChecking, setIsChecking] = useState(true);
  
  useEffect(() => {
    if (eventLoading) {
      setIsChecking(true);
      return;
    }
    
    if (!event) {
      setHasAccess(false);
      setIsChecking(false);
      return;
    }
    
    // Extract user email from JWT token
    const getUserEmail = () => {
      try {
        const token = apiClient.getJWTToken();
        if (token) {
          const parts = token.split('.');
          if (parts.length === 3) {
            const payload = JSON.parse(atob(parts[1]));
            return payload.email?.toLowerCase() || null;
          }
        }
      } catch (error) {
        console.error('Error extracting user email from token:', error);
      }
      return null;
    };
    
    const userEmail = getUserEmail();
    const isAdmin = eventService.isAdministrator(event, userEmail);
    const isCompleted = event.state === 'completed';
    
    // Access granted if: admin OR event completed
    setHasAccess(isAdmin || isCompleted);
    setIsChecking(false);
  }, [event, eventLoading]);
  
  if (isChecking || eventLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <div className="text-muted-foreground">Checking permissions...</div>
        </div>
      </div>
    );
  }
  
  if (!hasAccess) {
    return <Navigate to={`/event/${eventId}`} replace />;
  }
  
  return children;
}

export default DashboardRoute;
```

#### 2.7 Add Dashboard Route to App

**File**: `frontend/src/App.jsx`

Add route:
```javascript
import DashboardPage from './pages/DashboardPage';
import DashboardRoute from './components/DashboardRoute';

// ... in Routes ...
<Route 
  path="/event/:eventId/dashboard" 
  element={
    <EventRouteWrapper>
      <DashboardRoute>
        <DashboardPage />
      </DashboardRoute>
    </EventRouteWrapper>
  } 
/>
```

#### 2.8 Add Dashboard Button to Profile Page

**File**: `frontend/src/pages/ProfilePage.jsx`

Add dashboard button:
```javascript
import { BarChart3 } from 'lucide-react';

// ... in navigation buttons section ...
{/* Dashboard link (for admins always, for regular users only when completed) */}
{((isAdmin && eventId) || (event?.state === 'completed' && eventId)) && (
  <Button
    variant="ghost"
    onClick={() => navigate(`/event/${eventId}/dashboard`)}
    className="-ml-2 min-h-[44px] active:bg-accent active:opacity-70 touch-manipulation"
    aria-label="Go to dashboard"
  >
    <BarChart3 className="h-4 w-4 mr-2" />
    Dashboard
  </Button>
)}
```

## Testing

### Backend Tests

**File**: `backend/tests/services/DashboardService.test.js`

Test cases:
- Calculate statistics correctly
- Calculate global average correctly
- Calculate item summaries with Bayesian averages
- Handle edge cases (no users, no ratings, excluded items)
- Cache behavior

### Frontend Tests

**File**: `frontend/tests/pages/DashboardPage.test.jsx`

Test cases:
- Load dashboard data
- Display statistics correctly
- Display item table with sorting
- Handle loading states
- Handle error states
- Refresh button functionality

### E2E Tests

**File**: `frontend/tests/e2e/dashboard.spec.js`

Test cases:
- Admin can access dashboard in any state
- Regular user can access dashboard only when completed
- Regular user redirected when accessing before completion
- Dashboard button visibility in profile page
- Table sorting functionality
- Refresh button functionality

## Key Implementation Notes

1. **Caching**: Dashboard data cached for 30 seconds to reduce file I/O
2. **Access Control**: Check both user role and event state
3. **Edge Cases**: Handle C=0, global_avg undefined, no ratings gracefully
4. **Formatting**: All averages formatted to 2 decimal places
5. **Progress Bars**: Visual-only, no text labels (accessibility via aria-label)
6. **Default Sort**: Item ID ascending on initial load
7. **Manual Refresh**: Invalidate cache before recalculating
