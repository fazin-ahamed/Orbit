import { Router } from 'express';
import { BillingController } from './billing.controller';

const router = Router();

// Subscription management
router.get('/subscription', BillingController.getSubscription);
router.post('/subscription', BillingController.createSubscription);
router.put('/subscription', BillingController.updateSubscription);
router.delete('/subscription', BillingController.cancelSubscription);

// Usage tracking
router.get('/usage', BillingController.getUsage);
router.post('/usage', BillingController.recordUsage);

// Billing and invoices
router.get('/invoices', BillingController.getInvoices);

// Products and pricing
router.get('/products', BillingController.getProducts);

// Payment methods
router.post('/payment-methods', BillingController.createPaymentMethod);

export default router;