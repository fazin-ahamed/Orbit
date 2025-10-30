# BusinessOS High-Level Architecture

## Overview
BusinessOS is a multi-tenant SaaS platform built with Node.js/Express backend, PostgreSQL database, React/TypeScript frontend, deployed on Oracle Free Tier.

## Mermaid Diagram: System Components

```mermaid
graph TD
    subgraph Frontend["Frontend SPA (React/TS)"]
        UI[Dashboard & Modules UI]
    end

    subgraph Gateway["API Gateway (Express)"]
        AG[API Gateway - Auth, Rate Limiting, Routing]
    end

    subgraph Services["Core Microservices (Node.js/Express)"]
        Auth[Auth Service - SSO, MFA, JWT]
        Tenant[Tenant Service - Metadata, Billing Config]
        CRM[CRM Service]
        Projects[Projects Service]
        Accounting[Accounting Service]
        Inventory[Inventory Service]
        HR[HR Service]
        Support[Support Service]
        KB[Knowledge Base Service]
        Workflow[Workflow Engine - Builder & Execution]
        AI[AI Orchestrator - BYOK Proxy, RAG]
        Connectors[Connector Runtime - Sandboxes]
        Billing[Billing Service]
    end

    subgraph Backend["Backend Infrastructure"]
        DB[PostgreSQL - Multi-tenant with RLS]
        VS[Vector Store - PGVector Extension]
        EB[Event Bus - Redis/Kafka-lite]
        KMS[KMS - Encrypted Key Storage for BYOK]
    end

    UI -->|REST/GraphQL/WebSockets| AG
    AG -->|Authenticated Requests| Auth
    AG -->|Tenant-Routed| Tenant
    AG -->|Module APIs| CRM
    AG -->|Module APIs| Projects
    AG -->|Module APIs| Accounting
    AG -->|Module APIs| Inventory
    AG -->|Module APIs| HR
    AG -->|Module APIs| Support
    AG -->|Module APIs| KB
    AG -->|Workflow APIs| Workflow
    AG -->|AI APIs| AI
    AG -->|Connector APIs| Connectors
    AG -->|Billing APIs| Billing

    Services -->|Events| EB
    EB -->|Async Triggers| Workflow
    EB -->|Notifications| AI
    Services -->|Data Queries| DB
    AI -->|Embeddings| VS
    VS -->|RAG Queries| DB
    AI -->|Model Calls| KMS

    style Frontend fill:#e1f5fe
    style Services fill:#f3e5f5
    style Backend fill:#e8f5e8
```

## Key Interactions
- **API Flow**: Frontend calls hit Gateway, authenticated via Auth Service, routed to tenant-specific instances.
- **Event-Driven**: Services publish to Event Bus for workflows and AI triggers.
- **Data Layer**: Shared PostgreSQL with tenant isolation via Row-Level Security (RLS).
- **AI Layer**: BYOK keys stored in KMS, proxied through AI service to providers like OpenAI/Anthropic.

This diagram captures the microservices architecture from the spec, optimized for free tier constraints (e.g., in-memory Redis for events).