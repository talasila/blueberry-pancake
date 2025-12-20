/**
 * Concurrency Tests
 * 
 * Tests for concurrent operations in a multi-tenant environment.
 * Covers: multi-tenant isolation, concurrent user actions, race conditions,
 * admin concurrent actions, cache consistency, event lifecycle, and rate limiting.
 */

import { test, expect } from '@playwright/test';
import {
  createTestEvent,
  deleteTestEvent,
  addAdminToEvent,
  clearAuth,
  submitEmail,
  enterAndSubmitPIN,
} from './helpers.js';

const BASE_URL = 'http://localhost:3000';
const API_URL = 'http://localhost:3001';

// Test event IDs for cleanup
const testEventIds = [];
const testEventPin = '654321';

/**
 * Helper to get a user token via PIN verification
 */
async function getUserToken(eventId, email, pin) {
  const response = await fetch(`${API_URL}/api/events/${eventId}/verify-pin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin, email })
  });
  if (!response.ok) {
    throw new Error(`Failed to get user token: ${await response.text()}`);
  }
  const data = await response.json();
  return data.token;
}

/**
 * Helper to submit a rating via API
 */
async function submitRating(eventId, token, itemId, rating, note = '') {
  const response = await fetch(`${API_URL}/api/events/${eventId}/ratings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ itemId, rating, note })
  });
  return { ok: response.ok, status: response.status, data: response.ok ? await response.json() : await response.text() };
}

/**
 * Helper to get ratings via API (returns CSV, parse to array)
 */
async function getRatings(eventId, token) {
  const response = await fetch(`${API_URL}/api/events/${eventId}/ratings`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!response.ok) {
    throw new Error(`Failed to get ratings: ${await response.text()}`);
  }
  // API returns CSV, parse it
  const csvText = await response.text();
  return parseCSV(csvText);
}

/**
 * Parse CSV text to array of objects
 */
function parseCSV(csvText) {
  const lines = csvText.trim().split('\n');
  if (lines.length === 0) return [];
  
  const headers = lines[0].split(',');
  const ratings = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    const rating = {};
    headers.forEach((header, index) => {
      let value = values[index] || '';
      // Try to parse numbers
      if (header === 'itemId' || header === 'rating') {
        value = parseInt(value, 10);
      }
      rating[header.trim()] = value;
    });
    ratings.push(rating);
  }
  
  return ratings;
}

/**
 * Helper to start an event
 */
async function startEvent(eventId, adminToken) {
  const response = await fetch(`${API_URL}/api/events/${eventId}/state`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({ state: 'started', currentState: 'created' })
  });
  return { ok: response.ok, status: response.status, data: response.ok ? await response.json() : await response.text() };
}

/**
 * Helper to transition event state
 */
async function transitionState(eventId, adminToken, newState, currentState) {
  const response = await fetch(`${API_URL}/api/events/${eventId}/state`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({ state: newState, currentState })
  });
  return { ok: response.ok, status: response.status, data: response.ok ? await response.json() : await response.text() };
}

/**
 * Helper to add administrator via API
 */
async function addAdministrator(eventId, adminToken, newAdminEmail) {
  const response = await fetch(`${API_URL}/api/events/${eventId}/administrators`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({ email: newAdminEmail })
  });
  return { ok: response.ok, status: response.status, data: response.ok ? await response.json() : await response.text() };
}

/**
 * Helper to get event via API
 */
async function getEvent(eventId, token) {
  const response = await fetch(`${API_URL}/api/events/${eventId}`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return { ok: response.ok, status: response.status, data: response.ok ? await response.json() : await response.text() };
}

/**
 * Helper to update item configuration
 */
async function updateItemConfig(eventId, adminToken, config) {
  const response = await fetch(`${API_URL}/api/events/${eventId}/item-configuration`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify(config)
  });
  return { ok: response.ok, status: response.status, data: response.ok ? await response.json() : await response.text() };
}

/**
 * Helper to save bookmarks via API
 */
async function saveBookmarks(eventId, token, bookmarks) {
  const response = await fetch(`${API_URL}/api/events/${eventId}/bookmarks`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ bookmarks })
  });
  return { ok: response.ok, status: response.status, data: response.ok ? await response.json() : await response.text() };
}

/**
 * Helper to regenerate PIN
 */
async function regeneratePIN(eventId, adminToken) {
  const response = await fetch(`${API_URL}/api/events/${eventId}/regenerate-pin`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    }
  });
  return { ok: response.ok, status: response.status, data: response.ok ? await response.json() : await response.text() };
}

/**
 * Helper to get bookmarks via API
 */
async function getBookmarks(eventId, token) {
  const response = await fetch(`${API_URL}/api/events/${eventId}/bookmarks`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return { ok: response.ok, status: response.status, data: response.ok ? await response.json() : await response.text() };
}

/**
 * Cleanup helper - delete all test events
 */
async function cleanupTestEvents() {
  for (const eventId of testEventIds) {
    try {
      await deleteTestEvent(eventId);
    } catch (e) {
      // Ignore cleanup errors
    }
  }
  testEventIds.length = 0;
}

// ===================================
// SCENARIO 1: Multi-Tenant Isolation Tests
// ===================================

test.describe('Multi-Tenant Isolation', () => {
  test.afterEach(async () => {
    await cleanupTestEvents();
  });

  test.afterAll(async () => {
    // Safety net: clean up if afterEach failed
    await cleanupTestEvents();
  });

  test('parallel event creation generates unique IDs', async () => {
    // Create 5 events in parallel
    const createPromises = Array.from({ length: 5 }, (_, i) =>
      createTestEvent(null, `Parallel Event ${i + 1}`, testEventPin)
    );
    
    const eventIds = await Promise.all(createPromises);
    testEventIds.push(...eventIds);
    
    // All event IDs should be unique
    const uniqueIds = new Set(eventIds);
    expect(uniqueIds.size).toBe(5);
    
    // All events should exist and be accessible
    for (const eventId of eventIds) {
      const adminToken = await addAdminToEvent(eventId, 'admin@example.com');
      const result = await getEvent(eventId, adminToken);
      expect(result.ok).toBe(true);
    }
  });

  test('ratings in one event do not affect another event', async () => {
    // Create two separate events
    const event1Id = await createTestEvent(null, 'Isolation Event 1', testEventPin);
    const event2Id = await createTestEvent(null, 'Isolation Event 2', testEventPin);
    testEventIds.push(event1Id, event2Id);
    
    // Setup both events
    const admin1Token = await addAdminToEvent(event1Id, 'admin1@example.com');
    const admin2Token = await addAdminToEvent(event2Id, 'admin2@example.com');
    await startEvent(event1Id, admin1Token);
    await startEvent(event2Id, admin2Token);
    
    // Get user tokens for both events
    const user1Token = await getUserToken(event1Id, 'user@example.com', testEventPin);
    const user2Token = await getUserToken(event2Id, 'user@example.com', testEventPin);
    
    // Submit rating in Event 1 only
    await submitRating(event1Id, user1Token, 1, 4, 'Event 1 rating');
    await submitRating(event1Id, user1Token, 2, 3, 'Another Event 1 rating');
    
    // Submit different rating in Event 2
    await submitRating(event2Id, user2Token, 1, 2, 'Event 2 rating');
    
    // Verify Event 1 has 2 ratings
    const ratings1 = await getRatings(event1Id, user1Token);
    expect(ratings1.length).toBe(2);
    
    // Verify Event 2 has only 1 rating (not affected by Event 1)
    const ratings2 = await getRatings(event2Id, user2Token);
    expect(ratings2.length).toBe(1);
    expect(ratings2[0].rating).toBe(2);
  });

  test('parallel operations across events do not interfere', async () => {
    // Create two events
    const event1Id = await createTestEvent(null, 'Parallel Ops Event 1', testEventPin);
    const event2Id = await createTestEvent(null, 'Parallel Ops Event 2', testEventPin);
    testEventIds.push(event1Id, event2Id);
    
    const admin1Token = await addAdminToEvent(event1Id, 'admin1@example.com');
    const admin2Token = await addAdminToEvent(event2Id, 'admin2@example.com');
    await startEvent(event1Id, admin1Token);
    await startEvent(event2Id, admin2Token);
    
    const user1Token = await getUserToken(event1Id, 'user1@example.com', testEventPin);
    const user2Token = await getUserToken(event2Id, 'user2@example.com', testEventPin);
    
    // Perform parallel operations ACROSS events (different events, different users)
    // Note: Same-user operations within an event are tested in Scenario 2
    const operations = await Promise.all([
      updateItemConfig(event1Id, admin1Token, { numberOfItems: 25 }),
      submitRating(event1Id, user1Token, 1, 4), // Event 1 user
      submitRating(event2Id, user2Token, 1, 3), // Event 2 user
      saveBookmarks(event2Id, user2Token, [1, 2]),
    ]);
    
    // All operations should succeed
    operations.forEach(result => expect(result.ok).toBe(true));
    
    // Verify Event 1 config was updated
    const event1 = await getEvent(event1Id, admin1Token);
    expect(event1.data.itemConfiguration.numberOfItems).toBe(25);
    
    // Verify Event 1 has its rating
    const ratings1 = await getRatings(event1Id, user1Token);
    expect(ratings1.length).toBe(1);
    expect(ratings1[0].rating).toBe(4);
    
    // Verify Event 2 has its rating and bookmarks (isolated from Event 1)
    const ratings2 = await getRatings(event2Id, user2Token);
    expect(ratings2.length).toBe(1);
    expect(ratings2[0].rating).toBe(3);
    
    const bookmarks2 = await getBookmarks(event2Id, user2Token);
    expect(bookmarks2.data.bookmarks).toEqual([1, 2]);
  });

  // ===================================
  // Cross-Event Token Authorization Tests
  // ===================================

  test('user token from Event 1 cannot access Event 2 ratings endpoint', async () => {
    // Create two events
    const event1Id = await createTestEvent(null, 'Token Isolation Event 1', testEventPin);
    const event2Id = await createTestEvent(null, 'Token Isolation Event 2', testEventPin);
    testEventIds.push(event1Id, event2Id);
    
    // Setup both events
    const admin1Token = await addAdminToEvent(event1Id, 'admin1@example.com');
    const admin2Token = await addAdminToEvent(event2Id, 'admin2@example.com');
    await startEvent(event1Id, admin1Token);
    await startEvent(event2Id, admin2Token);
    
    // Get user token for Event 1 only
    const user1Token = await getUserToken(event1Id, 'user@example.com', testEventPin);
    
    // Try to access Event 2's ratings with Event 1's token - should get 403
    const ratingsResponse = await fetch(`${API_URL}/api/events/${event2Id}/ratings`, {
      headers: { 'Authorization': `Bearer ${user1Token}` }
    });
    
    expect(ratingsResponse.status).toBe(403);
    const errorData = await ratingsResponse.json();
    expect(errorData.code).toBe('EVENT_ACCESS_DENIED');
  });

  test('user token from Event 1 cannot access Event 2 bookmarks endpoint', async () => {
    const event1Id = await createTestEvent(null, 'Bookmark Auth Event 1', testEventPin);
    const event2Id = await createTestEvent(null, 'Bookmark Auth Event 2', testEventPin);
    testEventIds.push(event1Id, event2Id);
    
    const admin1Token = await addAdminToEvent(event1Id, 'admin1@example.com');
    const admin2Token = await addAdminToEvent(event2Id, 'admin2@example.com');
    await startEvent(event1Id, admin1Token);
    await startEvent(event2Id, admin2Token);
    
    const user1Token = await getUserToken(event1Id, 'user@example.com', testEventPin);
    
    // Try GET bookmarks
    const getResponse = await fetch(`${API_URL}/api/events/${event2Id}/bookmarks`, {
      headers: { 'Authorization': `Bearer ${user1Token}` }
    });
    expect(getResponse.status).toBe(403);
    
    // Try PUT bookmarks
    const putResponse = await fetch(`${API_URL}/api/events/${event2Id}/bookmarks`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user1Token}`
      },
      body: JSON.stringify({ bookmarks: [1, 2, 3] })
    });
    expect(putResponse.status).toBe(403);
  });

  test('user token from Event 1 cannot access Event 2 similar-users endpoint', async () => {
    const event1Id = await createTestEvent(null, 'Similar Users Auth Event 1', testEventPin);
    const event2Id = await createTestEvent(null, 'Similar Users Auth Event 2', testEventPin);
    testEventIds.push(event1Id, event2Id);
    
    const admin1Token = await addAdminToEvent(event1Id, 'admin1@example.com');
    const admin2Token = await addAdminToEvent(event2Id, 'admin2@example.com');
    await startEvent(event1Id, admin1Token);
    await startEvent(event2Id, admin2Token);
    
    const user1Token = await getUserToken(event1Id, 'user@example.com', testEventPin);
    
    const response = await fetch(`${API_URL}/api/events/${event2Id}/similar-users`, {
      headers: { 'Authorization': `Bearer ${user1Token}` }
    });
    
    expect(response.status).toBe(403);
    const errorData = await response.json();
    expect(errorData.code).toBe('EVENT_ACCESS_DENIED');
  });

  test('user token from Event 1 cannot submit rating to Event 2', async () => {
    const event1Id = await createTestEvent(null, 'Rating Submit Auth Event 1', testEventPin);
    const event2Id = await createTestEvent(null, 'Rating Submit Auth Event 2', testEventPin);
    testEventIds.push(event1Id, event2Id);
    
    const admin1Token = await addAdminToEvent(event1Id, 'admin1@example.com');
    const admin2Token = await addAdminToEvent(event2Id, 'admin2@example.com');
    await startEvent(event1Id, admin1Token);
    await startEvent(event2Id, admin2Token);
    
    const user1Token = await getUserToken(event1Id, 'user@example.com', testEventPin);
    
    const response = await fetch(`${API_URL}/api/events/${event2Id}/ratings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user1Token}`
      },
      body: JSON.stringify({ itemId: 1, rating: 4 })
    });
    
    expect(response.status).toBe(403);
    const errorData = await response.json();
    expect(errorData.code).toBe('EVENT_ACCESS_DENIED');
  });

  test('admin token from Event 1 cannot access Event 2 dashboard', async () => {
    const event1Id = await createTestEvent(null, 'Dashboard Auth Event 1', testEventPin);
    const event2Id = await createTestEvent(null, 'Dashboard Auth Event 2', testEventPin);
    testEventIds.push(event1Id, event2Id);
    
    const admin1Token = await addAdminToEvent(event1Id, 'admin1@example.com');
    await addAdminToEvent(event2Id, 'admin2@example.com');
    
    // Admin of Event 1 tries to access Event 2's dashboard
    const response = await fetch(`${API_URL}/api/events/${event2Id}/dashboard`, {
      headers: { 'Authorization': `Bearer ${admin1Token}` }
    });
    
    expect(response.status).toBe(403);
    const errorData = await response.json();
    expect(errorData.code).toBe('EVENT_ACCESS_DENIED');
  });

  test('admin token from Event 1 cannot modify Event 2 state', async () => {
    const event1Id = await createTestEvent(null, 'State Auth Event 1', testEventPin);
    const event2Id = await createTestEvent(null, 'State Auth Event 2', testEventPin);
    testEventIds.push(event1Id, event2Id);
    
    const admin1Token = await addAdminToEvent(event1Id, 'admin1@example.com');
    await addAdminToEvent(event2Id, 'admin2@example.com');
    
    // Admin of Event 1 tries to start Event 2
    const response = await fetch(`${API_URL}/api/events/${event2Id}/state`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${admin1Token}`
      },
      body: JSON.stringify({ state: 'started', currentState: 'created' })
    });
    
    expect(response.status).toBe(403);
    const errorData = await response.json();
    expect(errorData.code).toBe('EVENT_ACCESS_DENIED');
  });

  test('admin token from Event 1 cannot modify Event 2 item configuration', async () => {
    const event1Id = await createTestEvent(null, 'Config Auth Event 1', testEventPin);
    const event2Id = await createTestEvent(null, 'Config Auth Event 2', testEventPin);
    testEventIds.push(event1Id, event2Id);
    
    const admin1Token = await addAdminToEvent(event1Id, 'admin1@example.com');
    await addAdminToEvent(event2Id, 'admin2@example.com');
    
    // Admin of Event 1 tries to modify Event 2's config
    const response = await fetch(`${API_URL}/api/events/${event2Id}/item-configuration`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${admin1Token}`
      },
      body: JSON.stringify({ numberOfItems: 50 })
    });
    
    expect(response.status).toBe(403);
    const errorData = await response.json();
    expect(errorData.code).toBe('EVENT_ACCESS_DENIED');
  });

  // ===================================
  // Same Email, Different Events Isolation
  // ===================================

  test('same email requires separate authentication per event', async () => {
    // Create two events
    const event1Id = await createTestEvent(null, 'Same Email Event 1', testEventPin);
    const event2Id = await createTestEvent(null, 'Same Email Event 2', testEventPin);
    testEventIds.push(event1Id, event2Id);
    
    const admin1Token = await addAdminToEvent(event1Id, 'admin@example.com');
    const admin2Token = await addAdminToEvent(event2Id, 'admin@example.com');
    await startEvent(event1Id, admin1Token);
    await startEvent(event2Id, admin2Token);
    
    // Same email authenticates to Event 1
    const userTokenEvent1 = await getUserToken(event1Id, 'shareduser@example.com', testEventPin);
    
    // This token should NOT work for Event 2 (must authenticate separately)
    const crossEventResponse = await fetch(`${API_URL}/api/events/${event2Id}/ratings`, {
      headers: { 'Authorization': `Bearer ${userTokenEvent1}` }
    });
    expect(crossEventResponse.status).toBe(403);
    
    // Now authenticate to Event 2 separately
    const userTokenEvent2 = await getUserToken(event2Id, 'shareduser@example.com', testEventPin);
    
    // Event 2 token should work for Event 2
    const validResponse = await fetch(`${API_URL}/api/events/${event2Id}/ratings`, {
      headers: { 'Authorization': `Bearer ${userTokenEvent2}` }
    });
    expect(validResponse.ok).toBe(true);
    
    // But Event 2 token should NOT work for Event 1
    const crossEventResponse2 = await fetch(`${API_URL}/api/events/${event1Id}/ratings`, {
      headers: { 'Authorization': `Bearer ${userTokenEvent2}` }
    });
    expect(crossEventResponse2.status).toBe(403);
  });

  // ===================================
  // Data Isolation Negative Tests
  // ===================================

  test('bookmarks in Event 1 do not appear in Event 2 (negative test)', async () => {
    const event1Id = await createTestEvent(null, 'Bookmark Isolation Event 1', testEventPin);
    const event2Id = await createTestEvent(null, 'Bookmark Isolation Event 2', testEventPin);
    testEventIds.push(event1Id, event2Id);
    
    const admin1Token = await addAdminToEvent(event1Id, 'admin1@example.com');
    const admin2Token = await addAdminToEvent(event2Id, 'admin2@example.com');
    await startEvent(event1Id, admin1Token);
    await startEvent(event2Id, admin2Token);
    
    // Same user authenticates to both events
    const user1Token = await getUserToken(event1Id, 'user@example.com', testEventPin);
    const user2Token = await getUserToken(event2Id, 'user@example.com', testEventPin);
    
    // Save bookmarks ONLY in Event 1
    await saveBookmarks(event1Id, user1Token, [1, 2, 3, 4, 5]);
    
    // Verify Event 1 has bookmarks
    const bookmarks1 = await getBookmarks(event1Id, user1Token);
    expect(bookmarks1.data.bookmarks).toEqual([1, 2, 3, 4, 5]);
    
    // Verify Event 2 has NO bookmarks (empty array)
    const bookmarks2 = await getBookmarks(event2Id, user2Token);
    expect(bookmarks2.data.bookmarks).toEqual([]);
  });

  test('dashboard data is isolated between events', async () => {
    const event1Id = await createTestEvent(null, 'Dashboard Isolation Event 1', testEventPin);
    const event2Id = await createTestEvent(null, 'Dashboard Isolation Event 2', testEventPin);
    testEventIds.push(event1Id, event2Id);
    
    const admin1Token = await addAdminToEvent(event1Id, 'admin1@example.com');
    const admin2Token = await addAdminToEvent(event2Id, 'admin2@example.com');
    await startEvent(event1Id, admin1Token);
    await startEvent(event2Id, admin2Token);
    
    // Submit ratings ONLY in Event 1
    const user1Token = await getUserToken(event1Id, 'rater@example.com', testEventPin);
    await submitRating(event1Id, user1Token, 1, 4);
    await submitRating(event1Id, user1Token, 2, 3);
    await submitRating(event1Id, user1Token, 3, 4);
    
    // Verify Event 1 dashboard shows ratings
    const dashboard1Response = await fetch(`${API_URL}/api/events/${event1Id}/dashboard`, {
      headers: { 'Authorization': `Bearer ${admin1Token}` }
    });
    expect(dashboard1Response.ok).toBe(true);
    const dashboard1 = await dashboard1Response.json();
    expect(dashboard1.statistics.totalRatings).toBe(3);
    
    // Verify Event 2 dashboard shows ZERO ratings (not contaminated by Event 1)
    const dashboard2Response = await fetch(`${API_URL}/api/events/${event2Id}/dashboard`, {
      headers: { 'Authorization': `Bearer ${admin2Token}` }
    });
    expect(dashboard2Response.ok).toBe(true);
    const dashboard2 = await dashboard2Response.json();
    expect(dashboard2.statistics.totalRatings).toBe(0);
  });

  test('similar users are isolated between events', async () => {
    const event1Id = await createTestEvent(null, 'Similar Isolation Event 1', testEventPin);
    const event2Id = await createTestEvent(null, 'Similar Isolation Event 2', testEventPin);
    testEventIds.push(event1Id, event2Id);
    
    const admin1Token = await addAdminToEvent(event1Id, 'admin1@example.com');
    const admin2Token = await addAdminToEvent(event2Id, 'admin2@example.com');
    await startEvent(event1Id, admin1Token);
    await startEvent(event2Id, admin2Token);
    
    // Create two users with matching ratings in Event 1
    const user1Event1Token = await getUserToken(event1Id, 'matcher1@example.com', testEventPin);
    const user2Event1Token = await getUserToken(event1Id, 'matcher2@example.com', testEventPin);
    
    // Both users rate same items with same scores in Event 1
    await submitRating(event1Id, user1Event1Token, 1, 4);
    await submitRating(event1Id, user1Event1Token, 2, 4);
    await submitRating(event1Id, user1Event1Token, 3, 4);
    await submitRating(event1Id, user2Event1Token, 1, 4);
    await submitRating(event1Id, user2Event1Token, 2, 4);
    await submitRating(event1Id, user2Event1Token, 3, 4);
    
    // User 1 should see User 2 as similar in Event 1
    const similar1Response = await fetch(`${API_URL}/api/events/${event1Id}/similar-users`, {
      headers: { 'Authorization': `Bearer ${user1Event1Token}` }
    });
    expect(similar1Response.ok).toBe(true);
    const similar1 = await similar1Response.json();
    expect(similar1.similarUsers.length).toBeGreaterThan(0);
    expect(similar1.similarUsers.some(u => u.email === 'matcher2@example.com')).toBe(true);
    
    // Now authenticate matcher1 to Event 2 (same email, different event)
    const user1Event2Token = await getUserToken(event2Id, 'matcher1@example.com', testEventPin);
    
    // Submit ratings in Event 2 for user1
    await submitRating(event2Id, user1Event2Token, 1, 4);
    await submitRating(event2Id, user1Event2Token, 2, 4);
    await submitRating(event2Id, user1Event2Token, 3, 4);
    
    // User 1 in Event 2 should NOT see matcher2 (who only rated in Event 1)
    const similar2Response = await fetch(`${API_URL}/api/events/${event2Id}/similar-users`, {
      headers: { 'Authorization': `Bearer ${user1Event2Token}` }
    });
    expect(similar2Response.ok).toBe(true);
    const similar2 = await similar2Response.json();
    // Should have no similar users (only matcher1 is in Event 2)
    expect(similar2.similarUsers.some(u => u.email === 'matcher2@example.com')).toBe(false);
  });

  test('user profiles are isolated between events', async () => {
    const event1Id = await createTestEvent(null, 'Profile Isolation Event 1', testEventPin);
    const event2Id = await createTestEvent(null, 'Profile Isolation Event 2', testEventPin);
    testEventIds.push(event1Id, event2Id);
    
    const admin1Token = await addAdminToEvent(event1Id, 'admin1@example.com');
    const admin2Token = await addAdminToEvent(event2Id, 'admin2@example.com');
    await startEvent(event1Id, admin1Token);
    await startEvent(event2Id, admin2Token);
    
    // Same user authenticates to both events
    const userEvent1Token = await getUserToken(event1Id, 'profileuser@example.com', testEventPin);
    const userEvent2Token = await getUserToken(event2Id, 'profileuser@example.com', testEventPin);
    
    // Update profile name in Event 1 only
    const updateResponse = await fetch(`${API_URL}/api/events/${event1Id}/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userEvent1Token}`
      },
      body: JSON.stringify({ name: 'Event1 User Name' })
    });
    expect(updateResponse.ok).toBe(true);
    
    // Verify profile in Event 1 has the name
    const profile1Response = await fetch(`${API_URL}/api/events/${event1Id}/profile`, {
      headers: { 'Authorization': `Bearer ${userEvent1Token}` }
    });
    expect(profile1Response.ok).toBe(true);
    const profile1 = await profile1Response.json();
    expect(profile1.name).toBe('Event1 User Name');
    
    // Verify profile in Event 2 does NOT have the name from Event 1
    const profile2Response = await fetch(`${API_URL}/api/events/${event2Id}/profile`, {
      headers: { 'Authorization': `Bearer ${userEvent2Token}` }
    });
    expect(profile2Response.ok).toBe(true);
    const profile2 = await profile2Response.json();
    // Event 2 profile should be default (empty or different name)
    expect(profile2.name).not.toBe('Event1 User Name');
  });
});

// ===================================
// SCENARIO 2: Concurrent User Actions Within an Event
// ===================================

test.describe('Concurrent User Actions', () => {
  let testEventId;
  let adminToken;
  
  test.beforeEach(async () => {
    testEventId = await createTestEvent(null, 'Concurrent Users Event', testEventPin);
    testEventIds.push(testEventId);
    adminToken = await addAdminToEvent(testEventId, 'admin@example.com');
    await startEvent(testEventId, adminToken);
  });
  
  test.afterEach(async () => {
    await cleanupTestEvents();
  });

  test.afterAll(async () => {
    // Safety net: clean up if afterEach failed
    await cleanupTestEvents();
  });

  test('multiple users can each submit ratings for same item', async () => {
    // Create 5 users and get their tokens
    const users = await Promise.all([
      getUserToken(testEventId, 'user1@example.com', testEventPin),
      getUserToken(testEventId, 'user2@example.com', testEventPin),
      getUserToken(testEventId, 'user3@example.com', testEventPin),
      getUserToken(testEventId, 'user4@example.com', testEventPin),
      getUserToken(testEventId, 'user5@example.com', testEventPin),
    ]);
    
    // Each user rates item #1 (sequential to avoid write-back cache race)
    // Note: True simultaneous writes have a known race condition in write-back caching
    for (let i = 0; i < users.length; i++) {
      const result = await submitRating(testEventId, users[i], 1, (i % 4) + 1);
      expect(result.ok).toBe(true);
    }
    
    // Verify all 5 ratings exist
    const ratings = await getRatings(testEventId, users[0]);
    const item1Ratings = ratings.filter(r => r.itemId === 1);
    expect(item1Ratings.length).toBe(5);
  });

  test('simultaneous rating submissions from multiple users on same item', async () => {
    // This test verifies the mutex/lock fix for the write-back cache race condition.
    // Before the fix, concurrent submissions would cause lost updates (last write wins).
    // With the per-event lock, all ratings should be preserved.
    
    // Create 5 users and get their tokens
    const users = await Promise.all([
      getUserToken(testEventId, 'simuser1@example.com', testEventPin),
      getUserToken(testEventId, 'simuser2@example.com', testEventPin),
      getUserToken(testEventId, 'simuser3@example.com', testEventPin),
      getUserToken(testEventId, 'simuser4@example.com', testEventPin),
      getUserToken(testEventId, 'simuser5@example.com', testEventPin),
    ]);
    
    // All 5 users rate the SAME item (#1) simultaneously
    // This is the scenario that previously failed due to the race condition
    const ratingPromises = users.map((token, i) =>
      submitRating(testEventId, token, 1, (i % 4) + 1)
    );
    
    const results = await Promise.all(ratingPromises);
    
    // All API calls should succeed
    results.forEach(result => expect(result.ok).toBe(true));
    
    // Verify ALL 5 ratings are preserved (this would fail without the mutex fix)
    const ratings = await getRatings(testEventId, users[0]);
    const item1Ratings = ratings.filter(r => r.itemId === 1);
    expect(item1Ratings.length).toBe(5);
    
    // Verify each user's rating is present
    const raterEmails = item1Ratings.map(r => r.email);
    expect(raterEmails).toContain('simuser1@example.com');
    expect(raterEmails).toContain('simuser2@example.com');
    expect(raterEmails).toContain('simuser3@example.com');
    expect(raterEmails).toContain('simuser4@example.com');
    expect(raterEmails).toContain('simuser5@example.com');
  });

  test('concurrent bookmark saves from multiple users', async () => {
    // Create 3 users
    const users = await Promise.all([
      getUserToken(testEventId, 'bookmark1@example.com', testEventPin),
      getUserToken(testEventId, 'bookmark2@example.com', testEventPin),
      getUserToken(testEventId, 'bookmark3@example.com', testEventPin),
    ]);
    
    // All users save different bookmarks simultaneously
    const bookmarkPromises = [
      saveBookmarks(testEventId, users[0], [1, 2, 3]),
      saveBookmarks(testEventId, users[1], [4, 5, 6]),
      saveBookmarks(testEventId, users[2], [7, 8, 9]),
    ];
    
    const results = await Promise.all(bookmarkPromises);
    results.forEach(result => expect(result.ok).toBe(true));
    
    // Verify each user has their own bookmarks
    const bookmarks0 = await getBookmarks(testEventId, users[0]);
    const bookmarks1 = await getBookmarks(testEventId, users[1]);
    const bookmarks2 = await getBookmarks(testEventId, users[2]);
    
    expect(bookmarks0.data.bookmarks).toEqual([1, 2, 3]);
    expect(bookmarks1.data.bookmarks).toEqual([4, 5, 6]);
    expect(bookmarks2.data.bookmarks).toEqual([7, 8, 9]);
  });

  test('parallel user registration via PIN', async () => {
    // Multiple users join event simultaneously
    const joinPromises = Array.from({ length: 5 }, (_, i) =>
      getUserToken(testEventId, `newuser${i}@example.com`, testEventPin)
    );
    
    const tokens = await Promise.all(joinPromises);
    
    // All users should get valid tokens
    tokens.forEach(token => {
      expect(token).toBeTruthy();
      expect(token.length).toBeGreaterThan(0);
    });
  });

  test('rating and bookmark same item concurrently', async () => {
    const userA = await getUserToken(testEventId, 'rater@example.com', testEventPin);
    const userB = await getUserToken(testEventId, 'bookmarker@example.com', testEventPin);
    
    // User A rates item #1 while User B bookmarks it
    const [ratingResult, bookmarkResult] = await Promise.all([
      submitRating(testEventId, userA, 1, 4),
      saveBookmarks(testEventId, userB, [1]),
    ]);
    
    expect(ratingResult.ok).toBe(true);
    expect(bookmarkResult.ok).toBe(true);
    
    // Verify both operations persisted
    const ratings = await getRatings(testEventId, userA);
    const bookmarks = await getBookmarks(testEventId, userB);
    
    expect(ratings.some(r => r.itemId === 1 && r.rating === 4)).toBe(true);
    expect(bookmarks.data.bookmarks).toContain(1);
  });
});

// ===================================
// SCENARIO 3: Race Conditions
// ===================================

test.describe('Race Conditions', () => {
  test.afterEach(async () => {
    await cleanupTestEvents();
  });

  test.afterAll(async () => {
    // Safety net: clean up if afterEach failed
    await cleanupTestEvents();
  });

  test('optimistic locking prevents concurrent state transitions', async () => {
    const testEventId = await createTestEvent(null, 'Race Condition Event', testEventPin);
    testEventIds.push(testEventId);
    
    // Add two admins
    const admin1Token = await addAdminToEvent(testEventId, 'admin1@example.com');
    const admin2Token = await addAdminToEvent(testEventId, 'admin2@example.com');
    
    // Both admins try to start the event at the same time
    const [result1, result2] = await Promise.all([
      transitionState(testEventId, admin1Token, 'started', 'created'),
      transitionState(testEventId, admin2Token, 'started', 'created'),
    ]);
    
    // One should succeed, one should fail with optimistic lock error
    const successes = [result1, result2].filter(r => r.ok);
    const failures = [result1, result2].filter(r => !r.ok);
    
    expect(successes.length).toBe(1);
    expect(failures.length).toBe(1);
    
    // The failure should be due to state conflict
    expect(failures[0].data).toMatch(/state has changed|current state|refresh/i);
  });

  test('user updates same rating rapidly - latest wins', async () => {
    const testEventId = await createTestEvent(null, 'Rapid Rating Event', testEventPin);
    testEventIds.push(testEventId);
    
    const adminToken = await addAdminToEvent(testEventId, 'admin@example.com');
    await startEvent(testEventId, adminToken);
    
    const userToken = await getUserToken(testEventId, 'rapiduser@example.com', testEventPin);
    
    // Submit multiple ratings for same item in rapid succession
    const results = await Promise.all([
      submitRating(testEventId, userToken, 1, 1),
      submitRating(testEventId, userToken, 1, 2),
      submitRating(testEventId, userToken, 1, 3),
      submitRating(testEventId, userToken, 1, 4),
    ]);
    
    // All should succeed (replace semantics)
    results.forEach(result => expect(result.ok).toBe(true));
    
    // Only one rating should exist for this item (latest)
    const ratings = await getRatings(testEventId, userToken);
    const item1Ratings = ratings.filter(r => r.itemId === 1);
    expect(item1Ratings.length).toBe(1);
  });

  test('item config update during rating does not corrupt data', async () => {
    const testEventId = await createTestEvent(null, 'Config During Rating Event', testEventPin);
    testEventIds.push(testEventId);
    
    const adminToken = await addAdminToEvent(testEventId, 'admin@example.com');
    await startEvent(testEventId, adminToken);
    
    const userToken = await getUserToken(testEventId, 'user@example.com', testEventPin);
    
    // Simultaneously: user rates items while admin updates config
    const operations = await Promise.all([
      submitRating(testEventId, userToken, 1, 4),
      submitRating(testEventId, userToken, 2, 3),
      updateItemConfig(testEventId, adminToken, { numberOfItems: 30 }),
      submitRating(testEventId, userToken, 3, 2),
    ]);
    
    // Rating operations should succeed
    expect(operations[0].ok).toBe(true);
    expect(operations[1].ok).toBe(true);
    expect(operations[2].ok).toBe(true);
    expect(operations[3].ok).toBe(true);
    
    // Verify all ratings persisted correctly
    const ratings = await getRatings(testEventId, userToken);
    expect(ratings.length).toBe(3);
    
    // Verify config was updated
    const event = await getEvent(testEventId, adminToken);
    expect(event.data.itemConfiguration.numberOfItems).toBe(30);
  });

  test('concurrent state transitions from started state', async () => {
    const testEventId = await createTestEvent(null, 'State Race Event', testEventPin);
    testEventIds.push(testEventId);
    
    const admin1Token = await addAdminToEvent(testEventId, 'admin1@example.com');
    const admin2Token = await addAdminToEvent(testEventId, 'admin2@example.com');
    
    // First start the event
    await startEvent(testEventId, admin1Token);
    
    // Both admins try different transitions from started state
    const [pauseResult, completeResult] = await Promise.all([
      transitionState(testEventId, admin1Token, 'paused', 'started'),
      transitionState(testEventId, admin2Token, 'completed', 'started'),
    ]);
    
    // One should succeed, one should fail
    const successes = [pauseResult, completeResult].filter(r => r.ok);
    const failures = [pauseResult, completeResult].filter(r => !r.ok);
    
    expect(successes.length).toBe(1);
    expect(failures.length).toBe(1);
  });
});

// ===================================
// SCENARIO 4: Admin Concurrent Actions
// ===================================

test.describe('Admin Concurrent Actions', () => {
  test.afterEach(async () => {
    await cleanupTestEvents();
  });

  test.afterAll(async () => {
    // Safety net: clean up if afterEach failed
    await cleanupTestEvents();
  });

  test('two admins adding same administrator simultaneously', async () => {
    const testEventId = await createTestEvent(null, 'Admin Add Race Event', testEventPin);
    testEventIds.push(testEventId);
    
    const admin1Token = await addAdminToEvent(testEventId, 'admin1@example.com');
    const admin2Token = await addAdminToEvent(testEventId, 'admin2@example.com');
    
    // Both try to add the same new admin
    const [result1, result2] = await Promise.all([
      addAdministrator(testEventId, admin1Token, 'newadmin@example.com'),
      addAdministrator(testEventId, admin2Token, 'newadmin@example.com'),
    ]);
    
    // One should succeed, one should fail with "already exists"
    const successes = [result1, result2].filter(r => r.ok);
    const failures = [result1, result2].filter(r => !r.ok);
    
    expect(successes.length).toBe(1);
    expect(failures.length).toBe(1);
    expect(failures[0].data).toMatch(/already exists/i);
  });

  test('parallel PIN regeneration by multiple admins', async () => {
    const testEventId = await createTestEvent(null, 'PIN Regen Race Event', testEventPin);
    testEventIds.push(testEventId);
    
    const admin1Token = await addAdminToEvent(testEventId, 'admin1@example.com');
    const admin2Token = await addAdminToEvent(testEventId, 'admin2@example.com');
    
    // Both admins regenerate PIN simultaneously
    const [result1, result2] = await Promise.all([
      regeneratePIN(testEventId, admin1Token),
      regeneratePIN(testEventId, admin2Token),
    ]);
    
    // Both should succeed (no conflict on PIN regeneration)
    expect(result1.ok).toBe(true);
    expect(result2.ok).toBe(true);
    
    // The event should have a valid PIN (one of the two)
    const event = await getEvent(testEventId, admin1Token);
    expect(event.data.pin).toMatch(/^\d{6}$/);
  });

  test('concurrent item configuration updates', async () => {
    const testEventId = await createTestEvent(null, 'Config Race Event', testEventPin);
    testEventIds.push(testEventId);
    
    const admin1Token = await addAdminToEvent(testEventId, 'admin1@example.com');
    const admin2Token = await addAdminToEvent(testEventId, 'admin2@example.com');
    
    // Both admins update config simultaneously with different values
    const [result1, result2] = await Promise.all([
      updateItemConfig(testEventId, admin1Token, { numberOfItems: 25 }),
      updateItemConfig(testEventId, admin2Token, { numberOfItems: 30 }),
    ]);
    
    // Both should succeed (last write wins)
    expect(result1.ok).toBe(true);
    expect(result2.ok).toBe(true);
    
    // Final value should be one of the two
    const event = await getEvent(testEventId, admin1Token);
    expect([25, 30]).toContain(event.data.itemConfiguration.numberOfItems);
  });
});

// ===================================
// SCENARIO 5: Cache Consistency Tests
// ===================================

test.describe('Cache Consistency', () => {
  test.afterEach(async () => {
    await cleanupTestEvents();
  });

  test.afterAll(async () => {
    // Safety net: clean up if afterEach failed
    await cleanupTestEvents();
  });

  test('concurrent rating submissions are all persisted', async () => {
    // This test verifies that multiple concurrent write operations all complete
    // and their results are eventually visible when read.
    
    const testEventId = await createTestEvent(null, 'Cache Read Event', testEventPin);
    testEventIds.push(testEventId);
    
    const adminToken = await addAdminToEvent(testEventId, 'admin@example.com');
    const startResult = await startEvent(testEventId, adminToken);
    expect(startResult.ok).toBe(true);
    
    // Create users sequentially (rate limiting applies to PIN verification)
    const user1 = await getUserToken(testEventId, 'writer1@example.com', testEventPin);
    const user2 = await getUserToken(testEventId, 'writer2@example.com', testEventPin);
    const user3 = await getUserToken(testEventId, 'writer3@example.com', testEventPin);
    
    // Submit 3 ratings concurrently from different users (different items to avoid conflicts)
    const [rating1, rating2, rating3] = await Promise.all([
      submitRating(testEventId, user1, 1, 4),
      submitRating(testEventId, user2, 2, 3),
      submitRating(testEventId, user3, 3, 2),
    ]);
    
    // All writes should succeed
    expect(rating1.ok).toBe(true);
    expect(rating2.ok).toBe(true);
    expect(rating3.ok).toBe(true);
    
    // After all writes complete, verify all ratings are visible
    const allRatings = await getRatings(testEventId, user1);
    
    expect(allRatings.length).toBe(3);
    
    // Verify each item was rated by the correct user
    const ratedItems = allRatings.map(r => parseInt(r.itemId || r.item_id));
    expect(ratedItems).toContain(1);
    expect(ratedItems).toContain(2);
    expect(ratedItems).toContain(3);
  });

  test('reads during writes return valid data', async () => {
    // Real-world scenario: admin views ratings while users are actively rating.
    // We verify:
    // 1. Reads don't fail or return errors
    // 2. Data returned is structurally valid (not corrupted)
    // 3. Count is within valid range (0 to N)
    // 4. After writes complete, all data is visible (eventual consistency)
    
    const testEventId = await createTestEvent(null, 'Reads During Writes Event', testEventPin);
    testEventIds.push(testEventId);
    
    const adminToken = await addAdminToEvent(testEventId, 'admin@example.com');
    await startEvent(testEventId, adminToken);
    
    const writer1 = await getUserToken(testEventId, 'writer1@example.com', testEventPin);
    const writer2 = await getUserToken(testEventId, 'writer2@example.com', testEventPin);
    const reader = await getUserToken(testEventId, 'reader@example.com', testEventPin);
    
    const TOTAL_WRITES = 3;
    
    // Submit ratings with interleaved reads
    // Writes are sequential to avoid race conditions; reads happen during the process
    const [read1] = await Promise.all([
      getRatings(testEventId, reader),
      submitRating(testEventId, writer1, 1, 4),
    ]);
    
    const [read2] = await Promise.all([
      getRatings(testEventId, reader),
      submitRating(testEventId, writer2, 2, 3),
    ]);
    
    await submitRating(testEventId, writer1, 3, 2);
    
    // Reads should return arrays (not crash)
    expect(Array.isArray(read1)).toBe(true);
    expect(Array.isArray(read2)).toBe(true);
    
    // Counts should be within valid range
    expect(read1.length).toBeGreaterThanOrEqual(0);
    expect(read1.length).toBeLessThanOrEqual(TOTAL_WRITES);
    expect(read2.length).toBeGreaterThanOrEqual(0);
    expect(read2.length).toBeLessThanOrEqual(TOTAL_WRITES);
    
    // Data should be structurally valid
    for (const rating of [...read1, ...read2]) {
      expect(rating).toHaveProperty('email');
      expect(rating).toHaveProperty('itemId');
      expect(rating).toHaveProperty('rating');
    }
    
    // EVENTUAL CONSISTENCY: After writes complete, all data visible
    const finalRatings = await getRatings(testEventId, reader);
    expect(finalRatings.length).toBe(TOTAL_WRITES);
  });

  test('dashboard data consistency during concurrent ratings', async () => {
    const testEventId = await createTestEvent(null, 'Dashboard Cache Event', testEventPin);
    testEventIds.push(testEventId);
    
    const adminToken = await addAdminToEvent(testEventId, 'admin@example.com');
    await startEvent(testEventId, adminToken);
    
    // Create users and submit ratings concurrently
    const users = await Promise.all(
      Array.from({ length: 5 }, (_, i) =>
        getUserToken(testEventId, `dashuser${i}@example.com`, testEventPin)
      )
    );
    
    // All users rate simultaneously
    const ratingPromises = users.flatMap((token, userIndex) =>
      [1, 2, 3].map(itemId =>
        submitRating(testEventId, token, itemId, (userIndex % 4) + 1)
      )
    );
    
    await Promise.all(ratingPromises);
    
    // Fetch dashboard data
    const dashboardResponse = await fetch(`${API_URL}/api/events/${testEventId}/dashboard`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    
    expect(dashboardResponse.ok).toBe(true);
    const dashboard = await dashboardResponse.json();
    
    // Dashboard should reflect consistent state
    // Note: Dashboard returns statistics in a nested object
    expect(dashboard.statistics.totalRatings).toBe(15); // 5 users * 3 items
    // totalUsers includes: event owner + admin + 5 raters = 7 users
    // (createTestEvent creates an owner, addAdminToEvent adds another admin as user)
    expect(dashboard.statistics.totalUsers).toBe(7);
  });
});

// ===================================
// SCENARIO 6: Event Lifecycle Concurrency
// ===================================

test.describe('Event Lifecycle Concurrency', () => {
  test.afterEach(async () => {
    await cleanupTestEvents();
  });

  test.afterAll(async () => {
    // Safety net: clean up if afterEach failed
    await cleanupTestEvents();
  });

  test('rating during state transition to paused', async () => {
    const testEventId = await createTestEvent(null, 'Lifecycle Race Event', testEventPin);
    testEventIds.push(testEventId);
    
    const adminToken = await addAdminToEvent(testEventId, 'admin@example.com');
    await startEvent(testEventId, adminToken);
    
    const userToken = await getUserToken(testEventId, 'user@example.com', testEventPin);
    
    // User tries to rate while admin pauses
    const [ratingResult, pauseResult] = await Promise.all([
      submitRating(testEventId, userToken, 1, 4),
      transitionState(testEventId, adminToken, 'paused', 'started'),
    ]);
    
    // State transition should succeed
    expect(pauseResult.ok).toBe(true);
    
    // Rating might succeed or fail depending on timing
    // If it fails, should be because event is paused
    if (!ratingResult.ok) {
      expect(ratingResult.data).toMatch(/not in started state|paused/i);
    }
  });

  test('bookmark during event completion', async () => {
    const testEventId = await createTestEvent(null, 'Complete During Bookmark Event', testEventPin);
    testEventIds.push(testEventId);
    
    const adminToken = await addAdminToEvent(testEventId, 'admin@example.com');
    await startEvent(testEventId, adminToken);
    
    const userToken = await getUserToken(testEventId, 'user@example.com', testEventPin);
    
    // User saves bookmarks while admin completes event
    const [bookmarkResult, completeResult] = await Promise.all([
      saveBookmarks(testEventId, userToken, [1, 2, 3]),
      transitionState(testEventId, adminToken, 'completed', 'started'),
    ]);
    
    // State transition should succeed
    expect(completeResult.ok).toBe(true);
    
    // Bookmark should succeed (bookmarks allowed in any state)
    expect(bookmarkResult.ok).toBe(true);
  });

  test('similar users request during event state change', async () => {
    const testEventId = await createTestEvent(null, 'Similar Users Lifecycle Event', testEventPin);
    testEventIds.push(testEventId);
    
    const adminToken = await addAdminToEvent(testEventId, 'admin@example.com');
    await startEvent(testEventId, adminToken);
    
    // Create users with ratings
    const user1Token = await getUserToken(testEventId, 'user1@example.com', testEventPin);
    const user2Token = await getUserToken(testEventId, 'user2@example.com', testEventPin);
    
    await submitRating(testEventId, user1Token, 1, 4);
    await submitRating(testEventId, user1Token, 2, 4);
    await submitRating(testEventId, user1Token, 3, 4);
    await submitRating(testEventId, user2Token, 1, 4);
    await submitRating(testEventId, user2Token, 2, 4);
    await submitRating(testEventId, user2Token, 3, 4);
    
    // Request similar users while admin pauses event
    const similarUsersPromise = fetch(`${API_URL}/api/events/${testEventId}/similar-users`, {
      headers: { 'Authorization': `Bearer ${user1Token}` }
    });
    
    const [similarResult, pauseResult] = await Promise.all([
      similarUsersPromise,
      transitionState(testEventId, adminToken, 'paused', 'started'),
    ]);
    
    // Pause should succeed
    expect(pauseResult.ok).toBe(true);
    
    // Similar users request should complete (either with results or appropriate error)
    expect(similarResult.status).toBeLessThan(500); // No server error
  });
});

// ===================================
// SCENARIO 7: Rate Limiting Tests
// ===================================

test.describe('Rate Limiting', () => {
  test.afterEach(async () => {
    await cleanupTestEvents();
  });

  test.afterAll(async () => {
    // Safety net: clean up if afterEach failed
    await cleanupTestEvents();
  });

  test('burst rating submissions from same user', async () => {
    const testEventId = await createTestEvent(null, 'Rate Limit Event', testEventPin);
    testEventIds.push(testEventId);
    
    const adminToken = await addAdminToEvent(testEventId, 'admin@example.com');
    await startEvent(testEventId, adminToken);
    
    const userToken = await getUserToken(testEventId, 'bursty@example.com', testEventPin);
    
    // Submit many ratings in rapid succession (different items)
    const burstPromises = Array.from({ length: 20 }, (_, i) =>
      submitRating(testEventId, userToken, i + 1, (i % 4) + 1)
    );
    
    const results = await Promise.all(burstPromises);
    
    // Count successes and rate-limited responses
    const successes = results.filter(r => r.ok);
    const rateLimited = results.filter(r => r.status === 429);
    
    // Either all succeed (no rate limiting) or some are rate limited
    expect(successes.length + rateLimited.length).toBe(20);
    
    // If rate limiting is enabled, some should be limited
    // If not, all should succeed
    expect(successes.length).toBeGreaterThan(0);
  });

  test('multiple users within rate limit windows', async () => {
    const testEventId = await createTestEvent(null, 'Multi User Rate Limit Event', testEventPin);
    testEventIds.push(testEventId);
    
    const adminToken = await addAdminToEvent(testEventId, 'admin@example.com');
    await startEvent(testEventId, adminToken);
    
    // Create 10 different users
    const users = await Promise.all(
      Array.from({ length: 10 }, (_, i) =>
        getUserToken(testEventId, `ratelimituser${i}@example.com`, testEventPin)
      )
    );
    
    // Each user submits 3 ratings simultaneously
    const allPromises = users.flatMap((token, userIndex) =>
      [1, 2, 3].map(itemId =>
        submitRating(testEventId, token, itemId, (userIndex % 4) + 1)
      )
    );
    
    const results = await Promise.all(allPromises);
    
    // Most should succeed (rate limits are per-user, not global)
    const successes = results.filter(r => r.ok);
    expect(successes.length).toBeGreaterThanOrEqual(20); // At least 20 of 30
  });

  test('sustained low-rate submissions stay within limits', async () => {
    const testEventId = await createTestEvent(null, 'Sustained Rate Event', testEventPin);
    testEventIds.push(testEventId);
    
    const adminToken = await addAdminToEvent(testEventId, 'admin@example.com');
    await startEvent(testEventId, adminToken);
    
    const userToken = await getUserToken(testEventId, 'sustained@example.com', testEventPin);
    
    // Submit ratings with small delays (should not trigger rate limit)
    const results = [];
    for (let i = 1; i <= 5; i++) {
      const result = await submitRating(testEventId, userToken, i, (i % 4) + 1);
      results.push(result);
      await new Promise(resolve => setTimeout(resolve, 100)); // 100ms delay
    }
    
    // All should succeed with paced requests
    results.forEach(result => expect(result.ok).toBe(true));
    
    // Verify all ratings exist
    const ratings = await getRatings(testEventId, userToken);
    expect(ratings.length).toBe(5);
  });
});

// ===================================
// SCENARIO: Integration - Full Concurrent Workflow
// ===================================

test.describe('Full Concurrent Workflow', () => {
  test.afterEach(async () => {
    await cleanupTestEvents();
  });

  test.afterAll(async () => {
    // Safety net: clean up if afterEach failed
    await cleanupTestEvents();
  });

  test('complete event lifecycle with concurrent operations', async () => {
    // Create event
    const testEventId = await createTestEvent(null, 'Full Workflow Event', testEventPin);
    testEventIds.push(testEventId);
    
    // Setup admins
    const ownerToken = await addAdminToEvent(testEventId, 'owner@example.com');
    const admin2Token = await addAdminToEvent(testEventId, 'admin2@example.com');
    
    // Start event
    await startEvent(testEventId, ownerToken);
    
    // Create multiple users concurrently
    const users = await Promise.all(
      Array.from({ length: 10 }, (_, i) =>
        getUserToken(testEventId, `fulluser${i}@example.com`, testEventPin)
      )
    );
    
    // Phase 1: All users rate and bookmark concurrently
    const phase1Ops = users.flatMap((token, i) => [
      submitRating(testEventId, token, 1, (i % 4) + 1),
      submitRating(testEventId, token, 2, ((i + 1) % 4) + 1),
      submitRating(testEventId, token, 3, ((i + 2) % 4) + 1),
      saveBookmarks(testEventId, token, [1, 2]),
    ]);
    
    const phase1Results = await Promise.all(phase1Ops);
    const phase1Successes = phase1Results.filter(r => r.ok).length;
    expect(phase1Successes).toBeGreaterThanOrEqual(35); // Most should succeed
    
    // Phase 2: Admin actions while users continue
    const phase2Ops = await Promise.all([
      // Admin updates config
      updateItemConfig(testEventId, ownerToken, { numberOfItems: 25 }),
      // More user ratings
      submitRating(testEventId, users[0], 4, 4),
      submitRating(testEventId, users[1], 5, 3),
      // Admin regenerates PIN
      regeneratePIN(testEventId, admin2Token),
    ]);
    
    phase2Ops.forEach(result => expect(result.ok).toBe(true));
    
    // Phase 3: Complete event and verify final state
    const completeResult = await transitionState(testEventId, ownerToken, 'completed', 'started');
    expect(completeResult.ok).toBe(true);
    
    // Verify final state
    const finalEvent = await getEvent(testEventId, ownerToken);
    expect(finalEvent.data.state).toBe('completed');
    expect(finalEvent.data.itemConfiguration.numberOfItems).toBe(25);
    
    // Verify ratings persisted
    const finalRatings = await getRatings(testEventId, users[0]);
    expect(finalRatings.length).toBeGreaterThanOrEqual(30);
  });
});
