import { writable, derived, get } from 'svelte/store';
import { browser } from '$app/environment';

interface HorarioState {
	isRunning: boolean;
	isPaused: boolean;
	startTime: number | null; // timestamp
	pauseStart: number | null; // timestamp
	accumulatedMs: number;
	fecha: string; // YYYY-MM-DD
	lastUpdate: number; // timestamp
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
			lastUpdate: Date.now()
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
				lastUpdate: Date.now()
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
		lastUpdate: Date.now()
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

	iniciar() {
		const now = Date.now();
		const today = new Date().toISOString().split('T')[0];

		horarioState.update((state) => {
			const newState: HorarioState = {
				isRunning: true,
				isPaused: false,
				startTime: now,
				pauseStart: null,
				accumulatedMs: 0,
				fecha: today,
				lastUpdate: now
			};
			saveToStorage(newState);
			return newState;
		});
	},

	pausar() {
		const now = Date.now();

		horarioState.update((state) => {
			if (!state.isRunning || state.isPaused || !state.startTime) return state;

			const newState: HorarioState = {
				...state,
				isPaused: true,
				pauseStart: now,
				accumulatedMs: state.accumulatedMs + (now - state.startTime),
				startTime: null,
				lastUpdate: now
			};
			saveToStorage(newState);
			return newState;
		});
	},

	reanudar() {
		const now = Date.now();

		horarioState.update((state) => {
			if (!state.isRunning || !state.isPaused) return state;

			const newState: HorarioState = {
				...state,
				isPaused: false,
				pauseStart: null,
				startTime: now,
				lastUpdate: now
			};
			saveToStorage(newState);
			return newState;
		});
	},

	detener() {
		const now = Date.now();

		horarioState.update((state) => {
			if (!state.isRunning) return state;

			let finalAccumulated = state.accumulatedMs;
			if (state.startTime && !state.isPaused) {
				finalAccumulated += now - state.startTime;
			}

			const newState: HorarioState = {
				isRunning: false,
				isPaused: false,
				startTime: null,
				pauseStart: null,
				accumulatedMs: finalAccumulated,
				fecha: state.fecha,
				lastUpdate: now
			};
			saveToStorage(newState);
			return newState;
		});
	},

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

	reset() {
		const today = new Date().toISOString().split('T')[0];
		const newState: HorarioState = {
			isRunning: false,
			isPaused: false,
			startTime: null,
			pauseStart: null,
			accumulatedMs: 0,
			fecha: today,
			lastUpdate: Date.now()
		};
		horarioState.set(newState);
		saveToStorage(newState);
	}
};

// Autosave periódico
if (browser) {
	setInterval(() => {
		const state = get(horarioState);
		if (state.isRunning) {
			horario.actualizar();
		}
	}, AUTOSAVE_INTERVAL);
}
