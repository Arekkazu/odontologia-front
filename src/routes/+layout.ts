import { redirect } from '@sveltejs/kit';
import type { LayoutLoad } from './$types';

const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:3000/api';

/**
 * Verifica si la sesión es válida realizando una llamada protegida.
 * Usa el endpoint de consultas porque requiere sesión según el backend.
 */
async function checkSession(fetch: Parameters<LayoutLoad>[0]['fetch']): Promise<boolean> {
	try {
		const resp = await fetch(`${API_BASE}/consultas`, {
			method: 'GET',
			headers: { Accept: 'application/json' },
			credentials: 'include' as RequestCredentials
		});
		return resp.ok;
	} catch {
		return false;
	}
}

export const load: LayoutLoad = async ({ fetch, url, depends }) => {
	depends('app:session');

	const isAuthRoute = url.pathname.startsWith('/auth');
	let isAuthenticated = false;

	if (!isAuthRoute) {
		isAuthenticated = await checkSession(fetch);
		if (!isAuthenticated) {
			throw redirect(302, '/auth');
		}
	}

	return { isAuthenticated, isAuthRoute };
};
