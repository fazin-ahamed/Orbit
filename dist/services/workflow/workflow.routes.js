"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const workflow_controller_1 = require("./workflow.controller");
const router = (0, express_1.Router)();
// Workflow CRUD
router.post('/workflows', workflow_controller_1.WorkflowController.createWorkflow);
router.get('/workflows', workflow_controller_1.WorkflowController.getWorkflows);
router.get('/workflows/:id', workflow_controller_1.WorkflowController.getWorkflow);
router.put('/workflows/:id', workflow_controller_1.WorkflowController.updateWorkflow);
router.delete('/workflows/:id', workflow_controller_1.WorkflowController.deleteWorkflow);
// Executions
router.post('/executions', workflow_controller_1.WorkflowController.startExecution);
router.get('/executions', workflow_controller_1.WorkflowController.getExecutions);
router.get('/executions/:id', workflow_controller_1.WorkflowController.getExecution);
// Triggers
router.post('/triggers', workflow_controller_1.WorkflowController.createTrigger);
router.get('/triggers', workflow_controller_1.WorkflowController.getTriggers);
router.post('/triggers/connect', workflow_controller_1.WorkflowController.connectTriggerToWorkflow);
// Templates
router.get('/templates', workflow_controller_1.WorkflowController.getTemplates);
router.post('/templates/from-workflow', workflow_controller_1.WorkflowController.createTemplateFromWorkflow);
// Webhooks & Events
router.post('/webhooks/:event_type', workflow_controller_1.WorkflowController.handleWebhook);
// Analytics
router.get('/stats', workflow_controller_1.WorkflowController.getWorkflowStats);
exports.default = router;
//# sourceMappingURL=workflow.routes.js.map