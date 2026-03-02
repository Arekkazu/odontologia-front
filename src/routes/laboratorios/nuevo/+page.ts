import type { PageLoad } from './$types';
import type { Laboratorio } from '$lib/services/api/laboratorios';

const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:3000/api';
const LABS_URL = API_BASE.endsWith('/') ? `${API_BASE}laboratorios` : `${API_BASE}/laboratorios`;

export const ssr = false; // client-side fetch to include session cookie

function isArrayUnknown(v: unknown): v is unknown[] {
	return Array.isArray(v);
}

/**
 * Try to extract an array of T from a possibly wrapped body:
 * - plain array: [ ... ]
 * - wrapper: { ok, message, data: [...] }
 * - defensive: first array found among object values
 */
function extractArrayFromBody<T>(body: unknown): T[] | null {
	if (isArrayUnknown(body)) return body as T[];

	if (typeof body === 'object' && body !== null) {
		const wrapped = body as Record<string, unknown>;
		if (isArrayUnknown(wrapped.data)) return wrapped.data as T[];

		// defensive: find first array among values
		const vals = Object.values(wrapped);
		for (const v of vals) {
			if (isArrayUnknown(v)) return v as T[];
		}
	}

	return null;
}

export const load: PageLoad = async ({ fetch }) => {
	try {
		const resp = await fetch(LABS_URL, { credentials: 'include' });

		// Try parse body as JSON; if not JSON, set body = null
		let body: unknown = null;
		try {
			body = await resp.json();
		} catch {
			body = null;
		}

		if (!resp.ok) {
			const message =
				typeof body === 'object' && body !== null && 'message' in (body as Record<string, unknown>)
					? String((body as Record<string, unknown>).message)
					: `Error cargando laboratorios (status ${resp.status})`;
			return { labs: [], error: message };
		}

		const labs = extractArrayFromBody<Laboratorio>(body);
		if (labs !== null) {
			return { labs };
		}

		// If resp.ok but no array found, try fallback: if body is an object that looks like a single lab, wrap it.
		if (body && typeof body === 'object' && 'id' in (body as Record<string, unknown>)) {
			return { labs: [body as Laboratorio] };
		}

		// Nothing useful found
		return { labs: [] };
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Error cargando laboratorios';
		return { labs: [], error: message };
	}
};
