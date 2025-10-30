import { Router } from 'express';
import { AIController } from './ai.controller';
import vectorRoutes from './vector.routes';

const router = Router();

// AI provider management
router.get('/providers', AIController.getProviders);
router.post('/providers/configure', AIController.configureProvider);
router.get('/providers/test', AIController.testConnection);

// AI operations
router.post('/chat/completions', AIController.createChatCompletion);
router.post('/embeddings', AIController.createEmbedding);

// AI usage and monitoring
router.get('/usage', AIController.getUsage);

// Vector storage routes
router.use('/', vectorRoutes);

export default router;