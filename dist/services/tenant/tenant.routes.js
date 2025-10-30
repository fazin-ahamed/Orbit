"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const tenant_controller_1 = require("./tenant.controller");
const router = (0, express_1.Router)();
// Platform admin routes (TODO: RBAC middleware)
router.post('/', tenant_controller_1.TenantController.create);
router.get('/', tenant_controller_1.TenantController.getAll);
router.get('/:id', tenant_controller_1.TenantController.getById);
router.put('/:id', tenant_controller_1.TenantController.update);
router.delete('/:id', tenant_controller_1.TenantController.delete);
// Tenant-specific routes (e.g., get own tenant)
router.get('/me', (req, res) => {
    // TODO: Use req.tenantId to fetch current tenant
    res.json({ message: 'Current tenant placeholder', tenantId: req.tenantId });
});
exports.default = router;
//# sourceMappingURL=tenant.routes.js.map