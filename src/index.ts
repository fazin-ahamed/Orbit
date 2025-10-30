import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

// Import routes
import authRoutes from './services/auth/auth.routes';
import tenantRoutes from './services/tenant/tenant.routes';
import billingRoutes from './services/billing/billing.routes';
import databaseRoutes from './services/database/database.routes';
import aiRoutes from './services/ai/ai.routes';
import crmRoutes from './services/crm/crm.routes';
import workflowRoutes from './services/workflow/workflow.routes';
import projectsRoutes from './services/projects/projects.routes';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3001',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

// Rate limiting (per IP, 100 requests / 15 min for MVP)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Tenant resolution middleware (placeholder - resolve from subdomain/header)
app.use((req: Request, res: Response, next: NextFunction) => {
  const tenantId = req.headers['x-tenant-id'] as string || '00000000-0000-0000-0000-000000000001'; // Default tenant UUID
  req['tenantId'] = tenantId;
  next();
});

// Auth middleware placeholder
app.use((req: Request, res: Response, next: NextFunction) => {
  // TODO: JWT validation, set req.user
  next();
});

// Routes
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString(), tenant: req['tenantId'] });
});

app.use('/api/auth', authRoutes);
app.use('/api/tenants', tenantRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/database', databaseRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/crm', crmRoutes);
app.use('/api/workflows', workflowRoutes);
app.use('/api/projects', projectsRoutes);

// Catch-all for undefined routes
app.use('*', (req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`BusinessOS API Gateway running on port ${PORT}`);
});