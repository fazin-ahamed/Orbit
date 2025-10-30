"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
// Import routes
const auth_routes_1 = __importDefault(require("./services/auth/auth.routes"));
const tenant_routes_1 = __importDefault(require("./services/tenant/tenant.routes"));
const billing_routes_1 = __importDefault(require("./services/billing/billing.routes"));
const database_routes_1 = __importDefault(require("./services/database/database.routes"));
const ai_routes_1 = __importDefault(require("./services/ai/ai.routes"));
const crm_routes_1 = __importDefault(require("./services/crm/crm.routes"));
const workflow_routes_1 = __importDefault(require("./services/workflow/workflow.routes"));
const projects_routes_1 = __importDefault(require("./services/projects/projects.routes"));
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
// Middleware
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: process.env.FRONTEND_URL || 'http://localhost:3001',
    credentials: true,
}));
app.use(express_1.default.json({ limit: '10mb' }));
// Rate limiting (per IP, 100 requests / 15 min for MVP)
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});
app.use(limiter);
// Tenant resolution middleware (placeholder - resolve from subdomain/header)
app.use((req, res, next) => {
    const tenantId = req.headers['x-tenant-id'] || 'default'; // TODO: Implement subdomain resolution
    req['tenantId'] = tenantId;
    next();
});
// Auth middleware placeholder
app.use((req, res, next) => {
    // TODO: JWT validation, set req.user
    next();
});
// Routes
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', timestamp: new Date().toISOString(), tenant: req['tenantId'] });
});
app.use('/api/auth', auth_routes_1.default);
app.use('/api/tenants', tenant_routes_1.default);
app.use('/api/billing', billing_routes_1.default);
app.use('/api/database', database_routes_1.default);
app.use('/api/ai', ai_routes_1.default);
app.use('/api/crm', crm_routes_1.default);
app.use('/api/workflows', workflow_routes_1.default);
app.use('/api/projects', projects_routes_1.default);
// Catch-all for undefined routes
app.use('*', (req, res) => {
    res.status(404).json({ error: 'Route not found' });
});
app.listen(PORT, () => {
    console.log(`BusinessOS API Gateway running on port ${PORT}`);
});
//# sourceMappingURL=index.js.map