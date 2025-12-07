import { Router } from 'express';
import cacheService from '../cache/CacheService.js';

const router = Router();

/**
 * Health check endpoint
 * GET /api/health
 */
router.get('/', (req, res) => {
  const cacheStats = cacheService.getStats();
  
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    cache: cacheStats
  });
});

export default router;
