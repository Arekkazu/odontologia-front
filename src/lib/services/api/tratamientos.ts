/**
 * Servicio de Tratamientos conectado al backend.
 *
 * Endpoints disponibles:
 * - POST /api/tratamientos - Crear tratamiento
 * - GET /api/tratamientos?consulta_id=X - Listar tratamientos de una consulta
 * - GET /api/tratamientos/con-pagos?consulta_id=X - Listar con info de pagos
 * - GET /api/tratamientos/:id - Ver detalle de tratamiento
 * - PUT /api/tratamientos/:id - Actualizar tratamiento (incluyendo estado)
 * - DELETE /api/tratamientos/:id - Eliminar tratamiento
 *
 * Estados posibles:
 * - "propuesto" - Tratamiento sugerido, paciente aún no acepta
 * - "aceptado" - Paciente aceptó el tratamiento
 * - "en_curso" - Tratamiento en progreso
 * - "finalizado" - Tratamiento completado
 * - "cancelado" - Tratamiento cancelado
 */
import { apiClient } from './http';

export type EstadoTratamiento = 'propuesto' | 'aceptado' | 'en_curso' | 'finalizado' | 'cancelado';

export interface Tratamiento {
	id: number;
	consulta_id: number;
	descripcion: string;
	fecha_inicio?: string | null; // date (YYYY-MM-DD)
	fecha_fin?: string | null; // date (YYYY-MM-DD)
	costo_total: number;
	estado: EstadoTratamiento;
}

export interface TratamientoConPagos extends Tratamiento {
	total_pagado: number; // Calculado por el backend
	saldo_pendiente: number; // Calculado por el backend
}

export interface CreateTratamientoInput {
	consulta_id: number;
	descripcion: string;
	costo_total: number;
	fecha_inicio?: string; // date (YYYY-MM-DD)
	fecha_fin?: string; // date (YYYY-MM-DD)
	estado?: EstadoTratamiento; // Opcional, default "propuesto"
}

export interface UpdateTratamientoInput {
	descripcion?: string;
	costo_total?: number;
	fecha_inicio?: string | null;
	fecha_fin?: string | null;
	estado?: EstadoTratamiento;
}

/* -------------------------------------------------------------------------- */
/*                                Helpers                                     */
/* -------------------------------------------------------------------------- */

function unwrapPayload<T>(value: unknown): T {
	if (typeof value === 'object' && value !== null && 'data' in (value as Record<string, unknown>)) {
		return (value as Record<string, unknown>).data as T;
	}
	return value as T;
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

/**
 * Crear un nuevo tratamiento
 */
export async function createTratamiento(input: CreateTratamientoInput): Promise<Tratamiento> {
	const resp = await apiClient.post<Tratamiento>('tratamientos', input);
	if (!resp.ok) {
		throw errorFromResponse(resp, 'No se pudo crear el tratamiento');
	}
	return unwrapPayload<Tratamiento>(resp.data);
}

/**
 * Obtener detalle de un tratamiento
 */
export async function getTratamiento(id: number): Promise<Tratamiento> {
	const resp = await apiClient.get<Tratamiento>(`tratamientos/${id}`);
	if (!resp.ok) {
		throw errorFromResponse(resp, `Tratamiento ${id} no encontrado`);
	}
	return unwrapPayload<Tratamiento>(resp.data);
}

/**
 * Actualizar un tratamiento (incluyendo cambio de estado)
 */
export async function updateTratamiento(
	id: number,
	input: UpdateTratamientoInput
): Promise<Tratamiento> {
	const resp = await apiClient.put<Tratamiento>(`tratamientos/${id}`, input);
	if (!resp.ok) {
		throw errorFromResponse(resp, `No se pudo actualizar el tratamiento ${id}`);
	}
	return unwrapPayload<Tratamiento>(resp.data);
}

/**
 * Eliminar un tratamiento
 */
export async function deleteTratamiento(id: number): Promise<void> {
	const resp = await apiClient.delete(`tratamientos/${id}`);
	if (!resp.ok) {
		throw errorFromResponse(resp, `No se pudo eliminar el tratamiento ${id}`);
	}
}

/* -------------------------------------------------------------------------- */
/*                                Listados                                    */
/* -------------------------------------------------------------------------- */

/**
 * Listar tratamientos de una consulta
 */
export async function listTratamientosByConsulta(consulta_id: number): Promise<Tratamiento[]> {
	const resp = await apiClient.get<Tratamiento[]>(`tratamientos?consulta_id=${consulta_id}`);
	if (!resp.ok) {
		console.error('Error listando tratamientos:', resp);
		return [];
	}
	return ensureArray<Tratamiento>(resp.data);
}

/**
 * Listar tratamientos de una consulta CON información de pagos
 * (total_pagado y saldo_pendiente calculados por el backend)
 */
export async function listTratamientosConPagosByConsulta(
	consulta_id: number
): Promise<TratamientoConPagos[]> {
	const resp = await apiClient.get<TratamientoConPagos[]>(
		`tratamientos/con-pagos?consulta_id=${consulta_id}`
	);
	if (!resp.ok) {
		console.error('Error listando tratamientos con pagos:', resp);
		return [];
	}
	return ensureArray<TratamientoConPagos>(resp.data);
}

/* -------------------------------------------------------------------------- */
/*                          Helpers de estado                                 */
/* -------------------------------------------------------------------------- */

/**
 * Obtener el texto legible de un estado
 */
export function getEstadoLabel(estado: EstadoTratamiento): string {
	const labels: Record<EstadoTratamiento, string> = {
		propuesto: 'Propuesto',
		aceptado: 'Aceptado',
		en_curso: 'En curso',
		finalizado: 'Finalizado',
		cancelado: 'Cancelado'
	};
	return labels[estado] || estado;
}

/**
 * Obtener la variante del badge según el estado
 */
export function getEstadoBadgeVariant(
	estado: EstadoTratamiento
): 'success' | 'warning' | 'info' | 'error' | 'neutral' {
	const variants: Record<EstadoTratamiento, 'success' | 'warning' | 'info' | 'error' | 'neutral'> =
		{
			propuesto: 'neutral',
			aceptado: 'info',
			en_curso: 'warning',
			finalizado: 'success',
			cancelado: 'error'
		};
	return variants[estado] || 'neutral';
}

/**
 * Cambiar el estado de un tratamiento
 */
export async function cambiarEstadoTratamiento(
	id: number,
	nuevoEstado: EstadoTratamiento
): Promise<Tratamiento> {
	return updateTratamiento(id, { estado: nuevoEstado });
}
