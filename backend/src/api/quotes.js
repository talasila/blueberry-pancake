import { Router } from 'express';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import loggerService from '../logging/Logger.js';
import cacheService from '../cache/CacheService.js';

const router = Router();

// Get project root directory (where quotes.json is located)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '../../..');
const quotesFilePath = join(projectRoot, 'quotes.json');

// Cache key for quotes database
const QUOTES_CACHE_KEY = 'quotes:database';

/**
 * Load quotes from file and cache them
 * @returns {Promise<object>} Quotes database object
 */
async function loadQuotesFromFile() {
  try {
    // Read quotes.json file
    const quotesData = await readFile(quotesFilePath, 'utf-8');
    
    // Parse JSON
    const quotes = JSON.parse(quotesData);
    
    // Cache quotes (1 hour TTL)
    cacheService.set(QUOTES_CACHE_KEY, quotes, 3600);
    
    return quotes;
  } catch (error) {
    loggerService.error(`Failed to load quotes database: ${error.message}`, error).catch(() => {});
    throw error;
  }
}

/**
 * Get quotes database (from cache or file)
 * @returns {Promise<object>} Quotes database object
 */
async function getQuotesDatabase() {
  // Ensure cache is initialized
  cacheService.initialize();
  
  // Try cache first
  const cachedQuotes = cacheService.get(QUOTES_CACHE_KEY);
  if (cachedQuotes) {
    return cachedQuotes;
  }
  
  // Load from file if not in cache
  return loadQuotesFromFile();
}

/**
 * Get suggestions for a specific rating level
 * Returns one randomly selected quote from each quote type
 * @param {object} quotes - Full quotes database
 * @param {number|string} ratingLevel - Rating level (1-4)
 * @returns {Array<{text: string, quoteType: string, ratingLevel: number}>} Array of suggestions
 */
function getSuggestionsForRating(quotes, ratingLevel) {
  const ratingKey = String(ratingLevel);
  const levelQuotes = quotes[ratingKey];
  
  if (!levelQuotes || typeof levelQuotes !== 'object') {
    return [];
  }
  
  const quoteTypes = ['snarky', 'poetic', 'haiku'];
  const suggestions = [];
  
  // Get one random quote from each type
  for (const quoteType of quoteTypes) {
    const typeQuotes = levelQuotes[quoteType];
    
    if (Array.isArray(typeQuotes) && typeQuotes.length > 0) {
      // Random selection: O(1) operation
      const randomIndex = Math.floor(Math.random() * typeQuotes.length);
      const selectedQuote = typeQuotes[randomIndex];
      
      if (selectedQuote && selectedQuote.text) {
        suggestions.push({
          text: selectedQuote.text,
          quoteType: quoteType,
          ratingLevel: Number(ratingLevel)
        });
      }
    }
  }
  
  return suggestions;
}

/**
 * GET /api/quotes/:ratingLevel
 * Get suggestions for a specific rating level
 * 
 * Returns one randomly selected suggestion from each quote type (snarky, poetic, haiku)
 * for the specified rating level. Quotes are cached on the server side.
 * 
 * @param {string} ratingLevel - Rating level (1-4) as URL parameter
 * @returns {Array<{text: string, quoteType: string, ratingLevel: number}>} Array of suggestions
 * @throws {400} Bad request - invalid rating level
 * @throws {500} Internal server error - quotes.json file missing or corrupted
 */
router.get('/:ratingLevel', async (req, res) => {
  try {
    const { ratingLevel } = req.params;
    
    // Validate rating level
    const ratingNum = parseInt(ratingLevel, 10);
    if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 4) {
      return res.status(400).json({
        error: 'Invalid rating level. Must be between 1 and 4.'
      });
    }
    
    // Get quotes database (from cache or file)
    const quotes = await getQuotesDatabase();
    
    // Get suggestions for this rating level
    const suggestions = getSuggestionsForRating(quotes, ratingLevel);
    
    // Return suggestions
    res.json(suggestions);
  } catch (error) {
    // Log error for debugging
    loggerService.error(`Failed to get quotes suggestions: ${error.message}`, error).catch(() => {});
    
    // Handle file not found
    if (error.code === 'ENOENT') {
      loggerService.warn(`Quotes file not found at ${quotesFilePath}`).catch(() => {});
      return res.status(500).json({
        error: 'Failed to load quotes database'
      });
    }
    
    // Handle JSON parse errors
    if (error instanceof SyntaxError) {
      loggerService.error(`Quotes file contains invalid JSON: ${error.message}`).catch(() => {});
      return res.status(500).json({
        error: 'Failed to load quotes database'
      });
    }
    
    // Handle other errors
    const isDevelopment = process.env.NODE_ENV !== 'production';
    res.status(500).json({
      error: 'Failed to load quotes suggestions',
      ...(isDevelopment && { details: error.message })
    });
  }
});

export default router;
