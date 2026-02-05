import type { StorageNamespace } from '$lib/services/storage';
import {
	loadCollection,
	saveCollection,
	upsertInCollection,
	removeFromCollection,
	generateSeqId
} from '$lib/services/storage';

/**
 * Mock services for Laboratorios and Trabajos de Laboratorio
 * Aligned with DB schema shared by the user.
 *
 * Tables (reference):
 * - laboratorios (id, nombre, direccion, telefono, email, activo, tiempo_estimado_dias)
 * - trabajos_laboratorio (id, tratamiento_id, laboratorio_id, descripcion_trabajo, estado,
 *   fecha_solicitud, fecha_envio, fecha_estimada_entrega, fecha_recepcion, fecha_entrega_paciente,
 *   costo_laboratorio)
 *
 * This module provides:
 * - Types aligned to the schema
 * - CRUD operations for laboratorios
 * - CRUD and workflow operations for trabajos de laboratorio
 * - Filters and seed data for development
 */

/* -------------------------------------------
 * Types aligned to schema
 * ------------------------------------------- */

export interface Laboratorio {
	id: number;
	nombre: string;
	direccion?: string | null;
	telefono?: string | null;
	email?: string | null;
	activo?: boolean | null; // default true
	tiempo_estimado_dias?: number | null;
}

export type EstadoTrabajoLaboratorio =
	| 'CREADO'
	| 'ENVIADO'
	| 'EN_PROCESO'
	| 'LISTO'
	| 'RECIBIDO'
	| 'ENTREGADO'
	| 'CANCELADO'
	| 'REHACER';

export interface TrabajoLaboratorio {
	id: number;
	tratamiento_id: number;
	laboratorio_id: number;
	descripcion_trabajo?: string | null;
	estado: EstadoTrabajoLaboratorio;
	fecha_solicitud: string; // YYYY-MM-DD (default CURRENT_DATE)
	fecha_envio?: string | null; // YYYY-MM-DD
	fecha_estimada_entrega?: string | null; // YYYY-MM-DD
	fecha_recepcion?: string | null; // YYYY-MM-DD
	fecha_entrega_paciente?: string | null; // YYYY-MM-DD
	costo_laboratorio?: number | null; // numeric(10, 2)
}

/* -------------------------------------------
 * Storage namespaces and keys
 * ------------------------------------------- */

const NS_LABORATORIOS: StorageNamespace = 'laboratorios';
const NS_TRABAJOS: StorageNamespace = 'trabajos_laboratorio';

const KEY_LABORATORIOS = 'collection';
const KEY_TRABAJOS = 'collection';

/* -------------------------------------------
 * Utils
 * ------------------------------------------- */

function toMoney(n: number | null | undefined): number | null {
	if (n === null || n === undefined) return null;
	return Math.round(n * 100) / 100;
}

function todayIsoDate(): string {
	const d = new Date();
	// Normalize to local date string YYYY-MM-DD
	return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().substring(0, 10);
}

function assertEstado(estado: string): asserts estado is EstadoTrabajoLaboratorio {
	const allowed: EstadoTrabajoLaboratorio[] = [
		'CREADO',
		'ENVIADO',
		'EN_PROCESO',
		'LISTO',
		'RECIBIDO',
		'ENTREGADO',
		'CANCELADO',
		'REHACER'
	];
	if (!allowed.includes(estado as EstadoTrabajoLaboratorio)) {
		throw new Error(`Estado no válido: ${estado}`);
	}
}

/* -------------------------------------------
 * Laboratorios - CRUD
 * ------------------------------------------- */

export interface CreateLaboratorioInput {
	nombre: string;
	direccion?: string | null;
	telefono?: string | null;
	email?: string | null;
	activo?: boolean | null;
	tiempo_estimado_dias?: number | null;
}

export interface UpdateLaboratorioInput {
	id: number;
	nombre?: string;
	direccion?: string | null;
	telefono?: string | null;
	email?: string | null;
	activo?: boolean | null;
	tiempo_estimado_dias?: number | null;
}

export function listLaboratorios(): Laboratorio[] {
	return loadCollection<Laboratorio>(NS_LABORATORIOS, KEY_LABORATORIOS).sort((a, b) =>
		a.nombre.localeCompare(b.nombre)
	);
}

export function getLaboratorioById(id: number): Laboratorio | null {
	const items = loadCollection<Laboratorio>(NS_LABORATORIOS, KEY_LABORATORIOS);
	return items.find((l) => l.id === id) || null;
}

export function createLaboratorio(input: CreateLaboratorioInput): Laboratorio {
	const id = generateSeqId(NS_LABORATORIOS);
	const item: Laboratorio = {
		id,
		nombre: input.nombre.trim(),
		direccion: input.direccion ?? null,
		telefono: input.telefono ?? null,
		email: input.email ?? null,
		activo: input.activo ?? true,
		tiempo_estimado_dias: input.tiempo_estimado_dias ?? null
	};
	const col = upsertInCollection<Laboratorio>(NS_LABORATORIOS, KEY_LABORATORIOS, item, () => id);
	return col.find((l) => l.id === id)!;
}

export function updateLaboratorio(input: UpdateLaboratorioInput): Laboratorio {
	const current = getLaboratorioById(input.id);
	if (!current) throw new Error(`Laboratorio ${input.id} no encontrado`);
	const next: Laboratorio = {
		...current,
		...(input.nombre !== undefined && { nombre: input.nombre.trim() }),
		...(input.direccion !== undefined && { direccion: input.direccion }),
		...(input.telefono !== undefined && { telefono: input.telefono }),
		...(input.email !== undefined && { email: input.email }),
		...(input.activo !== undefined && { activo: input.activo }),
		...(input.tiempo_estimado_dias !== undefined && {
			tiempo_estimado_dias: input.tiempo_estimado_dias
		})
	};
	const col = upsertInCollection<Laboratorio>(
		NS_LABORATORIOS,
		KEY_LABORATORIOS,
		next,
		() => next.id
	);
	const saved = col.find((l) => l.id === next.id);
	if (!saved) throw new Error('Error guardando laboratorio');
	return saved;
}

export function deleteLaboratorio(id: number): void {
	removeFromCollection<Laboratorio>(NS_LABORATORIOS, KEY_LABORATORIOS, id);
}

/* -------------------------------------------
 * Trabajos de Laboratorio - CRUD y flujo
 * ------------------------------------------- */

export interface CreateTrabajoInput {
	tratamiento_id: number;
	laboratorio_id: number;
	descripcion_trabajo?: string | null;
	estado?: EstadoTrabajoLaboratorio; // default 'CREADO'
	fecha_solicitud?: string; // default today
	fecha_envio?: string | null;
	fecha_estimada_entrega?: string | null;
	fecha_recepcion?: string | null;
	fecha_entrega_paciente?: string | null;
	costo_laboratorio?: number | null;
}

export interface UpdateTrabajoInput {
	id: number;
	tratamiento_id?: number;
	laboratorio_id?: number;
	descripcion_trabajo?: string | null;
	estado?: EstadoTrabajoLaboratorio;
	fecha_solicitud?: string;
	fecha_envio?: string | null;
	fecha_estimada_entrega?: string | null;
	fecha_recepcion?: string | null;
	fecha_entrega_paciente?: string | null;
	costo_laboratorio?: number | null;
}

export function listTrabajos(): TrabajoLaboratorio[] {
	return loadCollection<TrabajoLaboratorio>(NS_TRABAJOS, KEY_TRABAJOS).sort((a, b) => {
		// Order by latest fecha_solicitud desc, then by estado priority
		const da = new Date(a.fecha_solicitud).getTime();
		const db = new Date(b.fecha_solicitud).getTime();
		if (db !== da) return db - da;
		const prio = (e: EstadoTrabajoLaboratorio) =>
			e === 'LISTO'
				? 5
				: e === 'RECIBIDO'
					? 4
					: e === 'EN_PROCESO'
						? 3
						: e === 'ENVIADO'
							? 2
							: e === 'CREADO'
								? 1
								: 0;
		return prio(b.estado) - prio(a.estado);
	});
}

export function getTrabajoById(id: number): TrabajoLaboratorio | null {
	const items = loadCollection<TrabajoLaboratorio>(NS_TRABAJOS, KEY_TRABAJOS);
	return items.find((t) => t.id === id) || null;
}

export function listTrabajosPendientes(): TrabajoLaboratorio[] {
	// Pendientes de recoger: estados distintos a ENTREGADO/CANCELADO
	return listTrabajos().filter((t) => !['ENTREGADO', 'CANCELADO'].includes(t.estado));
}

export function createTrabajo(input: CreateTrabajoInput): TrabajoLaboratorio {
	const id = generateSeqId(NS_TRABAJOS);
	const estado = input.estado ?? 'CREADO';
	assertEstado(estado);

	// Validate laboratorio exists (optional in mock)
	const lab = getLaboratorioById(input.laboratorio_id);
	if (!lab) {
		throw new Error(`Laboratorio ${input.laboratorio_id} no existe`);
	}

	const item: TrabajoLaboratorio = {
		id,
		tratamiento_id: input.tratamiento_id,
		laboratorio_id: input.laboratorio_id,
		descripcion_trabajo: input.descripcion_trabajo ?? null,
		estado,
		fecha_solicitud: input.fecha_solicitud ?? todayIsoDate(),
		fecha_envio: input.fecha_envio ?? null,
		fecha_estimada_entrega: input.fecha_estimada_entrega ?? null,
		fecha_recepcion: input.fecha_recepcion ?? null,
		fecha_entrega_paciente: input.fecha_entrega_paciente ?? null,
		costo_laboratorio: toMoney(input.costo_laboratorio ?? null)
	};

	upsertInCollection<TrabajoLaboratorio>(NS_TRABAJOS, KEY_TRABAJOS, item, () => id);
	return item;
}

export function updateTrabajo(input: UpdateTrabajoInput): TrabajoLaboratorio {
	const current = getTrabajoById(input.id);
	if (!current) throw new Error(`Trabajo ${input.id} no encontrado`);

	if (input.estado !== undefined) assertEstado(input.estado);

	const next: TrabajoLaboratorio = {
		...current,
		...(input.tratamiento_id !== undefined && { tratamiento_id: input.tratamiento_id }),
		...(input.laboratorio_id !== undefined && { laboratorio_id: input.laboratorio_id }),
		...(input.descripcion_trabajo !== undefined && {
			descripcion_trabajo: input.descripcion_trabajo
		}),
		...(input.estado !== undefined && { estado: input.estado }),
		...(input.fecha_solicitud !== undefined && { fecha_solicitud: input.fecha_solicitud }),
		...(input.fecha_envio !== undefined && { fecha_envio: input.fecha_envio }),
		...(input.fecha_estimada_entrega !== undefined && {
			fecha_estimada_entrega: input.fecha_estimada_entrega
		}),
		...(input.fecha_recepcion !== undefined && { fecha_recepcion: input.fecha_recepcion }),
		...(input.fecha_entrega_paciente !== undefined && {
			fecha_entrega_paciente: input.fecha_entrega_paciente
		}),
		...(input.costo_laboratorio !== undefined && {
			costo_laboratorio: toMoney(input.costo_laboratorio)
		})
	};

	upsertInCollection<TrabajoLaboratorio>(NS_TRABAJOS, KEY_TRABAJOS, next, () => next.id);
	const saved = getTrabajoById(next.id);
	if (!saved) throw new Error('Error guardando trabajo de laboratorio');
	return saved;
}

export function deleteTrabajo(id: number): void {
	removeFromCollection<TrabajoLaboratorio>(NS_TRABAJOS, KEY_TRABAJOS, id);
}

/* -------------------------------------------
 * Workflow helpers
 * ------------------------------------------- */

export function marcarEnviado(id: number, fechaEnvio?: string): TrabajoLaboratorio {
	const now = fechaEnvio ?? todayIsoDate();
	return updateTrabajo({ id, estado: 'ENVIADO', fecha_envio: now });
}

export function marcarEnProceso(id: number): TrabajoLaboratorio {
	return updateTrabajo({ id, estado: 'EN_PROCESO' });
}

export function marcarListo(id: number, fechaEstimadaEntrega?: string): TrabajoLaboratorio {
	return updateTrabajo({
		id,
		estado: 'LISTO',
		fecha_estimada_entrega: fechaEstimadaEntrega ?? null
	});
}

export function marcarRecibido(id: number, fechaRecepcion?: string): TrabajoLaboratorio {
	const now = fechaRecepcion ?? todayIsoDate();
	return updateTrabajo({ id, estado: 'RECIBIDO', fecha_recepcion: now });
}

export function marcarEntregado(id: number, fechaEntregaPaciente?: string): TrabajoLaboratorio {
	const now = fechaEntregaPaciente ?? todayIsoDate();
	return updateTrabajo({ id, estado: 'ENTREGADO', fecha_entrega_paciente: now });
}

export function marcarCancelado(id: number): TrabajoLaboratorio {
	return updateTrabajo({ id, estado: 'CANCELADO' });
}

export function marcarRehacer(id: number): TrabajoLaboratorio {
	return updateTrabajo({ id, estado: 'REHACER' });
}

/* -------------------------------------------
 * Filters and helpers
 * ------------------------------------------- */

// Map estado to UI badge variant
export function estadoVariant(
	estado: EstadoTrabajoLaboratorio
): 'success' | 'warning' | 'info' | 'error' | 'neutral' {
	switch (estado) {
		case 'LISTO':
		case 'RECIBIDO':
		case 'ENTREGADO':
			return 'success';
		case 'EN_PROCESO':
		case 'ENVIADO':
			return 'info';
		case 'REHACER':
			return 'warning';
		case 'CANCELADO':
			return 'error';
		case 'CREADO':
		default:
			return 'neutral';
	}
}

export interface TrabajosFilter {
	laboratorio_id?: number;
	estado?: EstadoTrabajoLaboratorio;
	desde?: string; // fecha_solicitud desde YYYY-MM-DD
	hasta?: string; // fecha_solicitud hasta YYYY-MM-DD
}

export function filtrarTrabajos(filter: TrabajosFilter): TrabajoLaboratorio[] {
	const items = listTrabajos();
	return items.filter((t) => {
		const byLab = filter.laboratorio_id ? t.laboratorio_id === filter.laboratorio_id : true;
		const byEstado = filter.estado ? t.estado === filter.estado : true;
		const d = new Date(t.fecha_solicitud).getTime();
		const byDesde = filter.desde ? d >= new Date(filter.desde).getTime() : true;
		const byHasta = filter.hasta ? d <= new Date(filter.hasta).getTime() : true;
		return byLab && byEstado && byDesde && byHasta;
	});
}

/* -------------------------------------------
 * Seed data for development
 * ------------------------------------------- */

export function seedLaboratoriosMock(): void {
	// Avoid duplications if already seeded
	if (listLaboratorios().length > 0) return;

	createLaboratorio({
		nombre: 'Lab Dental Pro',
		direccion: 'Calle 20 # 30-40',
		telefono: '600123456',
		email: 'contacto@labdentalpro.com',
		activo: true,
		tiempo_estimado_dias: 7
	});

	createLaboratorio({
		nombre: 'Smile Lab',
		direccion: 'Av 3 # 15-22',
		telefono: '600987654',
		email: 'info@smilelab.co',
		activo: true,
		tiempo_estimado_dias: 5
	});

	createLaboratorio({
		nombre: 'DentalTech',
		direccion: 'Cra 45 # 12-10',
		telefono: '601234567',
		email: 'service@dentaltech.io',
		activo: true,
		tiempo_estimado_dias: 6
	});
}

export function seedTrabajosMock(): void {
	// Requires labs seeded
	seedLaboratoriosMock();
	const labs = listLaboratorios();
	if (labs.length === 0) return;

	// Create example trabajos loosely (tratamiento_id refs are mock numbers)
	const lab1 = labs.find((l) => l.nombre === 'Lab Dental Pro')!;
	const lab2 = labs.find((l) => l.nombre === 'Smile Lab')!;
	const lab3 = labs.find((l) => l.nombre === 'DentalTech')!;

	createTrabajo({
		tratamiento_id: 101, // mock
		laboratorio_id: lab1.id,
		descripcion_trabajo: 'Corona cerámica premolar',
		estado: 'EN_PROCESO',
		fecha_solicitud: todayIsoDate(),
		fecha_estimada_entrega: todayIsoDate(),
		costo_laboratorio: 120
	});

	createTrabajo({
		tratamiento_id: 102,
		laboratorio_id: lab2.id,
		descripcion_trabajo: 'Prótesis parcial removible',
		estado: 'ENVIADO',
		fecha_solicitud: todayIsoDate(),
		costo_laboratorio: 95.5
	});

	createTrabajo({
		tratamiento_id: 103,
		laboratorio_id: lab3.id,
		descripcion_trabajo: 'Carillas estéticas',
		estado: 'LISTO',
		fecha_solicitud: todayIsoDate(),
		fecha_estimada_entrega: todayIsoDate(),
		costo_laboratorio: 110
	});
}
