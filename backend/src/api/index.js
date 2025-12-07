import { Router } from 'express';
import healthRouter from './health.js';

const router = Router();

// Mount route modules
router.use('/health', healthRouter);

// Future API routes will be added here
// router.use('/events', eventsRouter);
// router.use('/auth', authRouter);

export default router;
