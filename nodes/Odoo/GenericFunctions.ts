/**
 * Thin adapter between n8n credential/execution context and odoo-client.
 *
 * Creates an OdooClient from n8n credentials, caches per execution,
 * and exposes the Introspector for dynamic UI (loadOptions).
 */
import type {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	IPollFunctions,
} from 'n8n-workflow';

import { OdooClient } from '@marcfargas/odoo-client';
import { Introspector } from '@marcfargas/odoo-introspection';

// ---------- helpers ----------

function resolveDb(db: string | undefined, url: string): string {
	if (db) return db;
	try {
		const hostname = new URL(url).hostname;
		return hostname.split('.')[0] || '';
	} catch {
		return '';
	}
}

/**
 * Build connection config from n8n credentials.
 */
function buildConfig(credentials: {
	url?: string;
	db?: string;
	username?: string;
	password?: string;
}) {
	const url = (credentials.url as string).replace(/\/$/, '');
	const db = resolveDb(credentials.db as string, url);
	const username = credentials.username as string;
	const password = credentials.password as string;
	return { url, db, username, password };
}

// ---------- client factory ----------

// WeakMap keyed on the n8n execution context — one client per execution.
const clientCache = new WeakMap<object, OdooClient>();

/**
 * Get or create an authenticated OdooClient for the current execution.
 *
 * The client is cached per execution (so multiple items share the same session).
 * On first call it authenticates; subsequent calls return the cached instance.
 */
export async function getClient(
	ctx: IExecuteFunctions | ILoadOptionsFunctions | IPollFunctions,
): Promise<OdooClient> {
	const existing = clientCache.get(ctx);
	if (existing) return existing;

	const credentials = await ctx.getCredentials('odooApi');
	const config = buildConfig(credentials);

	const client = new OdooClient({
		url: config.url,
		database: config.db,
		username: config.username,
		password: config.password,
	});
	await client.authenticate();

	clientCache.set(ctx, client);
	return client;
}

// ---------- introspector factory ----------

const introspectorCache = new WeakMap<OdooClient, Introspector>();

/**
 * Get an Introspector instance (cached per client).
 */
export function getIntrospector(client: OdooClient): Introspector {
	const existing = introspectorCache.get(client);
	if (existing) return existing;

	const introspector = new Introspector(client);
	introspectorCache.set(client, introspector);
	return introspector;
}

// ---------- domain parsing ----------

/**
 * Convert the n8n filter UI format to Odoo domain tuples.
 *
 * n8n's filter UI produces: { filter: [{ fieldName, operator, value }] }
 * Odoo expects: [['field', 'op', value], ...]
 */
export function buildDomain(
	filters?: { filter?: Array<{ fieldName: string; operator: string; value: string }> },
	domainJson?: string,
): any[] {
	const domain: any[] = [];

	// UI-built filters
	if (filters?.filter) {
		for (const f of filters.filter) {
			let value: any = f.value;
			// Try to parse as JSON for lists, numbers, booleans
			try {
				value = JSON.parse(value);
			} catch {
				// keep as string
			}
			domain.push([f.fieldName, f.operator, value]);
		}
	}

	// Raw domain JSON (takes precedence / merges)
	if (domainJson?.trim()) {
		try {
			const parsed = JSON.parse(domainJson);
			if (Array.isArray(parsed)) {
				domain.push(...parsed);
			}
		} catch {
			// ignore invalid JSON
		}
	}

	return domain;
}

/**
 * Parse context JSON string into an object.
 */
export function parseContext(contextJson?: string): Record<string, any> | undefined {
	if (!contextJson?.trim()) return undefined;
	try {
		return JSON.parse(contextJson);
	} catch {
		return undefined;
	}
}
