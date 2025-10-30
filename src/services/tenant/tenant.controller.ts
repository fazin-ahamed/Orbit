import { Request, Response } from 'express';
import { db } from '../../lib/db';
import { z } from 'zod';

const createTenantSchema = z.object({
  name: z.string().min(1),
  subdomain: z.string().min(1),
  region: z.string().default('global'),
  plan_tier: z.string().default('free'),
});

const updateTenantSchema = z.object({
  name: z.string().min(1).optional(),
  region: z.string().optional(),
  plan_tier: z.string().optional(),
});

export class TenantController {
  static async create(req: Request, res: Response) {
    try {
      const { name, subdomain, region, plan_tier } = createTenantSchema.parse(req.body);

      // Check subdomain uniqueness
      const existing = await db('tenants').where('subdomain', subdomain).first();
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

      const result = await db('tenants').insert(tenantData).returning('*');

      if (result && result.length > 0) {
        res.status(201).json(result[0]);
      } else {
        // Fallback: get the created tenant by subdomain
        const tenant = await db('tenants').where('subdomain', subdomain).first();
        res.status(201).json(tenant);
      }
    } catch (error) {
      console.error('Tenant creation error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getAll(req: Request, res: Response) {
    try {
      // For platform admin; tenant users see only their tenant
      const tenants = await db('tenants').select('*');
      res.json(tenants);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getById(req: Request, res: Response) {
    try {
      const id = req.params.id;
      const tenant = await db('tenants').where('id', id).first();

      if (!tenant) {
        return res.status(404).json({ error: 'Tenant not found' });
      }

      res.json(tenant);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async update(req: Request, res: Response) {
    try {
      const id = req.params.id;
      const updates = updateTenantSchema.parse(req.body);

      const updated = await db('tenants')
        .where('id', id)
        .update({ ...updates, updated_at: db.fn.now() })
        .returning('*');

      if (!updated.length) {
        return res.status(404).json({ error: 'Tenant not found' });
      }

      res.json(updated[0]);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async delete(req: Request, res: Response) {
    try {
      const id = req.params.id;

      const deleted = await db('tenants')
        .where('id', id)
        .del()
        .returning('id');

      if (!deleted.length) {
        return res.status(404).json({ error: 'Tenant not found' });
      }

      res.json({ message: 'Tenant deleted' });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}