import { Request, Response } from 'express';
import { db } from '../../lib/db';
import { z } from 'zod';

// Contact schemas
const createContactSchema = z.object({
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  company: z.string().optional(),
  job_title: z.string().optional(),
  source: z.string().optional(),
  custom_fields: z.record(z.any()).optional(),
});

const updateContactSchema = createContactSchema.partial();

// Lead schemas
const createLeadSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  contact_id: z.string().uuid().optional(),
  value: z.number().min(0).optional(),
  currency: z.string().default('USD'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  assigned_to: z.string().uuid().optional(),
  pipeline_id: z.string().uuid().optional(),
  expected_close_date: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

const updateLeadSchema = createLeadSchema.partial().extend({
  status: z.enum(['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost']).optional(),
  pipeline_stage: z.number().min(1).optional(),
});

// Pipeline schemas
const createPipelineSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  stages: z.array(z.object({
    id: z.number(),
    name: z.string(),
    order: z.number(),
    probability: z.number().min(0).max(100),
  })).min(1),
  is_default: z.boolean().default(false),
});

const updatePipelineSchema = createPipelineSchema.partial();

// Activity schemas
const createActivitySchema = z.object({
  lead_id: z.string().uuid().optional(),
  contact_id: z.string().uuid().optional(),
  type: z.enum(['call', 'email', 'meeting', 'note', 'task']),
  subject: z.string().min(1),
  description: z.string().optional(),
  scheduled_at: z.string().optional(),
  duration_minutes: z.number().min(1).optional(),
  metadata: z.record(z.any()).optional(),
});

const updateActivitySchema = createActivitySchema.partial().extend({
  completed_at: z.string().optional(),
  outcome: z.enum(['completed', 'cancelled', 'rescheduled']).optional(),
});

export class CRMController {
  // ========== CONTACTS ==========

  static async createContact(req: Request, res: Response) {
    try {
      const tenantId = req.tenantId || 'default';
      const userId = (req.user as any)?.id;
      const contactData = createContactSchema.parse(req.body);

      const [contactId] = await db('contacts')
        .insert({
          tenant_id: tenantId,
          ...contactData,
        })
        .returning('id');

      // Log audit
      await db('audit_logs').insert({
        tenant_id: tenantId,
        user_id: userId,
        action: 'contact_created',
        resource: 'contact',
        resource_id: contactId,
        details: { contact_id: contactId },
      });

      res.status(201).json({ id: contactId, ...contactData });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error('Error creating contact:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getContacts(req: Request, res: Response) {
    try {
      const tenantId = req.tenantId || 'default';
      const { page = 1, limit = 20, search, status = 'active' } = req.query;

      let query = db('contacts')
        .where({ tenant_id: tenantId, status })
        .orderBy('created_at', 'desc');

      if (search) {
        query = query.where(function() {
          this.where('first_name', 'ilike', `%${search}%`)
              .orWhere('last_name', 'ilike', `%${search}%`)
              .orWhere('email', 'ilike', `%${search}%`)
              .orWhere('company', 'ilike', `%${search}%`);
        });
      }

      const offset = (Number(page) - 1) * Number(limit);
      const contacts = await query.limit(Number(limit)).offset(offset);

      const [{ count }] = await db('contacts')
        .where({ tenant_id: tenantId, status })
        .count('id as count');

      res.json({
        contacts,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: Number(count),
          pages: Math.ceil(Number(count) / Number(limit)),
        },
      });
    } catch (error) {
      console.error('Error fetching contacts:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getContact(req: Request, res: Response) {
    try {
      const tenantId = req.tenantId || 'default';
      const { id } = req.params;

      const contact = await db('contacts')
        .where({ tenant_id: tenantId, id })
        .first();

      if (!contact) {
        return res.status(404).json({ error: 'Contact not found' });
      }

      // Get related leads
      const leads = await db('crm.leads')
        .where({ tenant_id: tenantId, contact_id: id })
        .orderBy('created_at', 'desc');

      res.json({ ...contact, leads });
    } catch (error) {
      console.error('Error fetching contact:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async updateContact(req: Request, res: Response) {
    try {
      const tenantId = req.tenantId || 'default';
      const userId = (req.user as any)?.id;
      const { id } = req.params;
      const updateData = updateContactSchema.parse(req.body);

      const updated = await db('contacts')
        .where({ tenant_id: tenantId, id })
        .update({ ...updateData, updated_at: db.fn.now() })
        .returning('*');

      if (!updated.length) {
        return res.status(404).json({ error: 'Contact not found' });
      }

      // Log audit
      await db('audit_logs').insert({
        tenant_id: tenantId,
        user_id: userId,
        action: 'contact_updated',
        resource: 'contact',
        resource_id: id,
        details: { updated_fields: Object.keys(updateData) },
      });

      res.json(updated[0]);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error('Error updating contact:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // ========== LEADS ==========

  static async createLead(req: Request, res: Response) {
    try {
      const tenantId = req.tenantId || 'default';
      const userId = (req.user as any)?.id;
      const leadData = createLeadSchema.parse(req.body);

      // Get default pipeline if none specified
      let pipelineId = leadData.pipeline_id;
      if (!pipelineId) {
        const defaultPipeline = await db('crm.pipelines')
          .where({ tenant_id: tenantId, is_default: true, is_active: true })
          .first();
        pipelineId = defaultPipeline?.id;
      }

      const [leadId] = await db('crm.leads')
        .insert({
          tenant_id: tenantId,
          pipeline_id: pipelineId,
          ...leadData,
        })
        .returning('id');

      // Log audit
      await db('audit_logs').insert({
        tenant_id: tenantId,
        user_id: userId,
        action: 'lead_created',
        resource: 'lead',
        resource_id: leadId,
        details: { lead_id: leadId, pipeline_id: pipelineId },
      });

      res.status(201).json({ id: leadId, ...leadData, pipeline_id: pipelineId });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error('Error creating lead:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getLeads(req: Request, res: Response) {
    try {
      const tenantId = req.tenantId || 'default';
      const { page = 1, limit = 20, status, assigned_to, pipeline_id } = req.query;

      let query = db('crm.leads')
        .where({ tenant_id: tenantId })
        .leftJoin('contacts', 'crm.leads.contact_id', 'crm.contacts.id')
        .leftJoin('users', 'crm.leads.assigned_to', 'platform.users.id')
        .leftJoin('crm.pipelines', 'crm.leads.pipeline_id', 'crm.pipelines.id')
        .select(
          'crm.leads.*',
          'crm.contacts.first_name as contact_first_name',
          'crm.contacts.last_name as contact_last_name',
          'crm.contacts.email as contact_email',
          'platform.users.first_name as assigned_first_name',
          'platform.users.last_name as assigned_last_name',
          'crm.pipelines.name as pipeline_name'
        )
        .orderBy('crm.leads.created_at', 'desc');

      if (status) {
        query = query.where('crm.leads.status', status);
      }
      if (assigned_to) {
        query = query.where('crm.leads.assigned_to', assigned_to);
      }
      if (pipeline_id) {
        query = query.where('crm.leads.pipeline_id', pipeline_id);
      }

      const offset = (Number(page) - 1) * Number(limit);
      const leads = await query.limit(Number(limit)).offset(offset);

      const [{ count }] = await db('crm.leads')
        .where({ tenant_id: tenantId })
        .count('id as count');

      res.json({
        leads,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: Number(count),
          pages: Math.ceil(Number(count) / Number(limit)),
        },
      });
    } catch (error) {
      console.error('Error fetching leads:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async updateLead(req: Request, res: Response) {
    try {
      const tenantId = req.tenantId || 'default';
      const userId = (req.user as any)?.id;
      const { id } = req.params;
      const updateData = updateLeadSchema.parse(req.body);

      const updated = await db('crm.leads')
        .where({ tenant_id: tenantId, id })
        .update({ ...updateData, updated_at: db.fn.now() })
        .returning('*');

      if (!updated.length) {
        return res.status(404).json({ error: 'Lead not found' });
      }

      // Log audit
      await db('audit_logs').insert({
        tenant_id: tenantId,
        user_id: userId,
        action: 'lead_updated',
        resource: 'lead',
        resource_id: id,
        details: { updated_fields: Object.keys(updateData) },
      });

      res.json(updated[0]);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error('Error updating lead:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // ========== PIPELINES ==========

  static async getPipelines(req: Request, res: Response) {
    try {
      const tenantId = req.tenantId || 'default';

      const pipelines = await db('crm.pipelines')
        .where({ tenant_id: tenantId, is_active: true })
        .orderBy('name');

      res.json({ pipelines });
    } catch (error) {
      console.error('Error fetching pipelines:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async createPipeline(req: Request, res: Response) {
    try {
      const tenantId = req.tenantId || 'default';
      const userId = (req.user as any)?.id;
      const pipelineData = createPipelineSchema.parse(req.body);

      const [pipelineId] = await db('crm.pipelines')
        .insert({
          tenant_id: tenantId,
          ...pipelineData,
          stages: JSON.stringify(pipelineData.stages),
        })
        .returning('id');

      res.status(201).json({ id: pipelineId, ...pipelineData });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error('Error creating pipeline:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // ========== ACTIVITIES ==========

  static async createActivity(req: Request, res: Response) {
    try {
      const tenantId = req.tenantId || 'default';
      const userId = (req.user as any)?.id;
      const activityData = createActivitySchema.parse(req.body);

      const [activityId] = await db('crm.activities')
        .insert({
          tenant_id: tenantId,
          user_id: userId,
          ...activityData,
        })
        .returning('id');

      res.status(201).json({ id: activityId, ...activityData });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error('Error creating activity:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getActivities(req: Request, res: Response) {
    try {
      const tenantId = req.tenantId || 'default';
      const { lead_id, contact_id, type, page = 1, limit = 20 } = req.query;

      let query = db('crm.activities')
        .where({ tenant_id: tenantId })
        .leftJoin('users', 'crm.activities.user_id', 'platform.users.id')
        .select(
          'crm.activities.*',
          'platform.users.first_name as user_first_name',
          'platform.users.last_name as user_last_name'
        )
        .orderBy('crm.activities.created_at', 'desc');

      if (lead_id) {
        query = query.where('crm.activities.lead_id', lead_id);
      }
      if (contact_id) {
        query = query.where('crm.activities.contact_id', contact_id);
      }
      if (type) {
        query = query.where('crm.activities.type', type);
      }

      const offset = (Number(page) - 1) * Number(limit);
      const activities = await query.limit(Number(limit)).offset(offset);

      res.json({ activities });
    } catch (error) {
      console.error('Error fetching activities:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // ========== DASHBOARD & ANALYTICS ==========

  static async getDashboardStats(req: Request, res: Response) {
    try {
      const tenantId = req.tenantId || 'default';

      // Get lead stats
      const leadStats = await db('crm.leads')
        .where({ tenant_id: tenantId })
        .select('status')
        .count('id as count')
        .groupBy('status');

      // Get contact stats
      const contactStats = await db('contacts')
        .where({ tenant_id: tenantId })
        .select('status')
        .count('id as count')
        .groupBy('status');

      // Get pipeline performance
      const pipelineStats = await db('crm.leads')
        .where({ tenant_id: tenantId })
        .whereNotNull('pipeline_id')
        .select('pipeline_id', 'pipeline_stage', 'status')
        .count('id as count')
        .groupBy('pipeline_id', 'pipeline_stage', 'status');

      // Get recent activities
      const recentActivities = await db('crm.activities')
        .where({ tenant_id: tenantId })
        .leftJoin('users', 'crm.activities.user_id', 'platform.users.id')
        .select(
          'crm.activities.*',
          'platform.users.first_name as user_first_name',
          'platform.users.last_name as user_last_name'
        )
        .orderBy('crm.activities.created_at', 'desc')
        .limit(10);

      res.json({
        leadStats,
        contactStats,
        pipelineStats,
        recentActivities,
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
