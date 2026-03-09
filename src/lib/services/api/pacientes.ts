/**
 * Servicio de Pacientes y Consultas conectado al backend.
 * - Usa endpoints reales descritos en infobackend.md.
 * - Mantiene stubs locales para tratamientos y pagos (deprecados, usar servicios específicos).
 *
 * Endpoints backend relevantes:
 * - POST /auth/login, /auth/logout (ya cubiertos en auth.ts)
 * - Pacientes:
 *   - POST /api/patient/register
 *   - GET  /api/patient/:id
 *   - PUT  /api/patient/:id
 *   - GET  /api/patient/:id/saldo-pendiente
 * - Consultas:
 *   - POST /api/consultas
 *   - GET  /api/consultas
 *   - GET  /api/consultas/:id
 *   - PUT  /api/consultas/:id
 *   - DELETE /api/consultas/:id
 *
 * Notas:
 * - Todas las llamadas usan credentials: "include" vía apiClient.
 * - Para tratamientos y pagos, usar los servicios específicos: tratamientos.ts y pagos.ts
 */

import { apiClient } from './http';

/* -------------------------------------------------------------------------- */
/*                                   Tipos                                    */
/* -------------------------------------------------------------------------- */

/**
 * El backend puede devolver diferentes shapes:
 * - dni como número o string
 * - typeDni como clave string o como objeto con metadatos
 *
 * Definimos tipos flexibles para cubrir ambos casos.
 */
export type TipoDni = string | { typeDni: string; descriptionDni?: string } | null;

export interface Paciente {
	id: number;
	dni: string | number;
	name: string;
	lastname: string;
	email?: string | null;
	phone?: string | null;
	typeDni: TipoDni;
	created_at?: string | null; // ISO string
	nombre_completo?: string | null;
}

export interface CreatePacienteInput {
	dni: string;
	name: string;
	lastname: string;
	email?: string | null;
	phone?: string | null;
	typeDni: string;
	created_at?: string | null;
}

export interface UpdatePacienteInput {
	dni?: string;
	name?: string;
	lastname?: string;
	email?: string | null;
	phone?: string | null;
	typeDni?: string;
	created_at?: string | null;
}

export interface Consulta {
	id: number;
	paciente_id: number;
	motivo: string;
	diagnostico: string;
	fecha_consulta?: string; // datetime ISO
	observaciones?: string | null;
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

/* Tratamientos y pagos (stubs locales en memoria) */
export interface Tratamiento {
	id: number;
	consulta_id: number;
	descripcion: string;
	fecha_inicio?: string | null; // date
	fecha_fin?: string | null; // date
	costo_total: number; // numeric(10,2)
}

export interface Pago {
	id: number;
	tratamiento_id: number;
	fecha_pago: string; // date
	monto: number; // numeric(10,2)
	metodo_pago?: string | null;
	observaciones?: string | null;
}

export interface TratamientoConSaldo extends Tratamiento {
	totalPagos: number;
	saldoPendiente: number;
}

export interface PacienteResumen {
	paciente: Paciente;
	tratamientos: TratamientoConSaldo[];
	totalSaldoPaciente: number;
}

export interface SaldoPendientePaciente {
	costo_total: number; // Suma de TODOS sus tratamientos
	total_pagado: number; // Suma de TODOS sus pagos
	saldo_pendiente: number; // Diferencia
	tratamientos_count: number; // Total de tratamientos del paciente
}

/* -------------------------------------------------------------------------- */
/*                           Utilidades internas                              */
/* -------------------------------------------------------------------------- */

function toMoney(n: number): number {
	return Math.round(n * 100) / 100;
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

function extractMessage(data: unknown, fallback: string): string {
	if (data && typeof data === 'object' && 'message' in data) {
		const msg = (data as { message?: unknown }).message;
		return typeof msg === 'string' ? msg : String(msg ?? fallback);
	}
	return fallback;
}

/* -------------------------------------------------------------------------- */
/*                              Pacientes (API)                               */
/* -------------------------------------------------------------------------- */

export async function createPaciente(input: CreatePacienteInput): Promise<Paciente> {
	const resp = await apiClient.post<unknown>('patient/register', input);
	if (!resp.ok) {
		throw new Error(
			extractMessage(resp.data, `No se pudo crear el paciente (status ${resp.status})`)
		);
	}
	return unwrapPayload<Paciente>(resp.data);
}

export async function getPacienteById(id: number): Promise<Paciente> {
	const resp = await apiClient.get<unknown>(`patient/${id}`);
	if (!resp.ok) {
		throw new Error(
			extractMessage(resp.data, `Paciente ${id} no encontrado (status ${resp.status})`)
		);
	}
	return unwrapPayload<Paciente>(resp.data);
}

export async function updatePaciente(id: number, input: UpdatePacienteInput): Promise<Paciente> {
	const resp = await apiClient.put<unknown>(`patient/${id}`, input);
	if (!resp.ok) {
		throw new Error(
			extractMessage(resp.data, `No se pudo actualizar el paciente ${id} (status ${resp.status})`)
		);
	}
	return unwrapPayload<Paciente>(resp.data);
}

/**
 * Lista todos los pacientes.
 *
 * IMPORTANTE: El backend actual NO tiene implementado GET /api/patient según infobackend.md.
 * Solo tiene GET /api/patient/:id para obtener un paciente específico.
 *
 * Esta función intentará llamar al endpoint y retornará [] si no existe.
 * Para usar esta funcionalidad, el backend necesita implementar:
 *
 * GET /api/patient
 * Respuesta: { ok: true, message: "...", data: [...pacientes] }
 *
 * Solución temporal: Retorna array vacío si el endpoint no está disponible.
 */
export async function listPacientes(): Promise<Paciente[]> {
	try {
		const resp = await apiClient.get<unknown>('patient');
		if (!resp.ok) {
			console.warn('Endpoint GET /api/patient no disponible. Retornando array vacío.');
			return [];
		}
		return ensureArray<Paciente>(resp.data);
	} catch (err) {
		console.warn('Error al listar pacientes. El endpoint puede no estar implementado:', err);
		return [];
	}
}

/* -------------------------------------------------------------------------- */
/*                              Consultas (API)                               */
/* -------------------------------------------------------------------------- */

export async function createConsulta(input: CreateConsultaInput): Promise<Consulta> {
	const resp = await apiClient.post<unknown>('consultas', input);
	if (!resp.ok) {
		throw new Error(
			extractMessage(resp.data, `No se pudo crear la consulta (status ${resp.status})`)
		);
	}
	return unwrapPayload<Consulta>(resp.data);
}

export async function getConsulta(id: number): Promise<Consulta> {
	const resp = await apiClient.get<unknown>(`consultas/${id}`);
	if (!resp.ok) {
		throw new Error(
			extractMessage(resp.data, `Consulta ${id} no encontrada (status ${resp.status})`)
		);
	}
	return unwrapPayload<Consulta>(resp.data);
}

export async function updateConsulta(id: number, input: UpdateConsultaInput): Promise<Consulta> {
	const resp = await apiClient.put<unknown>(`consultas/${id}`, input);
	if (!resp.ok) {
		throw new Error(
			extractMessage(resp.data, `No se pudo actualizar la consulta ${id} (status ${resp.status})`)
		);
	}
	return unwrapPayload<Consulta>(resp.data);
}

export async function deleteConsulta(id: number): Promise<void> {
	const resp = await apiClient.delete(`consultas/${id}`);
	if (!resp.ok) {
		throw new Error(
			extractMessage(resp.data, `No se pudo eliminar la consulta ${id} (status ${resp.status})`)
		);
	}
}

export async function listConsultas(): Promise<Consulta[]> {
	const resp = await apiClient.get<unknown>('consultas');
	if (!resp.ok) return [];
	return ensureArray<Consulta>(resp.data);
}

export async function listConsultasByPaciente(paciente_id: number): Promise<Consulta[]> {
	const all = await listConsultas();
	return all.filter((c) => c.paciente_id === paciente_id);
}

/**
 * Obtener el saldo pendiente total de un paciente
 * Endpoint: GET /api/patient/:id/saldo-pendiente
 */
export async function getSaldoPendientePaciente(
	paciente_id: number
): Promise<SaldoPendientePaciente> {
	const resp = await apiClient.get<SaldoPendientePaciente>(
		`patient/${paciente_id}/saldo-pendiente`
	);
	if (!resp.ok) {
		throw new Error(`No se pudo obtener el saldo del paciente ${paciente_id}`);
	}
	return unwrapPayload<SaldoPendientePaciente>(resp.data);
}

/* -------------------------------------------------------------------------- */
/*             Tratamientos y pagos (stubs locales en memoria)               */
/* -------------------------------------------------------------------------- */

/**
 * Estos stubs mantienen compatibilidad temporal con la UI.
 * Reemplázalos por llamadas reales cuando exista API de tratamientos/pagos.
 */
let tratamientosMem: Tratamiento[] = [];
let pagosMem: Pago[] = [];
let seqTrat = 1;
let seqPago = 1;

export function listTratamientosByConsulta(consultaId: number): Tratamiento[] {
	return tratamientosMem.filter((t) => t.consulta_id === consultaId);
}

export function createTratamiento(input: {
	consulta_id: number;
	descripcion: string;
	fecha_inicio?: string | null;
	fecha_fin?: string | null;
	costo_total?: number;
}): Tratamiento {
	const tratamiento: Tratamiento = {
		id: seqTrat++,
		consulta_id: input.consulta_id,
		descripcion: input.descripcion.trim(),
		fecha_inicio: input.fecha_inicio ?? null,
		fecha_fin: input.fecha_fin ?? null,
		costo_total: toMoney(input.costo_total ?? 0)
	};
	tratamientosMem.push(tratamiento);
	return tratamiento;
}

export function updateTratamiento(input: {
	id: number;
	descripcion?: string;
	fecha_inicio?: string | null;
	fecha_fin?: string | null;
	costo_total?: number;
}): Tratamiento {
	const idx = tratamientosMem.findIndex((t) => t.id === input.id);
	if (idx === -1) throw new Error(`Tratamiento ${input.id} no encontrado`);
	const next: Tratamiento = {
		...tratamientosMem[idx],
		...(input.descripcion !== undefined && { descripcion: input.descripcion.trim() }),
		...(input.fecha_inicio !== undefined && { fecha_inicio: input.fecha_inicio }),
		...(input.fecha_fin !== undefined && { fecha_fin: input.fecha_fin }),
		...(input.costo_total !== undefined && { costo_total: toMoney(input.costo_total) })
	};
	tratamientosMem[idx] = next;
	return next;
}

export function deleteTratamiento(id: number): void {
	tratamientosMem = tratamientosMem.filter((t) => t.id !== id);
	pagosMem = pagosMem.filter((p) => p.tratamiento_id !== id);
}

export function listPagosByTratamiento(tratamientoId: number): Pago[] {
	return pagosMem.filter((p) => p.tratamiento_id === tratamientoId);
}

export function createPago(input: {
	tratamiento_id: number;
	monto: number;
	fecha_pago?: string;
	metodo_pago?: string | null;
	observaciones?: string | null;
}): Pago {
	const pago: Pago = {
		id: seqPago++,
		tratamiento_id: input.tratamiento_id,
		fecha_pago: input.fecha_pago ?? new Date().toISOString().substring(0, 10),
		monto: toMoney(input.monto),
		metodo_pago: input.metodo_pago ?? null,
		observaciones: input.observaciones ?? null
	};
	pagosMem.push(pago);
	return pago;
}

/* -------------------------------------------------------------------------- */
/*                               Cálculos UI                                 */
/* -------------------------------------------------------------------------- */

export function computeTratamientoSaldo(tratamiento: Tratamiento): TratamientoConSaldo {
	const pagos = listPagosByTratamiento(tratamiento.id);
	const totalPagos = toMoney(pagos.reduce((sum, p) => sum + (p.monto || 0), 0));
	const saldoPendiente = toMoney((tratamiento.costo_total || 0) - totalPagos);
	return {
		...tratamiento,
		totalPagos,
		saldoPendiente
	};
}

export async function listTratamientosConSaldoByPaciente(
	pacienteId: number
): Promise<TratamientoConSaldo[]> {
	const consultas = await listConsultasByPaciente(pacienteId);
	const tratados = consultas.flatMap((c) => listTratamientosByConsulta(c.id));
	return tratados.map(computeTratamientoSaldo);
}

export async function getPacienteResumen(pacienteId: number): Promise<PacienteResumen | null> {
	try {
		const paciente = await getPacienteById(pacienteId);
		const tratamientosSaldo = await listTratamientosConSaldoByPaciente(pacienteId);
		const totalSaldoPaciente = toMoney(
			tratamientosSaldo.reduce((sum, t) => sum + (t.saldoPendiente || 0), 0)
		);

		return {
			paciente,
			tratamientos: tratamientosSaldo,
			totalSaldoPaciente
		};
	} catch {
		return null;
	}
}

/* -------------------------------------------------------------------------- */
/*                                 Seeds (stub)                              */
/* -------------------------------------------------------------------------- */

/**
 * Semilla mínima para entornos sin backend de tratamientos/pagos.
 * No afecta el backend; solo la memoria local.
 */
export function seedMockData(): void {
	if (tratamientosMem.length > 0 || pagosMem.length > 0) return;
	const today = new Date().toISOString().substring(0, 10);

	const t1 = createTratamiento({
		consulta_id: 1,
		descripcion: 'Endodoncia Molar Superior',
		fecha_inicio: today,
		costo_total: 350
	});
	createPago({ tratamiento_id: t1.id, monto: 150, metodo_pago: 'Efectivo' });
	createPago({ tratamiento_id: t1.id, monto: 50, metodo_pago: 'Tarjeta' });

	const t2 = createTratamiento({
		consulta_id: 2,
		descripcion: 'Limpieza y fluor',
		fecha_inicio: today,
		costo_total: 120
	});
	createPago({ tratamiento_id: t2.id, monto: 120, metodo_pago: 'Efectivo' });
}
