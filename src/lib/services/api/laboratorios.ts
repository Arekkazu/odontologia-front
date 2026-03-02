/**
 * Servicio para Laboratorios y Trabajos de Laboratorio conectado al backend.
 * Endpoints según infobackend.md:
 * - Laboratorios:
 *   - POST   /api/laboratorios
 *   - GET    /api/laboratorios
 *   - GET    /api/laboratorios/:id
 *   - PUT    /api/laboratorios/:id
 *   - DELETE /api/laboratorios/:id
 * - Trabajos de laboratorio:
 *   - POST   /api/trabajos-laboratorio
 *   - GET    /api/trabajos-laboratorio
 *   - GET    /api/trabajos-laboratorio/:id
 *   - PATCH  /api/trabajos-laboratorio/:id
 *
 * Todas las llamadas usan cookies de sesión vía apiClient (credentials: "include").
 */
import { apiClient } from './http';

/* -------------------------------------------------------------------------- */
/*                                   Tipos                                    */
/* -------------------------------------------------------------------------- */

export interface Laboratorio {
	id: number;
	nombre: string;
	direccion?: string | null;
	telefono?: string | null;
	email?: string | null;
	activo?: boolean | null;
	tiempo_estimado_dias?: number | null;
}

export interface CreateLaboratorioInput {
	nombre: string;
	direccion?: string | null;
	telefono?: string | null;
	email?: string | null;
	activo?: boolean | null;
	tiempo_estimado_dias?: number | null;
}

export interface UpdateLaboratorioInput {
	nombre?: string;
	direccion?: string | null;
	telefono?: string | null;
	email?: string | null;
	activo?: boolean | null;
	tiempo_estimado_dias?: number | null;
}

/**
 * Estados conocidos para trabajos de laboratorio.
 * Se amplía para cubrir variantes usadas en la UI y en el backend.
 */
export type TrabajoEstado =
	| 'SOLICITADO'
	| 'ENVIADO'
	| 'RECIBIDO'
	| 'ENTREGADO'
	| 'CREADO'
	| 'EN_PROCESO'
	| 'LISTO'
	| 'CANCELADO'
	| 'REHACER';

export interface TrabajoLaboratorio {
	id: number;
	laboratorio_id: number;
	consulta_id?: number | null;
	descripcion?: string | null;
	estado: TrabajoEstado;
	fecha_solicitud?: string | null; // YYYY-MM-DD
	fecha_recepcion?: string | null; // YYYY-MM-DD
	fecha_entrega_paciente?: string | null; // YYYY-MM-DD
}

/**
 * Input legacy / internal used in some helpers. Dates as YYYY-MM-DD strings.
 */
export interface CreateTrabajoInput {
	laboratorio_id: number;
	consulta_id?: number | null;
	descripcion?: string | null;
	estado: TrabajoEstado;
	fecha_recepcion?: string | null;
	fecha_entrega_paciente?: string | null;
}

export interface UpdateTrabajoInput {
	laboratorio_id?: number;
	consulta_id?: number | null;
	descripcion?: string | null;
	estado?: TrabajoEstado;
	fecha_recepcion?: string | null;
	fecha_entrega_paciente?: string | null;
}

/**
 * DTO esperado por el front-end para crear un Trabajo de Laboratorio.
 * (Tal como lo proporcionaste)
 */
export interface TrabajoLaboratorioCreateDto {
	laboratorio_id: number;
	consulta_id?: number;
	descripcion?: string;
	estado: TrabajoEstado;
	fecha_recepcion?: Date;
	fecha_entrega_paciente?: Date;
}

/* -------------------------------------------------------------------------- */
/*                               Utilidades                                   */
/* -------------------------------------------------------------------------- */

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
	if (typeof resp.data === 'object' && resp.data !== null && 'message' in (resp.data as any)) {
		return new Error(String((resp.data as any).message));
	}
	return new Error(`${fallback} (status ${resp.status})`);
}

/**
 * Valida/asegura que el estado esté dentro de los permitidos.
 */
function assertEstado(estado: unknown): asserts estado is TrabajoEstado {
	const allowed: TrabajoEstado[] = [
		'SOLICITADO',
		'ENVIADO',
		'RECIBIDO',
		'ENTREGADO',
		'CREADO',
		'EN_PROCESO',
		'LISTO',
		'CANCELADO',
		'REHACER'
	];
	if (typeof estado !== 'string' || !allowed.includes(estado as TrabajoEstado)) {
		throw new Error(`Estado no válido: ${String(estado)}. Debe ser uno de: ${allowed.join('|')}`);
	}
}

/**
 * Normaliza valores de fecha a una cadena ISO completa (timestamp con Z) cuando sea necesario.
 * - Si se pasa un Date, se retorna el ISO completo (ej. 2025-03-01T00:00:00.000Z)
 * - Si se pasa una cadena que puede parsearse como fecha, se intenta normalizar a ISO completo.
 * - Si no puede normalizarse, se devuelve la cadena original.
 */
function normalizeDateToIso(date?: Date | string | null): string | null {
	if (!date) return null;
	if (date instanceof Date) {
		// Retornar ISO completo (UTC) con time y Z
		return date.toISOString();
	}
	// Si es string, intentar normalizar (si viene en formato ISO o similar lo convertimos)
	const s = String(date).trim();
	if (!s) return null;
	const maybeIso = new Date(s);
	if (!Number.isNaN(maybeIso.getTime())) {
		return maybeIso.toISOString();
	}
	// Fallback: devolver la cadena tal cual (backend decidirá)
	return s;
}

/* -------------------------------------------------------------------------- */
/*                              Laboratorios (API)                            */
/* -------------------------------------------------------------------------- */

export async function createLaboratorio(input: CreateLaboratorioInput): Promise<Laboratorio> {
	const resp = await apiClient.post<Laboratorio>('laboratorios', input);
	if (!resp.ok) {
		throw errorFromResponse(resp, 'No se pudo crear el laboratorio');
	}
	return unwrapPayload<Laboratorio>(resp.data);
}

export async function updateLaboratorio(
	id: number,
	input: UpdateLaboratorioInput
): Promise<Laboratorio> {
	const resp = await apiClient.put<Laboratorio>(`laboratorios/${id}`, input);
	if (!resp.ok) {
		throw errorFromResponse(resp, `No se pudo actualizar el laboratorio ${id}`);
	}
	return unwrapPayload<Laboratorio>(resp.data);
}

export async function deleteLaboratorio(id: number): Promise<void> {
	const resp = await apiClient.delete(`laboratorios/${id}`);
	if (!resp.ok) {
		throw errorFromResponse(resp, `No se pudo eliminar el laboratorio ${id}`);
	}
}

export async function getLaboratorio(id: number): Promise<Laboratorio> {
	const resp = await apiClient.get<Laboratorio>(`laboratorios/${id}`);
	if (!resp.ok) {
		throw errorFromResponse(resp, `Laboratorio ${id} no encontrado`);
	}
	return unwrapPayload<Laboratorio>(resp.data);
}

export async function listLaboratorios(): Promise<Laboratorio[]> {
	const resp = await apiClient.get<Laboratorio[]>('laboratorios');
	if (!resp.ok) return [];
	return ensureArray<Laboratorio>(resp.data);
}

/* -------------------------------------------------------------------------- */
/*                        Trabajos de laboratorio (API)                       */
/* -------------------------------------------------------------------------- */

/**
 * Crea un trabajo de laboratorio.
 * Acepta tanto el DTO `TrabajoLaboratorioCreateDto` (dates como Date)
 * como el `CreateTrabajoInput` (fechas como strings).
 *
 * Normaliza las fechas a YYYY-MM-DD antes de enviar al API.
 */
export async function createTrabajoLaboratorio(
	input: TrabajoLaboratorioCreateDto | CreateTrabajoInput
): Promise<TrabajoLaboratorio> {
	// Validar estado (lanza si no es válido)
	assertEstado((input as any).estado);

	// Construir payload normalizado que el backend espera
	const payload: Record<string, unknown> = {
		laboratorio_id: (input as any).laboratorio_id,
		consulta_id: (input as any).consulta_id ?? null,
		descripcion: (input as any).descripcion ?? null,
		estado: (input as any).estado
	};

	// Normalizar fechas (acepta Date o string)
	if ((input as any).fecha_recepcion !== undefined) {
		payload.fecha_recepcion = normalizeDateToIso((input as any).fecha_recepcion);
	}
	if ((input as any).fecha_entrega_paciente !== undefined) {
		payload.fecha_entrega_paciente = normalizeDateToIso((input as any).fecha_entrega_paciente);
	}

	const resp = await apiClient.post<TrabajoLaboratorio>('trabajos-laboratorio', payload);
	if (!resp.ok) {
		throw errorFromResponse(resp, 'No se pudo crear el trabajo de laboratorio');
	}
	return unwrapPayload<TrabajoLaboratorio>(resp.data);
}

export async function updateTrabajoLaboratorio(
	id: number,
	input: UpdateTrabajoInput
): Promise<TrabajoLaboratorio> {
	if (input.estado) assertEstado(input.estado);
	const resp = await apiClient.patch<TrabajoLaboratorio>(`trabajos-laboratorio/${id}`, input);
	if (!resp.ok) {
		throw errorFromResponse(resp, `No se pudo actualizar el trabajo de laboratorio ${id}`);
	}
	return unwrapPayload<TrabajoLaboratorio>(resp.data);
}

export async function getTrabajoLaboratorio(id: number): Promise<TrabajoLaboratorio> {
	const resp = await apiClient.get<TrabajoLaboratorio>(`trabajos-laboratorio/${id}`);
	if (!resp.ok) {
		throw errorFromResponse(resp, `Trabajo de laboratorio ${id} no encontrado`);
	}
	return unwrapPayload<TrabajoLaboratorio>(resp.data);
}

export async function listTrabajosLaboratorio(): Promise<TrabajoLaboratorio[]> {
	const resp = await apiClient.get<TrabajoLaboratorio[]>('trabajos-laboratorio');
	if (!resp.ok) return [];
	return ensureArray<TrabajoLaboratorio>(resp.data);
}

/* -------------------------------------------------------------------------- */
/*                      Helpers de flujo de estado (opcional)                 */
/* -------------------------------------------------------------------------- */

export async function marcarEnviado(id: number): Promise<TrabajoLaboratorio> {
	return updateTrabajoLaboratorio(id, { estado: 'ENVIADO' });
}

export async function marcarRecibido(
	id: number,
	fecha_recepcion?: string
): Promise<TrabajoLaboratorio> {
	return updateTrabajoLaboratorio(id, {
		estado: 'RECIBIDO',
		fecha_recepcion: fecha_recepcion ?? null
	});
}

export async function marcarEntregado(
	id: number,
	fecha_entrega_paciente?: string
): Promise<TrabajoLaboratorio> {
	return updateTrabajoLaboratorio(id, {
		estado: 'ENTREGADO',
		fecha_entrega_paciente: fecha_entrega_paciente ?? null
	});
}
