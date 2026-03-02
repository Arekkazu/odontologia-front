<script lang="ts">
	import { Card, Button, Badge } from '$lib/ui';
	import { onMount, onDestroy } from 'svelte';
	import { horario, tiempoActual, formatTime, formatTimeShort } from '$lib/stores/horario';
	import { browser } from '$app/environment';

	let displayTime = '0h 00m 00s';
	let tickInterval: number | null = null;

	// Actualizar display cada segundo
	function updateDisplay() {
		tiempoActual.subscribe((ms) => {
			displayTime = formatTime(ms);
		})();
	}

	function startTicking() {
		stopTicking();
		updateDisplay();
		tickInterval = window.setInterval(updateDisplay, 1000);
	}

	function stopTicking() {
		if (tickInterval !== null) {
			clearInterval(tickInterval);
			tickInterval = null;
		}
	}

	function handlePausar() {
		horario.pausar();
		if (browser) {
			console.log('⏸️ Cronómetro pausado');
		}
	}

	function handleReanudar() {
		horario.reanudar();
		if (browser) {
			console.log('▶️ Cronómetro reanudado');
		}
	}

	function handleDetener() {
		const ok = confirm('¿Guardar salida y finalizar jornada de hoy?');
		if (!ok) return;

		horario.detener();
		if (browser) {
			console.log('⏹️ Jornada finalizada:', displayTime);
		}
		alert(`Jornada guardada: ${displayTime}`);
	}

	onMount(() => {
		startTicking();

		// Log para debug
		if (browser) {
			console.log('🕐 Cronómetro iniciado. Estado actual:', {
				isRunning: $horario.isRunning,
				isPaused: $horario.isPaused,
				fecha: $horario.fecha,
				accumulatedMs: $horario.accumulatedMs,
				localStorage: localStorage.getItem('horario_cronometro')
			});
		}
	});

	onDestroy(() => {
		stopTicking();
		if (browser) {
			console.log('👋 Saliendo de página de horario, estado guardado en localStorage');
		}
	});

	// Calendario mensual (placeholder)
	let currentDate = new Date();
	let monthDays: Array<{
		date: Date;
		label: string;
		type: 'normal' | 'extra' | 'none';
		workedMs: number;
	}> = [];

	function computeDisplay(ms: number): string {
		return formatTimeShort(ms);
	}

	function buildMonth(date: Date) {
		const year = date.getFullYear();
		const month = date.getMonth();
		const lastDay = new Date(year, month + 1, 0);
		const totalDays = lastDay.getDate();

		const days: typeof monthDays = [];
		for (let d = 1; d <= totalDays; d++) {
			const dayDate = new Date(year, month, d);

			// Placeholder: lógica de ejemplo
			const weekend = dayDate.getDay() === 0 || dayDate.getDay() === 6;
			const workedMs = weekend ? 0 : Math.floor(Math.random() * 5 * 60 * 60 * 1000);
			const type: 'normal' | 'extra' | 'none' =
				workedMs === 0 ? 'none' : workedMs > 8 * 60 * 60 * 1000 ? 'extra' : 'normal';

			days.push({
				date: dayDate,
				label: String(d),
				type,
				workedMs
			});
		}
		monthDays = days;
	}

	function prevMonth() {
		currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
		buildMonth(currentDate);
	}

	function nextMonth() {
		currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
		buildMonth(currentDate);
	}

	$: buildMonth(currentDate);

	// Resumen del mes (placeholder)
	$: resumenMes = (() => {
		const totalMs = monthDays.reduce((sum, d) => sum + d.workedMs, 0);
		const extrasMs = monthDays
			.filter((d) => d.type === 'extra')
			.reduce((sum, d) => sum + d.workedMs, 0);
		const normalesMs = totalMs - extrasMs;
		const diasTrabajados = monthDays.filter((d) => d.workedMs > 0).length;
		const promedioDiarioMs = diasTrabajados > 0 ? Math.floor(totalMs / diasTrabajados) : 0;

		return {
			total: computeDisplay(totalMs),
			normales: computeDisplay(normalesMs),
			extras: computeDisplay(extrasMs),
			diasTrabajados,
			promedioDiario: computeDisplay(promedioDiarioMs)
		};
	})();
</script>

<section class="horario">
	<!-- Panel Cronómetro -->
	<Card title="Control de horario" subtitle="Registro de jornada laboral" hoverable>
		<div class="cronometro">
			<div class="indicadores">
				<div class="contador">
					<span class="label">Hoy:</span>
					<span class="value">{displayTime}</span>
				</div>
				<div class="estado">
					{#if $horario.isRunning && !$horario.isPaused}
						<Badge variant="success" pill>Activo</Badge>
					{:else if $horario.isPaused}
						<Badge variant="info" pill>Pausado</Badge>
					{:else}
						<Badge variant="neutral" pill>Finalizado</Badge>
					{/if}
				</div>
			</div>
			<div class="acciones">
				<Button
					variant="outline"
					size="sm"
					on:click={handlePausar}
					disabled={!$horario.isRunning || $horario.isPaused}
				>
					Pausar
				</Button>
				<Button
					variant="outline"
					size="sm"
					on:click={handleReanudar}
					disabled={!$horario.isRunning || !$horario.isPaused}
				>
					Reanudar
				</Button>
				<Button variant="danger" size="sm" on:click={handleDetener} disabled={!$horario.isRunning}>
					Guardar salida
				</Button>
			</div>
			<div class="autosave text-soft">💾 Guardado automático cada minuto</div>
		</div>
	</Card>

	<!-- Panel Registro Diario -->
	<Card title="Registro diario" subtitle="Información de la jornada" hoverable>
		<div class="registro-diario">
			<div class="info-message">
				<p>⏰ El registro de horario inicia automáticamente al iniciar sesión</p>
				<p>💾 Tu tiempo se guarda automáticamente</p>
			</div>
			<div class="row">
				<div class="field">
					<label>Hora de entrada</label>
					<div class="value">
						{#if $horario.startTime}
							{new Date($horario.startTime).toLocaleTimeString('es-ES')}
						{:else}
							No iniciado
						{/if}
					</div>
				</div>
				<div class="field">
					<label>Fecha</label>
					<div class="value">
						{new Date($horario.fecha).toLocaleDateString('es-ES', {
							weekday: 'long',
							year: 'numeric',
							month: 'long',
							day: 'numeric'
						})}
					</div>
				</div>
			</div>
			<div class="row">
				<Badge variant="success">Día normal</Badge>
				<Badge variant="warning">Hora extra</Badge>
			</div>
		</div>
	</Card>

	<!-- Panel Calendario -->
	<Card
		title="Calendario mensual"
		subtitle={`${currentDate.toLocaleString('default', { month: 'long' })} ${currentDate.getFullYear()}`}
		hoverable
	>
		<div class="calendar-controls">
			<Button variant="outline" size="sm" on:click={prevMonth}>← Mes anterior</Button>
			<Button variant="outline" size="sm" on:click={nextMonth}>Mes siguiente →</Button>
		</div>
		<div class="calendar-legend">
			<Badge variant="success" pill>Normal (verde)</Badge>
			<Badge variant="warning" pill>Extra (naranja)</Badge>
			<Badge variant="neutral" pill>No trabajado (gris)</Badge>
		</div>
		<div class="calendar-grid">
			{#each monthDays as d (d.date.getTime())}
				<div class={`calendar-day ${d.type}`}>
					<div class="day-header">
						<span class="day-number">{d.label}</span>
						{#if d.type === 'extra'}
							<span class="extra-indicator">EX</span>
						{/if}
					</div>
					<div class="day-body">
						{#if d.workedMs > 0}
							<span class="worked">{computeDisplay(d.workedMs)}</span>
						{:else}
							<span class="worked text-soft">—</span>
						{/if}
					</div>
					<div class="day-actions">
						<Button variant="outline" size="sm">Ver detalle</Button>
					</div>
				</div>
			{/each}
		</div>
	</Card>

	<!-- Panel Resumen -->
	<Card title="Resumen del mes" hoverable>
		<div class="resumen-grid">
			<div class="resumen-item">
				<div class="label">Total</div>
				<div class="value">{resumenMes.total}</div>
			</div>
			<div class="resumen-item">
				<div class="label">Normales</div>
				<div class="value text-success">{resumenMes.normales}</div>
			</div>
			<div class="resumen-item">
				<div class="label">Extras</div>
				<div class="value text-warning">{resumenMes.extras}</div>
			</div>
			<div class="resumen-item">
				<div class="label">Días trabajados</div>
				<div class="value">{resumenMes.diasTrabajados}</div>
			</div>
			<div class="resumen-item">
				<div class="label">Promedio diario</div>
				<div class="value">{resumenMes.promedioDiario}</div>
			</div>
		</div>
		<div class="resumen-actions">
			<Button variant="secondary">Exportar reporte</Button>
			<Button variant="outline">Ver meses anteriores</Button>
		</div>
	</Card>
</section>

<style>
	.horario {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	/* Cronómetro */
	.cronometro {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}
	.indicadores {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: var(--space-3);
	}
	.contador .label {
		font-size: var(--font-size-sm);
		color: var(--color-text-soft);
		margin-right: var(--space-2);
	}
	.contador .value {
		font-weight: 800;
		font-size: var(--font-size-2xl);
		color: var(--color-brand-600);
	}
	.acciones {
		display: inline-flex;
		gap: var(--space-2);
		flex-wrap: wrap;
	}
	.autosave {
		font-size: var(--font-size-sm);
	}

	/* Registro diario */
	.registro-diario {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}
	.info-message {
		background: var(--color-brand-50);
		border: 1px solid var(--color-brand-200);
		border-radius: var(--radius-sm);
		padding: var(--space-3);
		font-size: var(--font-size-sm);
		color: var(--color-text-soft);
	}
	.info-message p {
		margin: var(--space-2) 0;
	}
	.registro-diario .row {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: var(--space-3);
	}
	.field {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}
	.field label {
		font-size: var(--font-size-sm);
		font-weight: 600;
		color: var(--color-text-soft);
	}
	.field .value {
		font-size: var(--font-size-md);
		font-weight: 600;
		color: var(--color-text);
	}
	@media (max-width: 640px) {
		.registro-diario .row {
			grid-template-columns: 1fr;
		}
	}

	/* Calendario */
	.calendar-controls {
		display: flex;
		justify-content: space-between;
		margin-bottom: var(--space-3);
	}
	.calendar-legend {
		display: inline-flex;
		gap: var(--space-2);
		margin-bottom: var(--space-2);
		align-items: center;
		flex-wrap: wrap;
	}
	.calendar-grid {
		display: grid;
		grid-template-columns: repeat(7, 1fr);
		gap: var(--space-2);
	}
	@media (max-width: 768px) {
		.calendar-grid {
			grid-template-columns: repeat(4, 1fr);
		}
	}
	@media (max-width: 480px) {
		.calendar-grid {
			grid-template-columns: repeat(3, 1fr);
		}
	}
	.calendar-day {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		min-height: 90px;
		padding: var(--space-2);
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}
	.calendar-day.normal {
		background: #e8f5e9;
		border-color: #81c784;
	}
	.calendar-day.extra {
		background: #fff3e0;
		border-color: #ffb74d;
	}
	.calendar-day.none {
		background: #f5f5f5;
		border-color: #e0e0e0;
	}

	.day-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
	.day-number {
		font-weight: 700;
		font-size: var(--font-size-sm);
	}
	.extra-indicator {
		font-size: var(--font-size-xs);
		background: var(--color-warning);
		color: var(--color-black);
		border-radius: var(--radius-full);
		padding: 0 var(--space-2);
		height: 1.25rem;
		display: inline-flex;
		align-items: center;
		border: 1px solid rgba(0, 0, 0, 0.08);
		font-weight: 700;
	}
	.day-body {
		display: flex;
		align-items: center;
		min-height: 24px;
	}
	.worked {
		font-weight: 600;
		font-size: var(--font-size-sm);
	}
	.day-actions {
		display: flex;
		justify-content: flex-end;
	}

	/* Resumen */
	.resumen-grid {
		display: grid;
		grid-template-columns: repeat(5, 1fr);
		gap: var(--space-3);
		margin-bottom: var(--space-3);
	}
	@media (max-width: 768px) {
		.resumen-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}
	.resumen-item {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		padding: var(--space-3);
	}
	.resumen-item .label {
		font-size: var(--font-size-sm);
		color: var(--color-text-soft);
		margin-bottom: var(--space-2);
	}
	.resumen-item .value {
		font-size: var(--font-size-xl);
		font-weight: 700;
	}
	.resumen-actions {
		display: inline-flex;
		gap: var(--space-2);
		flex-wrap: wrap;
	}

	.text-soft {
		color: var(--color-text-soft);
	}
	.text-success {
		color: var(--color-success);
	}
	.text-warning {
		color: var(--color-warning);
	}
</style>
