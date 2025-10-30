"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const crm_controller_1 = require("./crm.controller");
const router = (0, express_1.Router)();
// Contact routes
router.post('/contacts', crm_controller_1.CRMController.createContact);
router.get('/contacts', crm_controller_1.CRMController.getContacts);
router.get('/contacts/:id', crm_controller_1.CRMController.getContact);
router.put('/contacts/:id', crm_controller_1.CRMController.updateContact);
// Lead routes
router.post('/leads', crm_controller_1.CRMController.createLead);
router.get('/leads', crm_controller_1.CRMController.getLeads);
router.put('/leads/:id', crm_controller_1.CRMController.updateLead);
// Pipeline routes
router.get('/pipelines', crm_controller_1.CRMController.getPipelines);
router.post('/pipelines', crm_controller_1.CRMController.createPipeline);
// Activity routes
router.post('/activities', crm_controller_1.CRMController.createActivity);
router.get('/activities', crm_controller_1.CRMController.getActivities);
// Dashboard routes
router.get('/dashboard/stats', crm_controller_1.CRMController.getDashboardStats);
exports.default = router;
//# sourceMappingURL=crm.routes.js.map