"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowController = void 0;
const db_1 = require("../../lib/db");
const zod_1 = require("zod");
const workflow_engine_1 = require("./workflow.engine");
// Workflow schemas
const createWorkflowSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    description: zod_1.z.string().optional(),
    nodes: zod_1.z.array(zod_1.z.any()).default([]),
    edges: zod_1.z.array(zod_1.z.any()).default([]),
    triggers: zod_1.z.array(zod_1.z.any()).default([]),
    variables: zod_1.z.record(zod_1.z.any()).default({}),
    is_template: zod_1.z.boolean().default(false),
});
const updateWorkflowSchema = createWorkflowSchema.partial().extend({
    status: zod_1.z.enum(['draft', 'active', 'paused', 'archived']).optional(),
});
// Trigger schemas
const createTriggerSchema = zod_1.z.object({
    event_type: zod_1.z.string().min(1),
    name: zod_1.z.string().min(1),
    description: zod_1.z.string().optional(),
    config: zod_1.z.record(zod_1.z.any()).default({}),
});
const updateTriggerSchema = createTriggerSchema.partial().extend({
    is_active: zod_1.z.boolean().optional(),
});
// Execution schemas
const startExecutionSchema = zod_1.z.object({
    workflow_id: zod_1.z.string().uuid(),
    trigger_data: zod_1.z.record(zod_1.z.any()).default({}),
});
class WorkflowController {
    // ========== WORKFLOWS ==========
    static async createWorkflow(req, res) {
        try {
            const tenantId = req.tenantId || 'default';
            const userId = req.user?.id;
            const workflowData = createWorkflowSchema.parse(req.body);
            const [workflowId] = await (0, db_1.db)('workflows')
                .insert({
                tenant_id: tenantId,
                created_by: userId,
                updated_by: userId,
                ...workflowData,
            })
                .returning('id');
            // Log audit
            await (0, db_1.db)('audit_logs').insert({
                tenant_id: tenantId,
                user_id: userId,
                action: 'workflow_created',
                resource: 'workflow',
                resource_id: workflowId,
                details: { workflow_id: workflowId, name: workflowData.name },
            });
            res.status(201).json({ id: workflowId, ...workflowData });
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                return res.status(400).json({ error: error.errors });
            }
            console.error('Error creating workflow:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
    static async getWorkflows(req, res) {
        try {
            const tenantId = req.tenantId || 'default';
            const { page = 1, limit = 20, status, is_template } = req.query;
            let query = (0, db_1.db)('workflows')
                .where({ tenant_id: tenantId })
                .orderBy('created_at', 'desc');
            if (status) {
                query = query.where({ status });
            }
            if (is_template !== undefined) {
                query = query.where({ is_template: is_template === 'true' });
            }
            const offset = (Number(page) - 1) * Number(limit);
            const workflows = await query.limit(Number(limit)).offset(offset);
            const [{ count }] = await (0, db_1.db)('workflows')
                .where({ tenant_id: tenantId })
                .count('id as count');
            res.json({
                workflows,
                pagination: {
                    page: Number(page),
                    limit: Number(limit),
                    total: Number(count),
                    pages: Math.ceil(Number(count) / Number(limit)),
                },
            });
        }
        catch (error) {
            console.error('Error fetching workflows:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
    static async getWorkflow(req, res) {
        try {
            const tenantId = req.tenantId || 'default';
            const { id } = req.params;
            const workflow = await (0, db_1.db)('workflows')
                .where({ tenant_id: tenantId, id })
                .first();
            if (!workflow) {
                return res.status(404).json({ error: 'Workflow not found' });
            }
            res.json(workflow);
        }
        catch (error) {
            console.error('Error fetching workflow:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
    static async updateWorkflow(req, res) {
        try {
            const tenantId = req.tenantId || 'default';
            const userId = req.user?.id;
            const { id } = req.params;
            const updateData = updateWorkflowSchema.parse(req.body);
            const updated = await (0, db_1.db)('workflows')
                .where({ tenant_id: tenantId, id })
                .update({
                ...updateData,
                updated_by: userId,
                updated_at: db_1.db.fn.now()
            })
                .returning('*');
            if (!updated.length) {
                return res.status(404).json({ error: 'Workflow not found' });
            }
            // Log audit
            await (0, db_1.db)('audit_logs').insert({
                tenant_id: tenantId,
                user_id: userId,
                action: 'workflow_updated',
                resource: 'workflow',
                resource_id: id,
                details: { updated_fields: Object.keys(updateData) },
            });
            res.json(updated[0]);
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                return res.status(400).json({ error: error.errors });
            }
            console.error('Error updating workflow:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
    static async deleteWorkflow(req, res) {
        try {
            const tenantId = req.tenantId || 'default';
            const userId = req.user?.id;
            const { id } = req.params;
            const deleted = await (0, db_1.db)('workflows')
                .where({ tenant_id: tenantId, id })
                .del();
            if (!deleted) {
                return res.status(404).json({ error: 'Workflow not found' });
            }
            // Log audit
            await (0, db_1.db)('audit_logs').insert({
                tenant_id: tenantId,
                user_id: userId,
                action: 'workflow_deleted',
                resource: 'workflow',
                resource_id: id,
                details: { workflow_id: id },
            });
            res.json({ message: 'Workflow deleted successfully' });
        }
        catch (error) {
            console.error('Error deleting workflow:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
    // ========== EXECUTIONS ==========
    static async startExecution(req, res) {
        try {
            const tenantId = req.tenantId || 'default';
            const userId = req.user?.id;
            const { workflow_id, trigger_data } = startExecutionSchema.parse(req.body);
            // Verify workflow exists and is active
            const workflow = await (0, db_1.db)('workflows')
                .where({ tenant_id: tenantId, id: workflow_id, status: 'active' })
                .first();
            if (!workflow) {
                return res.status(404).json({ error: 'Active workflow not found' });
            }
            // Create execution record
            const [executionId] = await (0, db_1.db)('workflow_executions')
                .insert({
                tenant_id: tenantId,
                workflow_id,
                trigger_data: JSON.stringify(trigger_data),
            })
                .returning('id');
            // Start workflow execution asynchronously
            workflow_engine_1.WorkflowEngine.executeWorkflow(executionId, tenantId)
                .catch(error => console.error('Workflow execution error:', error));
            // Log audit
            await (0, db_1.db)('audit_logs').insert({
                tenant_id: tenantId,
                user_id: userId,
                action: 'workflow_execution_started',
                resource: 'workflow_execution',
                resource_id: executionId,
                details: { workflow_id, execution_id: executionId },
            });
            res.status(201).json({
                execution_id: executionId,
                status: 'running',
                message: 'Workflow execution started'
            });
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                return res.status(400).json({ error: error.errors });
            }
            console.error('Error starting workflow execution:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
    static async getExecutions(req, res) {
        try {
            const tenantId = req.tenantId || 'default';
            const { workflow_id, status, page = 1, limit = 20 } = req.query;
            let query = (0, db_1.db)('workflow_executions')
                .where({ tenant_id: tenantId })
                .leftJoin('workflows', 'workflow_workflow_executions.workflow_id', 'workflows.id')
                .select('workflow_workflow_executions.*', 'workflows.name as workflow_name')
                .orderBy('workflow_workflow_executions.created_at', 'desc');
            if (workflow_id) {
                query = query.where('workflow_workflow_executions.workflow_id', workflow_id);
            }
            if (status) {
                query = query.where('workflow_workflow_executions.status', status);
            }
            const offset = (Number(page) - 1) * Number(limit);
            const executions = await query.limit(Number(limit)).offset(offset);
            const [{ count }] = await (0, db_1.db)('workflow_executions')
                .where({ tenant_id: tenantId })
                .count('id as count');
            res.json({
                executions,
                pagination: {
                    page: Number(page),
                    limit: Number(limit),
                    total: Number(count),
                    pages: Math.ceil(Number(count) / Number(limit)),
                },
            });
        }
        catch (error) {
            console.error('Error fetching executions:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
    static async getExecution(req, res) {
        try {
            const tenantId = req.tenantId || 'default';
            const { id } = req.params;
            const execution = await (0, db_1.db)('workflow_executions')
                .where({ tenant_id: tenantId, id })
                .leftJoin('workflows', 'workflow_workflow_executions.workflow_id', 'workflows.id')
                .select('workflow_workflow_executions.*', 'workflows.name as workflow_name', 'workflows.nodes', 'workflows.edges')
                .first();
            if (!execution) {
                return res.status(404).json({ error: 'Execution not found' });
            }
            // Get execution steps
            const steps = await (0, db_1.db)('workflow_execution_steps')
                .where({ execution_id: id })
                .orderBy('created_at');
            res.json({ ...execution, steps });
        }
        catch (error) {
            console.error('Error fetching execution:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
    // ========== TRIGGERS ==========
    static async createTrigger(req, res) {
        try {
            const tenantId = req.tenantId || 'default';
            const userId = req.user?.id;
            const triggerData = createTriggerSchema.parse(req.body);
            const [triggerId] = await (0, db_1.db)('workflow_triggers')
                .insert({
                tenant_id: tenantId,
                created_by: userId,
                ...triggerData,
            })
                .returning('id');
            res.status(201).json({ id: triggerId, ...triggerData });
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                return res.status(400).json({ error: error.errors });
            }
            console.error('Error creating trigger:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
    static async getTriggers(req, res) {
        try {
            const tenantId = req.tenantId || 'default';
            const { event_type, is_active } = req.query;
            let query = (0, db_1.db)('workflow_triggers')
                .where({ tenant_id: tenantId })
                .orderBy('created_at', 'desc');
            if (event_type) {
                query = query.where({ event_type });
            }
            if (is_active !== undefined) {
                query = query.where({ is_active: is_active === 'true' });
            }
            const triggers = await query;
            res.json({ triggers });
        }
        catch (error) {
            console.error('Error fetching triggers:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
    static async connectTriggerToWorkflow(req, res) {
        try {
            const tenantId = req.tenantId || 'default';
            const { trigger_id, workflow_id, conditions } = req.body;
            // Verify trigger and workflow belong to tenant
            const trigger = await (0, db_1.db)('workflow_triggers')
                .where({ tenant_id: tenantId, id: trigger_id })
                .first();
            const workflow = await (0, db_1.db)('workflows')
                .where({ tenant_id: tenantId, id: workflow_id })
                .first();
            if (!trigger || !workflow) {
                return res.status(404).json({ error: 'Trigger or workflow not found' });
            }
            const [connectionId] = await (0, db_1.db)('workflow_trigger_workflows')
                .insert({
                trigger_id,
                workflow_id,
                conditions: JSON.stringify(conditions || {}),
            })
                .returning('id');
            res.status(201).json({
                id: connectionId,
                trigger_id,
                workflow_id,
                conditions: conditions || {}
            });
        }
        catch (error) {
            console.error('Error connecting trigger to workflow:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
    // ========== TEMPLATES ==========
    static async getTemplates(req, res) {
        try {
            const tenantId = req.tenantId || 'default';
            const { category } = req.query;
            let query = (0, db_1.db)('workflow_templates')
                .where(function () {
                this.where({ is_public: true })
                    .orWhere({ created_by: req.user?.id });
            })
                .orderBy('created_at', 'desc');
            if (category) {
                query = query.where({ category });
            }
            const templates = await query;
            res.json({ templates });
        }
        catch (error) {
            console.error('Error fetching templates:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
    static async createTemplateFromWorkflow(req, res) {
        try {
            const tenantId = req.tenantId || 'default';
            const userId = req.user?.id;
            const { workflow_id, name, description, category, is_public } = req.body;
            // Get workflow
            const workflow = await (0, db_1.db)('workflows')
                .where({ tenant_id: tenantId, id: workflow_id })
                .first();
            if (!workflow) {
                return res.status(404).json({ error: 'Workflow not found' });
            }
            const [templateId] = await (0, db_1.db)('workflow_templates')
                .insert({
                name: name || workflow.name,
                description: description || workflow.description,
                category: category || 'custom',
                nodes: workflow.nodes,
                edges: workflow.edges,
                metadata: JSON.stringify({
                    original_workflow_id: workflow_id,
                    created_from: 'workflow'
                }),
                is_public: is_public || false,
                created_by: userId,
            })
                .returning('id');
            res.status(201).json({ id: templateId, message: 'Template created successfully' });
        }
        catch (error) {
            console.error('Error creating template:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
    // ========== WEBHOOKS & EVENT HANDLING ==========
    static async handleWebhook(req, res) {
        try {
            const tenantId = req.tenantId || 'default';
            const { event_type } = req.params;
            const eventData = req.body;
            // Find active triggers for this event type
            const triggers = await (0, db_1.db)('workflow_triggers')
                .where({
                tenant_id: tenantId,
                event_type,
                is_active: true
            });
            // Trigger workflows for each trigger
            const executions = [];
            for (const trigger of triggers) {
                const triggerWorkflows = await (0, db_1.db)('workflow_trigger_workflows')
                    .where({ trigger_id: trigger.id, is_active: true })
                    .join('workflows', 'workflow_trigger_workflows.workflow_id', 'workflows.id')
                    .where('workflows.status', 'active')
                    .select('workflows.*');
                for (const workflow of triggerWorkflows) {
                    // Check conditions if any
                    const conditions = JSON.parse(trigger.conditions || '{}');
                    if (workflow_engine_1.WorkflowEngine.checkConditions(eventData, conditions)) {
                        const [executionId] = await (0, db_1.db)('workflow_executions')
                            .insert({
                            tenant_id: tenantId,
                            workflow_id: workflow.id,
                            trigger_data: JSON.stringify(eventData),
                        })
                            .returning('id');
                        // Start execution
                        workflow_engine_1.WorkflowEngine.executeWorkflow(executionId, tenantId)
                            .catch(error => console.error('Workflow execution error:', error));
                        executions.push({ execution_id: executionId, workflow_id: workflow.id });
                    }
                }
            }
            res.json({
                message: `Event processed. Started ${executions.length} workflow executions.`,
                executions
            });
        }
        catch (error) {
            console.error('Error handling webhook:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
    // ========== ANALYTICS ==========
    static async getWorkflowStats(req, res) {
        try {
            const tenantId = req.tenantId || 'default';
            // Get workflow counts by status
            const workflowStats = await (0, db_1.db)('workflows')
                .where({ tenant_id: tenantId })
                .select('status')
                .count('id as count')
                .groupBy('status');
            // Get execution stats
            const executionStats = await (0, db_1.db)('workflow_executions')
                .where({ tenant_id: tenantId })
                .select('status')
                .count('id as count')
                .groupBy('status');
            // Get recent executions
            const recentExecutions = await (0, db_1.db)('workflow_executions')
                .where({ tenant_id: tenantId })
                .leftJoin('workflows', 'workflow_workflow_executions.workflow_id', 'workflows.id')
                .select('workflow_workflow_executions.id', 'workflow_workflow_executions.status', 'workflow_workflow_executions.started_at', 'workflow_workflow_executions.completed_at', 'workflows.name as workflow_name')
                .orderBy('workflow_workflow_executions.started_at', 'desc')
                .limit(10);
            res.json({
                workflowStats,
                executionStats,
                recentExecutions,
            });
        }
        catch (error) {
            console.error('Error fetching workflow stats:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
}
exports.WorkflowController = WorkflowController;
//# sourceMappingURL=workflow.controller.js.map