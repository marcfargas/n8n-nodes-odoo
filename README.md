# @marcfargas/n8n-nodes-odoo

Advanced Odoo node for [n8n](https://n8n.io) — schema-aware CRUD, method calls, chatter messaging, dynamic property fields, URL generation, and polling triggers.

Built on [odoo-toolbox](https://github.com/marcfargas/odoo-toolbox) (`@marcfargas/odoo-client` + `@marcfargas/odoo-introspection`).

## Why This Node?

The built-in n8n Odoo node supports basic CRUD on three hardcoded models plus a generic "Custom Resource." This node replaces that with a unified, model-agnostic approach and adds several capabilities that don't exist in the built-in node:

| Feature | Built-in | This node |
|---------|:--------:|:---------:|
| CRUD on any model | Via Custom Resource | ✓ First-class |
| Method calls (`action_confirm`, etc.) | — | ✓ |
| Chatter (notes & messages) | — | ✓ |
| Properties (Odoo 17+ dynamic fields) | — | ✓ |
| Schema introspection | — | ✓ |
| URL generation (backend, portal) | — | ✓ |
| Polling trigger | — | ✓ |
| Mail context options | — | ✓ |
| Domain filters on all operations | Custom only | ✓ |
| Context support (`lang`, `company`, `active_test`) | — | ✓ |
| Typed error handling | Generic | Auth / Validation / Access / Missing |

## Installation

### Community Nodes (recommended)

1. In n8n, go to **Settings → Community Nodes**
2. Enter `@marcfargas/n8n-nodes-odoo`
3. Click **Install**

### Self-Hosted / Docker

```bash
cd ~/.n8n/nodes
npm install @marcfargas/n8n-nodes-odoo
```

Restart n8n after installation.

## Credentials

Create an **Odoo API** credential in n8n with:

| Field | Description | Example |
|-------|-------------|---------|
| **URL** | Odoo instance URL | `https://mycompany.odoo.com` |
| **Database** | Database name (auto-detected if blank) | `mycompany` |
| **Username** | Odoo login (email) | `admin@mycompany.com` |
| **Password** | Password or [API key](https://www.odoo.com/documentation/17.0/developer/reference/external_api.html#api-keys) | |

> **Tip:** API keys are recommended over passwords — they survive password changes and can be scoped per integration.

The credential includes a built-in **Test** button that verifies the connection.

## Resources & Operations

### Record

Universal CRUD for any Odoo model. The model picker loads all available models at design time with metadata (name, transient flag).

| Operation | Description |
|-----------|-------------|
| **Create** | Create a record. Values via UI field picker or raw JSON. |
| **Get** | Fetch a record by ID with field selection. |
| **Search** | Query with domain filters, field selection, ordering, limit/offset. |
| **Update** | Modify a record by ID. Values via UI field picker or raw JSON. |
| **Delete** | Remove a record by ID. |
| **Count** | Count records matching a domain filter. |

**Mail Options** (Create & Update): When writing to models that inherit `mail.thread`, you can control notification behavior:

- **Disable All Tracking** — skip all `mail.thread` features (best for bulk imports)
- **No Field Change Messages** — skip tracking messages but keep notifications/followers
- **No Creation Log** — suppress the "Record created" chatter message (Create only)
- **No Auto-Subscribe Creator** — don't add the creator as a follower (Create only)

### Method

Call any server-side model method — workflow actions, button handlers, custom methods:

- Positional and keyword arguments (JSON)
- Full context support
- Works with any method name the connected user has access to

Common examples: `action_confirm` (sales/purchase), `action_post` (invoices), `button_validate` (inventory).

### Message

Post to Odoo's chatter (`mail.thread`) from any model that supports it:

| Operation | Description |
|-----------|-------------|
| **Post Internal Note** | Visible to internal users only |
| **Post Message** | Visible to all followers (customers included) |

### Property

Read and write Odoo 17+ [dynamic property fields](https://www.odoo.com/documentation/17.0/developer/reference/backend/orm.html#odoo.fields.Properties):

| Operation | Description |
|-----------|-------------|
| **Get** | Read current property values for a record |
| **Update** | Safely update individual properties (read-modify-write pattern) |

### Schema

Runtime introspection of the Odoo instance:

| Operation | Description |
|-----------|-------------|
| **List Models** | All models with name, technical name, and transient flag |
| **Get Fields** | Field metadata: name, type, required, readonly, relation, help |

### URL

Generate links to Odoo records:

| Operation | Description |
|-----------|-------------|
| **Get Base URL** | Read the `web.base.url` system parameter |
| **Get Record URL** | Version-agnostic `/mail/view` redirect link for any record |
| **Get Portal URL** | Customer-facing portal link with access token (for `portal.mixin` models) |

Portal URL options: suffix path (e.g., `/accept`), report type (HTML/PDF/text), download flag.

## Trigger

The **Odoo Toolbox Trigger** polls for new or modified records:

- Watches any model for changes via `write_date`
- Configurable poll interval
- Domain filter support (watch only matching records)
- Field selection (control which fields are returned)
- Maintains state between polls (no duplicate events)

## Development

### Setup

```bash
git clone https://github.com/marcfargas/n8n-nodes-odoo.git
cd n8n-nodes-odoo
npm install
npm run build
```

### Testing

The project has a three-tier test strategy:

```bash
# Tier 1: Unit tests (mocked odoo-client, fast)
npm test

# Tier 2: Integration tests (real Odoo via testcontainers, needs Docker)
npm run test:integration

# Tier 3: E2E tests (real n8n + real Odoo via testcontainers)
npm run test:e2e
```

**Requirements:** Docker must be running for Tier 2 and Tier 3 tests. Integration tests spin up PostgreSQL + Odoo containers. E2E tests add an n8n container with the node installed.

### CI/CD

GitHub Actions runs on every push and PR to `main`:

1. **Build** — TypeScript compilation
2. **Unit Tests** — 69 tests, mocked dependencies
3. **Integration Tests** — 13 tests against real Odoo in Docker

### Project Structure

```
├── credentials/          # n8n credential type
│   └── OdooApi.credentials.ts
├── nodes/Odoo/           # Node implementation
│   ├── Odoo.node.ts              # Main node (6 resources)
│   ├── OdooTrigger.node.ts       # Polling trigger
│   ├── GenericFunctions.ts       # Client factory, domain/context parsers
│   └── descriptions/             # Resource/operation UI definitions
│       ├── RecordDescription.ts
│       ├── MethodDescription.ts
│       ├── MessageDescription.ts
│       ├── PropertyDescription.ts
│       ├── SchemaDescription.ts
│       └── UrlDescription.ts
├── tests/
│   ├── unit/                     # Tier 1: Pure unit tests
│   ├── integration/              # Tier 2: Real Odoo, mocked n8n
│   └── e2e/                      # Tier 3: Real n8n + real Odoo
│       ├── Dockerfile.n8n        # Custom n8n image with node installed
│       ├── globalSetup.ts        # Container orchestration
│       └── helpers/n8nApi.ts     # n8n REST/API client
└── .github/workflows/ci.yml     # CI pipeline
```

## Compatibility

- **n8n:** v1.0+ (tested with v2.11)
- **Odoo:** 15.0, 16.0, 17.0 (tested with 17.0)
- **Node.js:** 20+

## License

[MIT](LICENSE) © Marc Fargas

## Credits

- [@marcfargas/odoo-client](https://www.npmjs.com/package/@marcfargas/odoo-client) — Typed Odoo JSON-RPC client
- [@marcfargas/odoo-introspection](https://www.npmjs.com/package/@marcfargas/odoo-introspection) — Schema discovery and field metadata
- [n8n](https://n8n.io) — Workflow automation platform
