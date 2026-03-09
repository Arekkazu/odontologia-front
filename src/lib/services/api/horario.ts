/**
 * Servicio API para el módulo de horario laboral
 */
import { apiClient } from './http';

// ============================================
// TIPOS E INTERFACES
// ============================================

export interface Pausa {
	id: number;
	horario_id: number;
	hora_inicio: string; // ISO string
	hora_fin: string | null; // ISO string
	duracion_ms: number | null;
}

export interface HorarioRegistro {
	id: number;
	usuario_id: number;
	fecha: string; // ISO string
	hora_entrada: string | null; // ISO string
	hora_salida: string | null; // ISO string
	total_ms: number | null;
	notas: string | null;
	tipo: 'none' | 'normal' | 'extra';
	is_running?: boolean;
	is_paused?: boolean;
	pausas?: Pausa[];
}

export interface HorarioSnapshot {
	id: number;
	usuario_id: number;
	fecha: string; // ISO string
	accumulated_ms: number;
	is_running: boolean;
	is_paused: boolean;
	created_at: string; // ISO string
}

export interface DiaCalendario {
	date: string; // YYYY-MM-DD
	worked_ms: number;
	type: 'none' | 'normal' | 'extra';
}

export interface ResumenMensual {
	total_ms: number;
	normales_ms: number;
	extras_ms: number;
	dias_trabajados: number;
	promedio_diario_ms: number;
}

export interface CalendarioMensual {
	year: number;
	month: number;
	days: DiaCalendario[];
	summary: ResumenMensual;
}

export interface HorarioDashboard {
	hoy_ms: number;
	total_mes_ms: number;
	alerta_8h: boolean;
	alerta_tiempo_extra: boolean;
}

// ============================================
// RESPUESTAS DE API
// ============================================

interface ApiSuccessResponse<T> {
	ok: true;
	message: string;
	data: T;
}

interface ApiErrorResponse {
	ok: false;
	message: string;
	error?: string;
}

type ApiHorarioResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

// ============================================
// 1. CONTROL DE HORARIO (Cronómetro)
// ============================================

/**
 * GET /api/horario/today
 * Obtiene el estado de la jornada actual
 */
export async function getToday(): Promise<HorarioRegistro | null> {
	try {
		const response = await apiClient.get<ApiHorarioResponse<HorarioRegistro>>('/horario/today');

		if (!response.ok || response.status === 404) {
			return null;
		}

		const body = response.data;
		if (body.ok) {
			return body.data;
		}

		return null;
	} catch (error) {
		console.error('Error obteniendo horario de hoy:', error);
		return null;
	}
}

/**
 * POST /api/horario/entry
 * Iniciar la jornada laboral
 */
export async function registrarEntrada(params?: {
	fecha?: string;
	hora_entrada?: string;
	notas?: string;
}): Promise<HorarioRegistro> {
	const response = await apiClient.post<ApiHorarioResponse<HorarioRegistro>>(
		'/horario/entry',
		params
	);

	if (!response.ok) {
		throw new Error('Error registrando entrada');
	}

	const body = response.data;
	if (!body.ok) {
		throw new Error(body.message || 'Error registrando entrada');
	}

	return body.data;
}

/**
 * POST /api/horario/pause/start
 * Iniciar pausa
 */
export async function iniciarPausa(params?: {
	fecha?: string;
	hora_inicio?: string;
}): Promise<Pausa> {
	const response = await apiClient.post<ApiHorarioResponse<Pausa>>(
		'/horario/pause/start',
		params
	);

	if (!response.ok) {
		throw new Error('Error iniciando pausa');
	}

	const body = response.data;
	if (!body.ok) {
		throw new Error(body.message || 'Error iniciando pausa');
	}

	return body.data;
}

/**
 * POST /api/horario/pause/end
 * Finalizar pausa
 */
export async function finalizarPausa(params?: {
	fecha?: string;
	hora_fin?: string;
	pausa_id?: number;
}): Promise<Pausa> {
	const response = await apiClient.post<ApiHorarioResponse<Pausa>>(
		'/horario/pause/end',
		params
	);

	if (!response.ok) {
		throw new Error('Error finalizando pausa');
	}

	const body = response.data;
	if (!body.ok) {
		throw new Error(body.message || 'Error finalizando pausa');
	}

	return body.data;
}

/**
 * POST /api/horario/exit
 * Guardar salida y cerrar jornada
 */
export async function registrarSalida(params?: {
	fecha?: string;
	hora_salida?: string;
	notas?: string;
}): Promise<HorarioRegistro> {
	const response = await apiClient.post<ApiHorarioResponse<HorarioRegistro>>(
		'/horario/exit',
		params
	);

	if (!response.ok) {
		throw new Error('Error registrando salida');
	}

	const body = response.data;
	if (!body.ok) {
		throw new Error(body.message || 'Error registrando salida');
	}

	return body.data;
}

/**
 * POST /api/horario/snapshot
 * Guardado automático (autosave)
 */
export async function guardarSnapshot(params: {
	fecha?: string;
	accumulated_ms: number;
	is_running: boolean;
	is_paused: boolean;
}): Promise<HorarioSnapshot> {
	const response = await apiClient.post<ApiHorarioResponse<HorarioSnapshot>>(
		'/horario/snapshot',
		params
	);

	if (!response.ok) {
		throw new Error('Error guardando snapshot');
	}

	const body = response.data;
	if (!body.ok) {
		throw new Error(body.message || 'Error guardando snapshot');
	}

	return body.data;
}

/**
 * GET /api/horario/snapshot?fecha=YYYY-MM-DD
 * Recuperar estado guardado
 */
export async function getSnapshot(fecha?: string): Promise<HorarioSnapshot | null> {
	try {
		const response = await apiClient.get<ApiHorarioResponse<HorarioSnapshot>>(
			'/horario/snapshot',
			{
				query: fecha ? { fecha } : undefined
			}
		);

		if (!response.ok || response.status === 400) {
			return null;
		}

		const body = response.data;
		if (body.ok) {
			return body.data;
		}

		return null;
	} catch (error) {
		console.error('Error obteniendo snapshot:', error);
		return null;
	}
}

// ============================================
// 2. REGISTRO DIARIO
// ============================================

/**
 * GET /api/horario/day/:date
 * Ver detalles de un día específico
 */
export async function getDia(fecha: string): Promise<HorarioRegistro | null> {
	try {
		const response = await apiClient.get<ApiHorarioResponse<HorarioRegistro>>(
			`/horario/day/${fecha}`
		);

		if (!response.ok || response.status === 404) {
			return null;
		}

		const body = response.data;
		if (body.ok) {
			return body.data;
		}

		return null;
	} catch (error) {
		console.error('Error obteniendo día:', error);
		return null;
	}
}

/**
 * PUT /api/horario/day/:date
 * Editar manualmente un día
 */
export async function actualizarDia(
	fecha: string,
	params: {
		hora_entrada?: string;
		hora_salida?: string;
		notas?: string;
	}
): Promise<HorarioRegistro> {
	const response = await apiClient.put<ApiHorarioResponse<HorarioRegistro>>(
		`/horario/day/${fecha}`,
		params
	);

	if (!response.ok) {
		throw new Error('Error actualizando día');
	}

	const body = response.data;
	if (!body.ok) {
		throw new Error(body.message || 'Error actualizando día');
	}

	return body.data;
}

// ============================================
// 3. CALENDARIO MENSUAL
// ============================================

/**
 * GET /api/horario/month?year=YYYY&month=MM
 * Obtener todos los días del mes para el calendario
 */
export async function getCalendarioMensual(
	year: number,
	month: number
): Promise<CalendarioMensual> {
	const response = await apiClient.get<ApiHorarioResponse<CalendarioMensual>>('/horario/month', {
		query: { year, month }
	});

	if (!response.ok) {
		throw new Error('Error obteniendo calendario mensual');
	}

	const body = response.data;
	if (!body.ok) {
		throw new Error(body.message || 'Error obteniendo calendario mensual');
	}

	return body.data;
}

// ============================================
// 4. DASHBOARD DE HORARIO
// ============================================

/**
 * GET /api/horario/dashboard
 * Cargar toda la información de la página /horario
 */
export async function getHorarioDashboard(): Promise<{
	horario: HorarioDashboard;
	resumen_mes: ResumenMensual;
	pacientes_saldo_pendiente?: any[];
	trabajos_laboratorio_pendientes?: any[];
}> {
	const response = await apiClient.get<
		ApiHorarioResponse<{
			horario: HorarioDashboard;
			resumen_mes: ResumenMensual;
			pacientes_saldo_pendiente?: any[];
			trabajos_laboratorio_pendientes?: any[];
		}>
	>('/horario/dashboard');

	if (!response.ok) {
		throw new Error('Error obteniendo dashboard de horario');
	}

	const body = response.data;
	if (!body.ok) {
		throw new Error(body.message || 'Error obteniendo dashboard de horario');
	}

	return body.data;
}

// ============================================
// HELPERS
// ============================================

/**
 * Convierte milisegundos a formato "Xh YYm"
 */
export function formatMillisToTime(ms: number): string {
	const totalMinutes = Math.floor(ms / 60000);
	const hours = Math.floor(totalMinutes / 60);
	const minutes = totalMinutes % 60;
	return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
}

/**
 * Convierte milisegundos a formato "Xh YYm ZZs"
 */
export function formatMillisToTimeWithSeconds(ms: number): string {
	const totalSeconds = Math.floor(ms / 1000);
	const hours = Math.floor(totalSeconds / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const seconds = totalSeconds % 60;
	return `${hours}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`;
}

/**
 * Convierte fecha ISO a formato YYYY-MM-DD
 */
export function toDateString(date: Date | string): string {
	if (typeof date === 'string') {
		return date.split('T')[0];
	}
	return date.toISOString().split('T')[0];
}

// ============================================
// SERVICIO EXPORTADO
// ============================================

export const horarioService = {
	// Control de horario
	getToday,
	registrarEntrada,
	iniciarPausa,
	finalizarPausa,
	registrarSalida,
	guardarSnapshot,
	getSnapshot,

	// Registro diario
	getDia,
	actualizarDia,

	// Calendario
	getCalendarioMensual,

	// Dashboard
	getHorarioDashboard,

	// Helpers
	formatMillisToTime,
	formatMillisToTimeWithSeconds,
	toDateString
};
