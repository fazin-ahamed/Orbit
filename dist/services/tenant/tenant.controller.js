"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantController = void 0;
const db_1 = require("../../lib/db");
const zod_1 = require("zod");
const createTenantSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    subdomain: zod_1.z.string().min(1),
    region: zod_1.z.string().default('global'),
    plan_tier: zod_1.z.string().default('free'),
});
const updateTenantSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).optional(),
    region: zod_1.z.string().optional(),
    plan_tier: zod_1.z.string().optional(),
});
class TenantController {
    static async create(req, res) {
        try {
            const { name, subdomain, region, plan_tier } = createTenantSchema.parse(req.body);
            // Check subdomain uniqueness
            const existing = await (0, db_1.db)('tenants').where('subdomain', subdomain).first();
            if (existing) {
                return res.status(409).json({ error: 'Subdomain already taken' });
            }
            // Insert tenant with timestamps
            const tenantData = {
                name,
                subdomain,
                region,
                plan_tier,
                created_at: new Date(),
                updated_at: new Date()
            };
            const result = await (0, db_1.db)('tenants').insert(tenantData).returning('*');
            if (result && result.length > 0) {
                res.status(201).json(result[0]);
            }
            else {
                // Fallback: get the created tenant by subdomain
                const tenant = await (0, db_1.db)('tenants').where('subdomain', subdomain).first();
                res.status(201).json(tenant);
            }
        }
        catch (error) {
            console.error('Tenant creation error:', error);
            if (error instanceof zod_1.z.ZodError) {
                return res.status(400).json({ error: error.errors });
            }
            res.status(500).json({ error: 'Internal server error' });
        }
    }
    static async getAll(req, res) {
        try {
            // For platform admin; tenant users see only their tenant
            const tenants = await (0, db_1.db)('tenants').select('*');
            res.json(tenants);
        }
        catch (error) {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
    static async getById(req, res) {
        try {
            const id = req.params.id;
            const tenant = await (0, db_1.db)('tenants').where('id', id).first();
            if (!tenant) {
                return res.status(404).json({ error: 'Tenant not found' });
            }
            res.json(tenant);
        }
        catch (error) {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
    static async update(req, res) {
        try {
            const id = req.params.id;
            const updates = updateTenantSchema.parse(req.body);
            const updated = await (0, db_1.db)('tenants')
                .where('id', id)
                .update({ ...updates, updated_at: db_1.db.fn.now() })
                .returning('*');
            if (!updated.length) {
                return res.status(404).json({ error: 'Tenant not found' });
            }
            res.json(updated[0]);
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                return res.status(400).json({ error: error.errors });
            }
            res.status(500).json({ error: 'Internal server error' });
        }
    }
    static async delete(req, res) {
        try {
            const id = req.params.id;
            const deleted = await (0, db_1.db)('tenants')
                .where('id', id)
                .del()
                .returning('id');
            if (!deleted.length) {
                return res.status(404).json({ error: 'Tenant not found' });
            }
            res.json({ message: 'Tenant deleted' });
        }
        catch (error) {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
}
exports.TenantController = TenantController;
//# sourceMappingURL=tenant.controller.js.map