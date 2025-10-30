# BusinessOS Frontend Architecture Design

## Overview
The frontend is a single-page application (SPA) built with React and TypeScript, providing a unified dashboard for all modules (CRM, Projects, etc.), workflow builder, AI tools, and admin features. Design emphasizes modularity, responsiveness (mobile-first for ops managers), real-time updates (WebSockets for workflows/tickets), and accessibility (WCAG 2.1). Integrated with backend via REST/GraphQL APIs through the Gateway. For Oracle Free Tier: Static hosting (e.g., Oracle Object Storage), lightweight bundle (Vite for build).

Key Principles: Component reusability, tenant-aware theming, offline support for core views (Service Workers).

## 1. Tech Stack & Structure
- **Framework:** React 18+ with TypeScript for type safety.
- **Build Tool:** Vite for fast dev/build; optimized for production (tree-shaking, code splitting).
- **State Management:** Zustand (lightweight alternative to Redux) for global state (user, tenant config); React Query for API caching/mutations.
- **Routing:** React Router v6 for SPA navigation (e.g., /crm/contacts, /workflows/builder).
- **UI Library:** Material-UI (MUI) for components (theming, responsive grids); custom overrides for BusinessOS branding.
- **Styling:** CSS-in-JS with Emotion (scoped, dynamic themes based on tenant config).
- **Real-Time:** Socket.io-client for WebSockets (e.g., live notifications, workflow execution status).
- **Forms/Validation:** React Hook Form + Zod for schema validation.
- **Testing:** Vitest + React Testing Library; Cypress for E2E.

**Project Structure:**
```
src/
├── components/          # Reusable UI (Button, Modal, DataTable)
├── features/            # Module-specific (crm/, projects/, workflows/)
│   ├── crm/
│   │   ├── ContactsList.tsx
│   │   ├── OpportunityPipeline.tsx
│   │   └── hooks/useContacts.ts  # Custom hooks for API
│   └── workflows/
│       ├── BuilderCanvas.tsx     # Visual editor with React Flow
│       └── NodePalette.tsx
├── hooks/               # Shared (useAuth, useApi)
├── lib/                 # Utils (apiClient, socketManager)
├── pages/               # Routes (Dashboard, Settings)
├── store/               # Zustand stores (authStore, tenantStore)
├── types/               # TypeScript defs (API schemas)
└── App.tsx              # Root with Router, AuthProvider
```

## 2. Authentication & Layout
- **Auth Flow:** Protected routes via AuthProvider (JWT storage in localStorage/httpOnly cookies); redirect to login on 401.
- **Layout:** Persistent sidebar (modules navigation), top bar (user menu, notifications), main content area.
- **Tenant Awareness:** Load tenant config on app init; dynamic routing (e.g., {tenant}.businessos.com -> tenant context).
- **Theming:** MUI ThemeProvider with tenant colors/fonts; dark mode toggle.

**Mermaid Diagram: Component Hierarchy**
```mermaid
graph TD
    App[App.tsx<br/>- Router<br/>- AuthProvider<br/>- ThemeProvider]
    Layout[Layout.tsx<br/>- Header<br/>- Sidebar (Modules)<br/>- Notifications]
    Dashboard[Dashboard.tsx<br/>- KPI Cards<br/>- Recent Activity]
    Module[Module Pages<br/>e.g., CRM Contacts]
    Builder[Workflow Builder<br/>- React Flow Canvas<br/>- Node Editor]
    Admin[Admin Pages<br/>- Tenant Settings<br/>- Billing Overview]

    App --> Layout
    Layout --> Dashboard
    Layout --> Module
    Layout --> Builder
    Layout --> Admin

    Module -.->|API Calls| ApiClient[lib/apiClient.ts<br/>- Axios Instance<br/>- Tenant Headers]
    Builder -.->|WebSockets| Socket[lib/socketManager.ts<br/>- Real-time Updates]
    style App fill:#e1f5fe
    style Layout fill:#f3e5f5
```

## 3. Module Dashboards & UI Behaviors
**General Behaviors:**
- Responsive: MUI Grid/Breakpoints; mobile collapses sidebar to hamburger.
- Loading/Error States: Skeleton loaders, toast notifications (react-hot-toast).
- Search/Filter: Integrated DataTables with debounced search, pagination (server-side for large lists).
- Real-Time: WebSockets subscribe to tenant events (e.g., new ticket -> update Support dashboard).

**CRM Dashboard:**
- Views: Contacts list (sortable table, search by name/email), Pipeline (Kanban with stages, drag-drop via react-beautiful-dnd), Activities timeline.
- Behaviors: Auto-enrich on contact create (AI call), merge duplicates (modal with diff), sequences (stepper for outreach).
- AC: Pipeline updates in <2s; conversion KPIs displayed.

**Projects Dashboard:**
- Views: Project list (cards with progress bars), Gantt chart (react-google-charts or custom), Time tracking (clock-in modal).
- Behaviors: Billable time auto-sync to Accounting, expense upload (drag-drop files), task assignment (autocomplete users).
- AC: Real-time assignee notifications; invoice sync button triggers workflow.

**Accounting Dashboard:**
- Views: Invoices table (filter by status), Reconciliation queue, Reports (charts via Recharts).
- Behaviors: Auto-match on bank feed import (Plaid connector), tax calc (region-aware), eSign integration (DocuSign node).
- AC: DSO KPI auto-calculated; discrepancies flagged >$5.

**Similar for Other Modules:**
- Inventory: Stock levels grid, reorder alerts (threshold-based).
- HR: Employee directory, onboarding checklist (progress stepper).
- Support: Ticket kanban, SLA timers (countdown), AI draft suggestions (inline editor).
- Knowledge Base: Article tree view, semantic search (AI query).

**Workflow Builder UI:**
- Canvas: React Flow for nodes/edges; palette sidebar.
- Behaviors: Drag-drop nodes, connect edges (validation), test-run (simulate step-by-step), debug (highlight errors).
- AC: Dry-run validates without execution; version history (diff modal).

**AI Features UI:**
- Prompt Library: Reusable templates dropdown.
- Agent Interface: Chat-like for CoT, approval modals for human-in-loop.
- Behaviors: RAG results shown with sources (collapsible); token usage indicator.

## 4. Admin & Marketplace UI
- Tenant Admin: Settings form (SSO config, BYOK keys input - masked), audit log viewer (filterable table), data export button.
- Marketplace: Search bar, category filters, install button (modal for auth setup).
- Behaviors: Approval gates for workflows (review diff), usage charts (Recharts).

## 5. Performance & Accessibility
- Optimization: Lazy loading for modules (React.lazy), code splitting by route.
- Offline: Service Worker for caching static assets; PWA manifest for installable app.
- Accessibility: ARIA labels, keyboard nav (focus management in builder), color contrast.
- i18n: react-i18next for multi-language (start with EN).

## Integration with Backend
- API Client: Axios base with interceptors (auth headers, tenant_id, error handling).
- GraphQL Option: Apollo Client for complex queries (e.g., federated module data); fallback REST for simplicity.
- Error Handling: Global handler for 4xx/5xx; offline queue for mutations (if needed).

## Development & Deployment
- Dev: Vite dev server with HMR; proxy to backend.
- Build: `vite build` -> static files to Oracle Object Storage (CDN for global access).
- CI/CD: GitHub Actions for tests/build (future).

## Risks & Mitigations
- Bundle Size: Monitor with vite-bundle-analyzer; split heavy libs (e.g., React Flow).
- Real-Time Scalability: Limit subscriptions; fallback to polling.
- Cross-Browser: Test on Chrome/FF/Safari; polyfills for IE if needed.
- UX Consistency: Design system with Storybook for component docs.

This architecture delivers intuitive, AI-augmented UIs per spec section 6 (e.g., visual builder behaviors), supporting personas like Sales Managers (pipeline health) and Ops (automation monitoring).