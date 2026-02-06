#!/usr/bin/env node
/**
 * Event Migration Script
 * 
 * Migrates event data from the old file-based format to DynamoDB.
 * 
 * Usage:
 *   node scripts/migrate-event.js <eventId>
 *   node scripts/migrate-event.js TALASILA
 * 
 * Prerequisites:
 *   - DynamoDB Local must be running (npm run dynamo:start)
 *   - Table must exist (npm run dynamo:setup)
 */

import { readFile } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  BatchWriteCommand,
} from '@aws-sdk/lib-dynamodb';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '../..');

// Configuration
const TABLE_NAME = process.env.DYNAMODB_TABLE || 'blueberry-pancake-dev';
const ENDPOINT = process.env.DYNAMODB_ENDPOINT || 'http://localhost:8000';
const REGION = process.env.AWS_REGION || 'us-east-1';

// Get event ID from command line
const eventId = process.argv[2];

if (!eventId) {
  console.error('Usage: node scripts/migrate-event.js <eventId>');
  console.error('Example: node scripts/migrate-event.js TALASILA');
  process.exit(1);
}

// Initialize DynamoDB client
const client = new DynamoDBClient({
  region: REGION,
  endpoint: ENDPOINT,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'local',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'local',
  },
});

const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true,
    convertEmptyValues: false,
  },
});

/**
 * Parse CSV content into array of objects
 * Handles quoted fields with commas
 */
function parseCSV(content) {
  const lines = content.trim().split('\n');
  if (lines.length === 0) return [];

  const headers = lines[0].split(',');
  const records = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const values = [];
    let current = '';
    let inQuotes = false;

    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());

    const record = {};
    headers.forEach((header, idx) => {
      record[header.trim()] = values[idx] || '';
    });
    records.push(record);
  }

  return records;
}

/**
 * Read event config from file
 */
async function readEventConfig(eventId) {
  const configPath = join(projectRoot, 'data', 'events', eventId, 'config.json');
  console.log(`[Migration] Reading config from: ${configPath}`);
  
  const content = await readFile(configPath, 'utf-8');
  return JSON.parse(content);
}

/**
 * Read ratings from CSV file
 */
async function readRatings(eventId) {
  const ratingsPath = join(projectRoot, 'data', 'events', eventId, 'ratings.csv');
  console.log(`[Migration] Reading ratings from: ${ratingsPath}`);
  
  try {
    const content = await readFile(ratingsPath, 'utf-8');
    return parseCSV(content);
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log('[Migration] No ratings file found, skipping ratings migration');
      return [];
    }
    throw error;
  }
}

/**
 * Write event config to DynamoDB
 */
async function writeEventConfig(config) {
  console.log(`[Migration] Writing event config for: ${config.eventId}`);
  
  const item = {
    PK: `EVENT#${config.eventId}`,
    SK: 'CONFIG',
    GSI1PK: 'EVENTS',
    GSI1SK: config.createdAt || new Date().toISOString(),
    ...config,
  };

  await docClient.send(new PutCommand({
    TableName: TABLE_NAME,
    Item: item,
  }));

  console.log('[Migration] Event config written successfully');
}

/**
 * Write ratings to DynamoDB in batches
 */
async function writeRatings(eventId, ratings) {
  if (ratings.length === 0) {
    console.log('[Migration] No ratings to migrate');
    return;
  }

  console.log(`[Migration] Writing ${ratings.length} ratings...`);

  // Prepare items for batch write
  const items = ratings.map(rating => ({
    PK: `EVENT#${eventId}`,
    SK: `RATING#${rating.email.toLowerCase()}#${rating.itemId}`,
    email: rating.email.toLowerCase(),
    itemId: parseInt(rating.itemId, 10),
    rating: parseInt(rating.rating, 10),
    note: rating.note || null,
    timestamp: rating.timestamp || new Date().toISOString(),
  }));

  // DynamoDB BatchWrite supports max 25 items per request
  const BATCH_SIZE = 25;
  let processed = 0;

  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);
    
    const request = {
      RequestItems: {
        [TABLE_NAME]: batch.map(item => ({
          PutRequest: { Item: item },
        })),
      },
    };

    await docClient.send(new BatchWriteCommand(request));
    processed += batch.length;
    
    // Progress indicator
    process.stdout.write(`\r[Migration] Ratings progress: ${processed}/${items.length}`);
  }

  console.log('\n[Migration] Ratings written successfully');
}

/**
 * Extract and write bookmarks from config to separate DynamoDB items
 * Bookmarks are stored under config.users[email].bookmarks
 */
async function writeBookmarks(eventId, config) {
  const users = config.users || {};
  const bookmarkItems = [];

  // Extract bookmarks from each user
  for (const email in users) {
    const userData = users[email];
    if (userData && userData.bookmarks && Array.isArray(userData.bookmarks) && userData.bookmarks.length > 0) {
      bookmarkItems.push({
        PK: `EVENT#${eventId}`,
        SK: `BOOKMARK#${email.toLowerCase()}`,
        email: email.toLowerCase(),
        bookmarks: userData.bookmarks,
        updatedAt: new Date().toISOString(),
      });
    }
  }

  if (bookmarkItems.length === 0) {
    console.log('[Migration] No bookmarks to migrate');
    return;
  }

  console.log(`[Migration] Writing ${bookmarkItems.length} user bookmark records...`);

  // DynamoDB BatchWrite supports max 25 items per request
  const BATCH_SIZE = 25;
  let processed = 0;

  for (let i = 0; i < bookmarkItems.length; i += BATCH_SIZE) {
    const batch = bookmarkItems.slice(i, i + BATCH_SIZE);
    
    const request = {
      RequestItems: {
        [TABLE_NAME]: batch.map(item => ({
          PutRequest: { Item: item },
        })),
      },
    };

    await docClient.send(new BatchWriteCommand(request));
    processed += batch.length;
    
    // Progress indicator
    process.stdout.write(`\r[Migration] Bookmarks progress: ${processed}/${bookmarkItems.length}`);
  }

  console.log('\n[Migration] Bookmarks written successfully');
}

/**
 * Clean bookmarks from config before writing
 * (bookmarks are now stored separately)
 */
function cleanConfigBookmarks(config) {
  const cleanedConfig = { ...config };
  if (cleanedConfig.users) {
    cleanedConfig.users = { ...cleanedConfig.users };
    for (const email in cleanedConfig.users) {
      if (cleanedConfig.users[email] && cleanedConfig.users[email].bookmarks) {
        cleanedConfig.users[email] = { ...cleanedConfig.users[email] };
        delete cleanedConfig.users[email].bookmarks;
      }
    }
  }
  return cleanedConfig;
}

/**
 * Main migration function
 */
async function migrate() {
  console.log('='.repeat(60));
  console.log(`[Migration] Starting migration for event: ${eventId}`);
  console.log(`[Migration] DynamoDB endpoint: ${ENDPOINT}`);
  console.log(`[Migration] Table: ${TABLE_NAME}`);
  console.log('='.repeat(60));

  try {
    // Read existing data
    const config = await readEventConfig(eventId);
    const ratings = await readRatings(eventId);

    // Count bookmarks in config
    const bookmarkCount = Object.values(config.users || {})
      .filter(u => u && u.bookmarks && Array.isArray(u.bookmarks) && u.bookmarks.length > 0)
      .length;

    console.log(`[Migration] Found ${Object.keys(config.users || {}).length} users in config`);
    console.log(`[Migration] Found ${bookmarkCount} users with bookmarks`);
    console.log(`[Migration] Found ${ratings.length} ratings`);

    // Write bookmarks as separate items first (before cleaning config)
    await writeBookmarks(eventId, config);

    // Clean bookmarks from config (they're now stored separately)
    const cleanedConfig = cleanConfigBookmarks(config);

    // Write cleaned config and ratings to DynamoDB
    await writeEventConfig(cleanedConfig);
    await writeRatings(eventId, ratings);

    console.log('='.repeat(60));
    console.log('[Migration] Migration completed successfully!');
    console.log(`[Migration] View data at: http://localhost:8001`);
    console.log('='.repeat(60));
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.error(`[Migration] ERROR: Event directory not found: data/events/${eventId}`);
      console.error('[Migration] Make sure the event exists in the old file format.');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('[Migration] ERROR: Cannot connect to DynamoDB Local');
      console.error('[Migration] Make sure DynamoDB Local is running: npm run dynamo:start');
    } else {
      console.error('[Migration] ERROR:', error.message);
    }
    process.exit(1);
  }
}

migrate();
