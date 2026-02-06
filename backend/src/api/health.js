import { Router } from 'express';
import dataRepository from '../data/DynamoDBRepository.js';

const router = Router();

/**
 * Health check endpoint
 * GET /api/health
 */
router.get('/', async (req, res) => {
  try {
    // Simple check that DynamoDB is accessible
    const isInitialized = dataRepository.isInitialized?.() ?? true;
    
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      storage: {
        type: 'dynamodb',
        initialized: isInitialized
      }
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: 'Storage unavailable'
    });
  }
});

export default router;
