import { Router } from 'express';
import { WorkflowController } from './workflow.controller';

const router = Router();

// Workflow CRUD
router.post('/workflows', WorkflowController.createWorkflow);
router.get('/workflows', WorkflowController.getWorkflows);
router.get('/workflows/:id', WorkflowController.getWorkflow);
router.put('/workflows/:id', WorkflowController.updateWorkflow);
router.delete('/workflows/:id', WorkflowController.deleteWorkflow);

// Executions
router.post('/executions', WorkflowController.startExecution);
router.get('/executions', WorkflowController.getExecutions);
router.get('/executions/:id', WorkflowController.getExecution);

// Triggers
router.post('/triggers', WorkflowController.createTrigger);
router.get('/triggers', WorkflowController.getTriggers);
router.post('/triggers/connect', WorkflowController.connectTriggerToWorkflow);

// Templates
router.get('/templates', WorkflowController.getTemplates);
router.post('/templates/from-workflow', WorkflowController.createTemplateFromWorkflow);

// Webhooks & Events
router.post('/webhooks/:event_type', WorkflowController.handleWebhook);

// Analytics
router.get('/stats', WorkflowController.getWorkflowStats);

export default router;
