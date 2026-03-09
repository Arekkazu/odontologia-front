/**
 * Cliente HTTP compartido para hablar con el backend con cookies de sesión.
 * - Usa `credentials: 'include'` para enviar la cookie `connect.sid`.
 * - Expone helpers para /auth y /api.
 * - Permite agregar query params y tipar respuestas.
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface RequestOptions extends RequestInit {
	method?: HttpMethod;
	query?: Record<string, string | number | boolean | undefined | null>;
	json?: unknown; // cuerpo que se serializa a JSON automáticamente
	skipAuth?: boolean; // si true, no agrega credentials (por ejemplo para assets públicos)
}

export interface ApiResponse<T> {
	ok: boolean;
	status: number;
	data: T;
	raw: Response;
}

/** Construye una URL con base y query params */
function buildUrl(base: string, path: string, query?: RequestOptions['query']): string {
	// Remover el slash inicial del path si existe para evitar que sea tratado como absoluto
	const cleanPath = path.startsWith('/') ? path.slice(1) : path;
	const cleanBase = base.endsWith('/') ? base : `${base}/`;
	const url = new URL(cleanPath, cleanBase);
	if (query) {
		Object.entries(query).forEach(([key, value]) => {
			if (value === undefined || value === null) return;
			url.searchParams.set(key, String(value));
		});
	}
	return url.toString();
}

/** Deducción de base URLs */
const AUTH_BASE = import.meta.env.VITE_AUTH_BASE ?? 'http://localhost:3000/auth';
const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:3000/api';

export class ApiClient {
	private base: string;

	constructor(base: string) {
		this.base = base;
	}

	async request<T = unknown>(path: string, opts: RequestOptions = {}): Promise<ApiResponse<T>> {
		const { method = 'GET', query, json, headers, skipAuth = false, ...rest } = opts;

		const url = buildUrl(this.base, path, query);

		const init: RequestInit = {
			method,
			...rest,
			credentials: skipAuth ? 'omit' : 'include'
		};

		const finalHeaders: HeadersInit = {
			Accept: 'application/json',
			...(json !== undefined ? { 'Content-Type': 'application/json' } : {}),
			...headers
		};
		init.headers = finalHeaders;

		if (json !== undefined) {
			init.body = JSON.stringify(json);
		}

		const resp = await fetch(url, init);
		const contentType = resp.headers.get('content-type') || '';
		const isJson = contentType.includes('application/json');

		let data: unknown = null;
		if (isJson) {
			try {
				data = await resp.json();
			} catch {
				data = null;
			}
		} else {
			data = await resp.text();
		}

		return { ok: resp.ok, status: resp.status, data: data as T, raw: resp };
	}

	get<T = unknown>(path: string, options?: Omit<RequestOptions, 'method' | 'json'>) {
		return this.request<T>(path, { ...options, method: 'GET' });
	}

	post<T = unknown>(
		path: string,
		json?: unknown,
		options?: Omit<RequestOptions, 'method' | 'json'>
	) {
		return this.request<T>(path, { ...options, method: 'POST', json });
	}

	put<T = unknown>(
		path: string,
		json?: unknown,
		options?: Omit<RequestOptions, 'method' | 'json'>
	) {
		return this.request<T>(path, { ...options, method: 'PUT', json });
	}

	patch<T = unknown>(
		path: string,
		json?: unknown,
		options?: Omit<RequestOptions, 'method' | 'json'>
	) {
		return this.request<T>(path, { ...options, method: 'PATCH', json });
	}

	delete<T = unknown>(path: string, options?: Omit<RequestOptions, 'method' | 'json'>) {
		return this.request<T>(path, { ...options, method: 'DELETE' });
	}
}

/**
 * Clientes listos para usar:
 * - authClient: para /auth (login/logout)
 * - apiClient: para /api (rutas protegidas)
 */
export const authClient = new ApiClient(AUTH_BASE);
export const apiClient = new ApiClient(API_BASE);
