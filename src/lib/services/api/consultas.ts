import type { StorageNamespace } from '$lib/services/storage';
import { loadCollection, saveCollection, generateSeqId } from '$lib/services/storage';
import { listPacientes, listTratamientosByConsulta, listPagosByTratamiento } from './pacientes';

/**
 * Tipos para Consultas
 */

export interface Consulta {
	id: number;
	paciente_id: number;
	fecha_consulta: string; // ISO timestamp
	observaciones?: string | null;
	motivo?: string | null;
	diagnostico?: string | null;
}

export interface ConsultaConDetalles extends Consulta {
	paciente_nombre: string;
	tratamientos_count: number;
	costo_total_tratamientos: number;
	saldo_pendiente: number;
	fecha_formato: string; // formateada para UI
}

/**
 * Constantes de almacenamiento
 */
const NS_CONSULTAS: StorageNamespace = 'consultas';
const KEY_CONSULTAS = 'collection';

/**
 * Utilidades
 */

function nowIso(): string {
	return new Date().toISOString();
}

function toMoney(n: number): number {
	return Math.round(n * 100) / 100;
}

function formatearFecha(isoDate: string): string {
	try {
		const d = new Date(isoDate);
		return d.toLocaleDateString('es-ES', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	} catch {
		return isoDate;
	}
}

/**
 * CRUD para Consultas (global)
 */

/**
 * Obtener todas las consultas (globales)
 */
export function listConsultas(): ConsultaConDetalles[] {
	const consultas = loadCollection<Consulta>(NS_CONSULTAS, KEY_CONSULTAS);
	const pacientes = listPacientes();

	return consultas.map((c) => {
		const paciente = pacientes.find((p) => p.id === c.paciente_id);
		const tratamientos = listTratamientosByConsulta(c.id);

		const costoTotal = tratamientos.reduce((sum, t) => sum + (t.costo_total || 0), 0);
		const totalPagos = tratamientos.reduce((sum, t) => {
			const pagos = listPagosByTratamiento(t.id);
			return sum + pagos.reduce((psum, p) => psum + (p.monto || 0), 0);
		}, 0);

		return {
			...c,
			paciente_nombre: paciente?.nombre_completo || '—',
			tratamientos_count: tratamientos.length,
			costo_total_tratamientos: toMoney(costoTotal),
			saldo_pendiente: toMoney(costoTotal - totalPagos),
			fecha_formato: formatearFecha(c.fecha_consulta)
		};
	});
}

/**
 * Obtener una consulta por ID con detalles
 */
export function getConsulta(id: number): ConsultaConDetalles | null {
	const consultas = loadCollection<Consulta>(NS_CONSULTAS, KEY_CONSULTAS);
	const consulta = consultas.find((c) => c.id === id);

	if (!consulta) return null;

	const pacientes = listPacientes();
	const paciente = pacientes.find((p) => p.id === consulta.paciente_id);
	const tratamientos = listTratamientosByConsulta(consulta.id);

	const costoTotal = tratamientos.reduce((sum, t) => sum + (t.costo_total || 0), 0);
	const totalPagos = tratamientos.reduce((sum, t) => {
		const pagos = listPagosByTratamiento(t.id);
		return sum + pagos.reduce((psum, p) => psum + (p.monto || 0), 0);
	}, 0);

	return {
		...consulta,
		paciente_nombre: paciente?.nombre_completo || '—',
		tratamientos_count: tratamientos.length,
		costo_total_tratamientos: toMoney(costoTotal),
		saldo_pendiente: toMoney(costoTotal - totalPagos),
		fecha_formato: formatearFecha(consulta.fecha_consulta)
	};
}

/**
 * Crear una nueva consulta
 */
export function createConsulta(data: {
	paciente_id: number;
	motivo?: string;
	diagnostico?: string;
	observaciones?: string;
}): Consulta {
	const consultas = loadCollection<Consulta>(NS_CONSULTAS, KEY_CONSULTAS);
	const id = generateSeqId(NS_CONSULTAS);

	const newConsulta: Consulta = {
		id,
		paciente_id: data.paciente_id,
		fecha_consulta: nowIso(),
		motivo: data.motivo || null,
		diagnostico: data.diagnostico || null,
		observaciones: data.observaciones || null
	};

	consultas.push(newConsulta);
	saveCollection(NS_CONSULTAS, KEY_CONSULTAS, consultas);

	return newConsulta;
}

/**
 * Actualizar una consulta
 */
export function updateConsulta(id: number, data: Partial<Consulta>): ConsultaConDetalles | null {
	const consultas = loadCollection<Consulta>(NS_CONSULTAS, KEY_CONSULTAS);
	const idx = consultas.findIndex((c) => c.id === id);

	if (idx === -1) return null;

	consultas[idx] = { ...consultas[idx], ...data };
	saveCollection(NS_CONSULTAS, KEY_CONSULTAS, consultas);

	return getConsulta(id);
}

/**
 * Obtener consultas de un paciente específico
 */
export function getConsultasPaciente(paciente_id: number): ConsultaConDetalles[] {
	return listConsultas().filter((c) => c.paciente_id === paciente_id);
}

/**
 * Buscar consultas con filtros avanzados
 */
export function searchConsultas(query: {
	searchText?: string;
	paciente_id?: number;
	desde?: string;
	hasta?: string;
	ordenar?: 'reciente' | 'antiguo' | 'paciente';
}): ConsultaConDetalles[] {
	let results = listConsultas();

	// Filtrar por texto: paciente, motivo, diagnóstico
	if (query.searchText) {
		const q = query.searchText.toLowerCase();
		results = results.filter(
			(c) =>
				c.paciente_nombre.toLowerCase().includes(q) ||
				c.motivo?.toLowerCase().includes(q) ||
				c.diagnostico?.toLowerCase().includes(q) ||
				String(c.id).includes(q)
		);
	}

	// Filtrar por paciente
	if (query.paciente_id) {
		results = results.filter((c) => c.paciente_id === query.paciente_id);
	}

	// Filtrar por rango de fechas
	if (query.desde) {
		const desde = new Date(query.desde).getTime();
		results = results.filter((c) => new Date(c.fecha_consulta).getTime() >= desde);
	}
	if (query.hasta) {
		const hasta = new Date(query.hasta).getTime();
		results = results.filter((c) => new Date(c.fecha_consulta).getTime() <= hasta);
	}

	// Ordenar
	const orden = query.ordenar || 'reciente';
	if (orden === 'reciente') {
		results.sort(
			(a, b) => new Date(b.fecha_consulta).getTime() - new Date(a.fecha_consulta).getTime()
		);
	} else if (orden === 'antiguo') {
		results.sort(
			(a, b) => new Date(a.fecha_consulta).getTime() - new Date(b.fecha_consulta).getTime()
		);
	} else if (orden === 'paciente') {
		results.sort((a, b) => a.paciente_nombre.localeCompare(b.paciente_nombre));
	}

	return results;
}

/**
 * Obtener últimas consultas (N más recientes)
 */
export function getUltimasConsultas(limit: number = 5): ConsultaConDetalles[] {
	return listConsultas().slice(0, limit);
}

/**
 * Obtener estadísticas de consultas
 */
export function getEstadisticasConsultas() {
	const todas = listConsultas();
	const hoy = new Date().toDateString();

	const consultasHoy = todas.filter((c) => new Date(c.fecha_consulta).toDateString() === hoy);
	const consultasEstaSemana = todas.filter((c) => {
		const diff = Date.now() - new Date(c.fecha_consulta).getTime();
		return diff < 7 * 24 * 60 * 60 * 1000;
	});

	return {
		total: todas.length,
		hoy: consultasHoy.length,
		estaSemana: consultasEstaSemana.length,
		ultimasRecientes: todas.slice(0, 5)
	};
}

/**
 * Seed mock data para testing
 */
export function seedConsultasMock(): void {
	const pacientes = listPacientes();
	if (pacientes.length === 0) return; // Sin pacientes, no hay consultas

	const mockConsultas: Consulta[] = [
		{
			id: 1,
			paciente_id: pacientes[0]?.id || 1,
			fecha_consulta: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
			motivo: 'Revisión general',
			diagnostico: 'Limpieza dental requerida',
			observaciones: 'Paciente presenta sarro moderado'
		},
		{
			id: 2,
			paciente_id: pacientes[1]?.id || 2,
			fecha_consulta: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
			motivo: 'Dolor molar derecho',
			diagnostico: 'Caries profunda',
			observaciones: 'Requiere tratamiento urgente'
		},
		{
			id: 3,
			paciente_id: pacientes[0]?.id || 1,
			fecha_consulta: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
			motivo: 'Colocación de corona',
			diagnostico: 'Seguimiento',
			observaciones: 'Corona se encuentra en buen estado'
		},
		{
			id: 4,
			paciente_id: pacientes[1]?.id || 2,
			fecha_consulta: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
			motivo: 'Control de endodoncia',
			diagnostico: 'Recuperación normal',
			observaciones: 'Paciente sin molestias'
		}
	];

	saveCollection(NS_CONSULTAS, KEY_CONSULTAS, mockConsultas);
}
