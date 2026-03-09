/**
 * Servicio de Pagos conectado al backend.
 *
 * Endpoints disponibles:
 * - POST /api/pagos - Registrar pago
 * - GET /api/pagos?tratamiento_id=X - Listar pagos de un tratamiento
 * - GET /api/pagos?consulta_id=X - Listar pagos de una consulta
 * - GET /api/pagos?paciente_id=X - Listar pagos de un paciente
 * - GET /api/pagos/:id - Ver detalle de pago
 * - PUT /api/pagos/:id - Actualizar pago
 * - DELETE /api/pagos/:id - Eliminar pago
 *
 * Métodos de pago disponibles:
 * - "efectivo"
 * - "tarjeta"
 * - "transferencia"
 */
import { apiClient } from './http';

export type MetodoPago = 'efectivo' | 'tarjeta' | 'transferencia';

export interface Pago {
	id: number;
	tratamiento_id: number;
	monto: number;
	metodo_pago?: string | null;
	observaciones?: string | null;
	fecha_pago: string; // date (YYYY-MM-DD)
}

export interface CreatePagoInput {
	tratamiento_id: number;
	monto: number;
	metodo_pago?: string; // "efectivo", "tarjeta", "transferencia", etc.
	observaciones?: string;
	fecha_pago?: string; // date (YYYY-MM-DD), default hoy
}

export interface UpdatePagoInput {
	monto?: number;
	metodo_pago?: string | null;
	observaciones?: string | null;
	fecha_pago?: string;
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
 * Registrar un nuevo pago
 * NOTA: El backend valida que el monto no exceda el saldo pendiente
 */
export async function createPago(input: CreatePagoInput): Promise<Pago> {
	const resp = await apiClient.post<Pago>('pagos', input);
	if (!resp.ok) {
		throw errorFromResponse(resp, 'No se pudo registrar el pago');
	}
	return unwrapPayload<Pago>(resp.data);
}

/**
 * Obtener detalle de un pago
 */
export async function getPago(id: number): Promise<Pago> {
	const resp = await apiClient.get<Pago>(`pagos/${id}`);
	if (!resp.ok) {
		throw errorFromResponse(resp, `Pago ${id} no encontrado`);
	}
	return unwrapPayload<Pago>(resp.data);
}

/**
 * Actualizar un pago
 */
export async function updatePago(id: number, input: UpdatePagoInput): Promise<Pago> {
	const resp = await apiClient.put<Pago>(`pagos/${id}`, input);
	if (!resp.ok) {
		throw errorFromResponse(resp, `No se pudo actualizar el pago ${id}`);
	}
	return unwrapPayload<Pago>(resp.data);
}

/**
 * Eliminar un pago
 */
export async function deletePago(id: number): Promise<void> {
	const resp = await apiClient.delete(`pagos/${id}`);
	if (!resp.ok) {
		throw errorFromResponse(resp, `No se pudo eliminar el pago ${id}`);
	}
}

/* -------------------------------------------------------------------------- */
/*                                Listados                                    */
/* -------------------------------------------------------------------------- */

/**
 * Listar pagos de un tratamiento
 */
export async function listPagosByTratamiento(tratamiento_id: number): Promise<Pago[]> {
	const resp = await apiClient.get<Pago[]>(`pagos?tratamiento_id=${tratamiento_id}`);
	if (!resp.ok) {
		console.error('Error listando pagos:', resp);
		return [];
	}
	return ensureArray<Pago>(resp.data);
}

/**
 * Listar todos los pagos de una consulta (todos sus tratamientos)
 */
export async function listPagosByConsulta(consulta_id: number): Promise<Pago[]> {
	const resp = await apiClient.get<Pago[]>(`pagos?consulta_id=${consulta_id}`);
	if (!resp.ok) {
		console.error('Error listando pagos de consulta:', resp);
		return [];
	}
	return ensureArray<Pago>(resp.data);
}

/**
 * Listar todos los pagos de un paciente (todas sus consultas)
 */
export async function listPagosByPaciente(paciente_id: number): Promise<Pago[]> {
	const resp = await apiClient.get<Pago[]>(`pagos?paciente_id=${paciente_id}`);
	if (!resp.ok) {
		console.error('Error listando pagos del paciente:', resp);
		return [];
	}
	return ensureArray<Pago>(resp.data);
}

/* -------------------------------------------------------------------------- */
/*                          Helpers de formato                                */
/* -------------------------------------------------------------------------- */

/**
 * Obtener el texto legible de un método de pago
 */
export function getMetodoPagoLabel(metodo?: string | null): string {
	if (!metodo) return 'No especificado';

	const labels: Record<string, string> = {
		efectivo: 'Efectivo',
		tarjeta: 'Tarjeta',
		transferencia: 'Transferencia'
	};

	return labels[metodo.toLowerCase()] || metodo;
}

/**
 * Obtener la fecha de hoy en formato YYYY-MM-DD
 */
export function getTodayDate(): string {
	const today = new Date();
	const year = today.getFullYear();
	const month = String(today.getMonth() + 1).padStart(2, '0');
	const day = String(today.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}
