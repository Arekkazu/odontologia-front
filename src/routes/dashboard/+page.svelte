<script lang="ts">
	import { onMount } from 'svelte';
	import { Card, Button, Badge, Input } from '$lib/ui';
	import {
		dashboardService,
		formatMillisToTime,
		type DashboardData
	} from '$lib/services/api/dashboard';

	// Estado del dashboard
	let loading = true;
	let error: string | null = null;
	let dashboardData: DashboardData | null = null;

	// Variables computadas para el template
	$: hoyTiempo = dashboardData?.horario
		? formatMillisToTime(dashboardData.horario.hoy_ms)
		: '0h 00m';
	$: totalMes = dashboardData?.horario
		? formatMillisToTime(dashboardData.horario.total_mes_ms)
		: '0h 00m';
	$: pacientesConSaldo = dashboardData?.pacientes_saldo_pendiente || [];
	$: trabajosPendientes = dashboardData?.trabajos_laboratorio_pendientes || [];
	$: resumenMes = dashboardData?.resumen_mes;
	$: alerta8h = dashboardData?.horario?.alerta_8h || false;
	$: alertaTiempoExtra = dashboardData?.horario?.alerta_tiempo_extra || false;

	// Formatear resumen del mes
	$: horasResumen = resumenMes
		? {
				mes: new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }),
				total: formatMillisToTime(resumenMes.total_ms),
				normales: formatMillisToTime(resumenMes.normales_ms),
				extras: formatMillisToTime(resumenMes.extras_ms),
				diasTrabajados: resumenMes.dias_trabajados,
				promedioDiario: formatMillisToTime(resumenMes.promedio_diario_ms)
			}
		: {
				mes: new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }),
				total: '0h 00m',
				normales: '0h 00m',
				extras: '0h 00m',
				diasTrabajados: 0,
				promedioDiario: '0h 00m'
			};

	// Cargar datos del dashboard
	async function loadDashboard() {
		loading = true;
		error = null;
		try {
			// El backend obtiene el usuario automáticamente de la sesión
			dashboardData = await dashboardService.getDashboard();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Error al cargar el dashboard';
			console.error('Error cargando dashboard:', err);
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		loadDashboard();
	});

	// Helper para mapear estado a variante de badge
	function getEstadoBadgeVariant(
		estado: string
	): 'success' | 'info' | 'warning' | 'neutral' | 'danger' {
		switch (estado) {
			case 'LISTO':
			case 'ENTREGADO':
				return 'success';
			case 'EN_PROCESO':
			case 'ENVIADO':
				return 'info';
			case 'SOLICITADO':
				return 'warning';
			default:
				return 'neutral';
		}
	}

	// Quick actions handlers
	function goNuevoPaciente() {
		window.location.href = '/pacientes/nuevo';
	}
	function goNuevoTrabajoLab() {
		window.location.href = '/laboratorios/nuevo';
	}
	function goRegistrarPago() {
		window.location.href = '/pacientes/pagos/registrar';
	}
	function goBuscarPaciente() {
		window.location.href = '/pacientes';
	}
</script>

<section class="dashboard">
	{#if loading}
		<div class="loading-state">
			<p>Cargando dashboard...</p>
		</div>
	{:else if error}
		<div class="error-state">
			<p class="error-message">{error}</p>
			<Button variant="primary" on:click={loadDashboard}>Reintentar</Button>
		</div>
	{:else}
		<div class="grid">
			<!-- Cronómetro y estado horario -->
			<Card title="Horario laboral" subtitle="Seguimiento del día" hoverable>
				<div class="horario-panel">
					<div class="horario-info">
						<div class="contador">
							<span class="label">Hoy:</span>
							<span class="value">{hoyTiempo}</span>
						</div>
						<div class="contador">
							<span class="label">Total mes:</span>
							<span class="value">{totalMes}</span>
						</div>
					</div>
					<div class="horario-actions">
						<Button variant="primary" size="sm" on:click={() => (window.location.href = '/horario')}
							>Ir al horario</Button
						>
					</div>
				</div>
				{#if alerta8h || alertaTiempoExtra}
					<div class="alertas mt-4">
						{#if alerta8h}
							<Badge variant="info">Alerta: completarás 8h en breve</Badge>
						{/if}
						{#if alertaTiempoExtra}
							<Badge variant="warning" pill>Tiempo extra</Badge>
						{/if}
					</div>
				{/if}
			</Card>

			<!-- Pacientes con saldo pendiente -->
			<Card title="Pacientes con saldo pendiente" subtitle="Últimos casos" hoverable>
				{#if pacientesConSaldo.length === 0}
					<div class="empty-state">
						<p>No hay pacientes con saldo pendiente</p>
					</div>
				{:else}
					<div class="tabla-wrapper">
						<table class="table">
							<thead>
								<tr>
									<th>Paciente</th>
									<th>Saldo</th>
									<th>Acciones</th>
								</tr>
							</thead>
							<tbody>
								{#each pacientesConSaldo as p}
									<tr>
										<td>{p.nombre} {p.apellidos}</td>
										<td>${p.saldo.toFixed(2)}</td>
										<td>
											<div class="actions-cell">
												<Button
													variant="secondary"
													size="sm"
													on:click={() => (window.location.href = `/pacientes/${p.id}`)}
												>
													Ver
												</Button>
												<Button
													variant="outline"
													size="sm"
													on:click={() => (window.location.href = `/pacientes/${p.id}/pagar`)}
												>
													Registrar pago
												</Button>
											</div>
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{/if}
				<div class="acciones-footer">
					<Button variant="primary" on:click={goRegistrarPago}>Registrar pago</Button>
					<Button variant="outline" on:click={goBuscarPaciente}>Buscar paciente</Button>
				</div>
			</Card>

			<!-- Trabajos de laboratorio -->
			<Card title="Trabajos de laboratorio pendientes" subtitle="Seguimiento rápido" hoverable>
				{#if trabajosPendientes.length === 0}
					<div class="empty-state">
						<p>No hay trabajos de laboratorio pendientes</p>
					</div>
				{:else}
					<div class="tabla-wrapper">
						<table class="table">
							<thead>
								<tr>
									<th>ID</th>
									<th>Paciente</th>
									<th>Laboratorio</th>
									<th>Descripción</th>
									<th>Estado</th>
									<th>Acciones</th>
								</tr>
							</thead>
							<tbody>
								{#each trabajosPendientes as t}
									<tr>
										<td>#{t.id}</td>
										<td>{t.paciente.nombre} {t.paciente.apellidos}</td>
										<td>{t.laboratorio.nombre}</td>
										<td>{t.descripcion}</td>
										<td>
											<Badge variant={getEstadoBadgeVariant(t.estado)}>
												{t.estado}
											</Badge>
										</td>
										<td>
											<div class="actions-cell">
												<Button
													variant="secondary"
													size="sm"
													on:click={() => (window.location.href = `/laboratorios/trabajos/${t.id}`)}
												>
													Ver
												</Button>
											</div>
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{/if}
				<div class="acciones-footer">
					<Button variant="primary" on:click={goNuevoTrabajoLab}>Nuevo trabajo</Button>
				</div>
			</Card>

			<!-- Resumen horas extras del mes -->
			<Card title="Resumen de horas del mes" subtitle={horasResumen.mes} hoverable>
				<div class="resumen-grid">
					<div class="resumen-item">
						<div class="label">Total</div>
						<div class="value">{horasResumen.total}</div>
					</div>
					<div class="resumen-item">
						<div class="label">Normales</div>
						<div class="value text-success">{horasResumen.normales}</div>
					</div>
					<div class="resumen-item">
						<div class="label">Extras</div>
						<div class="value text-warning">{horasResumen.extras}</div>
					</div>
					<div class="resumen-item">
						<div class="label">Días trabajados</div>
						<div class="value">{horasResumen.diasTrabajados}</div>
					</div>
					<div class="resumen-item">
						<div class="label">Promedio diario</div>
						<div class="value">{horasResumen.promedioDiario}</div>
					</div>
				</div>
				<div class="acciones-footer">
					<Button variant="secondary" on:click={() => (window.location.href = '/horario')}
						>Ver calendario</Button
					>
					<Button variant="outline">Exportar reporte</Button>
				</div>
			</Card>

			<!-- Accesos rápidos -->
			<Card title="Accesos rápidos" hoverable>
				<div class="acciones-rapidas">
					<Button variant="primary" on:click={goNuevoPaciente}>Registrar nuevo paciente</Button>
					<Button variant="secondary" on:click={goNuevoTrabajoLab}
						>Registrar trabajo de laboratorio</Button
					>
					<Button variant="outline" on:click={goRegistrarPago}>Registrar pago</Button>
					<Button variant="outline" on:click={goBuscarPaciente}>Buscar paciente</Button>
				</div>
			</Card>
		</div>
	{/if}
</section>

<style>
	.dashboard .grid {
		display: grid;
		grid-template-columns: repeat(12, 1fr);
		gap: var(--space-4);
	}

	/* Layout: top panels full-width, lists half-width on desktop */
	.dashboard .grid > :global(section.card) {
		grid-column: span 12;
	}

	/* Make middle sections split into two columns on larger screens */
	.dashboard .grid > :global(section.card:nth-child(2)),
	.dashboard .grid > :global(section.card:nth-child(3)) {
		grid-column: span 12;
	}

	@media (min-width: 960px) {
		.dashboard .grid > :global(section.card:nth-child(2)),
		.dashboard .grid > :global(section.card:nth-child(3)) {
			grid-column: span 6;
		}
	}

	.horario-panel {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-4);
		flex-wrap: wrap;
	}
	.horario-info {
		display: flex;
		gap: var(--space-6);
		align-items: center;
	}
	.contador .label {
		font-size: var(--font-size-sm);
		color: var(--color-text-soft);
		display: inline-block;
		margin-right: var(--space-2);
	}
	.contador .value {
		font-weight: 800;
		font-size: var(--font-size-xl);
	}
	.horario-actions {
		display: flex;
		gap: var(--space-2);
	}

	.tabla-wrapper {
		overflow: auto;
		border-radius: var(--radius-sm);
		margin-bottom: var(--space-3);
	}

	.actions-cell {
		display: flex;
		gap: var(--space-2);
		flex-wrap: wrap;
	}

	.acciones-footer {
		margin-top: var(--space-3);
		display: flex;
		justify-content: flex-end;
		gap: var(--space-2);
	}

	.filtros {
		display: flex;
		gap: var(--space-2);
		align-items: center;
		margin-bottom: var(--space-3);
	}

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

	.acciones-rapidas {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: var(--space-2);
	}
	@media (max-width: 640px) {
		.acciones-rapidas {
			grid-template-columns: 1fr;
		}
	}

	.mt-4 {
		margin-top: var(--space-4);
	}

	.loading-state,
	.error-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-height: 400px;
		gap: var(--space-4);
	}

	.error-message {
		color: var(--color-danger);
		font-weight: 600;
	}

	.empty-state {
		padding: var(--space-6);
		text-align: center;
		color: var(--color-text-soft);
	}

	.alertas {
		display: flex;
		gap: var(--space-2);
		flex-wrap: wrap;
	}

	.text-success {
		color: var(--color-success);
	}

	.text-warning {
		color: var(--color-warning);
	}
</style>
