/**
 * n8n REST API helper for E2E tests.
 *
 * Handles the full n8n initialization flow:
 *   1. Create owner account (POST /rest/owner/setup)
 *   2. Login to get session cookie (POST /rest/login)
 *   3. Create API key with cookie auth (POST /rest/api-keys)
 *   4. Use API key for all subsequent public API calls
 *
 * The public API (/api/v1/*) requires an X-N8N-API-KEY header.
 * The internal API (/rest/*) requires a session cookie.
 */

export class N8nApi {
	private apiKey?: string;
	private sessionCookie?: string;

	constructor(private baseUrl: string) {}

	// --------------- Internal request helpers ---------------

	/**
	 * Request against /api/v1/* using X-N8N-API-KEY header.
	 */
	private async apiRequest<T = any>(
		method: string,
		path: string,
		body?: any,
	): Promise<T> {
		if (!this.apiKey) {
			throw new Error('API key not set — call initialize() first');
		}

		const res = await fetch(`${this.baseUrl}${path}`, {
			method,
			headers: {
				'Content-Type': 'application/json',
				'X-N8N-API-KEY': this.apiKey,
			},
			body: body ? JSON.stringify(body) : undefined,
		});

		const text = await res.text();
		if (!res.ok) {
			throw new Error(
				`n8n API ${method} ${path} → ${res.status}: ${text.slice(0, 500)}`,
			);
		}

		return text ? JSON.parse(text) : ({} as T);
	}

	/**
	 * Request against /rest/* using session cookie.
	 */
	private async restRequest<T = any>(
		method: string,
		path: string,
		body?: any,
	): Promise<T> {
		const headers: Record<string, string> = {
			'Content-Type': 'application/json',
		};
		if (this.sessionCookie) {
			headers['Cookie'] = this.sessionCookie;
		}

		const res = await fetch(`${this.baseUrl}${path}`, {
			method,
			headers,
			body: body ? JSON.stringify(body) : undefined,
		});

		const text = await res.text();
		if (!res.ok) {
			throw new Error(
				`n8n REST ${method} ${path} → ${res.status}: ${text.slice(0, 500)}`,
			);
		}

		if (!text) return {} as T;

		try {
			return JSON.parse(text);
		} catch {
			throw new Error(
				`n8n REST ${method} ${path} returned non-JSON (${res.status}): ${text.slice(0, 300)}`,
			);
		}
	}

	// --------------- Setup ---------------

	/**
	 * Wait for n8n to become ready (healthz endpoint).
	 */
	async waitForReady(timeoutMs = 30_000): Promise<void> {
		const deadline = Date.now() + timeoutMs;
		while (Date.now() < deadline) {
			try {
				const res = await fetch(`${this.baseUrl}/healthz`);
				if (res.ok) return;
			} catch {
				// not ready yet
			}
			await new Promise((r) => setTimeout(r, 1000));
		}
		throw new Error(`n8n did not become ready within ${timeoutMs}ms`);
	}

	/**
	 * Wait for n8n to be fully ready (not just healthz, but REST API responding with JSON).
	 */
	private async waitForRestReady(timeoutMs = 60_000): Promise<void> {
		const deadline = Date.now() + timeoutMs;
		while (Date.now() < deadline) {
			try {
				const res = await fetch(`${this.baseUrl}/rest/settings`);
				if (res.ok) {
					const text = await res.text();
					// n8n returns plain text "n8n is starting up" before it's fully ready
					if (text.startsWith('{')) return;
				}
			} catch {
				// not ready yet
			}
			await new Promise((r) => setTimeout(r, 1000));
		}
		throw new Error(`n8n REST API did not become ready within ${timeoutMs}ms`);
	}

	/**
	 * Full n8n initialization: create owner → login → create API key.
	 *
	 * Must be called once before any API operations.
	 */
	async initialize(): Promise<void> {
		// Wait for REST API to be fully ready (healthz passes before REST does)
		await this.waitForRestReady();

		// 1. Create owner account
		const ownerResult = await this.restRequest('POST', '/rest/owner/setup', {
			email: 'admin@e2e.test',
			password: 'E2eTestPass1!',
			firstName: 'E2E',
			lastName: 'Admin',
		});

		// 2. Login to get session cookie
		const loginRes = await fetch(`${this.baseUrl}/rest/login`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				emailOrLdapLoginId: 'admin@e2e.test',
				password: 'E2eTestPass1!',
			}),
		});

		if (!loginRes.ok) {
			const text = await loginRes.text();
			throw new Error(`n8n login failed: ${loginRes.status}: ${text.slice(0, 300)}`);
		}

		// Extract session cookie from Set-Cookie header
		const setCookie = loginRes.headers.get('set-cookie');
		if (!setCookie) {
			throw new Error('No Set-Cookie header in login response');
		}
		// Extract just the n8n-auth=... part
		const match = setCookie.match(/n8n-auth=[^;]+/);
		if (!match) {
			throw new Error(`No n8n-auth cookie found in: ${setCookie.slice(0, 200)}`);
		}
		this.sessionCookie = match[0];

		// 3. Create API key (1 year expiry)
		const expiresAt = Date.now() + 365 * 24 * 60 * 60 * 1000;
		const keyResult = await this.restRequest('POST', '/rest/api-keys', {
			label: 'e2e-test',
			expiresAt,
			scopes: [
				'credential:create',
				'credential:read',
				'credential:update',
				'credential:delete',
				'workflow:create',
				'workflow:read',
				'workflow:update',
				'workflow:delete',
				'workflow:activate',
				'workflow:deactivate',
				'execution:read',
				'execution:list',
			],
		});

		this.apiKey = keyResult?.data?.rawApiKey;
		if (!this.apiKey) {
			throw new Error(
				`Failed to extract API key from response: ${JSON.stringify(keyResult).slice(0, 300)}`,
			);
		}
	}

	// --------------- Credentials ---------------

	/**
	 * Create an Odoo API credential.
	 * Returns the credential ID.
	 */
	async createOdooCredential(
		name: string,
		data: {
			url: string;
			db: string;
			username: string;
			password: string;
		},
	): Promise<string> {
		const result = await this.apiRequest('POST', '/api/v1/credentials', {
			name,
			type: 'odooApi',
			data,
		});
		return result.id;
	}

	/**
	 * Delete a credential.
	 */
	async deleteCredential(id: string): Promise<void> {
		await this.apiRequest('DELETE', `/api/v1/credentials/${id}`);
	}

	// --------------- Workflows ---------------

	/**
	 * Create a workflow from a definition object.
	 * Returns the workflow ID.
	 */
	async createWorkflow(workflow: any): Promise<string> {
		const result = await this.apiRequest('POST', '/api/v1/workflows', workflow);
		return result.id;
	}

	/**
	 * Activate a workflow.
	 */
	async activateWorkflow(id: string): Promise<void> {
		await this.apiRequest('PATCH', `/api/v1/workflows/${id}`, {
			active: true,
		});
	}

	/**
	 * Execute a workflow via the internal REST endpoint (uses session cookie).
	 *
	 * The public API does not have a workflow execution endpoint in current n8n versions.
	 * The internal REST endpoint requires session cookie auth (set during initialize()).
	 */
	async executeWorkflow(id: string): Promise<any> {
		// Must activate the workflow first, then trigger via test webhook or manual run
		// The /rest/workflows/:id/run endpoint is the internal "manual execution" endpoint
		return this.restRequest('POST', `/rest/workflows/${id}/run`, {
			startNodes: [],
			destinationNode: '',
			runData: {},
		});
	}

	/**
	 * Delete a workflow.
	 */
	async deleteWorkflow(id: string): Promise<void> {
		await this.apiRequest('DELETE', `/api/v1/workflows/${id}`);
	}

	// --------------- Executions ---------------

	/**
	 * Get execution details by ID, including full data (runData per node).
	 */
	async getExecution(id: string): Promise<any> {
		return this.apiRequest('GET', `/api/v1/executions/${id}?includeData=true`);
	}

	/**
	 * List recent executions.
	 */
	async listExecutions(limit = 10): Promise<any[]> {
		const result = await this.apiRequest(
			'GET',
			`/api/v1/executions?limit=${limit}`,
		);
		return result.data || [];
	}
}
