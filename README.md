# @marcfargas/n8n-nodes-odoo

Advanced Odoo node for [n8n](https://n8n.io) — schema-aware CRUD, method calls, chatter messaging, dynamic property fields, and polling triggers. Powered by [odoo-toolbox](https://github.com/marcfargas/odoo-toolbox).

## Why Another Odoo Node?

The built-in n8n Odoo node supports basic CRUD on 3 hardcoded models + a generic "Custom Resource". This node adds:

| Feature | Built-in | This node |
|---------|----------|-----------|
| CRUD on any model | ✓ (via Custom Resource) | ✓ (first-class) |
| **Method calls** (action_confirm, etc.) | ✗ | ✓ |
| **Chatter** (post notes/messages) | ✗ | ✓ |
| **Properties** (Odoo 17+ dynamic fields) | ✗ | ✓ |
| **Schema introspection** | ✗ | ✓ |
| **Polling trigger** | ✗ | ✓ |
| Dynamic model picker with metadata | Partial | ✓ |
| Typed field picker (type, required, relation) | ✗ | ✓ |
| Context support (lang, company, active_test) | ✗ | ✓ |
| Domain filters on all operations | Custom only | ✓ |
| Batch write/delete | ✗ | ✓ |
| Typed error handling | Generic | Auth/Validation/Access/Missing |
| AI agent compatible | ✓ | ✓ |

## Installation

### In n8n (community node)

1. Go to **Settings** → **Community Nodes**
2. Install: `@marcfargas/n8n-nodes-odoo`

### Manual (Docker/self-hosted)

```bash
cd ~/.n8n/nodes
npm install @marcfargas/n8n-nodes-odoo
# Restart n8n
```

## Configuration

Add Odoo credentials in n8n:

| Field | Description |
|-------|-------------|
| URL | Your Odoo instance URL (e.g., `https://mycompany.odoo.com`) |
| Database | Database name (auto-detected from URL if empty) |
| Username | Odoo user email |
| Password | Password or API key |

## Resources

### Record
Universal CRUD on any Odoo model:
- **Search** — with domain filters, field selection, ordering, pagination
- **Get** — by ID with field selection
- **Create** — via UI field picker or raw JSON
- **Update** — via UI field picker or raw JSON
- **Delete** — by ID
- **Count** — count matching records

### Method
Call any model method:
- `action_confirm`, `action_post`, `button_validate`, etc.
- Positional and keyword arguments
- Context support

### Message
Post to Odoo chatter (mail.thread):
- **Post Internal Note** — visible to internal users only
- **Post Message** — visible to all followers

### Property
Read and write Odoo 17+ dynamic property fields:
- **Get** — read current property values
- **Update** — safely update individual properties (read-modify-write pattern)

### Schema
Runtime introspection:
- **List Models** — all available models with metadata
- **Get Fields** — field name, type, required, readonly, relation, help text

## Trigger

The **Odoo Toolbox Trigger** polls for record changes:
- Watches any model for new/modified records
- Tracks `write_date` between polls
- Domain filter support
- Field selection

## Development

```bash
git clone https://github.com/marcfargas/n8n-nodes-odoo.git
cd n8n-nodes-odoo
npm install
npm run dev    # Starts n8n with node loaded + hot reload
```

## License

MIT

## Credits

Built on:
- [@marcfargas/odoo-client](https://www.npmjs.com/package/@marcfargas/odoo-client) — Odoo RPC client
- [@marcfargas/odoo-introspection](https://www.npmjs.com/package/@marcfargas/odoo-introspection) — Schema discovery
- [n8n](https://n8n.io) — Workflow automation platform
