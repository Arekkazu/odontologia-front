import type { PageLoad } from './$types';
import type { Paciente } from '$lib/services/api/pacientes';

const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:3000/api';
const PATIENT_URL = API_BASE.endsWith('/') ? `${API_BASE}patient` : `${API_BASE}/patient`;

export const ssr = false; // client-side fetch to include session cookie

type ApiWrapper<T> = {
	ok?: boolean;
	message?: string;
	data?: T;
};

/**
 * Type guard: checks whether a value is an array of unknown items.
 */
function isUnknownArray(v: unknown): v is unknown[] {
	return Array.isArray(v);
}

/**
 * Try to extract an array value from a possibly wrapped API response.
 * Supports:
 * - plain array: [ ... ]
 * - wrapper: { ok, message, data: [...] }
 * - wrapper with array at any object key (heuristic)
 */
function extractArrayFromBody<T>(body: unknown): T[] | null {
	// plain array
	if (isUnknownArray(body)) return body as T[];

	// object wrapper
	if (typeof body === 'object' && body !== null) {
		const wrapped = body as ApiWrapper<unknown>;

		if (isUnknownArray(wrapped.data)) return wrapped.data as T[];

		// defensive: find first array value on the object
		const vals = Object.values(wrapped);
		for (const v of vals) {
			if (isUnknownArray(v)) return v as T[];
		}
	}

	return null;
}

export const load: PageLoad = async ({ fetch }) => {
	try {
		const resp = await fetch(PATIENT_URL, { credentials: 'include' });

		// Try to parse body as JSON; if parsing fails, treat body as null
		let body: unknown = null;
		try {
			body = await resp.json();
		} catch {
			// Non-JSON response (keep body as null)
			body = null;
		}

		// If response is an HTTP error, try to surface a useful message
		if (!resp.ok) {
			// If wrapper contains a message, use it; otherwise fallback to status text
			if (
				typeof body === 'object' &&
				body !== null &&
				'message' in (body as Record<string, unknown>)
			) {
				const msg = (body as Record<string, unknown>).message;
				return {
					pacientes: [],
					error: typeof msg === 'string' ? msg : String(msg ?? `HTTP ${resp.status}`)
				};
			}
			return { pacientes: [], error: `Error cargando pacientes (status ${resp.status})` };
		}

		// resp.ok === true
		const pacientesFromBody = extractArrayFromBody<Paciente>(body);
		if (pacientesFromBody !== null) {
			return { pacientes: pacientesFromBody };
		}

		// Nothing found in body: return empty list and provide message if available
		if (
			typeof body === 'object' &&
			body !== null &&
			'message' in (body as Record<string, unknown>)
		) {
			const msg = (body as Record<string, unknown>).message;
			return { pacientes: [], error: typeof msg === 'string' ? msg : String(msg ?? null) };
		}

		// No useful data found, but request succeeded — return empty list
		return { pacientes: [] };
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Error cargando pacientes';
		return { pacientes: [], error: message };
	}
};
