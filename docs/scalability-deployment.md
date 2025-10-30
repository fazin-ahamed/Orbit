# BusinessOS Scalability, Performance, and Deployment Design

## Overview
This design addresses scalability for 100 pilot customers, performance optimizations for low-latency operations (e.g., <1s API responses, <2min workflows), and deployment on Oracle Cloud Free Tier (Always Free: 2 AMD VMs up to 1/8 OCPU/1GB RAM each, Autonomous Database 20GB, Object Storage 10GB, Load Balancer). Constraints: Limited RAM/CPU; prioritize lightweight, stateless components. Microservices enable horizontal scaling; caching and queues handle load. MVP focuses on vertical optimization; growth path to paid tiers.

## 1. Scalability
**Horizontal Scaling:**
- Services: Stateless Node.js/Express apps; deploy multiple instances (PM2 clustering on VM, up to 4 processes on 1GB RAM).
- Load Balancing: Oracle Load Balancer (free tier) distributes traffic; health checks on /health endpoint.
- Database: PostgreSQL Autonomous DB scales reads (replicas in paid); sharding by tenant_id for >100 tenants (app-level routing).
- Workflows/AI: BullMQ queues (Redis) distribute jobs across workers; auto-scale workers based on queue length (cron monitor).

**Vertical Scaling & Limits:**
- Free Tier: 1GB RAM total for app; limit concurrent users (~50 active) via rate limiting.
- Growth: Monitor with Oracle Monitoring (free); migrate to paid Compute for more OCUs.
- Event Bus: Redis PubSub (in-VM, 200MB max); fallback to DB polling for low load.

**Mermaid Diagram: Scaling Architecture**
```mermaid
graph TD
    LB[Oracle Load Balancer<br/>(Free Tier)]
    VM1[VM1 (1/8 OCPU, 1GB RAM)<br/>- API Gateway<br/>- Auth/Tenant Services<br/>- PM2 Cluster (2x)]
    VM2[VM2 (1/8 OCPU, 1GB RAM)<br/>- Core Services (CRM, Workflows)<br/>- Worker Pool (BullMQ)]
    Redis[Redis (In-VM)<br/>- Caching<br/>- Queues<br/>- PubSub]
    DB[Autonomous DB (20GB)<br/>- PostgreSQL<br/>- PGVector<br/>- RLS Indexes]
    OS[Object Storage<br/>- Frontend Static Files<br/>- Logs/Exports]

    LB --> VM1
    LB --> VM2
    VM1 <--> Redis
    VM2 <--> Redis
    VM1 --> DB
    VM2 --> DB
    VM1 --> OS
    VM2 --> OS

    subgraph External
        CDN[CDN (Object Storage +)<br/>- Frontend Delivery]
    end
    OS --> CDN

    style LB fill:#90EE90
    style DB fill:#FFB6C1
```

**Strategies:**
- Caching: Redis for tenant config, frequent queries (e.g., user roles TTL 5min); API responses (ETag for conditional GET).
- Async: All workflows/AI offloaded to queues; non-critical (e.g., reports) batched.
- Partitioning: DB indexes on tenant_id + date/stage; vacuum/analyze cron for maintenance.

## 2. Performance
**API & Backend:**
- Optimization: Express middleware for compression (gzip), JSON minification; database connection pooling (pg-pool, max 10).
- Query Tuning: EXPLAIN ANALYZE for slow queries; limit results (pagination default 50); composite indexes (e.g., tenant_id + created_at DESC).
- AI/Workflows: Batch embeddings (100 docs/job); timeout long runs (30s); cache RAG results (Redis, key: tenant+query_hash).
- Monitoring: Basic Prometheus + Grafana (lightweight, in-VM); track latency, error rates, resource usage.

**Frontend:**
- Bundle: Vite optimizes (<2MB gzipped); lazy load modules.
- Rendering: Virtual scrolling for lists (react-window); debounced searches.
- Network: GraphQL for over-fetching reduction; WebSockets only for real-time (e.g., 1 connection/tenant).

**Benchmarks & AC:**
- API Response: <200ms for reads, <500ms writes (under 10 concurrent).
- Workflow: <1s for simple (5 nodes), durable for complex.
- DB: <100ms queries with indexes; handle 100 pilots (~1k daily active).

**Tools:**
- Profiling: Node clinic.js for bottlenecks; pgBadger for DB logs.
- CDN: Oracle Object Storage as static host; edge caching for global latency.

## 3. Deployment
**Environment Setup (Oracle Free Tier):**
- **Compute:** 2 Always Free VMs (Ubuntu 22.04); install Node 20, PostgreSQL client, Redis.
- **Database:** Autonomous Transaction Processing (ATP) DB (free 20GB); enable PGVector extension via SQL.
- **Storage:** Object Storage for frontend builds, logs, exports.
- **Networking:** VCN (Virtual Cloud Network) with public subnets; security lists for ports 80/443 (LB), 3000 (internal).

**Deployment Process:**
1. **CI/CD:** GitHub Actions workflow: On push to main - lint/test/build; manual trigger for deploy.
   - Backend: Build (npm run build), Dockerize (lightweight, no heavy deps), push to Oracle Container Registry (free tier limited, fallback SCP).
   - Frontend: Vite build -> upload to Object Storage.
2. **Backend Deploy:** SCP Docker images/scripts to VMs; docker-compose up (services: gateway, services, redis).
   - docker-compose.yml: Volumes for logs; env vars for DB creds (Oracle Vault for secrets).
   - Services: PM2 ecosystem files for clustering/restarts.
3. **Database:** SQL scripts via psql (flyway or knex migrations); initial seed for tenants.
4. **Frontend:** Build artifacts to Object Storage bucket; configure as public website (index.html).
5. **Load Balancer:** Point to VMs; SSL certs via Oracle Cert Manager (free Let's Encrypt integration).
6. **Monitoring/Logs:** Oracle Logging Analytics (free tier); tail logs via SSH.

**Example docker-compose.yml (VM1):**
```yaml
version: '3'
services:
  gateway:
    image: businessos/gateway:latest
    ports:
      - "3000:3000"
    environment:
      - DB_URL=oracle_atp_connection
      - REDIS_URL=redis://localhost:6379
    depends_on:
      - redis
  redis:
    image: redis:alpine
    ports:
      - "6379:6379"
```

**Rollback/Security:**
- Blue-Green: Deploy to staging VM, swap LB backend.
- Secrets: Oracle Vault or env files (gitignored); rotate DB creds.
- Updates: Zero-downtime with PM2 reload; DB migrations atomic.

**MVP Deployment Timeline:**
- Week 1: Provision Oracle resources, deploy core services.
- Week 2: Integrate frontend, test end-to-end.
- Ongoing: Monitor for 100 pilots; scale to paid if CPU >80%.

## Risks & Mitigations
- Resource Exhaustion: Auto-alert on 80% RAM; optimize queries first.
- DB Limits: 20GB cap - archive old data; use JSONB sparingly.
- Vendor Lock: Abstract DB (e.g., via ORM like Prisma) for migration.
- Cold Starts: Pre-warm VMs; use persistent Redis.

This ensures BusinessOS runs efficiently on free tier while scaling to vision goals (150 connectors, AI workflows).