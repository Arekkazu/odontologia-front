<script lang="ts">
	import { Card, Button, Input, Badge } from '$lib/ui';
	import { onMount } from 'svelte';
	import { seedMockData } from '$lib/services/api/pacientes';
	import {
		listConsultas,
		searchConsultas,
		getEstadisticasConsultas,
		getUltimasConsultas,
		seedConsultasMock,
		type ConsultaConDetalles
	} from '$lib/services/api/consultas';

	// Estado de búsqueda y filtros
	let searchQuery = '';
	let filtroOrden: 'reciente' | 'antiguo' | 'paciente' = 'reciente';
	let filtroDesde = '';
	let filtroHasta = '';

	// Datos
	let todasConsultas: ConsultaConDetalles[] = [];
	let ultimasConsultas: ConsultaConDetalles[] = [];
	let estadisticas = {
		total: 0,
		hoy: 0,
		estaSemana: 0,
		ultimasRecientes: [] as ConsultaConDetalles[]
	};

	// Estados derivados
	$: filteredConsultas = searchConsultas({
		searchText: searchQuery,
		desde: filtroDesde,
		hasta: filtroHasta,
		ordenar: filtroOrden
	});

	// Acciones
	function nuevaConsulta() {
		window.location.href = '/consultas/nueva';
	}

	function verConsulta(id: number) {
		window.location.href = `/consultas/${id}`;
	}

	function limpiarFiltros() {
		searchQuery = '';
		filtroOrden = 'reciente';
		filtroDesde = '';
		filtroHasta = '';
	}

	function irAlPaciente(pacienteId: number) {
		window.location.href = `/pacientes/${pacienteId}`;
	}

	// Formatear moneda
	function formatMoney(amount: number): string {
		return new Intl.NumberFormat('es-ES', {
			style: 'currency',
			currency: 'COP',
			minimumFractionDigits: 0,
			maximumFractionDigits: 2
		}).format(amount);
	}

	// Cargar datos al montar el componente
	onMount(() => {
		// Inicializar datos mock si es necesario
		seedMockData();
		seedConsultasMock();

		// Cargar estadísticas y consultas
		estadisticas = getEstadisticasConsultas();
		todasConsultas = listConsultas();
		ultimasConsultas = getUltimasConsultas(5);
	});
</script>

<section class="consultas">
	<div class="header-row">
		<h1 class="title">Consultas</h1>
		<div class="actions">
			<Button variant="primary" on:click={nuevaConsulta}>Agregar consulta</Button>
		</div>
	</div>

	<!-- Tarjetas de estadísticas -->
	<div class="stats-grid">
		<Card title="Total de consultas" hoverable>
			<div class="stat-value">{estadisticas.total}</div>
			<p class="stat-label">registradas en el sistema</p>
		</Card>

		<Card title="Consultas hoy" hoverable>
			<div class="stat-value">{estadisticas.hoy}</div>
			<p class="stat-label">realizadas este día</p>
		</Card>

		<Card title="Esta semana" hoverable>
			<div class="stat-value">{estadisticas.estaSemana}</div>
			<p class="stat-label">últimos 7 días</p>
		</Card>

		<Card title="Saldos pendientes" hoverable>
			<div class="stat-value">{formatMoney(
				estadisticas.ultimasRecientes.reduce((sum, c) => sum + c.saldo_pendiente, 0)
			)}</div>
			<p class="stat-label">por cobrar</p>
		</Card>
	</div>

	<!-- Sección de búsqueda y filtros -->
	<Card title="Búsqueda y filtros" hoverable>
		<div class="filters">
			<Input
				type="search"
				placeholder="Buscar por paciente, motivo o ID"
				bind:value={searchQuery}
				description="Escribe para filtrar consultas rápidamente."
			/>

			<div class="filter-row">
				<label class="filter">
					<span>Ordenar por:</span>
					<select bind:value={filtroOrden} class="input">
						<option value="reciente">Más reciente</option>
						<option value="antiguo">Más antiguo</option>
						<option value="paciente">Paciente (A-Z)</option>
					</select>
				</label>

				<label class="filter">
					<span>Desde:</span>
					<input type="date" bind:value={filtroDesde} class="input" />
				</label>

				<label class="filter">
					<span>Hasta:</span>
					<input type="date" bind:value={filtroHasta} class="input" />
				</label>

				<Button variant="outline" size="sm" on:click={limpiarFiltros}> Limpiar filtros </Button>
			</div>
		</div>
	</Card>

	<!-- Últimas consultas (resumen rápido) -->
	{#if ultimasConsultas.length > 0}
		<Card title="Últimas consultas" subtitle={`${ultimasConsultas.length} consultas recientes`} hoverable>
			<div class="tabla-wrapper">
				<table class="table">
					<thead>
						<tr>
							<th style="width: 90px;">ID</th>
							<th>Paciente</th>
							<th>Motivo</th>
							<th style="width: 140px;">Fecha</th>
							<th style="width: 100px;">Trat.</th>
							<th style="width: 120px;">Costo</th>
							<th style="width: 120px;">Saldo</th>
							<th style="width: 140px;">Acciones</th>
						</tr>
					</thead>
					<tbody>
						{#each ultimasConsultas as c}
							<tr>
								<td>#{c.id}</td>
								<td>
									<div class="col-main">
										<div class="name">{c.paciente_nombre}</div>
									</div>
								</td>
								<td>{c.motivo || c.observaciones || '—'}</td>
								<td class="text-soft">{c.fecha_formato}</td>
								<td class="text-center">{c.tratamientos_count}</td>
								<td>{formatMoney(c.costo_total_tratamientos)}</td>
								<td>
									<Badge variant={c.saldo_pendiente > 0 ? 'warning' : 'success'}>
										{formatMoney(c.saldo_pendiente)}
									</Badge>
								</td>
								<td>
									<div class="row-actions">
										<Button variant="secondary" size="sm" on:click={() => verConsulta(c.id)}>
											Ver
										</Button>
										<Button variant="outline" size="sm" on:click={() => irAlPaciente(c.paciente_id)}>
											Paciente
										</Button>
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</Card>
	{/if}

	<!-- Listado completo de consultas con filtros aplicados -->
	<Card
		title="Todas las consultas"
		subtitle={`Total: ${filteredConsultas.length} consulta${filteredConsultas.length !== 1 ? 's' : ''}`}
		hoverable
	>
		<div class="tabla-wrapper">
			<table class="table">
				<thead>
					<tr>
						<th style="width: 90px;">ID</th>
						<th>Paciente</th>
						<th>Motivo</th>
						<th style="width: 140px;">Fecha</th>
						<th style="width: 100px;">Trat.</th>
						<th style="width: 120px;">Costo</th>
						<th style="width: 120px;">Saldo</th>
						<th style="width: 180px;">Acciones</th>
					</tr>
				</thead>
				<tbody>
					{#if filteredConsultas.length === 0}
						<tr>
							<td colspan="8" class="text-soft">No hay consultas que coincidan con tus filtros.</td>
						</tr>
					{:else}
						{#each filteredConsultas as c}
							<tr>
								<td>#{c.id}</td>
								<td>
									<div class="col-main">
										<div class="name">{c.paciente_nombre}</div>
									</div>
								</td>
								<td>{c.motivo || c.observaciones || '—'}</td>
								<td class="text-soft">{c.fecha_formato}</td>
								<td class="text-center">{c.tratamientos_count}</td>
								<td>{formatMoney(c.costo_total_tratamientos)}</td>
								<td>
									<Badge variant={c.saldo_pendiente > 0 ? 'warning' : 'success'}>
										{formatMoney(c.saldo_pendiente)}
									</Badge>
								</td>
								<td>
									<div class="row-actions">
										<Button variant="secondary" size="sm" on:click={() => verConsulta(c.id)}>
											Ver
										</Button>
										<Button variant="outline" size="sm" on:click={() => irAlPaciente(c.paciente_id)}>
											Paciente
										</Button>
									</div>
								</td>
							</tr>
						{/each}
					{/if}
				</tbody>
			</table>
		</div>
	</Card>
</section>

<style>
	.consultas {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	.header-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-3);
	}

	.title {
		margin: 0;
		font-size: var(--font-size-2xl);
		line-height: var(--line-height-tight);
	}

	.actions {
		display: inline-flex;
		gap: var(--space-2);
	}

	/* Estadísticas */
	.stats-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
		gap: var(--space-3);
	}

	.stat-value {
		font-size: var(--font-size-3xl);
		font-weight: 800;
		color: var(--color-brand-600);
		margin-bottom: var(--space-2);
	}

	.stat-label {
		margin: 0;
		font-size: var(--font-size-sm);
		color: var(--color-text-soft);
	}

	/* Filtros */
	.filters {
		display: grid;
		grid-template-columns: 1fr;
		gap: var(--space-3);
	}

	.filter-row {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-3);
		align-items: center;
	}

	.filter {
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
		font-size: var(--font-size-sm);
	}

	.filter span {
		color: var(--color-text-soft);
		min-width: 70px;
	}

	/* Tabla */
	.tabla-wrapper {
		overflow: auto;
		border-radius: var(--radius-sm);
	}

	.col-main .name {
		font-weight: 600;
	}

	.row-actions {
		display: inline-flex;
		flex-wrap: wrap;
		gap: var(--space-2);
	}

	.text-center {
		text-align: center;
	}
</style>
