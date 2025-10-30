# BusinessOS Multi-Tenancy Design

## Overview
BusinessOS uses a multi-tenant architecture to serve multiple customers (tenants) from a single application instance, optimizing resource usage on Oracle Free Tier (1GB RAM limit). The design prioritizes isolation, scalability, and compliance (e.g., data residency via region selection).

## Approach: Shared Database, Shared Schema with Row-Level Security (RLS)
- **Why Shared?** Cost-effective for MVP (avoids multiple DB instances on free tier). PostgreSQL supports efficient isolation without dedicated resources per tenant.
- **Alternatives Considered:**
  - Shared DB, Separate Schemas: Good isolation but schema management overhead.
  - Separate DBs: Strong isolation but not feasible on free tier (resource limits); reserved for enterprise upgrades.
- **Chosen: RLS in PostgreSQL** - Enforces tenant isolation at query level using policies. All data prefixed with `tenant_id` UUID.

## Implementation Details
1. **Tenant Model:**
   - Tenants have unique IDs, metadata (name, region, plan, BYOK keys), and config (e.g., model providers).
   - Onboarding: Create tenant record, provision user, set up RLS policies.

2. **Database Schema Enhancements:**
   - Every table includes `tenant_id` (UUID, not null, indexed).
   - Example for CRM Contacts table:
     ```sql
     CREATE TABLE crm.contacts (
         id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
         tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
         name VARCHAR(255) NOT NULL,
         email VARCHAR(255) UNIQUE,
         created_at TIMESTAMP DEFAULT NOW(),
         -- Other fields...
     );

     -- RLS Policy
     ALTER TABLE crm.contacts ENABLE ROW LEVEL SECURITY;
     CREATE POLICY tenant_isolation ON crm.contacts
         USING (tenant_id = current_setting('app.current_tenant_id')::UUID);
     ```

3. **Application Layer:**
   - **Auth Middleware (Express):** After JWT validation, extract `tenant_id` and set `req.tenantId`. Use `pg` client with `SET app.current_tenant_id = req.tenantId` for connections.
   - **API Routing:** Tenant Service resolves tenant from subdomain/header (e.g., {tenant}.businessos.com), injects into context.
   - **Service Propagation:** All microservices receive tenant context via headers; queries automatically filtered.

4. **Isolation Guarantees:**
   - **Data:** RLS prevents cross-tenant access; audits log tenant-specific actions.
   - **Compute:** Services stateless; tenant config loaded per request (cached in Redis for performance).
   - **Storage:** Shared but partitioned by tenant_id; vector store indexes segmented by tenant.
   - **BYOK:** Keys encrypted per tenant in KMS, accessible only via tenant context.

5. **Data Residency & Governance:**
   - Tenant selects region on signup (e.g., EU for GDPR); route to regional DB clusters (future: multi-region Oracle setup).
   - Export/Audit: Tenant admins can query/export only their data via dedicated endpoints.

6. **Scalability Path:**
   - MVP: Single shared DB.
   - Growth: Horizontal scaling with read replicas; sharding by tenant_id if >100 tenants.
   - Enterprise: Migrate to dedicated DBs via config flag, using tools like pg_dump for data export.

7. **Risks & Mitigations:**
   - Noisy Neighbor: Rate limiting per tenant; monitor query performance.
   - Compliance: SOC2 via audit trails; regular RLS policy reviews.
   - Testing: Unit tests for cross-tenant isolation; integration tests with mock tenants.

This design ensures secure, efficient multi-tenancy aligned with spec goals for 100 pilots.