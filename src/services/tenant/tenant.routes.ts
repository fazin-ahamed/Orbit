import { Router } from 'express';
import { TenantController } from './tenant.controller';

const router = Router();

// Platform admin routes (TODO: RBAC middleware)
router.post('/', TenantController.create);
router.get('/', TenantController.getAll);
router.get('/:id', TenantController.getById);
router.put('/:id', TenantController.update);
router.delete('/:id', TenantController.delete);

// Tenant-specific routes (e.g., get own tenant)
router.get('/me', (req, res) => {
  // TODO: Use req.tenantId to fetch current tenant
  res.json({ message: 'Current tenant placeholder', tenantId: req.tenantId });
});

export default router;