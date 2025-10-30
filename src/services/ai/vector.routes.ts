import { Router } from 'express';
import { VectorController } from './vector.controller';

const router = Router();

// Vector storage operations
router.post('/vectors', VectorController.createVector);
router.post('/vectors/search', VectorController.searchVectors);
router.get('/vectors/stats', VectorController.getVectorStats);
router.delete('/vectors/source/:source_id', VectorController.deleteVectorsBySource);

export default router;