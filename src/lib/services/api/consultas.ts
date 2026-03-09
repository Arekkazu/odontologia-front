/**
 * Servicio de Consultas conectado al backend.
 * Endpoints según infobackend.md:
 * - POST /api/consultas
 * - GET  /api/consultas
 * - GET  /api/consultas/:id
 * - PUT  /api/consultas/:id
 * - DELETE /api/consultas/:id
 *
 * Todas las llamadas usan cookies de sesión vía apiClient (credentials: "include").
 */
import { apiClient } from './http';

export interface ResumenFinanciero {
	costo_total: number;
	total_pagado: number;
	saldo_pendiente: number;
	tratamientos_count: number;
}

export interface Consulta {
	id: number;
	paciente_id: number;
	motivo: string;
	diagnostico: string;
	fecha_consulta?: string; // datetime ISO
	observaciones?: string | null;
	resumen_financiero?: ResumenFinanciero; // Nuevo: Resumen automático del backend
}

export interface CreateConsultaInput {
	paciente_id: number;
	motivo: string;
	diagnostico: string;
	fecha_consulta?: string;
	observaciones?: string | null;
}

export interface UpdateConsultaInput {
	motivo?: string;
	diagnostico?: string;
	fecha_consulta?: string;
	observaciones?: string | null;
}

function ensureArray<T>(val: unknown): T[] {
	if (Array.isArray(val)) return val as T[];
	if (typeof val === 'object' && val !== null) {
		const wrapped = val as Record<string, unknown>;
		if (Array.isArray(wrapped.data)) return wrapped.data as T[];
		for (const entry of Object.values(wrapped)) {
			if (Array.isArray(entry)) return entry as T[];
		}
	}
	return [];
}

/**
 * Unwraps API responses that come in the format: {ok, message, data: T}
 * Returns the inner data field if present, otherwise returns the value as-is.
 */
function unwrapPayload<T>(value: unknown): T {
	if (typeof value === 'object' && value !== null && 'data' in (value as Record<string, unknown>)) {
		return (value as Record<string, unknown>).data as T;
	}
	return value as T;
}

function errorFromResponse(resp: { data: unknown; status: number }, fallback: string): Error {
	if (
		typeof resp.data === 'object' &&
		resp.data !== null &&
		'message' in (resp.data as Record<string, unknown>)
	) {
		return new Error(String((resp.data as Record<string, unknown>).message));
	}
	return new Error(`${fallback} (status ${resp.status})`);
}

/* -------------------------------------------------------------------------- */
/*                                   CRUD                                     */
/* -------------------------------------------------------------------------- */

export async function createConsulta(input: CreateConsultaInput): Promise<Consulta> {
	const resp = await apiClient.post<Consulta>('consultas', input);
	if (!resp.ok) {
		throw errorFromResponse(resp, 'No se pudo crear la consulta');
	}
	return unwrapPayload<Consulta>(resp.data);
}

export async function getConsulta(id: number): Promise<Consulta> {
	const resp = await apiClient.get<Consulta>(`consultas/${id}`);
	if (!resp.ok) {
		throw errorFromResponse(resp, `Consulta ${id} no encontrada`);
	}
	return unwrapPayload<Consulta>(resp.data);
}

export async function updateConsulta(id: number, input: UpdateConsultaInput): Promise<Consulta> {
	const resp = await apiClient.put<Consulta>(`consultas/${id}`, input);
	if (!resp.ok) {
		throw errorFromResponse(resp, `No se pudo actualizar la consulta ${id}`);
	}
	return unwrapPayload<Consulta>(resp.data);
}

export async function deleteConsulta(id: number): Promise<void> {
	const resp = await apiClient.delete(`consultas/${id}`);
	if (!resp.ok) {
		throw errorFromResponse(resp, `No se pudo eliminar la consulta ${id}`);
	}
}

/* -------------------------------------------------------------------------- */
/*                                Listados                                    */
/* -------------------------------------------------------------------------- */

export async function listConsultas(): Promise<Consulta[]> {
	const resp = await apiClient.get<Consulta[]>('consultas');
	if (!resp.ok) return [];
	return ensureArray<Consulta>(resp.data);
}

export async function listConsultasByPaciente(paciente_id: number): Promise<Consulta[]> {
	const all = await listConsultas();
	return all.filter((c) => c.paciente_id === paciente_id);
}

/**
 * Búsqueda simple en cliente (filtra sobre el resultado de listConsultas).
 * Para grandes volúmenes se debería implementar en backend.
 */
export async function searchConsultas(params: {
	searchText?: string;
	paciente_id?: number;
	desde?: string;
	hasta?: string;
	ordenar?: 'reciente' | 'antiguo' | 'paciente';
}): Promise<Consulta[]> {
	let results = await listConsultas();

	if (params.searchText) {
		const q = params.searchText.toLowerCase();
		results = results.filter(
			(c) =>
				String(c.id).includes(q) ||
				c.motivo?.toLowerCase().includes(q) ||
				c.diagnostico?.toLowerCase().includes(q) ||
				c.observaciones?.toLowerCase().includes(q)
		);
	}

	if (params.paciente_id) {
		results = results.filter((c) => c.paciente_id === params.paciente_id);
	}

	if (params.desde) {
		const d = new Date(params.desde).getTime();
		results = results.filter((c) => new Date(c.fecha_consulta ?? '').getTime() >= d);
	}
	if (params.hasta) {
		const d = new Date(params.hasta).getTime();
		results = results.filter((c) => new Date(c.fecha_consulta ?? '').getTime() <= d);
	}

	const orden = params.ordenar ?? 'reciente';
	if (orden === 'reciente') {
		results.sort(
			(a, b) =>
				new Date(b.fecha_consulta ?? '').getTime() - new Date(a.fecha_consulta ?? '').getTime()
		);
	} else if (orden === 'antiguo') {
		results.sort(
			(a, b) =>
				new Date(a.fecha_consulta ?? '').getTime() - new Date(b.fecha_consulta ?? '').getTime()
		);
	} else if (orden === 'paciente') {
		results.sort((a, b) => a.paciente_id - b.paciente_id);
	}

	return results;
}
