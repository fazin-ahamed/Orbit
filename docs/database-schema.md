# BusinessOS Database Schema Outline

## Overview
The database schema uses PostgreSQL with multi-tenancy via `tenant_id` UUID in all tables, Row-Level Security (RLS) policies, and indexes for performance. Schemas are organized by module (e.g., `crm.`, `projects.`) for logical separation. Relationships use foreign keys with CASCADE deletes where appropriate. All timestamps use `TIMESTAMPTZ`. Designed for Oracle Free Tier: Efficient queries, JSONB for flexible fields (e.g., custom CRM fields).

**Global Tables (platform schema):**
- `tenants` (as in core-services-design.md)
- `users` (as in auth design)
- `audit_logs` (for security; see later)

**RLS Template (applied to all tables):**
```sql
ALTER TABLE module.table ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON module.table
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);
```

## 1. CRM Module
Focus: Contacts, activities, opportunities, pipelines.

**crm.contacts**
```sql
CREATE TABLE crm.contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES platform.tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(50),
    company VARCHAR(255),
    custom_fields JSONB DEFAULT '{}', -- e.g., {"industry": "tech"}
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_crm_contacts_tenant_email ON crm.contacts (tenant_id, email);
```

**crm.activities**
```sql
CREATE TABLE crm.activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    contact_id UUID REFERENCES crm.contacts(id) ON DELETE SET NULL,
    type VARCHAR(50) NOT NULL, -- e.g., 'call', 'email'
    notes TEXT,
    scheduled_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_crm_activities_tenant_contact ON crm.activities (tenant_id, contact_id);
```

**crm.opportunities**
```sql
CREATE TABLE crm.opportunities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    contact_id UUID REFERENCES crm.contacts(id),
    title VARCHAR(255) NOT NULL,
    stage VARCHAR(50) DEFAULT 'prospect', -- pipeline stages
    value DECIMAL(10,2),
    score INTEGER DEFAULT 0, -- AI-scored
    close_date DATE,
    custom_fields JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_crm_opportunities_tenant_stage ON crm.opportunities (tenant_id, stage);
```

**Relationships:** Activities link to contacts/opportunities; deduplication via unique email index + merging rules in app logic.

## 2. Projects Module
Focus: Tasks, timecards, expenses.

**projects.projects**
```sql
CREATE TABLE projects.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'active', -- active, completed, archived
    start_date DATE,
    end_date DATE,
    billable BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**projects.tasks**
```sql
CREATE TABLE projects.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    project_id UUID REFERENCES projects.projects(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    assignee_id UUID REFERENCES platform.users(id),
    status VARCHAR(50) DEFAULT 'todo',
    due_date DATE,
    priority VARCHAR(20) DEFAULT 'medium',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_projects_tasks_tenant_project ON projects.tasks (tenant_id, project_id);
```

**projects.timecards**
```sql
CREATE TABLE projects.timecards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    task_id UUID REFERENCES projects.tasks(id) ON DELETE SET NULL,
    user_id UUID REFERENCES platform.users(id),
    hours DECIMAL(5,2) NOT NULL,
    date DATE NOT NULL,
    notes TEXT,
    billable_rate DECIMAL(8,2)
);
CREATE INDEX idx_projects_timecards_tenant_date ON projects.timecards (tenant_id, date);
```

**Relationships:** Tasks under projects; timecards/expenses billable to opportunities (via FK if needed).

## 3. Accounting Module
Focus: Invoices, reconciliations, reports.

**accounting.invoices**
```sql
CREATE TABLE accounting.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    opportunity_id UUID REFERENCES crm.opportunities(id), -- optional
    number VARCHAR(100) UNIQUE NOT NULL,
    customer_name VARCHAR(255),
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(50) DEFAULT 'draft', -- draft, sent, paid, overdue
    due_date DATE,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    line_items JSONB NOT NULL, -- array of {description, qty, price}
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_accounting_invoices_tenant_status ON accounting.invoices (tenant_id, status);
```

**accounting.transactions**
```sql
CREATE TABLE accounting.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    invoice_id UUID REFERENCES accounting.invoices(id) ON DELETE SET NULL,
    type VARCHAR(50) NOT NULL, -- income, expense
    amount DECIMAL(10,2) NOT NULL,
    date DATE NOT NULL,
    description TEXT,
    reconciled BOOLEAN DEFAULT FALSE,
    bank_feed_data JSONB -- from Plaid connector
);
CREATE INDEX idx_accounting_transactions_tenant_date ON accounting.transactions (tenant_id, date);
```

**Relationships:** Transactions link to invoices; auto-match logic in app (e.g., Stripe payouts).

## 4. Inventory Module
Focus: SKUs, stock levels, orders.

**inventory.skus**
```sql
CREATE TABLE inventory.skus (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    code VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(8,2),
    cost DECIMAL(8,2),
    bom JSONB DEFAULT '[]', -- Bill of Materials array
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**inventory.stock_levels**
```sql
CREATE TABLE inventory.stock_levels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    sku_id UUID REFERENCES inventory.skus(id) ON DELETE CASCADE,
    warehouse VARCHAR(100) DEFAULT 'default',
    quantity INTEGER DEFAULT 0,
    reserved_quantity INTEGER DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_inventory_stock_tenant_sku ON inventory.stock_levels (tenant_id, sku_id);
```

**Relationships:** Stock updates via workflows (e.g., Shopify order -> decrement).

## 5. HR Module
Focus: Employees, requisitions, onboarding.

**hr.employees**
```sql
CREATE TABLE hr.employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    user_id UUID REFERENCES platform.users(id),
    name VARCHAR(255) NOT NULL,
    position VARCHAR(255),
    start_date DATE,
    salary DECIMAL(10,2),
    pto_balance DECIMAL(5,2) DEFAULT 0,
    custom_fields JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**hr.job_requisitions**
```sql
CREATE TABLE hr.job_requisitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'open',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 6. Support Module
Focus: Tickets, responses.

**support.tickets**
```sql
CREATE TABLE support.tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    contact_id UUID REFERENCES crm.contacts(id),
    subject VARCHAR(255) NOT NULL,
    description TEXT,
    channel VARCHAR(50) DEFAULT 'email', -- email, slack, chat
    status VARCHAR(50) DEFAULT 'open',
    priority VARCHAR(20) DEFAULT 'medium',
    sla_due TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_support_tickets_tenant_status ON support.tickets (tenant_id, status);
```

**support.responses**
```sql
CREATE TABLE support.responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    ticket_id UUID REFERENCES support.tickets(id) ON DELETE CASCADE,
    author_id UUID REFERENCES platform.users(id),
    message TEXT NOT NULL,
    is_ai_drafted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 7. Knowledge Base Module
Focus: Articles, search.

**kb.articles**
```sql
CREATE TABLE kb.articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    section VARCHAR(100),
    version INTEGER DEFAULT 1,
    is_published BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- Embeddings in ai.vectors table, linked by source_id = article.id
CREATE INDEX idx_kb_articles_tenant_published ON kb.articles (tenant_id, is_published);
```

## Additional Considerations
- **Custom Fields:** JSONB for extensibility (e.g., CRM custom_fields); index GIN for queries.
- **Relationships Across Modules:** e.g., Invoices FK to CRM opportunities; Projects expenses to Accounting.
- **Migrations:** Use Knex.js or Prisma for schema management.
- **Performance:** Composite indexes on (tenant_id, frequent filters); partitioning by tenant_id for large tenants.
- **Data Retention:** Policies via cron (e.g., delete archived >1yr).
- **Exports:** Views for CSV export (tenant-filtered).

This outline covers spec section 6.2 modules, providing a normalized, scalable foundation. Full ERD can be generated with tools like dbdiagram.io.