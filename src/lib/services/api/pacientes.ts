import type { StorageNamespace } from '$lib/services/storage';
import {
	loadCollection,
	saveCollection,
	upsertInCollection,
	removeFromCollection,
	generateSeqId
} from '$lib/services/storage';

/**
 * Tipos alineados al esquema de BD
 */

export interface TipoIdentificacion {
	id: number;
	codigo: string;
	descripcion: string;
}

export interface Paciente {
	id: number;
	nombre_completo: string;
	telefono?: string | null;
	direccion?: string | null;
	tipo_identificacion_id: number;
	numero_identificacion: string;
	fecha_creacion?: string | null; // timestamp
	activo?: boolean; // default true
}

export interface Consulta {
	id: number;
	paciente_id: number;
	fecha_consulta: string; // ISO timestamp
	observaciones?: string | null;
}

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

/**
 * Tipos derivados para el frontend
 */

export interface TratamientoConSaldo extends Tratamiento {
	totalPagos: number;
	saldoPendiente: number;
}

export interface PacienteResumen {
	paciente: Paciente;
	tratamientos: TratamientoConSaldo[];
	totalSaldoPaciente: number;
}

/**
 * Constantes de almacenamiento (LocalStorage)
 */
const NS_PACIENTES: StorageNamespace = 'pacientes';
const NS_CONSULTAS: StorageNamespace = 'consultas';
const NS_TRATAMIENTOS: StorageNamespace = 'tratamientos';
const NS_PAGOS: StorageNamespace = 'pagos';

// Claves de colecciones
const KEY_PACIENTES = 'collection';
const KEY_CONSULTAS = 'collection';
const KEY_TRATAMIENTOS = 'collection';
const KEY_PAGOS = 'collection';

/**
 * Utilidades
 */

function toMoney(n: number): number {
	// Asegura 2 decimales como número
	return Math.round(n * 100) / 100;
}

function nowIso(): string {
	return new Date().toISOString();
}

/**
 * Servicios mock: Pacientes
 */

export function listPacientes(): Paciente[] {
	return loadCollection<Paciente>(NS_PACIENTES, KEY_PACIENTES).sort((a, b) =>
		a.nombre_completo.localeCompare(b.nombre_completo)
	);
}

export function getPacienteById(id: number): Paciente | null {
	const items = loadCollection<Paciente>(NS_PACIENTES, KEY_PACIENTES);
	return items.find((p) => p.id === id) || null;
}

export interface CreatePacienteInput {
	nombre_completo: string;
	telefono?: string | null;
	direccion?: string | null;
	tipo_identificacion_id: number;
	numero_identificacion: string;
	activo?: boolean;
}

export function createPaciente(input: CreatePacienteInput): Paciente {
	const id = generateSeqId(NS_PACIENTES);
	const paciente: Paciente = {
		id,
		nombre_completo: input.nombre_completo.trim(),
		telefono: input.telefono ?? null,
		direccion: input.direccion ?? null,
		tipo_identificacion_id: input.tipo_identificacion_id,
		numero_identificacion: input.numero_identificacion.trim(),
		fecha_creacion: nowIso(),
		activo: input.activo ?? true
	};

	const col = upsertInCollection<Paciente>(NS_PACIENTES, KEY_PACIENTES, paciente, () =>
		generateSeqId(NS_PACIENTES)
	);
	return col.find((p) => p.id === id)!;
}

export interface UpdatePacienteInput {
	id: number;
	nombre_completo?: string;
	telefono?: string | null;
	direccion?: string | null;
	tipo_identificacion_id?: number;
	numero_identificacion?: string;
	activo?: boolean;
}

export function updatePaciente(input: UpdatePacienteInput): Paciente {
	const current = getPacienteById(input.id);
	if (!current) {
		throw new Error(`Paciente ${input.id} no encontrado`);
	}
	const next: Paciente = {
		...current,
		...(input.nombre_completo !== undefined && { nombre_completo: input.nombre_completo.trim() }),
		...(input.telefono !== undefined && { telefono: input.telefono }),
		...(input.direccion !== undefined && { direccion: input.direccion }),
		...(input.tipo_identificacion_id !== undefined && {
			tipo_identificacion_id: input.tipo_identificacion_id
		}),
		...(input.numero_identificacion !== undefined && {
			numero_identificacion: input.numero_identificacion.trim()
		}),
		...(input.activo !== undefined && { activo: input.activo })
	};
	const col = upsertInCollection<Paciente>(NS_PACIENTES, KEY_PACIENTES, next, () => next.id);
	const saved = col.find((p) => p.id === next.id);
	if (!saved) {
		throw new Error('Error al guardar paciente');
	}
	return saved;
}

export function deletePaciente(id: number): void {
	// Nota: Eliminación en cascada (consultas/tratamientos/pagos) no automática en mock.
	// Si se requiere, se puede implementar aquí según la necesidad.
	removeFromCollection<Paciente>(NS_PACIENTES, KEY_PACIENTES, id);
}

/**
 * Servicios mock: Consultas
 */

export interface CreateConsultaInput {
	paciente_id: number;
	fecha_consulta?: string; // timestamp ISO
	observaciones?: string | null;
}

export function listConsultasByPaciente(pacienteId: number): Consulta[] {
	return loadCollection<Consulta>(NS_CONSULTAS, KEY_CONSULTAS)
		.filter((c) => c.paciente_id === pacienteId)
		.sort((a, b) => new Date(b.fecha_consulta).getTime() - new Date(a.fecha_consulta).getTime());
}

export function createConsulta(input: CreateConsultaInput): Consulta {
	const id = generateSeqId(NS_CONSULTAS);
	const consulta: Consulta = {
		id,
		paciente_id: input.paciente_id,
		fecha_consulta: input.fecha_consulta ?? nowIso(),
		observaciones: input.observaciones ?? null
	};
	upsertInCollection<Consulta>(NS_CONSULTAS, KEY_CONSULTAS, consulta, () => consulta.id);
	return consulta;
}

/**
 * Servicios mock: Tratamientos
 */

export interface CreateTratamientoInput {
	consulta_id: number;
	descripcion: string;
	fecha_inicio?: string | null; // date
	fecha_fin?: string | null; // date
	costo_total?: number; // default 0
}

export function listTratamientosByConsulta(consultaId: number): Tratamiento[] {
	return loadCollection<Tratamiento>(NS_TRATAMIENTOS, KEY_TRATAMIENTOS)
		.filter((t) => t.consulta_id === consultaId)
		.sort((a, b) => {
			const ai = a.fecha_inicio ? new Date(a.fecha_inicio).getTime() : 0;
			const bi = b.fecha_inicio ? new Date(b.fecha_inicio).getTime() : 0;
			return bi - ai;
		});
}

export function createTratamiento(input: CreateTratamientoInput): Tratamiento {
	const id = generateSeqId(NS_TRATAMIENTOS);
	const tratamiento: Tratamiento = {
		id,
		consulta_id: input.consulta_id,
		descripcion: input.descripcion.trim(),
		fecha_inicio: input.fecha_inicio ?? null,
		fecha_fin: input.fecha_fin ?? null,
		costo_total: toMoney(input.costo_total ?? 0)
	};
	upsertInCollection<Tratamiento>(
		NS_TRATAMIENTOS,
		KEY_TRATAMIENTOS,
		tratamiento,
		() => tratamiento.id
	);
	return tratamiento;
}

export interface UpdateTratamientoInput {
	id: number;
	descripcion?: string;
	fecha_inicio?: string | null;
	fecha_fin?: string | null;
	costo_total?: number;
}

export function updateTratamiento(input: UpdateTratamientoInput): Tratamiento {
	const col = loadCollection<Tratamiento>(NS_TRATAMIENTOS, KEY_TRATAMIENTOS);
	const curr = col.find((t) => t.id === input.id);
	if (!curr) {
		throw new Error(`Tratamiento ${input.id} no encontrado`);
	}
	const next: Tratamiento = {
		...curr,
		...(input.descripcion !== undefined && { descripcion: input.descripcion.trim() }),
		...(input.fecha_inicio !== undefined && { fecha_inicio: input.fecha_inicio }),
		...(input.fecha_fin !== undefined && { fecha_fin: input.fecha_fin }),
		...(input.costo_total !== undefined && { costo_total: toMoney(input.costo_total) })
	};
	upsertInCollection<Tratamiento>(NS_TRATAMIENTOS, KEY_TRATAMIENTOS, next, () => next.id);
	return next;
}

export function deleteTratamiento(id: number): void {
	// Nota: en mock no se eliminan pagos automáticamente; manejar según necesidad.
	removeFromCollection<Tratamiento>(NS_TRATAMIENTOS, KEY_TRATAMIENTOS, id);
}

/**
 * Servicios mock: Pagos
 */

export interface CreatePagoInput {
	tratamiento_id: number;
	monto: number;
	fecha_pago?: string; // date
	metodo_pago?: string | null;
	observaciones?: string | null;
}

export function listPagosByTratamiento(tratamientoId: number): Pago[] {
	return loadCollection<Pago>(NS_PAGOS, KEY_PAGOS)
		.filter((p) => p.tratamiento_id === tratamientoId)
		.sort((a, b) => {
			const ad = new Date(a.fecha_pago).getTime();
			const bd = new Date(b.fecha_pago).getTime();
			return bd - ad;
		});
}

export function createPago(input: CreatePagoInput): Pago {
	const id = generateSeqId(NS_PAGOS);
	const pago: Pago = {
		id,
		tratamiento_id: input.tratamiento_id,
		fecha_pago: input.fecha_pago ?? new Date().toISOString().substring(0, 10), // YYYY-MM-DD
		monto: toMoney(input.monto),
		metodo_pago: input.metodo_pago ?? null,
		observaciones: input.observaciones ?? null
	};
	upsertInCollection<Pago>(NS_PAGOS, KEY_PAGOS, pago, () => pago.id);
	return pago;
}

/**
 * Cálculos de saldo
 */

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

export function listTratamientosConSaldoByPaciente(pacienteId: number): TratamientoConSaldo[] {
	// Obtener todas las consultas del paciente
	const consultas = listConsultasByPaciente(pacienteId);
	const tratamientosAll: Tratamiento[] = consultas.flatMap((c) => listTratamientosByConsulta(c.id));
	return tratamientosAll.map(computeTratamientoSaldo);
}

export function getPacienteResumen(pacienteId: number): PacienteResumen | null {
	const paciente = getPacienteById(pacienteId);
	if (!paciente) return null;

	const tratamientosSaldo = listTratamientosConSaldoByPaciente(pacienteId);
	const totalSaldoPaciente = toMoney(
		tratamientosSaldo.reduce((sum, t) => sum + (t.saldoPendiente || 0), 0)
	);

	return {
		paciente,
		tratamientos: tratamientosSaldo,
		totalSaldoPaciente
	};
}

/**
 * Datos iniciales mock (semilla opcional)
 * Llama a `seedMockData()` en la app para tener datos de ejemplo.
 */

export function seedMockData(): void {
	// Evitar duplicar semilla si ya existen pacientes
	const existing = listPacientes();
	if (existing.length > 0) return;

	// Tipos de identificación no se guardan aquí; se asumirán por now mocks en otro servicio.
	const p1 = createPaciente({
		nombre_completo: 'Juan Pérez',
		telefono: '3001234567',
		direccion: 'Calle 10 # 20-30',
		tipo_identificacion_id: 1,
		numero_identificacion: '1012345678',
		activo: true
	});
	const p2 = createPaciente({
		nombre_completo: 'María Gómez',
		telefono: '3017654321',
		direccion: 'Av 5 # 12-34',
		tipo_identificacion_id: 2,
		numero_identificacion: '99887766',
		activo: true
	});

	// Consulta y tratamientos para Juan
	const c1 = createConsulta({
		paciente_id: p1.id,
		observaciones: 'Dolor en molar superior derecho'
	});
	const t1 = createTratamiento({
		consulta_id: c1.id,
		descripcion: 'Endodoncia Molar Superior',
		fecha_inicio: new Date().toISOString().substring(0, 10),
		costo_total: 350.0
	});
	createPago({ tratamiento_id: t1.id, monto: 150.0, metodo_pago: 'Efectivo' });
	createPago({ tratamiento_id: t1.id, monto: 50.0, metodo_pago: 'Tarjeta' });

	// Consulta y tratamientos para María
	const c2 = createConsulta({ paciente_id: p2.id, observaciones: 'Sensibilidad en incisivos' });
	const t2 = createTratamiento({
		consulta_id: c2.id,
		descripcion: 'Limpieza y fluor',
		fecha_inicio: new Date().toISOString().substring(0, 10),
		costo_total: 120.0
	});
	createPago({ tratamiento_id: t2.id, monto: 120.0, metodo_pago: 'Efectivo' });

	// Guardar colecciones (ya se guardan en cada create, esto es opcional)
	const pcs = listPacientes();
	saveCollection<Paciente>(NS_PACIENTES, KEY_PACIENTES, pcs);
}
