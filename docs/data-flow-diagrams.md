# BusinessOS Data Flow Diagrams for Key Use Cases

## Overview
These diagrams illustrate end-to-end data flows for representative use cases from the spec (sections 5 & 7.2). Using Mermaid sequence diagrams to show interactions between frontend, services, DB, external systems, and AI/workflows. Focus on async/event-driven patterns for performance. Diagrams assume tenant context is propagated throughout.

## 1. AI-Assisted Summarization (Spec 7.2 Example)
User requests summary of a meeting transcript in the Knowledge Base or Support module.

```mermaid
sequenceDiagram
    participant UI as Frontend UI
    participant AG as API Gateway
    participant KB as KB Service
    participant AI as AI Orchestrator
    participant VS as Vector Store (PGVector)
    participant Proxy as Model Proxy (BYOK)
    participant Provider as AI Provider (e.g., OpenAI)
    participant DB as PostgreSQL
    participant EB as Event Bus (Redis)
    participant Billing as Billing Service

    UI->>AG: POST /kb/summarize {transcript_id, query}
    AG->>KB: Fetch Transcript (tenant_id)
    KB->>DB: Query kb.articles/content
    DB-->>KB: Transcript Text
    KB-->>AG: Text Chunks
    AG->>AI: Build RAG Context
    AI->>VS: Generate Query Embedding & Search (cosine similarity)
    VS->>DB: Vector Query (top-k chunks)
    DB-->>VS: Relevant Chunks (with metadata)
    VS-->>AI: RAG Context
    AI->>AI: Load Prompt Template (e.g., "Summarize using {context}: {query}")
    AI->>Proxy: Send Request {prompt, model}
    Proxy->>DB: Decrypt Tenant Key
    DB-->>Proxy: Key
    Proxy->>Provider: API Call (key, prompt)
    Provider-->>Proxy: Summary Response (tokens)
    Proxy-->>AI: Output with Provenance
    AI->>EB: Publish "summary_created" Event
    AI->>Billing: Log Tokens Used
    Billing->>DB: Increment Usage
    AI-->>AG: Summary + Sources
    AG-->>UI: Display (with expandable sources)
    Note over UI: Human review if agent flow
```

**Key Notes:** <60s end-to-end; provenance for audit; event triggers workflows (e.g., email summary).

## 2. Sales Use Case: Enrich Inbound Leads (Spec 5)
Inbound lead via form/email -> Enrich with firmographics -> Auto-assign rep -> Start multichannel workflow.

```mermaid
sequenceDiagram
    participant UI as CRM UI / Form
    participant AG as API Gateway
    participant CRM as CRM Service
    participant Connectors as Connector Runtime
    participant EB as Event Bus
    participant Workflow as Workflow Engine
    participant DB as PostgreSQL

    UI->>AG: POST /crm/leads {email, name, source}
    AG->>CRM: Create Lead Record
    CRM->>DB: INSERT crm.contacts (dedupe check)
    DB-->>CRM: Contact ID
    CRM->>Connectors: Enrich (e.g., Clearbit API)
    Connectors->>External: API Call (tenant key)
    External-->>Connectors: Firmographics (company, revenue)
    Connectors-->>CRM: Enriched Data
    CRM->>DB: UPDATE crm.contacts {firmographics}
    CRM->>EB: Publish "lead_enriched" Event
    EB->>Workflow: Trigger Assignment Flow
    Workflow->>DB: Load Workflow JSON
    Workflow->>CRM: Query Reps (round-robin or score-based)
    CRM-->>Workflow: Assigned Rep ID
    Workflow->>Connectors: Send Email (e.g., SendGrid)
    Connectors->>External: Send Outreach
    Workflow->>EB: Publish "sequence_started"
    Workflow-->>CRM: Workflow ID
    CRM-->>AG: Lead Created + Assigned
    AG-->>UI: Success Toast; Update List (<60s AC)
```

**Key Notes:** Enrichment within 60s; workflow handles follow-ups; activity logged in timeline.

## 3. Commerce Use Case: Shopify Order Flow (Spec 5)
Shopify order -> Inventory allocation -> Accounting invoice -> Shipping -> Notification.

```mermaid
sequenceDiagram
    participant Shopify as External (Webhook)
    participant AG as API Gateway
    participant Connectors as Connector Runtime
    participant Inventory as Inventory Service
    participant Accounting as Accounting Service
    participant Workflow as Workflow Engine
    participant Shipping as Connector (e.g., Shippo)
    participant EB as Event Bus
    participant DB as PostgreSQL

    Shopify->>AG: Webhook /orders/create {order_data}
    AG->>Connectors: Validate & Parse
    Connectors->>DB: Check Auth (tenant key)
    Connectors->>Inventory: Allocate Stock
    Inventory->>DB: UPDATE inventory.stock_levels (decrement qty)
    alt Low Stock
        Inventory->>EB: "reorder_needed"
    end
    Inventory-->>Connectors: Allocation ID
    Connectors->>Workflow: Trigger Invoice Flow
    Workflow->>Accounting: Create Invoice {order_items, customer}
    Accounting->>DB: INSERT accounting.invoices (line_items JSONB)
    Accounting-->>Workflow: Invoice ID
    Workflow->>Shipping: Generate Label
    Shipping->>External: API Call
    External-->>Shipping: Label URL
    Shipping-->>Workflow: Shipping Info
    Workflow->>Connectors: Notify Customer (email/SMS)
    Connectors->>External: Send Notification
    Workflow->>EB: "order_fulfilled" (2min AC)
    Workflow-->>Connectors: Completion
    Connectors-->>AG: 200 OK
```

**Key Notes:** Full flow <2min; inventory sync prevents oversell; events for reporting.

## 4. Support Use Case: Ticket Creation & AI Draft (Spec 5)
Incoming email -> Ticket -> AI-draft reply -> Approval -> Send.

```mermaid
sequenceDiagram
    participant Email as External (Inbound)
    participant AG as API Gateway
    participant Support as Support Service
    participant Connectors as Connector Runtime (Email Parser)
    participant AI as AI Orchestrator
    participant Workflow as Workflow Engine
    participant DB as PostgreSQL
    participant EB as Event Bus

    Email->>AG: Inbound Webhook /tickets/email {raw_email}
    AG->>Connectors: Parse Email
    Connectors->>Support: Create Ticket {subject, body, sender}
    Support->>DB: INSERT support.tickets (channel='email')
    Support->>CRM: Link Contact (if exists)
    CRM-->>Support: Contact ID (optional)
    Support->>EB: "ticket_created" (SLA timer start)
    EB->>Workflow: Trigger Reply Flow
    Workflow->>AI: Draft Reply {ticket_id}
    AI->>VS: RAG Query (similar tickets KB)
    VS-->>AI: Context
    AI->>Proxy: Generate Draft (prompt: "Draft helpful reply using {context}")
    Proxy-->>AI: Draft Text
    AI->>DB: UPDATE support.tickets {ai_draft}
    AI-->>Workflow: Draft
    Workflow->>UI: Notify Agent (WebSocket / in-app)
    UI->>AG: Approve & Edit
    AG->>Support: Update Response
    Support->>DB: INSERT support.responses {is_ai_drafted=true}
    Support->>Connectors: Send Reply (email)
    Connectors->>Email: Outbound
    Workflow->>EB: "ticket_replied" (<30s draft AC)
```

**Key Notes:** 80% drafts <30s; human approval for quality; SLA enforcement via workflow.

## Additional Use Cases
- **Finance Reconciliation:** Stripe webhook -> Match invoice -> Flag discrepancy -> Workflow alert (98% accuracy).
- **HR Candidate Flow:** LinkedIn connector -> Create record -> Schedule interview workflow -> Offer letter.
- **Legal Contract:** PDF upload -> AI extract clauses -> Vector store -> 90-day task creation.

These flows demonstrate embedded automation and AI, with events ensuring loose coupling. Full implementation uses the defined architecture for durability and scalability.