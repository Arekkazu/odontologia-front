<script lang="ts">
	import { Card, Button, Badge } from '$lib/ui';
	import { onMount, onDestroy } from 'svelte';
	import { horario, tiempoActual, formatTime, formatTimeShort } from '$lib/stores/horario';
	import { browser } from '$app/environment';
	import {
		horarioService,
		type CalendarioMensual,
		type ResumenMensual
	} from '$lib/services/api/horario';

	// ============================================
	// ESTADO LOCAL
	// ============================================
	let displayTime = '0h 00m 00s';
	let tickInterval: number | null = null;

	// Estados de carga
	let loadingCalendar = false;
	let loadingDashboard = false;
	let errorCalendar: string | null = null;
	let errorDashboard: string | null = null;

	// Datos del backend
	let calendarioData: CalendarioMensual | null = null;
	let dashboardData: {
		horario: {
			hoy_ms: number;
			total_mes_ms: number;
			alerta_8h: boolean;
			alerta_tiempo_extra: boolean;
		};
		resumen_mes: ResumenMensual;
	} | null = null;

	// ============================================
	// CRONÓMETRO
	// ============================================
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

	async function handleIniciar() {
		try {
			await horario.iniciar();
			if (browser) {
				console.log('✅ Jornada iniciada');
			}
			// Recargar dashboard
			await loadDashboard();
		} catch (error) {
			console.error('Error iniciando jornada:', error);
			alert('Error al iniciar jornada. Por favor intenta de nuevo.');
		}
	}

	async function handlePausar() {
		try {
			await horario.pausar();
			if (browser) {
				console.log('⏸️ Cronómetro pausado');
			}
		} catch (error) {
			console.error('Error pausando:', error);
		}
	}

	async function handleReanudar() {
		try {
			await horario.reanudar();
			if (browser) {
				console.log('▶️ Cronómetro reanudado');
			}
		} catch (error) {
			console.error('Error reanudando:', error);
		}
	}

	async function handleDetener() {
		const ok = confirm('¿Guardar salida y finalizar jornada de hoy?');
		if (!ok) return;

		try {
			await horario.detener();
			if (browser) {
				console.log('⏹️ Jornada finalizada:', displayTime);
			}
			alert(`Jornada guardada: ${displayTime}`);
			// Recargar datos
			await loadDashboard();
			await loadCalendar();
		} catch (error) {
			console.error('Error deteniendo:', error);
			alert('Error al guardar salida. Por favor intenta de nuevo.');
		}
	}

	// ============================================
	// CALENDARIO MENSUAL
	// ============================================
	let currentDate = new Date();

	async function loadCalendar() {
		loadingCalendar = true;
		errorCalendar = null;
		try {
			const year = currentDate.getFullYear();
			const month = currentDate.getMonth() + 1; // getMonth() es 0-indexed
			calendarioData = await horarioService.getCalendarioMensual(year, month);
		} catch (error) {
			errorCalendar = error instanceof Error ? error.message : 'Error cargando calendario';
			console.error('Error cargando calendario:', error);
		} finally {
			loadingCalendar = false;
		}
	}

	async function prevMonth() {
		currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
		await loadCalendar();
	}

	async function nextMonth() {
		currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
		await loadCalendar();
	}

	// Construir días del calendario con datos reales
	$: monthDays =
		calendarioData?.days.map((dia) => {
			const [year, month, day] = dia.date.split('-').map(Number);
			return {
				date: new Date(year, month - 1, day),
				label: String(day),
				type: dia.type,
				workedMs: dia.worked_ms,
				dateString: dia.date
			};
		}) || [];

	// Usar resumen del backend
	$: resumenMes = calendarioData?.summary
		? {
				total: formatTimeShort(calendarioData.summary.total_ms),
				normales: formatTimeShort(calendarioData.summary.normales_ms),
				extras: formatTimeShort(calendarioData.summary.extras_ms),
				diasTrabajados: calendarioData.summary.dias_trabajados,
				promedioDiario: formatTimeShort(calendarioData.summary.promedio_diario_ms)
			}
		: {
				total: '0h 00m',
				normales: '0h 00m',
				extras: '0h 00m',
				diasTrabajados: 0,
				promedioDiario: '0h 00m'
			};

	// ============================================
	// DASHBOARD
	// ============================================
	async function loadDashboard() {
		loadingDashboard = true;
		errorDashboard = null;
		try {
			dashboardData = await horarioService.getHorarioDashboard();
		} catch (error) {
			errorDashboard = error instanceof Error ? error.message : 'Error cargando dashboard';
			console.error('Error cargando dashboard:', error);
		} finally {
			loadingDashboard = false;
		}
	}

	$: hoyTiempoBackend = dashboardData ? formatTimeShort(dashboardData.horario.hoy_ms) : '0h 00m';
	$: totalMesBackend = dashboardData
		? formatTimeShort(dashboardData.horario.total_mes_ms)
		: '0h 00m';
	$: alerta8h = dashboardData?.horario.alerta_8h || false;
	$: alertaTiempoExtra = dashboardData?.horario.alerta_tiempo_extra || false;

	// ============================================
	// VER DETALLE DE DÍA
	// ============================================
	async function verDetalleDia(fecha: string) {
		try {
			const dia = await horarioService.getDia(fecha);
			if (dia) {
				const entrada = dia.hora_entrada
					? new Date(dia.hora_entrada).toLocaleTimeString('es-ES')
					: 'No registrada';
				const salida = dia.hora_salida
					? new Date(dia.hora_salida).toLocaleTimeString('es-ES')
					: 'No registrada';
				const total = dia.total_ms ? formatTimeShort(dia.total_ms) : '0h 00m';

				alert(`Detalle del ${fecha}

Entrada: ${entrada}
Salida: ${salida}
Total trabajado: ${total}
Tipo: ${dia.tipo}

${dia.notas || ''}`);
			} else {
				alert(`No hay registro para el día ${fecha}`);
			}
		} catch (error) {
			console.error('Error obteniendo detalle:', error);
			alert('Error al cargar los detalles del día');
		}
	}

	// ============================================
	// LIFECYCLE
	// ============================================
	onMount(async () => {
		startTicking();

		// Cargar datos del backend
		await Promise.all([loadCalendar(), loadDashboard()]);

		if (browser) {
			console.log('🕐 Página de horario cargada. Estado actual:', {
				isRunning: $horario.isRunning,
				isPaused: $horario.isPaused,
				fecha: $horario.fecha,
				accumulatedMs: $horario.accumulatedMs,
				syncedWithBackend: $horario.syncedWithBackend
			});
		}
	});

	onDestroy(() => {
		stopTicking();
		if (browser) {
			console.log('👋 Saliendo de página de horario');
		}
	});

	// Helper para formatear
	function computeDisplay(ms: number): string {
		return formatTimeShort(ms);
	}
</script>

<section class="horario">
	<!-- Panel Cronómetro -->
	<Card title="Control de horario" subtitle="Registro de jornada laboral" hoverable>
		<div class="cronometro">
			<div class="indicadores">
				<div class="contador">
					<span class="label">Hoy (cronómetro):</span>
					<span class="value">{displayTime}</span>
				</div>
				{#if dashboardData}
					<div class="contador-backend">
						<span class="label-small">Backend: {hoyTiempoBackend}</span>
						<span class="label-small">Total mes: {totalMesBackend}</span>
					</div>
				{/if}
				<div class="estado">
					{#if $horario.isRunning && !$horario.isPaused}
						<Badge variant="success" pill>Activo</Badge>
					{:else if $horario.isPaused}
						<Badge variant="info" pill>Pausado</Badge>
					{:else}
						<Badge variant="neutral" pill>No iniciado</Badge>
					{/if}
					{#if $horario.syncedWithBackend}
						<Badge variant="success">✓ Sincronizado</Badge>
					{:else if $horario.isRunning}
						<Badge variant="warning">⚠ No sincronizado</Badge>
					{/if}
				</div>
			</div>

			{#if alerta8h || alertaTiempoExtra}
				<div class="alertas">
					{#if alerta8h}
						<Badge variant="info">⏰ Completarás 8h en breve</Badge>
					{/if}
					{#if alertaTiempoExtra}
						<Badge variant="warning">⚠️ Tienes tiempo extra este mes</Badge>
					{/if}
				</div>
			{/if}

			<div class="acciones">
				{#if !$horario.isRunning}
					<Button variant="primary" size="sm" on:click={handleIniciar}>Iniciar jornada</Button>
				{:else}
					<Button variant="outline" size="sm" on:click={handlePausar} disabled={$horario.isPaused}>
						Pausar
					</Button>
					<Button
						variant="outline"
						size="sm"
						on:click={handleReanudar}
						disabled={!$horario.isPaused}
					>
						Reanudar
					</Button>
					<Button variant="danger" size="sm" on:click={handleDetener}>Guardar salida</Button>
				{/if}
			</div>
			<div class="autosave text-soft">
				💾 Guardado automático cada minuto {$horario.isRunning ? '(local + backend)' : ''}
			</div>
		</div>
	</Card>

	<!-- Panel Registro Diario -->
	<Card title="Registro diario" subtitle="Información de la jornada" hoverable>
		<div class="registro-diario">
			<div class="info-message">
				<p>⏰ Inicia tu jornada con el botón "Iniciar jornada"</p>
				<p>💾 Tu tiempo se guarda automáticamente en local y en el servidor</p>
				{#if $horario.horarioId}
					<p>🆔 ID de registro: #{$horario.horarioId}</p>
				{/if}
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
				<Badge variant="neutral">No trabajado</Badge>
			</div>
		</div>
	</Card>

	<!-- Panel Calendario -->
	<Card
		title="Calendario mensual"
		subtitle={`${currentDate.toLocaleString('es-ES', { month: 'long' })} ${currentDate.getFullYear()}`}
		hoverable
	>
		<div class="calendar-controls">
			<Button variant="outline" size="sm" on:click={prevMonth} disabled={loadingCalendar}>
				← Mes anterior
			</Button>
			<Button variant="outline" size="sm" on:click={nextMonth} disabled={loadingCalendar}>
				Mes siguiente →
			</Button>
		</div>

		{#if loadingCalendar}
			<div class="loading-message">Cargando calendario...</div>
		{:else if errorCalendar}
			<div class="error-message">
				<p>{errorCalendar}</p>
				<Button variant="primary" size="sm" on:click={loadCalendar}>Reintentar</Button>
			</div>
		{:else if monthDays.length === 0}
			<div class="empty-message">No hay datos para este mes</div>
		{:else}
			<div class="calendar-legend">
				<Badge variant="success" pill>Normal (verde)</Badge>
				<Badge variant="warning" pill>Extra (naranja)</Badge>
				<Badge variant="neutral" pill>No trabajado (gris)</Badge>
			</div>
			<div class="calendar-grid">
				{#each monthDays as d (d.dateString)}
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
							<Button variant="outline" size="sm" on:click={() => verDetalleDia(d.dateString)}>
								Ver detalle
							</Button>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</Card>

	<!-- Panel Resumen -->
	<Card title="Resumen del mes" hoverable>
		{#if loadingDashboard}
			<div class="loading-message">Cargando resumen...</div>
		{:else if errorDashboard}
			<div class="error-message">
				<p>{errorDashboard}</p>
				<Button variant="primary" size="sm" on:click={loadDashboard}>Reintentar</Button>
			</div>
		{:else}
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
				<Button variant="outline" on:click={loadDashboard}>🔄 Actualizar</Button>
			</div>
		{/if}
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
	.contador-backend {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}
	.label-small {
		font-size: var(--font-size-xs);
		color: var(--color-text-soft);
	}
	.estado {
		display: flex;
		gap: var(--space-2);
		align-items: center;
		flex-wrap: wrap;
	}
	.alertas {
		display: flex;
		gap: var(--space-2);
		flex-wrap: wrap;
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

	/* Estados */
	.loading-message,
	.error-message,
	.empty-message {
		padding: var(--space-4);
		text-align: center;
		color: var(--color-text-soft);
	}

	.error-message {
		color: var(--color-danger);
	}

	.error-message p {
		margin-bottom: var(--space-3);
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
