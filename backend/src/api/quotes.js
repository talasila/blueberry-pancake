import { Router } from 'express';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import loggerService from '../logging/Logger.js';
import { isProduction } from '../utils/environment.js';

const router = Router();

// Quote files live in backend/src/quotes/ (works for both local and Lambda - included in src/)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const quotesDir = join(__dirname, '..', 'quotes');

// Simple in-memory cache for static quotes (they never change during runtime)
const quotesCache = new Map();

/**
 * Parse quotes from text file content
 * Handles UTF-8 encoding and special characters properly
 * @param {string} fileContent - Raw file content (UTF-8 encoded)
 * @returns {string[]} Array of quote strings with special chars preserved
 */
function parseQuotesFromText(fileContent) {
  return fileContent
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map(line => {
      // Remove surrounding double quotes if present
      // Use a regex that handles the full line content including special chars
      const match = line.match(/^"(.*)"$/s);
      if (match) {
        return match[1];
      }
      // If no surrounding quotes, return line as-is (shouldn't happen with current format)
      return line;
    })
    .filter(quote => quote.length > 0); // Filter out any empty results
}

/**
 * Load quotes from a specific text file (with caching)
 * Ensures UTF-8 encoding is used for proper Unicode support
 * @param {number} fileNum - File number (1-4)
 * @returns {Promise<string[]>} Array of quotes
 */
async function loadQuotesFromFile(fileNum) {
  const cacheKey = `quotes:file:${fileNum}`;
  
  // Check simple in-memory cache (quotes are static, never change)
  if (quotesCache.has(cacheKey)) {
    return quotesCache.get(cacheKey);
  }
  
  const filePath = join(quotesDir, `${fileNum}.quotes.txt`);
  // Explicitly use UTF-8 encoding to preserve Unicode characters (em dashes, etc.)
  const content = await readFile(filePath, 'utf-8');
  const quotes = parseQuotesFromText(content);
  
  // Cache in-memory (no TTL needed - quotes are static)
  quotesCache.set(cacheKey, quotes);
  return quotes;
}

/**
 * Calculate which quote files to use based on normalized rating position
 * 
 * Mapping logic:
 * - Rating 1 (worst) always maps to file 1 (negative quotes)
 * - Max rating (best) always maps to file 4 (positive quotes)
 * - Middle ratings are interpolated and may blend from two files
 * 
 * @param {number} rating - User's selected rating (1 to maxRating)
 * @param {number} maxRating - Event's maximum rating (2, 3, or 4)
 * @returns {Array<{file: number, count: number}>} Files to use with quote counts
 */
function calculateQuoteFiles(rating, maxRating) {
  // Edge case: maxRating of 1 (shouldn't happen, but handle gracefully)
  if (maxRating <= 1) {
    return [{ file: 1, count: 2 }];
  }
  
  // Calculate normalized position (0 to 1)
  const normalizedPosition = (rating - 1) / (maxRating - 1);
  
  // Map to file position (1 to 4)
  const filePosition = 1 + (normalizedPosition * 3);
  
  // If whole number, use single file
  if (Number.isInteger(filePosition)) {
    return [{ file: filePosition, count: 2 }];
  }
  
  // Otherwise, blend from two adjacent files
  const lowerFile = Math.floor(filePosition);
  const upperFile = Math.ceil(filePosition);
  
  return [
    { file: lowerFile, count: 1 },
    { file: upperFile, count: 1 }
  ];
}

/**
 * Select random quotes from an array without duplicates
 * @param {string[]} quotes - Array of quote strings
 * @param {number} count - Number of quotes to select
 * @returns {string[]} Array of selected quotes
 */
function selectRandomQuotes(quotes, count) {
  const selected = [];
  const usedIndices = new Set();
  const maxCount = Math.min(count, quotes.length);
  
  while (selected.length < maxCount) {
    const idx = Math.floor(Math.random() * quotes.length);
    if (!usedIndices.has(idx)) {
      usedIndices.add(idx);
      selected.push(quotes[idx]);
    }
  }
  return selected;
}

/**
 * Get suggestions by loading from appropriate files and selecting randomly
 * @param {number} rating - User's rating (1 to maxRating)
 * @param {number} maxRating - Event's max rating (2, 3, or 4)
 * @returns {Promise<Array<{text: string, ratingLevel: number}>>} Array of suggestions
 */
async function getSuggestions(rating, maxRating) {
  const fileSpecs = calculateQuoteFiles(rating, maxRating);
  const suggestions = [];
  
  for (const spec of fileSpecs) {
    try {
      const quotes = await loadQuotesFromFile(spec.file);
      if (quotes.length === 0) continue;
      
      // Select random quotes from this file
      const selected = selectRandomQuotes(quotes, spec.count);
      suggestions.push(...selected.map(text => ({ text, ratingLevel: rating })));
    } catch (error) {
      // Log but continue - graceful degradation if one file is missing
      loggerService.warn(`Failed to load quotes from file ${spec.file}: ${error.message}`).catch(() => {});
    }
  }
  
  return suggestions;
}

/**
 * GET /api/quotes/:ratingLevel
 * Get suggestions for a specific rating level
 * 
 * Returns 2 randomly selected suggestions based on normalized mapping:
 * - Rating 1 always uses 1.quotes.txt (negative quotes)
 * - Max rating always uses 4.quotes.txt (positive quotes)
 * - Middle ratings may blend from two adjacent files
 * 
 * @param {string} ratingLevel - Rating level (1 to maxRating) as URL parameter
 * @param {string} [maxRating] - Maximum rating for the event (2, 3, or 4) as query param, defaults to 4
 * @returns {Array<{text: string, ratingLevel: number}>} Array of suggestions
 * @throws {400} Bad request - invalid rating level or maxRating
 * @throws {500} Internal server error - quote files missing or corrupted
 */
router.get('/:ratingLevel', async (req, res) => {
  try {
    const { ratingLevel } = req.params;
    const maxRating = parseInt(req.query.maxRating, 10) || 4;
    
    // Validate maxRating
    if (maxRating < 2 || maxRating > 4) {
      return res.status(400).json({
        error: 'Invalid maxRating. Must be 2, 3, or 4.'
      });
    }
    
    // Validate rating level
    const ratingNum = parseInt(ratingLevel, 10);
    if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > maxRating) {
      return res.status(400).json({
        error: `Invalid rating level. Must be between 1 and ${maxRating}.`
      });
    }
    
    // Get suggestions using normalized mapping
    const suggestions = await getSuggestions(ratingNum, maxRating);
    
    // Return suggestions
    res.json(suggestions);
  } catch (error) {
    // Log error for debugging
    loggerService.error(`Failed to get quotes suggestions: ${error.message}`, error).catch(() => {});
    
    // Handle file not found
    if (error.code === 'ENOENT') {
      loggerService.warn(`Quote file not found: ${error.path || 'unknown'}`).catch(() => {});
      return res.status(500).json({
        error: 'Failed to load quotes'
      });
    }
    
    // Handle other errors
    const isDevelopment = !isProduction();
    res.status(500).json({
      error: 'Failed to load quotes suggestions',
      ...(isDevelopment && { details: error.message })
    });
  }
});

export default router;
