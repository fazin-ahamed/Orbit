import { Request, Response } from 'express';
import { db } from '../../lib/db';
import { z } from 'zod';
import Stripe from 'stripe';

// Initialize Stripe (in production, use environment variables)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_default', {
  apiVersion: '2024-10-28.acacia' as any,
});

const createSubscriptionSchema = z.object({
  priceId: z.string(),
  paymentMethodId: z.string(),
});

const updateSubscriptionSchema = z.object({
  priceId: z.string().optional(),
  cancelAtPeriodEnd: z.boolean().optional(),
});

const recordUsageSchema = z.object({
  resourceType: z.enum(['ai_tokens', 'workflow_runs', 'api_calls', 'storage_mb']),
  quantity: z.number().positive(),
  metadata: z.record(z.any()).optional(),
});

export class BillingController {
  static async getSubscription(req: Request, res: Response) {
    try {
      const tenantId = req.tenantId;
      const userId = (req.user as any)?.id;

      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      // Get tenant's subscription info
      const tenant = await db('tenants')
        .where({ id: tenantId })
        .select('id', 'name', 'plan_tier', 'stripe_customer_id', 'stripe_subscription_id')
        .first();

      if (!tenant) {
        return res.status(404).json({ error: 'Tenant not found' });
      }

      let subscription = null;
      if (tenant.stripe_subscription_id) {
        subscription = await stripe.subscriptions.retrieve(tenant.stripe_subscription_id);
      }

      res.json({
        tenant: {
          id: tenant.id,
          name: tenant.name,
          plan_tier: tenant.plan_tier
        },
        subscription: subscription
      });
    } catch (error) {
      console.error('Error fetching subscription:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async createSubscription(req: Request, res: Response) {
    try {
      const tenantId = req.tenantId;
      const userId = (req.user as any)?.id;
      const { priceId, paymentMethodId } = createSubscriptionSchema.parse(req.body);

      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      // Get or create Stripe customer
      let tenant = await db('tenants')
        .where({ id: tenantId })
        .select('id', 'name', 'stripe_customer_id')
        .first();

      let customer;
      if (tenant?.stripe_customer_id) {
        customer = await stripe.customers.retrieve(tenant.stripe_customer_id);
      } else {
        customer = await stripe.customers.create({
          email: (req.user as any)?.email || 'unknown@example.com',
          name: tenant?.name,
          metadata: {
            tenant_id: tenantId || '',
            user_id: userId || ''
          }
        });

        // Update tenant with customer ID
        await db('tenants')
          .where({ id: tenantId })
          .update({
            stripe_customer_id: customer.id,
            updated_at: db.fn.now()
          });
      }

      // Attach payment method
      await stripe.paymentMethods.attach(paymentMethodId, {
        customer: customer.id,
      });

      // Set as default payment method
      await stripe.customers.update(customer.id, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });

      // Create subscription
      const subscription = await stripe.subscriptions.create({
        customer: customer.id,
        items: [{ price: priceId }],
        default_payment_method: paymentMethodId,
        metadata: {
          tenant_id: tenantId || '',
          user_id: userId || ''
        }
      });

      // Update tenant with subscription ID and plan tier
      const price = await stripe.prices.retrieve(priceId);
      const product = await stripe.products.retrieve(price.product as string);

      await db('tenants')
        .where({ id: tenantId })
        .update({
          stripe_subscription_id: subscription.id,
          plan_tier: product.name.toLowerCase(),
          updated_at: db.fn.now()
        });

      // Log subscription creation
      await db('audit_logs').insert({
        tenant_id: tenantId || '',
        user_id: userId || '',
        action: 'subscription_created',
        resource: 'subscription',
        resource_id: subscription.id,
        details: {
          price_id: priceId,
          product_name: product.name,
          amount: price.unit_amount
        },
        ip_address: req.ip,
        user_agent: req.get('User-Agent'),
        outcome: 'success'
      });

      res.status(201).json({
        subscription: subscription,
        client_secret: (subscription.latest_invoice as any)?.payment_intent?.client_secret
      });
    } catch (error) {
      console.error('Error creating subscription:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async updateSubscription(req: Request, res: Response) {
    try {
      const tenantId = req.tenantId;
      const userId = (req.user as any)?.id;
      const { priceId, cancelAtPeriodEnd } = updateSubscriptionSchema.parse(req.body);

      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const tenant = await db('tenants')
        .where({ id: tenantId })
        .select('stripe_subscription_id')
        .first();

      if (!tenant?.stripe_subscription_id) {
        return res.status(404).json({ error: 'No active subscription found' });
      }

      const subscription = await stripe.subscriptions.retrieve(tenant.stripe_subscription_id);

      if (priceId) {
        // Update subscription with new price
        const updatedSubscription = await stripe.subscriptions.update(tenant.stripe_subscription_id, {
          items: [{
            id: subscription.items.data[0].id,
            price: priceId
          }],
          proration_behavior: 'create_prorations'
        });

        res.json({ subscription: updatedSubscription });
      } else if (cancelAtPeriodEnd !== undefined) {
        // Cancel or reactivate subscription
        const updatedSubscription = await stripe.subscriptions.update(tenant.stripe_subscription_id, {
          cancel_at_period_end: cancelAtPeriodEnd
        });

        res.json({ subscription: updatedSubscription });
      }
    } catch (error) {
      console.error('Error updating subscription:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async cancelSubscription(req: Request, res: Response) {
    try {
      const tenantId = req.tenantId;
      const userId = (req.user as any)?.id;

      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const tenant = await db('tenants')
        .where({ id: tenantId })
        .select('stripe_subscription_id')
        .first();

      if (!tenant?.stripe_subscription_id) {
        return res.status(404).json({ error: 'No active subscription found' });
      }

      const canceledSubscription = await stripe.subscriptions.cancel(tenant.stripe_subscription_id);

      // Update tenant
      await db('tenants')
        .where({ id: tenantId })
        .update({
          stripe_subscription_id: null,
          plan_tier: 'free',
          updated_at: db.fn.now()
        });

      // Log cancellation
      await db('audit_logs').insert({
        tenant_id: tenantId,
        user_id: userId,
        action: 'subscription_cancelled',
        resource: 'subscription',
        resource_id: canceledSubscription.id,
        details: { cancelled_at: new Date().toISOString() },
        ip_address: req.ip,
        user_agent: req.get('User-Agent'),
        outcome: 'success'
      });

      res.json({ subscription: canceledSubscription });
    } catch (error) {
      console.error('Error canceling subscription:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getUsage(req: Request, res: Response) {
    try {
      const tenantId = req.tenantId;

      // Get current month's usage
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const usage = await db('billing.usage')
        .where({ tenant_id: tenantId })
        .where('period_start', '>=', startOfMonth)
        .select('resource', 'quantity', 'period_start', 'period_end')
        .orderBy('period_start', 'desc');

      // Aggregate by resource type
      const aggregatedUsage = usage.reduce((acc, record) => {
        if (!acc[record.resource]) {
          acc[record.resource] = 0;
        }
        acc[record.resource] += record.quantity;
        return acc;
      }, {} as Record<string, number>);

      res.json({
        period: {
          start: startOfMonth.toISOString(),
          current: new Date().toISOString()
        },
        usage: aggregatedUsage
      });
    } catch (error) {
      console.error('Error fetching usage:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async recordUsage(req: Request, res: Response) {
    try {
      const tenantId = req.tenantId;
      const userId = (req.user as any)?.id;
      const { resourceType, quantity, metadata } = recordUsageSchema.parse(req.body);

      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const endOfMonth = new Date(startOfMonth);
      endOfMonth.setMonth(endOfMonth.getMonth() + 1);

      // Record usage
      await db('billing.usage').insert({
        tenant_id: tenantId || '',
        resource: resourceType,
        quantity: quantity,
        period_start: startOfMonth,
        period_end: endOfMonth,
        metadata: JSON.stringify(metadata || {})
      });

      res.json({ message: 'Usage recorded successfully' });
    } catch (error) {
      console.error('Error recording usage:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getInvoices(req: Request, res: Response) {
    try {
      const tenantId = req.tenantId;

      const tenant = await db('tenants')
        .where({ id: tenantId })
        .select('stripe_customer_id')
        .first();

      if (!tenant?.stripe_customer_id) {
        return res.json({ invoices: [] });
      }

      const invoices = await stripe.invoices.list({
        customer: tenant.stripe_customer_id,
        limit: 50
      });

      res.json({ invoices: invoices.data });
    } catch (error) {
      console.error('Error fetching invoices:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getProducts(req: Request, res: Response) {
    try {
      const products = await stripe.products.list({
        active: true,
        limit: 50
      });

      const productsWithPrices = await Promise.all(
        products.data.map(async (product) => {
          const prices = await stripe.prices.list({
            product: product.id,
            active: true
          });

          return {
            ...product,
            prices: prices.data
          };
        })
      );

      res.json({ products: productsWithPrices });
    } catch (error) {
      console.error('Error fetching products:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async createPaymentMethod(req: Request, res: Response) {
    try {
      const userId = (req.user as any)?.id;
      const { paymentMethodId } = req.body;

      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const tenant = await db('tenants')
        .where({ id: req.tenantId })
        .select('stripe_customer_id')
        .first();

      if (!tenant?.stripe_customer_id) {
        return res.status(404).json({ error: 'Customer not found' });
      }

      // Attach payment method to customer
      await stripe.paymentMethods.attach(paymentMethodId, {
        customer: tenant.stripe_customer_id,
      });

      res.json({ message: 'Payment method added successfully' });
    } catch (error) {
      console.error('Error adding payment method:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}