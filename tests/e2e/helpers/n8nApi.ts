/**
 * n8n REST API helper for E2E tests.
 *
 * Wraps n8n's public API for creating credentials, workflows,
 * and executing workflows programmatically.
 *
 * Assumes N8N_USER_MANAGEMENT_DISABLED=true (no auth required).
 */

export class N8nApi {
	constructor(private baseUrl: string) {}

	private async request<T = any>(
		method: string,
		path: string,
		body?: any,
	): Promise<T> {
		const res = await fetch(`${this.baseUrl}${path}`, {
			method,
			headers: { 'Content-Type': 'application/json' },
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
		const result = await this.request('POST', '/api/v1/credentials', {
			name,
			type: 'odooApi',
			data,
		});
		return result.id;
	}

	/**
	 * Create a workflow from a definition object.
	 * Returns the workflow ID.
	 */
	async createWorkflow(workflow: any): Promise<string> {
		const result = await this.request('POST', '/api/v1/workflows', workflow);
		return result.id;
	}

	/**
	 * Activate a workflow.
	 */
	async activateWorkflow(id: string): Promise<void> {
		await this.request('PATCH', `/api/v1/workflows/${id}`, { active: true });
	}

	/**
	 * Execute a workflow and return the execution data.
	 *
	 * Note: This uses the internal /rest endpoint since the public API
	 * doesn't have a direct "run workflow" endpoint in all versions.
	 */
	async executeWorkflow(id: string): Promise<any> {
		// Try the internal endpoint first (works with user management disabled)
		try {
			return await this.request('POST', `/rest/workflows/${id}/run`, {
				startNodes: [],
				destinationNode: '',
				runData: {},
			});
		} catch {
			// Fallback: public API test endpoint
			return this.request('POST', `/api/v1/workflows/${id}/run`);
		}
	}

	/**
	 * Get execution details by ID.
	 */
	async getExecution(id: string): Promise<any> {
		return this.request('GET', `/api/v1/executions/${id}`);
	}

	/**
	 * List recent executions.
	 */
	async listExecutions(limit = 10): Promise<any[]> {
		const result = await this.request(
			'GET',
			`/api/v1/executions?limit=${limit}`,
		);
		return result.data || [];
	}

	/**
	 * Delete a workflow.
	 */
	async deleteWorkflow(id: string): Promise<void> {
		await this.request('DELETE', `/api/v1/workflows/${id}`);
	}

	/**
	 * Delete a credential.
	 */
	async deleteCredential(id: string): Promise<void> {
		await this.request('DELETE', `/api/v1/credentials/${id}`);
	}
}
