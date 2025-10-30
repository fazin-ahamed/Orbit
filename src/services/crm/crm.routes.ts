import { Router } from 'express';
import { CRMController } from './crm.controller';

const router = Router();

// Contact routes
router.post('/contacts', CRMController.createContact);
router.get('/contacts', CRMController.getContacts);
router.get('/contacts/:id', CRMController.getContact);
router.put('/contacts/:id', CRMController.updateContact);

// Lead routes
router.post('/leads', CRMController.createLead);
router.get('/leads', CRMController.getLeads);
router.put('/leads/:id', CRMController.updateLead);

// Pipeline routes
router.get('/pipelines', CRMController.getPipelines);
router.post('/pipelines', CRMController.createPipeline);

// Activity routes
router.post('/activities', CRMController.createActivity);
router.get('/activities', CRMController.getActivities);

// Dashboard routes
router.get('/dashboard/stats', CRMController.getDashboardStats);

export default router;
