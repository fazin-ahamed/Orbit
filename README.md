# BusinessOS - AI-First Business Operating System

A next-generation, AI-native SaaS platform that serves as a complete operating system for businesses and startups. It integrates 150+ services and tools, enabling unified operations, automation, and decision-making powered by AI compatibility and Bring Your Own Key (BYOK) for models like OpenAI, Claude, Groq, and OpenRouter.

## 🚀 Features

### Core Modules
- **CRM & Sales Hub** - Lead management, pipelines, customer journeys, and chat
- **Finance & Accounting** - Invoices, payments, subscriptions, and expense tracking
- **HRM & Payroll** - Employee management, attendance, and payroll automation
- **Projects & Tasks** - Kanban, Gantt, AI-driven project insights
- **Workflow Automation Engine** - Visual drag-and-drop builder (n8n-style)
- **AI Assistant Layer** - Contextual AI across modules with BYOK support

### Technical Features
- **Multi-tenant Architecture** - Complete tenant isolation with PostgreSQL schemas
- **AI Gateway** - Central service managing model routing (OpenAI, Claude, Groq, etc.)
- **BYOK Management** - Secure tenant-level key management
- **Vector Indexing** - Private embeddings storage for RAG
- **Real-time Communication** - WebSocket support for live updates
- **Advanced Security** - Zero-trust architecture, encryption, SOC2 compliance

## 🏗️ Architecture

### Backend (FastAPI/Python)
- **Framework**: Express.js + TypeScript
- **Database**: PostgreSQL with Supabase
- **AI Services**: OpenAI, Groq, Claude integration
- **Queue System**: BullMQ + Redis
- **Authentication**: JWT with MFA support
- **File Storage**: S3-compatible storage

### Frontend (React)
- **Framework**: React 18 + TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **State Management**: React hooks
- **Routing**: React Router
- **Build Tool**: Vite

### Infrastructure
- **Deployment**: Docker + Kubernetes ready
- **Monitoring**: Winston logging, health checks
- **Security**: Rate limiting, CORS, helmet
- **Performance**: Connection pooling, caching

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- PostgreSQL 15+
- Redis (optional, for queues)
- Docker (for local development)

### Backend Setup

1. **Clone and install dependencies:**
```bash
git clone <repository-url>
cd businessos
npm install
```

2. **Database setup:**
```bash
# Start PostgreSQL (via Docker)
docker-compose up -d db

# Run migrations
npm run migrate
```

3. **Environment configuration:**
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Start the backend:**
```bash
npm run dev
```

### Frontend Setup

1. **Install frontend dependencies:**
```bash
cd client
npm install
```

2. **Start the frontend:**
```bash
npm run dev
```

3. **Access the application:**
- Frontend: http://localhost:3001
- Backend API: http://localhost:3000

## 📁 Project Structure

```
businessos/
├── src/
│   ├── migrations/          # Database migrations
│   ├── services/            # Business logic modules
│   │   ├── ai/             # AI services & vector operations
│   │   ├── auth/           # Authentication & authorization
│   │   ├── billing/        # Subscription & payment management
│   │   ├── crm/            # Customer relationship management
│   │   ├── projects/       # Project & task management
│   │   ├── tenant/         # Multi-tenant management
│   │   └── workflow/       # Automation engine
│   ├── lib/                # Shared utilities
│   ├── types/              # TypeScript type definitions
│   └── index.ts            # Application entry point
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Page components
│   │   ├── hooks/          # Custom React hooks
│   │   └── lib/            # Frontend utilities
│   └── package.json
├── tests/                  # Test suites
├── docs/                   # Documentation
└── docker-compose.yml      # Local development environment
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `NODE_ENV` | Environment mode | No | `development` |
| `PORT` | Server port | No | `3000` |
| `JWT_SECRET` | JWT signing secret | Yes | - |
| `DATABASE_URL` | PostgreSQL connection string | Yes | - |
| `REDIS_URL` | Redis connection string | No | `redis://localhost:6379` |
| `OPENAI_API_KEY` | OpenAI API key | No | - |
| `GROQ_API_KEY` | Groq API key | No | - |

### AI Configuration

BusinessOS supports multiple AI providers with BYOK:

```typescript
// Configure AI providers per tenant
{
  provider: 'openai', // or 'groq', 'anthropic'
  apiKey: 'your-api-key',
  models: {
    chat: 'gpt-4o-mini',
    embedding: 'text-embedding-3-small'
  }
}
```

## 🔐 Security

### Authentication & Authorization
- JWT-based authentication with refresh tokens
- Multi-factor authentication (TOTP)
- Role-based access control (RBAC)
- SAML SSO support

### Data Protection
- End-to-end encryption for sensitive data
- Row-level security (RLS) in PostgreSQL
- API key encryption at rest
- Zero-trust architecture

### Compliance
- SOC2 Type II ready
- GDPR compliance
- ISO 27001 framework
- Regular security audits

## 🤖 AI Features

### Contextual AI Assistant
- **Writing Assistance** - Email drafting, content creation
- **Data Analysis** - Insights from CRM data, sales forecasting
- **Task Automation** - AI-driven task prioritization
- **Sentiment Analysis** - Customer feedback analysis

### Vector Search & RAG
- Private vector indexing for tenant data
- Semantic search across documents and conversations
- AI-powered knowledge retrieval
- Contextual prompt memory

### Workflow AI
- Auto-suggestion of workflow steps
- Intelligent condition evaluation
- Predictive automation triggers
- Natural language workflow creation

## 🔄 API Documentation

### REST API Endpoints

#### Authentication
```
POST /api/auth/login
POST /api/auth/register
POST /api/auth/refresh
GET  /api/auth/validate
```

#### CRM
```
GET    /api/crm/contacts
POST   /api/crm/contacts
GET    /api/crm/leads
POST   /api/crm/leads
GET    /api/crm/pipelines
```

#### Projects
```
GET    /api/projects/projects
POST   /api/projects/projects
GET    /api/projects/tasks
POST   /api/projects/tasks
```

#### Workflows
```
GET    /api/workflows/workflows
POST   /api/workflows/workflows
POST   /api/workflows/executions
GET    /api/workflows/templates
```

#### AI Services
```
POST   /api/ai/chat-completion
POST   /api/ai/embeddings
POST   /api/ai/vector-search
GET    /api/ai/usage
```

## 🚀 Deployment

### Docker Deployment
```bash
# Build and run with Docker Compose
docker-compose up -d

# Or build individual services
docker build -t businessos-backend .
docker build -t businessos-frontend ./client
```

### Kubernetes Deployment
```bash
# Apply Kubernetes manifests
kubectl apply -f k8s/

# Check deployment status
kubectl get pods
kubectl get services
```

### Production Checklist
- [ ] Environment variables configured
- [ ] Database migrations run
- [ ] SSL certificates installed
- [ ] Monitoring and logging set up
- [ ] Backup strategy implemented
- [ ] Security scanning completed

## 📊 Monitoring & Analytics

### Application Metrics
- API response times and error rates
- Database query performance
- AI usage and costs
- Workflow execution success rates

### Business Metrics
- User adoption and retention
- Feature usage analytics
- Revenue and subscription metrics
- Customer satisfaction scores

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Use TypeScript for all new code
- Follow ESLint configuration
- Write tests for new features
- Update documentation
- Use conventional commits

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: [docs/](docs/)
- **Issues**: [GitHub Issues](https://github.com/your-org/businessos/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-org/businessos/discussions)
- **Email**: support@businessos.com

## 🎯 Roadmap

### Phase 1 (Current) - MVP
- ✅ Core platform with multi-tenancy
- ✅ AI integration with BYOK
- ✅ CRM, Projects, and Workflow modules
- ✅ Basic frontend with React

### Phase 2 - Beta
- 🔄 Advanced workflow automation
- 🔄 50+ third-party integrations
- 🔄 Mobile application
- 🔄 Advanced analytics dashboard

### Phase 3 - Launch
- 📋 150+ integrations
- 📋 Enterprise security features
- 📋 White-label options
- 📋 Marketplace for extensions

### Phase 4 - Scale
- 🌟 AI agent marketplace
- 🌟 No-code app builder
- 🌟 Predictive analytics
- 🌟 Global infrastructure

---

**BusinessOS** - Redefining how businesses operate with AI-first automation and unified operations. 🚀
