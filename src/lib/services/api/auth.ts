import { authClient, type ApiResponse } from './http';
import { horario } from '$lib/stores/horario';

export interface AuthUser {
	username: string;
	role?: string;
}

export interface LoginResult {
	message: string;
	data: AuthUser;
}

export interface AuthState {
	user: AuthUser;
}

function buildError(resp: ApiResponse<unknown>, fallback = 'Error de autenticación'): Error {
	if (typeof resp.data === 'object' && resp.data !== null && 'message' in (resp.data as any)) {
		return new Error(String((resp.data as any).message));
	}
	return new Error(`${fallback} (status ${resp.status})`);
}

/**
 * Inicia sesión contra POST /auth/login
 * Envía credenciales y espera cookie de sesión (connect.sid).
 * Usa credentials: "include" por defecto en authClient.
 */
export async function login(username: string, password: string): Promise<AuthState> {
	const resp = await authClient.post<LoginResult>('login', { username, password });
	if (!resp.ok) {
		throw buildError(resp, 'No se pudo iniciar sesión');
	}
	const payload = resp.data;
	if (!payload || typeof payload !== 'object' || !('data' in payload)) {
		throw new Error('Respuesta inesperada del servidor');
	}

	// Iniciar el cronómetro de horario al hacer login
	horario.iniciar();

	return { user: (payload as LoginResult).data };
}

/**
 * Cierra sesión contra POST /auth/logout
 */
export async function logout(): Promise<boolean> {
	const resp = await authClient.post<{ message?: string }>('/logout', {});
	if (!resp.ok) {
		throw buildError(resp, 'No se pudo cerrar sesión');
	}

	// Detener el cronómetro de horario al hacer logout
	horario.detener();

	return true;
}
