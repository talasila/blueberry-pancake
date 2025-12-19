#!/usr/bin/env node

/**
 * Create Manual Test Event Script
 * 
 * Creates a fully populated event for manual testing with:
 * - Configured items and exclusions
 * - Multiple users with varying rating progress
 * - Ratings with suggested notes from quotes.json
 * - Bookmarks for some users
 * 
 * Usage: node scripts/create-manual-test-event.js
 * 
 * Prerequisites: Backend server must be running on http://localhost:3001
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const API_URL = process.env.API_URL || 'http://localhost:3001';
const EVENT_CONFIG = {
  name: 'My first wine tasting party',
  pin: '536475',
  adminEmail: 'sreenivas.talasila@gmail.com',
  numberOfItems: 35,
  excludedItems: [4, 11, 22, 27],
  numberOfUsers: 40,
  minRatingProgress: 0.25, // 25%
  maxRatingProgress: 0.95, // 95%
  noteUsageRate: 0.5, // 50% of ratings have notes
};

// Load quotes from quotes.json
async function loadQuotes() {
  const quotesPath = path.join(__dirname, '..', 'quotes.json');
  const quotesData = await fs.readFile(quotesPath, 'utf-8');
  return JSON.parse(quotesData);
}

// Get a random quote for a given rating
function getRandomQuote(quotes, rating) {
  const ratingQuotes = quotes[rating.toString()];
  if (!ratingQuotes || !ratingQuotes.snarky || ratingQuotes.snarky.length === 0) {
    return null;
  }
  const randomIndex = Math.floor(Math.random() * ratingQuotes.snarky.length);
  return ratingQuotes.snarky[randomIndex].text;
}

// API helper functions
async function createEvent(name, pin, adminEmail) {
  const response = await fetch(`${API_URL}/api/test/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, pin, typeOfItem: 'wine', adminEmail }),
  });
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create event: ${error}`);
  }
  return response.json();
}

async function addAdminToEvent(eventId, email) {
  const response = await fetch(`${API_URL}/api/test/events/${eventId}/add-admin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, addToUsers: true }),
  });
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to add admin: ${error}`);
  }
  return response.json();
}

async function updateItemConfig(eventId, token, config) {
  const response = await fetch(`${API_URL}/api/events/${eventId}/item-configuration`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(config),
  });
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to update item config: ${error}`);
  }
  return response.json();
}

async function transitionState(eventId, token, newState, currentState) {
  const response = await fetch(`${API_URL}/api/events/${eventId}/state`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ state: newState, currentState }),
  });
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to transition state: ${error}`);
  }
  return response.json();
}

async function getUserToken(eventId, email, pin) {
  const response = await fetch(`${API_URL}/api/events/${eventId}/verify-pin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, pin }),
  });
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get user token: ${error}`);
  }
  const data = await response.json();
  return data.token;
}

async function submitRating(eventId, token, itemId, rating, note = null) {
  const body = { itemId, rating };
  if (note) {
    body.note = note;
  }
  const response = await fetch(`${API_URL}/api/events/${eventId}/ratings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to submit rating: ${error}`);
  }
  return response.json();
}

async function saveBookmarks(eventId, token, bookmarks) {
  const response = await fetch(`${API_URL}/api/events/${eventId}/bookmarks`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ bookmarks }),
  });
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to save bookmarks: ${error}`);
  }
  return response.json();
}

// Generate available item IDs (excluding excluded items)
function getAvailableItems(numberOfItems, excludedItems) {
  const items = [];
  for (let i = 1; i <= numberOfItems; i++) {
    if (!excludedItems.includes(i)) {
      items.push(i);
    }
  }
  return items;
}

// Shuffle array (Fisher-Yates)
function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Generate random progress between min and max
function getRandomProgress(min, max) {
  return min + Math.random() * (max - min);
}

// Main function
async function main() {
  console.log('🍷 Creating Manual Test Event');
  console.log('==============================\n');

  try {
    // Load quotes
    console.log('📚 Loading quotes from quotes.json...');
    const quotes = await loadQuotes();
    console.log('   ✓ Quotes loaded\n');

    // Step 1: Create event
    console.log('📋 Step 1: Creating event...');
    const eventResult = await createEvent(
      EVENT_CONFIG.name,
      EVENT_CONFIG.pin,
      EVENT_CONFIG.adminEmail
    );
    const eventId = eventResult.eventId;
    console.log(`   ✓ Event created: ${eventId}`);
    console.log(`   ✓ Name: ${EVENT_CONFIG.name}`);
    console.log(`   ✓ PIN: ${EVENT_CONFIG.pin}\n`);

    // Step 2: Add admin and get token
    console.log('👤 Step 2: Adding administrator...');
    const adminResult = await addAdminToEvent(eventId, EVENT_CONFIG.adminEmail);
    const adminToken = adminResult.token;
    console.log(`   ✓ Admin added: ${EVENT_CONFIG.adminEmail}\n`);

    // Step 3: Configure items
    console.log('⚙️  Step 3: Configuring items...');
    await updateItemConfig(eventId, adminToken, {
      numberOfItems: EVENT_CONFIG.numberOfItems,
      excludedItemIds: EVENT_CONFIG.excludedItems,
    });
    console.log(`   ✓ Number of items: ${EVENT_CONFIG.numberOfItems}`);
    console.log(`   ✓ Excluded items: ${EVENT_CONFIG.excludedItems.join(', ')}\n`);

    // Step 4: Start the event
    console.log('🚀 Step 4: Starting event...');
    await transitionState(eventId, adminToken, 'started', 'created');
    console.log('   ✓ Event state: started\n');

    // Get available items for rating
    const availableItems = getAvailableItems(
      EVENT_CONFIG.numberOfItems,
      EVENT_CONFIG.excludedItems
    );
    console.log(`   ℹ️  Available items for rating: ${availableItems.length}\n`);

    // Step 5: Create users and submit ratings
    console.log(`👥 Step 5: Creating ${EVENT_CONFIG.numberOfUsers} users with ratings...`);
    
    let totalRatings = 0;
    let ratingsWithNotes = 0;
    let totalBookmarks = 0;

    for (let i = 1; i <= EVENT_CONFIG.numberOfUsers; i++) {
      const userEmail = `user${i}@example.com`;
      
      // Get user token via PIN verification
      const userToken = await getUserToken(eventId, userEmail, EVENT_CONFIG.pin);
      
      // Calculate how many items this user will rate (25% to 95% progress)
      const progress = getRandomProgress(
        EVENT_CONFIG.minRatingProgress,
        EVENT_CONFIG.maxRatingProgress
      );
      const itemsToRate = Math.floor(availableItems.length * progress);
      
      // Shuffle items and take the first N
      const shuffledItems = shuffleArray(availableItems);
      const userItems = shuffledItems.slice(0, itemsToRate);
      
      // Submit ratings for each item
      for (const itemId of userItems) {
        // Random rating 1-4
        const rating = Math.floor(Math.random() * 4) + 1;
        
        // Decide if this rating gets a note (50% chance)
        let note = null;
        if (Math.random() < EVENT_CONFIG.noteUsageRate) {
          note = getRandomQuote(quotes, rating);
          if (note) {
            ratingsWithNotes++;
          }
        }
        
        await submitRating(eventId, userToken, itemId, rating, note);
        totalRatings++;
      }
      
      // Add bookmarks for some users (60% chance, 1-5 random bookmarks)
      if (Math.random() < 0.6) {
        const numBookmarks = Math.floor(Math.random() * 5) + 1;
        const bookmarkItems = shuffleArray(availableItems).slice(0, numBookmarks);
        await saveBookmarks(eventId, userToken, bookmarkItems);
        totalBookmarks += bookmarkItems.length;
      }
      
      // Progress indicator
      const progressPercent = Math.round((i / EVENT_CONFIG.numberOfUsers) * 100);
      process.stdout.write(`\r   Creating users... ${progressPercent}% (${i}/${EVENT_CONFIG.numberOfUsers})`);
    }
    
    console.log('\n   ✓ All users created\n');

    // Summary
    console.log('📊 Summary');
    console.log('==========');
    console.log(`   Event ID: ${eventId}`);
    console.log(`   Event Name: ${EVENT_CONFIG.name}`);
    console.log(`   Event PIN: ${EVENT_CONFIG.pin}`);
    console.log(`   Admin: ${EVENT_CONFIG.adminEmail}`);
    console.log(`   Total Items: ${EVENT_CONFIG.numberOfItems}`);
    console.log(`   Excluded Items: ${EVENT_CONFIG.excludedItems.join(', ')}`);
    console.log(`   Available Items: ${availableItems.length}`);
    console.log(`   Total Users: ${EVENT_CONFIG.numberOfUsers}`);
    console.log(`   Total Ratings: ${totalRatings}`);
    console.log(`   Ratings with Notes: ${ratingsWithNotes}`);
    console.log(`   Total Bookmarks: ${totalBookmarks}`);
    console.log('');
    console.log('🔗 Access URLs:');
    console.log(`   Event Page: http://localhost:5173/event/${eventId}`);
    console.log(`   Admin Dashboard: http://localhost:5173/event/${eventId}/dashboard`);
    console.log('');
    console.log('✅ Done! Event is ready for manual testing.');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the script
main();
