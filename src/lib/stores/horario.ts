import { writable, derived, get } from 'svelte/store';
import { browser } from '$app/environment';
import { horarioService } from '$lib/services/api/horario';

interface HorarioState {
	isRunning: boolean;
	isPaused: boolean;
	startTime: number | null; // timestamp
	pauseStart: number | null; // timestamp
	accumulatedMs: number;
	fecha: string; // YYYY-MM-DD
	lastUpdate: number; // timestamp
	horarioId: number | null; // ID del registro en backend
	syncedWithBackend: boolean; // indica si está sincronizado
}

const STORAGE_KEY = 'horario_cronometro';
const AUTOSAVE_INTERVAL = 60 * 1000; // 1 minuto

// Estado inicial
function getInitialState(): HorarioState {
	if (!browser) {
		return {
			isRunning: false,
			isPaused: false,
			startTime: null,
			pauseStart: null,
			accumulatedMs: 0,
			fecha: new Date().toISOString().split('T')[0],
			lastUpdate: Date.now(),
			horarioId: null,
			syncedWithBackend: false
		};
	}

	const stored = localStorage.getItem(STORAGE_KEY);
	if (stored) {
		try {
			const parsed: HorarioState = JSON.parse(stored);
			const today = new Date().toISOString().split('T')[0];

			// Si la fecha guardada es de hoy, recuperar el estado
			if (parsed.fecha === today && parsed.isRunning) {
				// Recuperar tiempo acumulado hasta el último guardado
				if (parsed.startTime && !parsed.isPaused) {
					// Si estaba corriendo, agregar el tiempo desde el último guardado hasta ahora
					const timeSinceLastUpdate = Date.now() - parsed.lastUpdate;
					parsed.accumulatedMs += timeSinceLastUpdate;
				}
				parsed.startTime = Date.now(); // Reiniciar desde ahora
				parsed.lastUpdate = Date.now();
				return parsed;
			}

			// Si es otro día, resetear
			return {
				isRunning: false,
				isPaused: false,
				startTime: null,
				pauseStart: null,
				accumulatedMs: 0,
				fecha: today,
				lastUpdate: Date.now(),
				horarioId: null,
				syncedWithBackend: false
			};
		} catch (err) {
			console.error('Error recuperando estado del cronómetro:', err);
		}
	}

	return {
		isRunning: false,
		isPaused: false,
		startTime: null,
		pauseStart: null,
		accumulatedMs: 0,
		fecha: new Date().toISOString().split('T')[0],
		lastUpdate: Date.now(),
		horarioId: null,
		syncedWithBackend: false
	};
}

// Store principal
const horarioState = writable<HorarioState>(getInitialState());

// Función para guardar en localStorage
function saveToStorage(state: HorarioState) {
	if (!browser) return;
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
	} catch (err) {
		console.error('Error guardando estado del cronómetro:', err);
	}
}

// Función para sincronizar snapshot con backend
async function syncSnapshot(state: HorarioState) {
	if (!browser || !state.isRunning) return;

	try {
		const snapshot = await horarioService.guardarSnapshot({
			fecha: state.fecha,
			accumulated_ms: state.accumulatedMs,
			is_running: state.isRunning,
			is_paused: state.isPaused
		});

		console.log('✅ Snapshot sincronizado con backend:', snapshot);

		// Actualizar que está sincronizado
		horarioState.update((s) => ({
			...s,
			syncedWithBackend: true
		}));
	} catch (error) {
		console.error('❌ Error sincronizando snapshot con backend:', error);
		// No lanzamos error, el store local sigue funcionando
	}
}

// Store derivado para el display del tiempo actual
export const tiempoActual = derived(horarioState, ($state) => {
	if (!$state.isRunning) {
		return $state.accumulatedMs;
	}

	if ($state.isPaused) {
		return $state.accumulatedMs;
	}

	if ($state.startTime) {
		return $state.accumulatedMs + (Date.now() - $state.startTime);
	}

	return $state.accumulatedMs;
});

// Formatear tiempo en formato legible
export function formatTime(ms: number): string {
	const totalMinutes = Math.floor(ms / 60000);
	const hours = Math.floor(totalMinutes / 60);
	const minutes = totalMinutes % 60;
	const seconds = Math.floor((ms % 60000) / 1000);
	return `${hours}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
}

export function formatTimeShort(ms: number): string {
	const totalMinutes = Math.floor(ms / 60000);
	const hours = Math.floor(totalMinutes / 60);
	const minutes = totalMinutes % 60;
	return `${hours}h ${String(minutes).padStart(2, '0')}m`;
}

// Acciones del cronómetro
export const horario = {
	subscribe: horarioState.subscribe,

	/**
	 * Iniciar jornada laboral
	 * Sincroniza con backend llamando a POST /api/horario/entry
	 */
	async iniciar() {
		const now = Date.now();
		const today = new Date().toISOString().split('T')[0];

		// Primero actualizar el store local
		horarioState.update((state) => {
			const newState: HorarioState = {
				isRunning: true,
				isPaused: false,
				startTime: now,
				pauseStart: null,
				accumulatedMs: 0,
				fecha: today,
				lastUpdate: now,
				horarioId: null,
				syncedWithBackend: false
			};
			saveToStorage(newState);
			return newState;
		});

		// Intentar sincronizar con backend
		if (browser) {
			try {
				const registro = await horarioService.registrarEntrada({
					fecha: today,
					hora_entrada: new Date(now).toISOString()
				});

				console.log('✅ Entrada registrada en backend:', registro);

				// Actualizar con el ID del backend
				horarioState.update((state) => {
					const newState = {
						...state,
						horarioId: registro.id,
						syncedWithBackend: true
					};
					saveToStorage(newState);
					return newState;
				});
			} catch (error) {
				console.error('❌ Error registrando entrada en backend:', error);
				// No lanzamos error, el store local sigue funcionando
			}
		}
	},

	/**
	 * Pausar cronómetro
	 * Sincroniza con backend llamando a POST /api/horario/pause/start
	 */
	async pausar() {
		const now = Date.now();

		horarioState.update((state) => {
			if (!state.isRunning || state.isPaused || !state.startTime) return state;

			const newState: HorarioState = {
				...state,
				isPaused: true,
				pauseStart: now,
				accumulatedMs: state.accumulatedMs + (now - state.startTime),
				startTime: null,
				lastUpdate: now,
				syncedWithBackend: false
			};
			saveToStorage(newState);
			return newState;
		});

		// Intentar sincronizar con backend
		if (browser) {
			try {
				const pausa = await horarioService.iniciarPausa({
					fecha: get(horarioState).fecha,
					hora_inicio: new Date(now).toISOString()
				});

				console.log('✅ Pausa iniciada en backend:', pausa);

				horarioState.update((state) => {
					const newState = { ...state, syncedWithBackend: true };
					saveToStorage(newState);
					return newState;
				});
			} catch (error) {
				console.error('❌ Error iniciando pausa en backend:', error);
			}
		}
	},

	/**
	 * Reanudar cronómetro
	 * Sincroniza con backend llamando a POST /api/horario/pause/end
	 */
	async reanudar() {
		const now = Date.now();

		horarioState.update((state) => {
			if (!state.isRunning || !state.isPaused) return state;

			const newState: HorarioState = {
				...state,
				isPaused: false,
				pauseStart: null,
				startTime: now,
				lastUpdate: now,
				syncedWithBackend: false
			};
			saveToStorage(newState);
			return newState;
		});

		// Intentar sincronizar con backend
		if (browser) {
			try {
				const pausa = await horarioService.finalizarPausa({
					fecha: get(horarioState).fecha,
					hora_fin: new Date(now).toISOString()
				});

				console.log('✅ Pausa finalizada en backend:', pausa);

				horarioState.update((state) => {
					const newState = { ...state, syncedWithBackend: true };
					saveToStorage(newState);
					return newState;
				});
			} catch (error) {
				console.error('❌ Error finalizando pausa en backend:', error);
			}
		}
	},

	/**
	 * Detener y guardar salida
	 * Sincroniza con backend llamando a POST /api/horario/exit
	 */
	async detener() {
		const now = Date.now();

		const currentState = get(horarioState);
		if (!currentState.isRunning) return;

		let finalAccumulated = currentState.accumulatedMs;
		if (currentState.startTime && !currentState.isPaused) {
			finalAccumulated += now - currentState.startTime;
		}

		// Actualizar store local
		horarioState.update((state) => {
			const newState: HorarioState = {
				isRunning: false,
				isPaused: false,
				startTime: null,
				pauseStart: null,
				accumulatedMs: finalAccumulated,
				fecha: state.fecha,
				lastUpdate: now,
				horarioId: state.horarioId,
				syncedWithBackend: false
			};
			saveToStorage(newState);
			return newState;
		});

		// Intentar sincronizar con backend
		if (browser) {
			try {
				const registro = await horarioService.registrarSalida({
					fecha: currentState.fecha,
					hora_salida: new Date(now).toISOString()
				});

				console.log('✅ Salida registrada en backend:', registro);

				horarioState.update((state) => {
					const newState = { ...state, syncedWithBackend: true };
					saveToStorage(newState);
					return newState;
				});
			} catch (error) {
				console.error('❌ Error registrando salida en backend:', error);
			}
		}
	},

	/**
	 * Actualizar timestamp (para autosave)
	 */
	actualizar() {
		const now = Date.now();

		horarioState.update((state) => {
			const newState = {
				...state,
				lastUpdate: now
			};
			saveToStorage(newState);
			return newState;
		});
	},

	/**
	 * Sincronizar con backend (para autosave)
	 */
	async sincronizar() {
		const state = get(horarioState);
		await syncSnapshot(state);
	},

	/**
	 * Recuperar estado desde el backend
	 */
	async recuperarDesdeBackend() {
		if (!browser) return;

		const today = new Date().toISOString().split('T')[0];

		try {
			// Intentar obtener snapshot del backend
			const snapshot = await horarioService.getSnapshot(today);

			if (snapshot) {
				console.log('✅ Snapshot recuperado del backend:', snapshot);

				horarioState.update((state) => {
					const newState: HorarioState = {
						isRunning: snapshot.is_running,
						isPaused: snapshot.is_paused,
						startTime: snapshot.is_running && !snapshot.is_paused ? Date.now() : null,
						pauseStart: snapshot.is_paused ? Date.now() : null,
						accumulatedMs: snapshot.accumulated_ms,
						fecha: today,
						lastUpdate: Date.now(),
						horarioId: null, // No viene en snapshot
						syncedWithBackend: true
					};
					saveToStorage(newState);
					return newState;
				});

				return;
			}

			// Si no hay snapshot, intentar obtener el registro de hoy
			const registroHoy = await horarioService.getToday();

			if (registroHoy) {
				console.log('✅ Registro de hoy recuperado del backend:', registroHoy);

				const now = Date.now();
				let accumulatedMs = 0;

				if (registroHoy.hora_entrada && registroHoy.is_running) {
					const entrada = new Date(registroHoy.hora_entrada).getTime();
					accumulatedMs = now - entrada;

					// Restar pausas
					if (registroHoy.pausas) {
						for (const pausa of registroHoy.pausas) {
							if (pausa.duracion_ms) {
								accumulatedMs -= pausa.duracion_ms;
							}
						}
					}
				}

				horarioState.update((state) => {
					const newState: HorarioState = {
						isRunning: registroHoy.is_running || false,
						isPaused: registroHoy.is_paused || false,
						startTime: registroHoy.is_running && !registroHoy.is_paused ? now : null,
						pauseStart: registroHoy.is_paused ? now : null,
						accumulatedMs,
						fecha: today,
						lastUpdate: now,
						horarioId: registroHoy.id,
						syncedWithBackend: true
					};
					saveToStorage(newState);
					return newState;
				});
			}
		} catch (error) {
			console.error('❌ Error recuperando desde backend:', error);
			// Si falla, usa el estado local
		}
	},

	/**
	 * Resetear estado
	 */
	reset() {
		const today = new Date().toISOString().split('T')[0];
		const newState: HorarioState = {
			isRunning: false,
			isPaused: false,
			startTime: null,
			pauseStart: null,
			accumulatedMs: 0,
			fecha: today,
			lastUpdate: Date.now(),
			horarioId: null,
			syncedWithBackend: false
		};
		horarioState.set(newState);
		saveToStorage(newState);
	}
};

// Autosave periódico (local + backend)
if (browser) {
	setInterval(async () => {
		const state = get(horarioState);
		if (state.isRunning) {
			// Guardar en localStorage
			horario.actualizar();

			// Sincronizar con backend
			await horario.sincronizar();
		}
	}, AUTOSAVE_INTERVAL);

	// Al cargar la página, intentar recuperar del backend
	horario.recuperarDesdeBackend();
}
