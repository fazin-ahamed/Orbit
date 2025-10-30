import { Request, Response } from 'express';
import { db } from '../../lib/db';
import { z } from 'zod';

// Project schemas
const createProjectSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  start_date: z.string().optional(),
  due_date: z.string().optional(),
  budget: z.number().optional(),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  owner_id: z.string().uuid().optional(),
});

const updateProjectSchema = createProjectSchema.partial().extend({
  status: z.enum(['active', 'completed', 'on_hold', 'cancelled']).optional(),
});

// Task schemas
const createTaskSchema = z.object({
  project_id: z.string().uuid().optional(),
  title: z.string().min(1),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  assigned_to: z.string().uuid().optional(),
  due_date: z.string().optional(),
  estimated_hours: z.number().optional(),
  tags: z.array(z.string()).optional(),
});

const updateTaskSchema = createTaskSchema.partial().extend({
  status: z.enum(['todo', 'in_progress', 'review', 'done']).optional(),
  order: z.number().optional(),
});

export class ProjectsController {
  // ========== PROJECTS ==========

  static async createProject(req: Request, res: Response) {
    try {
      const tenantId = req.tenantId || 'default';
      const userId = (req.user as any)?.id;
      const projectData = createProjectSchema.parse(req.body);

      const [projectId] = await db('projects.projects')
        .insert({
          tenant_id: tenantId,
          owner_id: userId,
          ...projectData,
        })
        .returning('id');

      res.status(201).json({ id: projectId, ...projectData });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error('Error creating project:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getProjects(req: Request, res: Response) {
    try {
      const tenantId = req.tenantId || 'default';
      const { status, owner_id } = req.query;

      let query = db('projects.projects')
        .where({ tenant_id: tenantId })
        .leftJoin('users', 'projects.projects.owner_id', 'platform.users.id')
        .select(
          'projects.projects.*',
          'platform.users.first_name as owner_first_name',
          'platform.users.last_name as owner_last_name'
        )
        .orderBy('projects.projects.created_at', 'desc');

      if (status) query = query.where('projects.projects.status', status);
      if (owner_id) query = query.where('projects.projects.owner_id', owner_id);

      const projects = await query;

      res.json({ projects });
    } catch (error) {
      console.error('Error fetching projects:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async updateProject(req: Request, res: Response) {
    try {
      const tenantId = req.tenantId || 'default';
      const { id } = req.params;
      const updateData = updateProjectSchema.parse(req.body);

      const updated = await db('projects.projects')
        .where({ tenant_id: tenantId, id })
        .update({ ...updateData, updated_at: db.fn.now() })
        .returning('*');

      if (!updated.length) {
        return res.status(404).json({ error: 'Project not found' });
      }

      res.json(updated[0]);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error('Error updating project:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // ========== TASKS ==========

  static async createTask(req: Request, res: Response) {
    try {
      const tenantId = req.tenantId || 'default';
      const userId = (req.user as any)?.id;
      const taskData = createTaskSchema.parse(req.body);

      const [taskId] = await db('projects.tasks')
        .insert({
          tenant_id: tenantId,
          created_by: userId,
          ...taskData,
        })
        .returning('id');

      res.status(201).json({ id: taskId, ...taskData });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error('Error creating task:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getTasks(req: Request, res: Response) {
    try {
      const tenantId = req.tenantId || 'default';
      const { project_id, status, assigned_to } = req.query;

      let query = db('projects.tasks')
        .where({ tenant_id: tenantId })
        .leftJoin('users', 'projects.tasks.assigned_to', 'platform.users.id')
        .leftJoin('platform.users as creators', 'projects.tasks.created_by', 'creators.id')
        .leftJoin('projects.projects', 'projects.tasks.project_id', 'projects.projects.id')
        .select(
          'projects.tasks.*',
          'platform.users.first_name as assigned_first_name',
          'platform.users.last_name as assigned_last_name',
          'creators.first_name as creator_first_name',
          'creators.last_name as creator_last_name',
          'projects.projects.name as project_name'
        )
        .orderBy('projects.tasks.order')
        .orderBy('projects.tasks.created_at', 'desc');

      if (project_id) query = query.where('projects.tasks.project_id', project_id);
      if (status) query = query.where('projects.tasks.status', status);
      if (assigned_to) query = query.where('projects.tasks.assigned_to', assigned_to);

      const tasks = await query;

      res.json({ tasks });
    } catch (error) {
      console.error('Error fetching tasks:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async updateTask(req: Request, res: Response) {
    try {
      const tenantId = req.tenantId || 'default';
      const { id } = req.params;
      const updateData = updateTaskSchema.parse(req.body);

      const updated = await db('projects.tasks')
        .where({ tenant_id: tenantId, id })
        .update({ ...updateData, updated_at: db.fn.now() })
        .returning('*');

      if (!updated.length) {
        return res.status(404).json({ error: 'Task not found' });
      }

      res.json(updated[0]);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error('Error updating task:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // ========== DASHBOARD ==========

  static async getDashboardStats(req: Request, res: Response) {
    try {
      const tenantId = req.tenantId || 'default';

      // Project stats
      const projectStats = await db('projects.projects')
        .where({ tenant_id: tenantId })
        .select('status')
        .count('id as count')
        .groupBy('status');

      // Task stats
      const taskStats = await db('projects.tasks')
        .where({ tenant_id: tenantId })
        .select('status')
        .count('id as count')
        .groupBy('status');

      // Recent tasks
      const recentTasks = await db('projects.tasks')
        .where({ tenant_id: tenantId })
        .leftJoin('users', 'projects.tasks.assigned_to', 'platform.users.id')
        .select(
          'projects.tasks.id',
          'projects.tasks.title',
          'projects.tasks.status',
          'projects.tasks.due_date',
          'platform.users.first_name',
          'platform.users.last_name'
        )
        .orderBy('projects.tasks.created_at', 'desc')
        .limit(10);

      res.json({
        projectStats,
        taskStats,
        recentTasks,
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
