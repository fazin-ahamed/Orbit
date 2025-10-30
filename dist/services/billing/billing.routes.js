"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const billing_controller_1 = require("./billing.controller");
const router = (0, express_1.Router)();
// Subscription management
router.get('/subscription', billing_controller_1.BillingController.getSubscription);
router.post('/subscription', billing_controller_1.BillingController.createSubscription);
router.put('/subscription', billing_controller_1.BillingController.updateSubscription);
router.delete('/subscription', billing_controller_1.BillingController.cancelSubscription);
// Usage tracking
router.get('/usage', billing_controller_1.BillingController.getUsage);
router.post('/usage', billing_controller_1.BillingController.recordUsage);
// Billing and invoices
router.get('/invoices', billing_controller_1.BillingController.getInvoices);
// Products and pricing
router.get('/products', billing_controller_1.BillingController.getProducts);
// Payment methods
router.post('/payment-methods', billing_controller_1.BillingController.createPaymentMethod);
exports.default = router;
//# sourceMappingURL=billing.routes.js.map