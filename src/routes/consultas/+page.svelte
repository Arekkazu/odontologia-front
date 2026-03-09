<script lang="ts">
	import { Card, Button, Input } from '$lib/ui';
	import { onMount } from 'svelte';
	import { listConsultas, searchConsultas, type Consulta } from '$lib/services/api/consultas';
	import { getPacienteById, type Paciente } from '$lib/services/api/pacientes';

	// Estado de búsqueda y filtros
	let searchQuery = '';
	let filtroOrden: 'reciente' | 'antiguo' | 'paciente' = 'reciente';
	let filtroDesde = '';
	let filtroHasta = '';

	// Datos
	let filteredConsultas: Consulta[] = [];
	let ultimasConsultas: Consulta[] = [];
	let pacientesMap: Record<number, Paciente> = {};
	let estadisticas = {
		total: 0,
		hoy: 0,
		estaSemana: 0
	};

	// Helper para obtener nombre completo del paciente
	function getNombrePaciente(pacienteId: number): string {
		const paciente = pacientesMap[pacienteId];
		if (!paciente) return `Paciente #${pacienteId}`;
		return `${paciente.name} ${paciente.lastname}`.trim();
	}

	// Función para aplicar filtros
	async function aplicarFiltros() {
		filteredConsultas = await searchConsultas({
			searchText: searchQuery,
			desde: filtroDesde,
			hasta: filtroHasta,
			ordenar: filtroOrden
		});
	}

	// Reactividad: aplicar filtros cuando cambien
	$: {
		void searchQuery;
		void filtroOrden;
		void filtroDesde;
		void filtroHasta;
		aplicarFiltros();
	}

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

	// Cargar datos al montar el componente
	onMount(async () => {
		const all = await listConsultas();

		// Cargar datos de pacientes
		const pacienteIds = [...new Set(all.map((c) => c.paciente_id))];
		const pacientesTemp: Record<number, Paciente> = {};
		await Promise.all(
			pacienteIds.map(async (id) => {
				try {
					const paciente = await getPacienteById(id);
					pacientesTemp[id] = paciente;
				} catch (err) {
					console.error(`Error cargando paciente ${id}:`, err);
				}
			})
		);
		pacientesMap = pacientesTemp;

		const now = new Date();
		const todayStr = now.toDateString();
		const weekMs = 7 * 24 * 60 * 60 * 1000;

		const hoy = all.filter(
			(c) => new Date(c.fecha_consulta ?? '').toDateString() === todayStr
		).length;
		const estaSemana = all.filter((c) => {
			const t = new Date(c.fecha_consulta ?? '').getTime();
			return !Number.isNaN(t) && now.getTime() - t < weekMs;
		}).length;

		estadisticas = { total: all.length, hoy, estaSemana };

		ultimasConsultas = [...all]
			.sort(
				(a, b) =>
					new Date(b.fecha_consulta ?? '').getTime() - new Date(a.fecha_consulta ?? '').getTime()
			)
			.slice(0, 4);
	});
</script>

<section class="consultas">
	<div class="header-row">
		<h1 class="title">Consultas</h1>
		<div class="actions">
			<Button variant="primary" on:click={nuevaConsulta} ariaLabel="Agregar nueva consulta">
				Agregar consulta
			</Button>
		</div>
	</div>

	<!-- Tarjetas de estadísticas -->
	<div class="stats-grid">
		<Card
			title="Total de consultas"
			subtitle=""
			className=""
			ariaLabel="Total de consultas"
			hoverable
		>
			<div class="stat-value">{estadisticas.total}</div>
			<p class="stat-label">registradas en el sistema</p>
		</Card>

		<Card title="Consultas hoy" subtitle="" className="" ariaLabel="Consultas de hoy" hoverable>
			<div class="stat-value">{estadisticas.hoy}</div>
			<p class="stat-label">realizadas este día</p>
		</Card>

		<Card
			title="Esta semana"
			subtitle=""
			className=""
			ariaLabel="Consultas de esta semana"
			hoverable
		>
			<div class="stat-value">{estadisticas.estaSemana}</div>
			<p class="stat-label">últimos 7 días</p>
		</Card>

		<Card
			title="Últimas registradas"
			subtitle=""
			className=""
			ariaLabel="Últimas consultas registradas"
			hoverable
		>
			<div class="stat-value">{ultimasConsultas.length}</div>
			<p class="stat-label">en los últimos registros</p>
		</Card>
	</div>

	<!-- Sección de búsqueda y filtros -->
	<Card
		title="Búsqueda y filtros"
		subtitle=""
		className=""
		ariaLabel="Filtros de búsqueda"
		hoverable
	>
		<div class="filters">
			<Input
				type="search"
				placeholder="Buscar por paciente, motivo o ID"
				bind:value={searchQuery}
				description="Escribe para filtrar consultas rápidamente."
				label=""
				name="search"
				id="search-consultas"
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

				<Button
					variant="outline"
					size="sm"
					on:click={limpiarFiltros}
					ariaLabel="Limpiar filtros de búsqueda"
				>
					Limpiar filtros
				</Button>
			</div>
		</div>
	</Card>

	<!-- Últimas consultas (resumen rápido) -->
	{#if ultimasConsultas.length > 0}
		<Card
			title="Últimas consultas"
			subtitle={`${ultimasConsultas.length} consultas recientes`}
			className=""
			ariaLabel="Últimas consultas recientes"
			hoverable
		>
			<div class="tabla-wrapper">
				<table class="table">
					<thead>
						<tr>
							<th>Paciente</th>
							<th>Motivo</th>
							<th>Diagnóstico</th>
							<th style="width: 160px;">Fecha</th>
							<th style="width: 140px;">Acciones</th>
						</tr>
					</thead>
					<tbody>
						{#each ultimasConsultas as c (c.id)}
							<tr>
								<td>
									<div class="col-main">
										<span class="name">{getNombrePaciente(c.paciente_id)}</span>
										<span class="text-soft" style="font-size: 0.8em;">#{c.id}</span>
									</div>
								</td>
								<td>{c.motivo || '—'}</td>
								<td>{c.diagnostico || '—'}</td>
								<td class="text-soft">
									{c.fecha_consulta
										? new Date(c.fecha_consulta).toLocaleString('es-ES', {
												year: 'numeric',
												month: 'short',
												day: 'numeric',
												hour: '2-digit',
												minute: '2-digit'
											})
										: '—'}
								</td>
								<td>
									<div class="row-actions">
										<Button
											variant="secondary"
											size="sm"
											on:click={() => verConsulta(c.id)}
											ariaLabel={`Ver detalles de consulta ${c.id}`}
										>
											Ver detalles
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
		className=""
		ariaLabel="Listado completo de consultas"
		hoverable
	>
		<div class="tabla-wrapper">
			<table class="table">
				<thead>
					<tr>
						<th>Paciente</th>
						<th>Motivo de consulta</th>
						<th>Diagnóstico</th>
						<th style="width: 160px;">Fecha</th>
						<th style="width: 140px;">Acciones</th>
					</tr>
				</thead>
				<tbody>
					{#if filteredConsultas.length === 0}
						<tr>
							<td colspan="5" class="text-soft text-center"
								>No hay consultas que coincidan con tus filtros.</td
							>
						</tr>
					{:else}
						{#each filteredConsultas as c (c.id)}
							<tr>
								<td>
									<div class="col-main">
										<span class="name">{getNombrePaciente(c.paciente_id)}</span>
										<span class="text-soft" style="font-size: 0.8em;">Consulta #{c.id}</span>
									</div>
								</td>
								<td>{c.motivo || '—'}</td>
								<td>{c.diagnostico || '—'}</td>
								<td class="text-soft">
									{c.fecha_consulta
										? new Date(c.fecha_consulta).toLocaleString('es-ES', {
												year: 'numeric',
												month: 'short',
												day: 'numeric',
												hour: '2-digit',
												minute: '2-digit'
											})
										: '—'}
								</td>
								<td>
									<div class="row-actions">
										<Button
											variant="secondary"
											size="sm"
											on:click={() => verConsulta(c.id)}
											ariaLabel={`Ver detalles de consulta ${c.id}`}
										>
											Ver detalles
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

	.col-main {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}

	.col-main .name {
		font-weight: 600;
		color: var(--color-text);
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
