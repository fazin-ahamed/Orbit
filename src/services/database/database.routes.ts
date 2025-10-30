import { Router } from 'express';
import { DatabaseController } from './database.controller';

const router = Router();

// Database health and diagnostic routes
router.get('/health', DatabaseController.healthCheck);
router.get('/stats', DatabaseController.getStats);
router.get('/test-connection', DatabaseController.testConnection);

export default router;