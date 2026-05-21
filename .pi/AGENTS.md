# @marcfargas/n8n-nodes-odoo

Custom n8n community node for Odoo ERP, powered by odoo-toolbox.

## Project Type
Standalone npm package (n8n community node).

## Dependencies
- `@marcfargas/odoo-client` — RPC client, services (mail, properties, etc.)
- `@marcfargas/odoo-introspection` — runtime schema discovery
- `n8n-workflow` — peer dependency (n8n types)
- `@n8n/node-cli` — dev tooling (build, lint, dev server)

## Architecture
- **Programmatic style** — Odoo uses JSON-RPC, not REST
- `GenericFunctions.ts` — thin adapter from n8n context → odoo-client
- `descriptions/` — n8n UI definitions per resource
- `Odoo.node.ts` — main node (Record, Method, Message, Property, Schema)
- `OdooTrigger.node.ts` — polling trigger (write_date-based)

## Conventions
- Follow n8n node coding patterns (see built-in nodes for reference)
- TypeScript strict mode
- Use n8n's error handling patterns (NodeOperationError, continueOnFail)
- All Odoo-specific logic delegates to odoo-client — no raw JSON-RPC here

## Testing
- `npm run dev` — starts n8n with the node loaded + hot reload
- Unit tests: mock odoo-client, test parameter parsing and error handling
- Integration tests: against a running Odoo instance (Docker)
