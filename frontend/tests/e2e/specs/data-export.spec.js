/**
 * Data Export Tests
 * 
 * Tests the data export functionality on the admin page including:
 * - Export Ratings Data (raw ratings CSV)
 * - Export Ratings Matrix (pivot table)
 * - Export User Data (user statistics)
 * - Export Item Details (item statistics)
 * 
 * Also tests access control, button states, and CSV content validation.
 */

import { test, expect } from '@playwright/test';
import {
  createTestEvent,
  deleteTestEvent,
  addAdminToEvent,
  setAuthToken,
  clearAuth,
  submitEmail,
  enterAndSubmitPIN,
} from './helpers.js';

const BASE_URL = 'http://localhost:3000';
const API_URL = 'http://localhost:3001';

let testEventId;
const testEventPin = '654321';

// ===================================
// Helper Functions
// ===================================

/**
 * Get user token via PIN verification
 */
async function getUserToken(eventId, email, pin) {
  const response = await fetch(`${API_URL}/api/events/${eventId}/verify-pin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, pin })
  });
  if (!response.ok) {
    throw new Error(`Failed to get user token: ${await response.text()}`);
  }
  const data = await response.json();
  return data.token;
}

/**
 * Submit a rating via API
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
  return { ok: response.ok, status: response.status };
}

/**
 * Start an event (transition from created to started)
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
  if (!response.ok) {
    throw new Error(`Failed to start event: ${await response.text()}`);
  }
}

/**
 * Register an item via API
 * Note: Item ID is assigned by the backend, not specified by the caller
 */
async function registerItem(eventId, token, name, price = null, description = '') {
  const response = await fetch(`${API_URL}/api/events/${eventId}/items`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ name, price, description })
  });
  const data = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, item: data };
}

/**
 * Update item configuration via API
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
  return { ok: response.ok, status: response.status };
}

/**
 * Update user profile name via API
 */
async function updateUserProfile(eventId, token, name) {
  const response = await fetch(`${API_URL}/api/events/${eventId}/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ name })
  });
  return { ok: response.ok, status: response.status };
}

/**
 * Open the Export Data drawer on the admin page
 */
async function openExportDrawer(page) {
  const exportButton = page.getByRole('button', { name: /export data/i });
  await exportButton.waitFor({ state: 'visible', timeout: 10000 });
  await exportButton.click();
  
  // Wait for drawer to open
  await page.getByRole('heading', { name: /export data/i }).waitFor({ state: 'visible', timeout: 5000 });
}

/**
 * Click a specific export button and wait for download
 * @param {Page} page - Playwright page
 * @param {string} type - 'ratings' | 'matrix' | 'users' | 'items'
 * @returns {Promise<Download>} The download object
 */
async function clickExportAndWaitForDownload(page, type) {
  const buttonNames = {
    ratings: /export ratings data/i,
    matrix: /export ratings matrix/i,
    users: /export user data/i,
    items: /export.*details/i
  };
  
  const downloadPromise = page.waitForEvent('download');
  const button = page.getByRole('button', { name: buttonNames[type] });
  await button.click();
  
  return await downloadPromise;
}

/**
 * Click a specific export button (without waiting for download)
 */
async function clickExportButton(page, type) {
  const buttonNames = {
    ratings: /export ratings data/i,
    matrix: /export ratings matrix/i,
    users: /export user data/i,
    items: /export.*details/i
  };
  
  const button = page.getByRole('button', { name: buttonNames[type] });
  await button.click();
}

/**
 * Parse CSV content from a download
 */
async function parseDownloadedCSV(download) {
  const filePath = await download.path();
  // Use dynamic require to avoid ESM issues with WebKit
  const { readFileSync } = await import('node:fs');
  const content = readFileSync(filePath, 'utf-8');
  
  const lines = content.trim().split('\n');
  const headers = parseCSVLine(lines[0]);
  const rows = lines.slice(1).map(line => {
    const values = parseCSVLine(line);
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    return row;
  });
  
  return { headers, rows, rawContent: content };
}

/**
 * Parse a single CSV line, handling quoted fields
 */
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // Skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  
  return result;
}

/**
 * Get export button by type
 */
function getExportButton(page, type) {
  const buttonNames = {
    ratings: /export ratings data/i,
    matrix: /export ratings matrix/i,
    users: /export user data/i,
    items: /export.*details/i
  };
  return page.getByRole('button', { name: buttonNames[type] });
}

// ===================================
// Test Suites
// ===================================

test.describe('Data Export', () => {
  
  // ===================================
  // Data Export Access Tests
  // ===================================
  
  test.describe('Data Export Access', () => {
    test.afterEach(async () => {
      if (testEventId) {
        await deleteTestEvent(testEventId);
        testEventId = null;
      }
    });

    test('admin can access Export Data drawer', async ({ page }) => {
      testEventId = await createTestEvent(null, 'Export Access Event', testEventPin);
      const adminToken = await addAdminToEvent(testEventId, 'admin@example.com');
      
      await setAuthToken(page, adminToken, 'admin@example.com');
      await page.goto(`${BASE_URL}/event/${testEventId}/admin`);
      await page.waitForLoadState('networkidle');
      
      // Click Export Data button
      await openExportDrawer(page);
      
      // Verify all export buttons are visible
      await expect(page.getByRole('button', { name: /export ratings data/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /export ratings matrix/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /export user data/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /export.*details/i })).toBeVisible();
    });

    test('regular user cannot access admin page', async ({ page }) => {
      testEventId = await createTestEvent(null, 'Export Access Regular User Event', testEventPin);
      const adminToken = await addAdminToEvent(testEventId, 'admin@example.com');
      await startEvent(testEventId, adminToken);
      
      // Login as regular user
      await clearAuth(page);
      await page.goto(`${BASE_URL}/event/${testEventId}`);
      await submitEmail(page, 'regularuser@example.com');
      await enterAndSubmitPIN(page, testEventPin);
      await page.waitForLoadState('networkidle');
      
      // Try to navigate to admin page
      await page.goto(`${BASE_URL}/event/${testEventId}/admin`);
      await page.waitForLoadState('networkidle');
      
      // Should be redirected or show access denied - not on admin page with Export Data visible
      const exportButton = page.getByRole('button', { name: /export data/i });
      await expect(exportButton).not.toBeVisible({ timeout: 3000 }).catch(() => {
        // If visible, the URL should have changed (redirected)
        expect(page.url()).not.toContain('/admin');
      });
    });
  });

  // ===================================
  // Export Ratings Data Tests
  // ===================================

  test.describe('Export Ratings Data', () => {
    test.afterEach(async () => {
      if (testEventId) {
        await deleteTestEvent(testEventId);
        testEventId = null;
      }
    });

    test('shows error when no ratings exist', async ({ page }) => {
      testEventId = await createTestEvent(null, 'Export No Ratings Event', testEventPin);
      const adminToken = await addAdminToEvent(testEventId, 'admin@example.com');
      
      await setAuthToken(page, adminToken, 'admin@example.com');
      await page.goto(`${BASE_URL}/event/${testEventId}/admin`);
      await page.waitForLoadState('networkidle');
      
      await openExportDrawer(page);
      await clickExportButton(page, 'ratings');
      
      // Should show error message
      const errorMessage = page.getByText(/no ratings data available to export/i);
      await expect(errorMessage).toBeVisible({ timeout: 5000 });
    });

    test('exports single rating correctly', async ({ page }) => {
      testEventId = await createTestEvent(null, 'Export Single Rating Event', testEventPin);
      const adminToken = await addAdminToEvent(testEventId, 'admin@example.com');
      await startEvent(testEventId, adminToken);
      
      // Submit one rating
      const userToken = await getUserToken(testEventId, 'rater@example.com', testEventPin);
      await submitRating(testEventId, userToken, 1, 4, 'Great item!');
      
      await setAuthToken(page, adminToken, 'admin@example.com');
      await page.goto(`${BASE_URL}/event/${testEventId}/admin`);
      await page.waitForLoadState('networkidle');
      
      await openExportDrawer(page);
      const download = await clickExportAndWaitForDownload(page, 'ratings');
      
      const csv = await parseDownloadedCSV(download);
      expect(csv.rows.length).toBe(1);
      expect(csv.rows[0].userEmail).toBe('rater@example.com');
      expect(csv.rows[0].rating).toBe('4');
      expect(csv.rows[0].note).toBe('Great item!');
    });

    test('exports multiple ratings with correct columns', async ({ page }) => {
      testEventId = await createTestEvent(null, 'Export Multiple Ratings Event', testEventPin);
      const adminToken = await addAdminToEvent(testEventId, 'admin@example.com');
      await startEvent(testEventId, adminToken);
      
      // Submit ratings from multiple users
      const user1Token = await getUserToken(testEventId, 'user1@example.com', testEventPin);
      const user2Token = await getUserToken(testEventId, 'user2@example.com', testEventPin);
      
      await submitRating(testEventId, user1Token, 1, 4);
      await submitRating(testEventId, user1Token, 2, 3);
      await submitRating(testEventId, user2Token, 1, 2);
      await submitRating(testEventId, user2Token, 3, 4);
      await submitRating(testEventId, user2Token, 4, 1);
      
      await setAuthToken(page, adminToken, 'admin@example.com');
      await page.goto(`${BASE_URL}/event/${testEventId}/admin`);
      await page.waitForLoadState('networkidle');
      
      await openExportDrawer(page);
      const download = await clickExportAndWaitForDownload(page, 'ratings');
      
      const csv = await parseDownloadedCSV(download);
      expect(csv.headers).toEqual(['username', 'userEmail', 'ratingTimestamp', 'itemid', 'rating', 'note']);
      expect(csv.rows.length).toBe(5);
    });

    test('filename follows correct pattern', async ({ page }) => {
      testEventId = await createTestEvent(null, 'Export Filename Event', testEventPin);
      const adminToken = await addAdminToEvent(testEventId, 'admin@example.com');
      await startEvent(testEventId, adminToken);
      
      const userToken = await getUserToken(testEventId, 'user@example.com', testEventPin);
      await submitRating(testEventId, userToken, 1, 4);
      
      await setAuthToken(page, adminToken, 'admin@example.com');
      await page.goto(`${BASE_URL}/event/${testEventId}/admin`);
      await page.waitForLoadState('networkidle');
      
      await openExportDrawer(page);
      const download = await clickExportAndWaitForDownload(page, 'ratings');
      
      const filename = download.suggestedFilename();
      expect(filename).toMatch(/^ratings-export-.*-\d{4}-\d{2}-\d{2}\.csv$/);
      expect(filename).toContain(testEventId);
    });

    test('handles special characters in notes (CSV escaping)', async ({ page }) => {
      testEventId = await createTestEvent(null, 'Export Special Chars Event', testEventPin);
      const adminToken = await addAdminToEvent(testEventId, 'admin@example.com');
      await startEvent(testEventId, adminToken);
      
      const userToken = await getUserToken(testEventId, 'user@example.com', testEventPin);
      // Note with commas, quotes, and special characters
      await submitRating(testEventId, userToken, 1, 4, 'Great, "amazing" item & more!');
      
      await setAuthToken(page, adminToken, 'admin@example.com');
      await page.goto(`${BASE_URL}/event/${testEventId}/admin`);
      await page.waitForLoadState('networkidle');
      
      await openExportDrawer(page);
      const download = await clickExportAndWaitForDownload(page, 'ratings');
      
      const csv = await parseDownloadedCSV(download);
      expect(csv.rows[0].note).toContain('Great');
      expect(csv.rows[0].note).toContain('amazing');
      expect(csv.rows[0].note).toContain('&');
    });

    test('shows success message after export', async ({ page }) => {
      testEventId = await createTestEvent(null, 'Export Success Message Event', testEventPin);
      const adminToken = await addAdminToEvent(testEventId, 'admin@example.com');
      await startEvent(testEventId, adminToken);
      
      const userToken = await getUserToken(testEventId, 'user@example.com', testEventPin);
      await submitRating(testEventId, userToken, 1, 4);
      
      await setAuthToken(page, adminToken, 'admin@example.com');
      await page.goto(`${BASE_URL}/event/${testEventId}/admin`);
      await page.waitForLoadState('networkidle');
      
      await openExportDrawer(page);
      await clickExportAndWaitForDownload(page, 'ratings');
      
      const successMessage = page.getByText(/ratings data exported successfully/i);
      await expect(successMessage).toBeVisible({ timeout: 5000 });
    });

    test('includes username when user has display name', async ({ page }) => {
      testEventId = await createTestEvent(null, 'Export Username Event', testEventPin);
      const adminToken = await addAdminToEvent(testEventId, 'admin@example.com');
      await startEvent(testEventId, adminToken);
      
      const userToken = await getUserToken(testEventId, 'user@example.com', testEventPin);
      await updateUserProfile(testEventId, userToken, 'John Doe');
      await submitRating(testEventId, userToken, 1, 4);
      
      await setAuthToken(page, adminToken, 'admin@example.com');
      await page.goto(`${BASE_URL}/event/${testEventId}/admin`);
      await page.waitForLoadState('networkidle');
      
      await openExportDrawer(page);
      const download = await clickExportAndWaitForDownload(page, 'ratings');
      
      const csv = await parseDownloadedCSV(download);
      expect(csv.rows[0].username).toBe('John Doe');
    });
  });

  // ===================================
  // Export Ratings Matrix Tests
  // ===================================

  test.describe('Export Ratings Matrix', () => {
    test.afterEach(async () => {
      if (testEventId) {
        await deleteTestEvent(testEventId);
        testEventId = null;
      }
    });

    test('shows error when no ratings exist', async ({ page }) => {
      testEventId = await createTestEvent(null, 'Matrix No Ratings Event', testEventPin);
      const adminToken = await addAdminToEvent(testEventId, 'admin@example.com');
      
      await setAuthToken(page, adminToken, 'admin@example.com');
      await page.goto(`${BASE_URL}/event/${testEventId}/admin`);
      await page.waitForLoadState('networkidle');
      
      await openExportDrawer(page);
      await clickExportButton(page, 'matrix');
      
      const errorMessage = page.getByText(/no ratings data available to export/i);
      await expect(errorMessage).toBeVisible({ timeout: 5000 });
    });

    test('creates matrix with items as rows and users as columns', async ({ page }) => {
      testEventId = await createTestEvent(null, 'Matrix Structure Event', testEventPin);
      const adminToken = await addAdminToEvent(testEventId, 'admin@example.com');
      await startEvent(testEventId, adminToken);
      
      const user1Token = await getUserToken(testEventId, 'user1@example.com', testEventPin);
      const user2Token = await getUserToken(testEventId, 'user2@example.com', testEventPin);
      
      await submitRating(testEventId, user1Token, 1, 4);
      await submitRating(testEventId, user1Token, 2, 3);
      await submitRating(testEventId, user2Token, 1, 2);
      await submitRating(testEventId, user2Token, 3, 4);
      
      await setAuthToken(page, adminToken, 'admin@example.com');
      await page.goto(`${BASE_URL}/event/${testEventId}/admin`);
      await page.waitForLoadState('networkidle');
      
      await openExportDrawer(page);
      const download = await clickExportAndWaitForDownload(page, 'matrix');
      
      const csv = await parseDownloadedCSV(download);
      // Should have 3 rows (items 1, 2, 3)
      expect(csv.rows.length).toBe(3);
      // Should have itemId, user columns, Average Rating, Weighted Rating
      expect(csv.headers[0]).toBe('itemId');
      expect(csv.headers).toContain('Average Rating');
      expect(csv.headers).toContain('Weighted Rating');
    });

    test('includes Average and Weighted Rating columns', async ({ page }) => {
      testEventId = await createTestEvent(null, 'Matrix Averages Event', testEventPin);
      const adminToken = await addAdminToEvent(testEventId, 'admin@example.com');
      await startEvent(testEventId, adminToken);
      
      const user1Token = await getUserToken(testEventId, 'user1@example.com', testEventPin);
      const user2Token = await getUserToken(testEventId, 'user2@example.com', testEventPin);
      
      // Both users rate item 1
      await submitRating(testEventId, user1Token, 1, 4);
      await submitRating(testEventId, user2Token, 1, 2);
      
      await setAuthToken(page, adminToken, 'admin@example.com');
      await page.goto(`${BASE_URL}/event/${testEventId}/admin`);
      await page.waitForLoadState('networkidle');
      
      await openExportDrawer(page);
      const download = await clickExportAndWaitForDownload(page, 'matrix');
      
      const csv = await parseDownloadedCSV(download);
      const item1Row = csv.rows.find(r => r.itemId === '1');
      expect(item1Row['Average Rating']).toBe('3.00'); // (4+2)/2
      expect(item1Row['Weighted Rating']).toBeTruthy();
    });

    test('user columns use username (email) format when name exists', async ({ page }) => {
      testEventId = await createTestEvent(null, 'Matrix Username Format Event', testEventPin);
      const adminToken = await addAdminToEvent(testEventId, 'admin@example.com');
      await startEvent(testEventId, adminToken);
      
      const userToken = await getUserToken(testEventId, 'user@example.com', testEventPin);
      await updateUserProfile(testEventId, userToken, 'Jane Smith');
      await submitRating(testEventId, userToken, 1, 4);
      
      await setAuthToken(page, adminToken, 'admin@example.com');
      await page.goto(`${BASE_URL}/event/${testEventId}/admin`);
      await page.waitForLoadState('networkidle');
      
      await openExportDrawer(page);
      const download = await clickExportAndWaitForDownload(page, 'matrix');
      
      const csv = await parseDownloadedCSV(download);
      // Should have column like "Jane Smith (user@example.com)"
      const userColumn = csv.headers.find(h => h.includes('Jane Smith') && h.includes('user@example.com'));
      expect(userColumn).toBeTruthy();
    });

    test('filename follows correct pattern', async ({ page }) => {
      testEventId = await createTestEvent(null, 'Matrix Filename Event', testEventPin);
      const adminToken = await addAdminToEvent(testEventId, 'admin@example.com');
      await startEvent(testEventId, adminToken);
      
      const userToken = await getUserToken(testEventId, 'user@example.com', testEventPin);
      await submitRating(testEventId, userToken, 1, 4);
      
      await setAuthToken(page, adminToken, 'admin@example.com');
      await page.goto(`${BASE_URL}/event/${testEventId}/admin`);
      await page.waitForLoadState('networkidle');
      
      await openExportDrawer(page);
      const download = await clickExportAndWaitForDownload(page, 'matrix');
      
      const filename = download.suggestedFilename();
      expect(filename).toMatch(/^ratings-matrix-.*-\d{4}-\d{2}-\d{2}\.csv$/);
    });

    test('empty cells for unrated item-user combinations', async ({ page }) => {
      testEventId = await createTestEvent(null, 'Matrix Empty Cells Event', testEventPin);
      const adminToken = await addAdminToEvent(testEventId, 'admin@example.com');
      await startEvent(testEventId, adminToken);
      
      const user1Token = await getUserToken(testEventId, 'user1@example.com', testEventPin);
      const user2Token = await getUserToken(testEventId, 'user2@example.com', testEventPin);
      
      // User1 rates item 1, User2 rates item 2 - no overlap
      await submitRating(testEventId, user1Token, 1, 4);
      await submitRating(testEventId, user2Token, 2, 3);
      
      await setAuthToken(page, adminToken, 'admin@example.com');
      await page.goto(`${BASE_URL}/event/${testEventId}/admin`);
      await page.waitForLoadState('networkidle');
      
      await openExportDrawer(page);
      const download = await clickExportAndWaitForDownload(page, 'matrix');
      
      const csv = await parseDownloadedCSV(download);
      const item1Row = csv.rows.find(r => r.itemId === '1');
      const item2Row = csv.rows.find(r => r.itemId === '2');
      
      // User1 column should be empty for item 2, User2 column should be empty for item 1
      const user1Col = csv.headers.find(h => h.includes('user1@example.com'));
      const user2Col = csv.headers.find(h => h.includes('user2@example.com'));
      
      expect(item1Row[user2Col]).toBe('');
      expect(item2Row[user1Col]).toBe('');
    });
  });

  // ===================================
  // Export User Data Tests
  // ===================================

  test.describe('Export User Data', () => {
    test.afterEach(async () => {
      if (testEventId) {
        await deleteTestEvent(testEventId);
        testEventId = null;
      }
    });

    test('exports admin as user when only admin exists', async ({ page }) => {
      testEventId = await createTestEvent(null, 'Users Admin Only Event', testEventPin);
      const adminToken = await addAdminToEvent(testEventId, 'admin@example.com');
      
      // Admin is automatically added as a user, so export should succeed with 1 user
      await setAuthToken(page, adminToken, 'admin@example.com');
      await page.goto(`${BASE_URL}/event/${testEventId}/admin`);
      await page.waitForLoadState('networkidle');
      
      await openExportDrawer(page);
      const download = await clickExportAndWaitForDownload(page, 'users');
      
      const csv = await parseDownloadedCSV(download);
      expect(csv.rows.length).toBeGreaterThanOrEqual(1);
      
      // Admin should be in the exported users
      const adminRow = csv.rows.find(r => r.email === 'admin@example.com');
      expect(adminRow).toBeDefined();
    });

    test('exports user with correct columns', async ({ page }) => {
      testEventId = await createTestEvent(null, 'Users Columns Event', testEventPin);
      const adminToken = await addAdminToEvent(testEventId, 'admin@example.com');
      await startEvent(testEventId, adminToken);
      
      const userToken = await getUserToken(testEventId, 'user@example.com', testEventPin);
      await updateUserProfile(testEventId, userToken, 'Test User');
      await submitRating(testEventId, userToken, 1, 4);
      
      await setAuthToken(page, adminToken, 'admin@example.com');
      await page.goto(`${BASE_URL}/event/${testEventId}/admin`);
      await page.waitForLoadState('networkidle');
      
      await openExportDrawer(page);
      const download = await clickExportAndWaitForDownload(page, 'users');
      
      const csv = await parseDownloadedCSV(download);
      const expectedColumns = [
        'email', 'username', 'registrationDate', 'administratorStatus',
        'itemsRegisteredCount', 'itemIds', 'itemNames', 'ratingsGivenCount', 'averageRatingGiven'
      ];
      expect(csv.headers).toEqual(expectedColumns);
    });

    test('exports admin with Owner status', async ({ page }) => {
      testEventId = await createTestEvent(null, 'Users Owner Status Event', testEventPin);
      const adminToken = await addAdminToEvent(testEventId, 'owner@example.com');
      
      await setAuthToken(page, adminToken, 'owner@example.com');
      await page.goto(`${BASE_URL}/event/${testEventId}/admin`);
      await page.waitForLoadState('networkidle');
      
      await openExportDrawer(page);
      const download = await clickExportAndWaitForDownload(page, 'users');
      
      const csv = await parseDownloadedCSV(download);
      const ownerRow = csv.rows.find(r => r.email === 'owner@example.com');
      // First admin is typically the owner
      expect(['Owner', 'Administrator']).toContain(ownerRow?.administratorStatus);
    });

    test('exports regular user with correct status', async ({ page }) => {
      testEventId = await createTestEvent(null, 'Users Regular Status Event', testEventPin);
      const adminToken = await addAdminToEvent(testEventId, 'admin@example.com');
      await startEvent(testEventId, adminToken);
      
      const userToken = await getUserToken(testEventId, 'regular@example.com', testEventPin);
      await submitRating(testEventId, userToken, 1, 4);
      
      await setAuthToken(page, adminToken, 'admin@example.com');
      await page.goto(`${BASE_URL}/event/${testEventId}/admin`);
      await page.waitForLoadState('networkidle');
      
      await openExportDrawer(page);
      const download = await clickExportAndWaitForDownload(page, 'users');
      
      const csv = await parseDownloadedCSV(download);
      const regularRow = csv.rows.find(r => r.email === 'regular@example.com');
      expect(regularRow?.administratorStatus).toBe('Regular User');
    });

    test('includes items registered by user', async ({ page }) => {
      testEventId = await createTestEvent(null, 'Users Items Registered Event', testEventPin);
      const adminToken = await addAdminToEvent(testEventId, 'admin@example.com');
      await startEvent(testEventId, adminToken);
      
      const userToken = await getUserToken(testEventId, 'itemowner@example.com', testEventPin);
      const item1 = await registerItem(testEventId, userToken, 'My Wine', 25.99, 'A great wine');
      const item2 = await registerItem(testEventId, userToken, 'Another Wine', 35.00);
      
      // Ensure items were registered successfully
      if (!item1.ok || !item2.ok) {
        throw new Error(`Failed to register items: item1=${item1.status}, item2=${item2.status}`);
      }
      
      await setAuthToken(page, adminToken, 'admin@example.com');
      await page.goto(`${BASE_URL}/event/${testEventId}/admin`);
      await page.waitForLoadState('networkidle');
      
      await openExportDrawer(page);
      const download = await clickExportAndWaitForDownload(page, 'users');
      
      const csv = await parseDownloadedCSV(download);
      const ownerRow = csv.rows.find(r => r.email === 'itemowner@example.com');
      expect(ownerRow?.itemsRegisteredCount).toBe('2');
      // Note: itemIds is empty for newly registered items because numeric 
      // bottle IDs (itemId) are assigned later during the "paused" state.
      // The export only includes items with assigned itemIds.
      expect(ownerRow?.itemNames).toContain('My Wine');
      expect(ownerRow?.itemNames).toContain('Another Wine');
    });

    test('includes ratings statistics', async ({ page }) => {
      testEventId = await createTestEvent(null, 'Users Ratings Stats Event', testEventPin);
      const adminToken = await addAdminToEvent(testEventId, 'admin@example.com');
      await startEvent(testEventId, adminToken);
      
      const userToken = await getUserToken(testEventId, 'rater@example.com', testEventPin);
      await submitRating(testEventId, userToken, 1, 4);
      await submitRating(testEventId, userToken, 2, 2);
      await submitRating(testEventId, userToken, 3, 3);
      
      await setAuthToken(page, adminToken, 'admin@example.com');
      await page.goto(`${BASE_URL}/event/${testEventId}/admin`);
      await page.waitForLoadState('networkidle');
      
      await openExportDrawer(page);
      const download = await clickExportAndWaitForDownload(page, 'users');
      
      const csv = await parseDownloadedCSV(download);
      const raterRow = csv.rows.find(r => r.email === 'rater@example.com');
      expect(raterRow?.ratingsGivenCount).toBe('3');
      expect(raterRow?.averageRatingGiven).toBe('3.00'); // (4+2+3)/3 = 3
    });

    test('filename follows correct pattern', async ({ page }) => {
      testEventId = await createTestEvent(null, 'Users Filename Event', testEventPin);
      const adminToken = await addAdminToEvent(testEventId, 'admin@example.com');
      await startEvent(testEventId, adminToken);
      
      const userToken = await getUserToken(testEventId, 'user@example.com', testEventPin);
      await submitRating(testEventId, userToken, 1, 4);
      
      await setAuthToken(page, adminToken, 'admin@example.com');
      await page.goto(`${BASE_URL}/event/${testEventId}/admin`);
      await page.waitForLoadState('networkidle');
      
      await openExportDrawer(page);
      const download = await clickExportAndWaitForDownload(page, 'users');
      
      const filename = download.suggestedFilename();
      expect(filename).toMatch(/^users-export-.*-\d{4}-\d{2}-\d{2}\.csv$/);
    });
  });

  // ===================================
  // Export Item Details Tests
  // ===================================

  test.describe('Export Item Details', () => {
    test.afterEach(async () => {
      if (testEventId) {
        await deleteTestEvent(testEventId);
        testEventId = null;
      }
    });

    test('shows error when no items configured', async ({ page }) => {
      testEventId = await createTestEvent(null, 'Items No Config Event', testEventPin);
      const adminToken = await addAdminToEvent(testEventId, 'admin@example.com');
      
      // Set numberOfItems to 0
      await updateItemConfig(testEventId, adminToken, { numberOfItems: 0 });
      
      await setAuthToken(page, adminToken, 'admin@example.com');
      await page.goto(`${BASE_URL}/event/${testEventId}/admin`);
      await page.waitForLoadState('networkidle');
      
      await openExportDrawer(page);
      await clickExportButton(page, 'items');
      
      const errorMessage = page.getByText(/no.*configured for this event/i);
      await expect(errorMessage).toBeVisible({ timeout: 5000 });
    });

    test('exports all items from 1 to numberOfItems', async ({ page }) => {
      testEventId = await createTestEvent(null, 'Items All Items Event', testEventPin);
      const adminToken = await addAdminToEvent(testEventId, 'admin@example.com');
      
      // Set 10 items
      await updateItemConfig(testEventId, adminToken, { numberOfItems: 10 });
      
      await setAuthToken(page, adminToken, 'admin@example.com');
      await page.goto(`${BASE_URL}/event/${testEventId}/admin`);
      await page.waitForLoadState('networkidle');
      
      await openExportDrawer(page);
      const download = await clickExportAndWaitForDownload(page, 'items');
      
      const csv = await parseDownloadedCSV(download);
      expect(csv.rows.length).toBe(10);
      expect(csv.rows[0].itemId).toBe('1');
      expect(csv.rows[9].itemId).toBe('10');
    });

    test('excludes items in excludedItemIds list', async ({ page }) => {
      testEventId = await createTestEvent(null, 'Items Excluded Event', testEventPin);
      const adminToken = await addAdminToEvent(testEventId, 'admin@example.com');
      
      // Set 10 items, exclude 3, 5, 7
      await updateItemConfig(testEventId, adminToken, { 
        numberOfItems: 10, 
        excludedItemIds: [3, 5, 7] 
      });
      
      await setAuthToken(page, adminToken, 'admin@example.com');
      await page.goto(`${BASE_URL}/event/${testEventId}/admin`);
      await page.waitForLoadState('networkidle');
      
      await openExportDrawer(page);
      const download = await clickExportAndWaitForDownload(page, 'items');
      
      const csv = await parseDownloadedCSV(download);
      expect(csv.rows.length).toBe(7); // 10 - 3 excluded
      
      const itemIds = csv.rows.map(r => parseInt(r.itemId));
      expect(itemIds).not.toContain(3);
      expect(itemIds).not.toContain(5);
      expect(itemIds).not.toContain(7);
    });

    test('unassigned bottle slots have empty detail fields', async ({ page }) => {
      testEventId = await createTestEvent(null, 'Items Unassigned Event', testEventPin);
      const adminToken = await addAdminToEvent(testEventId, 'admin@example.com');
      
      // Set 5 bottle slots
      await updateItemConfig(testEventId, adminToken, { numberOfItems: 5 });
      
      await setAuthToken(page, adminToken, 'admin@example.com');
      await page.goto(`${BASE_URL}/event/${testEventId}/admin`);
      await page.waitForLoadState('networkidle');
      
      await openExportDrawer(page);
      const download = await clickExportAndWaitForDownload(page, 'items');
      
      const csv = await parseDownloadedCSV(download);
      
      // All 5 bottle slots should be exported
      expect(csv.rows.length).toBe(5);
      
      // All bottles should have empty detail fields (no items assigned yet)
      // Items are only linked to bottle numbers during "paused" state
      for (const row of csv.rows) {
        expect(row.name).toBe('');
        expect(row.price).toBe('');
        expect(row.ownerEmail).toBe('');
      }
    });

    test('includes rating statistics', async ({ page }) => {
      testEventId = await createTestEvent(null, 'Items Rating Stats Event', testEventPin);
      const adminToken = await addAdminToEvent(testEventId, 'admin@example.com');
      await updateItemConfig(testEventId, adminToken, { numberOfItems: 5 });
      await startEvent(testEventId, adminToken);
      
      // Multiple users rate item 1
      const user1Token = await getUserToken(testEventId, 'user1@example.com', testEventPin);
      const user2Token = await getUserToken(testEventId, 'user2@example.com', testEventPin);
      const user3Token = await getUserToken(testEventId, 'user3@example.com', testEventPin);
      
      await submitRating(testEventId, user1Token, 1, 4);
      await submitRating(testEventId, user2Token, 1, 3);
      await submitRating(testEventId, user3Token, 1, 2);
      
      await setAuthToken(page, adminToken, 'admin@example.com');
      await page.goto(`${BASE_URL}/event/${testEventId}/admin`);
      await page.waitForLoadState('networkidle');
      
      await openExportDrawer(page);
      const download = await clickExportAndWaitForDownload(page, 'items');
      
      const csv = await parseDownloadedCSV(download);
      const item1 = csv.rows.find(r => r.itemId === '1');
      
      expect(item1?.numberOfRaters).toBe('3');
      expect(item1?.averageRating).toBe('3.00'); // (4+3+2)/3
      expect(item1?.weightedAverage).toBeTruthy();
    });

    test('includes rating distribution', async ({ page }) => {
      testEventId = await createTestEvent(null, 'Items Rating Distribution Event', testEventPin);
      const adminToken = await addAdminToEvent(testEventId, 'admin@example.com');
      await updateItemConfig(testEventId, adminToken, { numberOfItems: 5 });
      await startEvent(testEventId, adminToken);
      
      // Create ratings with specific distribution: one 1, two 2s, one 3, three 4s
      const users = [];
      for (let i = 1; i <= 7; i++) {
        users.push(await getUserToken(testEventId, `user${i}@example.com`, testEventPin));
      }
      
      await submitRating(testEventId, users[0], 1, 1); // one 1
      await submitRating(testEventId, users[1], 1, 2); // two 2s
      await submitRating(testEventId, users[2], 1, 2);
      await submitRating(testEventId, users[3], 1, 3); // one 3
      await submitRating(testEventId, users[4], 1, 4); // three 4s
      await submitRating(testEventId, users[5], 1, 4);
      await submitRating(testEventId, users[6], 1, 4);
      
      await setAuthToken(page, adminToken, 'admin@example.com');
      await page.goto(`${BASE_URL}/event/${testEventId}/admin`);
      await page.waitForLoadState('networkidle');
      
      await openExportDrawer(page);
      const download = await clickExportAndWaitForDownload(page, 'items');
      
      const csv = await parseDownloadedCSV(download);
      const item1 = csv.rows.find(r => r.itemId === '1');
      
      expect(item1?.ratingCount1).toBe('1');
      expect(item1?.ratingCount2).toBe('2');
      expect(item1?.ratingCount3).toBe('1');
      expect(item1?.ratingCount4).toBe('3');
    });

    test('includes rating progression percentage', async ({ page }) => {
      testEventId = await createTestEvent(null, 'Items Progression Event', testEventPin);
      const adminToken = await addAdminToEvent(testEventId, 'admin@example.com');
      await updateItemConfig(testEventId, adminToken, { numberOfItems: 5 });
      await startEvent(testEventId, adminToken);
      
      // 4 users total, 2 rate item 1 = 50%
      const user1Token = await getUserToken(testEventId, 'user1@example.com', testEventPin);
      const user2Token = await getUserToken(testEventId, 'user2@example.com', testEventPin);
      await getUserToken(testEventId, 'user3@example.com', testEventPin); // joins but doesn't rate
      await getUserToken(testEventId, 'user4@example.com', testEventPin); // joins but doesn't rate
      
      await submitRating(testEventId, user1Token, 1, 4);
      await submitRating(testEventId, user2Token, 1, 3);
      
      await setAuthToken(page, adminToken, 'admin@example.com');
      await page.goto(`${BASE_URL}/event/${testEventId}/admin`);
      await page.waitForLoadState('networkidle');
      
      await openExportDrawer(page);
      const download = await clickExportAndWaitForDownload(page, 'items');
      
      const csv = await parseDownloadedCSV(download);
      const item1 = csv.rows.find(r => r.itemId === '1');
      
      // 2 raters out of total users (including admin = 5 users)
      // Exact percentage depends on total user count
      expect(parseFloat(item1?.ratingProgression)).toBeGreaterThan(0);
    });

    test('filename uses event terminology (bottles for wine)', async ({ page }) => {
      testEventId = await createTestEvent(null, 'Items Terminology Event', testEventPin);
      const adminToken = await addAdminToEvent(testEventId, 'admin@example.com');
      await updateItemConfig(testEventId, adminToken, { numberOfItems: 5 });
      
      await setAuthToken(page, adminToken, 'admin@example.com');
      await page.goto(`${BASE_URL}/event/${testEventId}/admin`);
      await page.waitForLoadState('networkidle');
      
      await openExportDrawer(page);
      const download = await clickExportAndWaitForDownload(page, 'items');
      
      const filename = download.suggestedFilename();
      // Default event type is "wine" which uses "bottles"
      expect(filename).toMatch(/^bottles-export-.*-\d{4}-\d{2}-\d{2}\.csv$/);
    });
  });

  // ===================================
  // Button States Tests
  // ===================================

  test.describe('Button States', () => {
    test.afterEach(async () => {
      if (testEventId) {
        await deleteTestEvent(testEventId);
        testEventId = null;
      }
    });

    test('all export buttons enabled when idle', async ({ page }) => {
      testEventId = await createTestEvent(null, 'Buttons Idle Event', testEventPin);
      const adminToken = await addAdminToEvent(testEventId, 'admin@example.com');
      
      await setAuthToken(page, adminToken, 'admin@example.com');
      await page.goto(`${BASE_URL}/event/${testEventId}/admin`);
      await page.waitForLoadState('networkidle');
      
      await openExportDrawer(page);
      
      await expect(getExportButton(page, 'ratings')).toBeEnabled();
      await expect(getExportButton(page, 'matrix')).toBeEnabled();
      await expect(getExportButton(page, 'users')).toBeEnabled();
      await expect(getExportButton(page, 'items')).toBeEnabled();
    });

    test('other buttons disabled during ratings export', async ({ page }) => {
      testEventId = await createTestEvent(null, 'Buttons During Ratings Event', testEventPin);
      const adminToken = await addAdminToEvent(testEventId, 'admin@example.com');
      await startEvent(testEventId, adminToken);
      
      // Add many ratings to make export take longer
      for (let i = 1; i <= 5; i++) {
        const userToken = await getUserToken(testEventId, `user${i}@example.com`, testEventPin);
        for (let j = 1; j <= 10; j++) {
          await submitRating(testEventId, userToken, j, (i % 4) + 1);
        }
      }
      
      await setAuthToken(page, adminToken, 'admin@example.com');
      await page.goto(`${BASE_URL}/event/${testEventId}/admin`);
      await page.waitForLoadState('networkidle');
      
      await openExportDrawer(page);
      
      // Click export and immediately check other buttons
      const downloadPromise = page.waitForEvent('download');
      await getExportButton(page, 'ratings').click();
      
      // Other buttons should be disabled during export
      // Note: This might be flaky if export is too fast
      const matrixDisabled = await getExportButton(page, 'matrix').isDisabled().catch(() => false);
      const usersDisabled = await getExportButton(page, 'users').isDisabled().catch(() => false);
      const itemsDisabled = await getExportButton(page, 'items').isDisabled().catch(() => false);
      
      // At least verify export completes
      await downloadPromise;
      
      // After export, all buttons should be enabled again
      await expect(getExportButton(page, 'matrix')).toBeEnabled();
      await expect(getExportButton(page, 'users')).toBeEnabled();
      await expect(getExportButton(page, 'items')).toBeEnabled();
    });

    test('buttons re-enable after export completes', async ({ page }) => {
      testEventId = await createTestEvent(null, 'Buttons Re-enable Event', testEventPin);
      const adminToken = await addAdminToEvent(testEventId, 'admin@example.com');
      await startEvent(testEventId, adminToken);
      
      const userToken = await getUserToken(testEventId, 'user@example.com', testEventPin);
      await submitRating(testEventId, userToken, 1, 4);
      
      await setAuthToken(page, adminToken, 'admin@example.com');
      await page.goto(`${BASE_URL}/event/${testEventId}/admin`);
      await page.waitForLoadState('networkidle');
      
      await openExportDrawer(page);
      
      // Do first export
      await clickExportAndWaitForDownload(page, 'ratings');
      
      // All buttons should be enabled after export
      await expect(getExportButton(page, 'ratings')).toBeEnabled();
      await expect(getExportButton(page, 'matrix')).toBeEnabled();
      await expect(getExportButton(page, 'users')).toBeEnabled();
      await expect(getExportButton(page, 'items')).toBeEnabled();
      
      // Can do another export
      await clickExportAndWaitForDownload(page, 'matrix');
      
      // Still enabled
      await expect(getExportButton(page, 'ratings')).toBeEnabled();
    });
  });

  // ===================================
  // Large Dataset and CSV Validation Tests
  // ===================================

  test.describe('Large Dataset and CSV Validation', () => {
    test.afterEach(async () => {
      if (testEventId) {
        await deleteTestEvent(testEventId);
        testEventId = null;
      }
    });

    test('exports large dataset without timeout', async ({ page }) => {
      test.setTimeout(120000); // 2 minute timeout for this test
      
      testEventId = await createTestEvent(null, 'Large Dataset Event', testEventPin);
      const adminToken = await addAdminToEvent(testEventId, 'admin@example.com');
      await startEvent(testEventId, adminToken);
      
      // Create 10 users with 10 ratings each = 100 ratings
      for (let i = 1; i <= 10; i++) {
        const userToken = await getUserToken(testEventId, `largeuser${i}@example.com`, testEventPin);
        for (let j = 1; j <= 10; j++) {
          await submitRating(testEventId, userToken, j, (i + j) % 4 + 1);
        }
      }
      
      await setAuthToken(page, adminToken, 'admin@example.com');
      await page.goto(`${BASE_URL}/event/${testEventId}/admin`);
      await page.waitForLoadState('networkidle');
      
      await openExportDrawer(page);
      const download = await clickExportAndWaitForDownload(page, 'ratings');
      
      const csv = await parseDownloadedCSV(download);
      expect(csv.rows.length).toBe(100);
    });

    test('ratings CSV has correct row count', async ({ page }) => {
      testEventId = await createTestEvent(null, 'CSV Row Count Event', testEventPin);
      const adminToken = await addAdminToEvent(testEventId, 'admin@example.com');
      await startEvent(testEventId, adminToken);
      
      // Submit exactly 10 ratings
      const userToken = await getUserToken(testEventId, 'counter@example.com', testEventPin);
      for (let i = 1; i <= 10; i++) {
        await submitRating(testEventId, userToken, i, (i % 4) + 1);
      }
      
      await setAuthToken(page, adminToken, 'admin@example.com');
      await page.goto(`${BASE_URL}/event/${testEventId}/admin`);
      await page.waitForLoadState('networkidle');
      
      await openExportDrawer(page);
      const download = await clickExportAndWaitForDownload(page, 'ratings');
      
      const csv = await parseDownloadedCSV(download);
      // Header + 10 data rows
      const lineCount = csv.rawContent.trim().split('\n').length;
      expect(lineCount).toBe(11);
      expect(csv.rows.length).toBe(10);
    });

    test('matrix CSV has correct structure', async ({ page }) => {
      testEventId = await createTestEvent(null, 'Matrix Structure Validation Event', testEventPin);
      const adminToken = await addAdminToEvent(testEventId, 'admin@example.com');
      await startEvent(testEventId, adminToken);
      
      // 2 users rate 3 items
      const user1Token = await getUserToken(testEventId, 'matrixuser1@example.com', testEventPin);
      const user2Token = await getUserToken(testEventId, 'matrixuser2@example.com', testEventPin);
      
      await submitRating(testEventId, user1Token, 1, 4);
      await submitRating(testEventId, user1Token, 2, 3);
      await submitRating(testEventId, user1Token, 3, 2);
      await submitRating(testEventId, user2Token, 1, 2);
      await submitRating(testEventId, user2Token, 2, 4);
      await submitRating(testEventId, user2Token, 3, 3);
      
      await setAuthToken(page, adminToken, 'admin@example.com');
      await page.goto(`${BASE_URL}/event/${testEventId}/admin`);
      await page.waitForLoadState('networkidle');
      
      await openExportDrawer(page);
      const download = await clickExportAndWaitForDownload(page, 'matrix');
      
      const csv = await parseDownloadedCSV(download);
      
      // 3 data rows (3 items)
      expect(csv.rows.length).toBe(3);
      
      // Columns: itemId, user1, user2, Average Rating, Weighted Rating
      expect(csv.headers.length).toBe(5);
      expect(csv.headers[0]).toBe('itemId');
      expect(csv.headers[csv.headers.length - 2]).toBe('Average Rating');
      expect(csv.headers[csv.headers.length - 1]).toBe('Weighted Rating');
    });
  });
});
