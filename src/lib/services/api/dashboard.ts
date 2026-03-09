/**
 * Servicio API para el dashboard
 */
import { apiClient } from './http';

export interface DashboardHorario {
	hoy_ms: number;
	total_mes_ms: number;
	alerta_8h: boolean;
	alerta_tiempo_extra: boolean;
}

export interface PacienteSaldoPendiente {
	id: number;
	nombre: string;
	apellidos: string;
	saldo: number;
}

export interface TrabajoLaboratorioPendiente {
	id: number;
	paciente: {
		id: number;
		nombre: string;
		apellidos: string;
	};
	laboratorio: {
		id: number;
		nombre: string;
	};
	estado: string;
	descripcion: string;
	fecha_solicitud: string;
	fecha_recepcion?: string;
	fecha_entrega_paciente?: string;
}

export interface ResumenMes {
	total_ms: number;
	normales_ms: number;
	extras_ms: number;
	dias_trabajados: number;
	promedio_diario_ms: number;
}

export interface DashboardData {
	horario?: DashboardHorario;
	pacientes_saldo_pendiente: PacienteSaldoPendiente[];
	trabajos_laboratorio_pendientes: TrabajoLaboratorioPendiente[];
	resumen_mes?: ResumenMes;
}

export interface DashboardResponse {
	ok: boolean;
	message: string;
	data: DashboardData;
}

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
 * Obtiene todos los datos del dashboard
 * El backend obtiene el usuario automáticamente de la sesión
 */
export async function getDashboard() {
	const response = await apiClient.get<DashboardResponse>('/dashboard');

	if (!response.ok) {
		throw new Error('Error al cargar el dashboard');
	}

	return response.data.data;
}

export const dashboardService = {
	getDashboard,
	formatMillisToTime
};
