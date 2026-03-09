<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { get as getStore } from 'svelte/store';
	import { Card, Button, Badge } from '$lib/ui';
	import {
		getPacienteById,
		getSaldoPendientePaciente,
		type Paciente as PacienteModel,
		type SaldoPendientePaciente
	} from '$lib/services/api/pacientes';
	import { getConsulta, type Consulta } from '$lib/services/api/consultas';
	import {
		listTratamientosConPagosByConsulta,
		type TratamientoConPagos,
		getEstadoLabel,
		getEstadoBadgeVariant
	} from '$lib/services/api/tratamientos';
	import { listPagosByTratamiento, type Pago, getMetodoPagoLabel } from '$lib/services/api/pagos';

	let pacienteId: number | null = null;
	let paciente: PacienteModel | null = null;

	let consultas: Consulta[] = [];
	let tratamientos: TratamientoConPagos[] = [];
	let saldoPaciente: SaldoPendientePaciente | null = null;

	// UI state
	let loading = true;
	let error: string | null = null;

	function formatMoney(value: number | null | undefined): string {
		const v = typeof value === 'number' ? value : 0;
		return `$${v.toFixed(2)}`;
	}

	function formatDate(dateStr: string | null | undefined): string {
		if (!dateStr) return '—';
		try {
			const d = new Date(dateStr);
			if (Number.isNaN(d.getTime())) {
				// Might be a date string without time (YYYY-MM-DD)
				return dateStr;
			}
			return d.toLocaleString();
		} catch {
			return dateStr;
		}
	}

	function formatDay(dateStr: string | null | undefined): string {
		if (!dateStr) return '—';
		return dateStr; // expected YYYY-MM-DD for some fields
	}

	function estadoSaldoBadgeVariant(
		saldo: number
	): 'success' | 'warning' | 'info' | 'error' | 'neutral' {
		if (saldo <= 0) return 'success';
		if (saldo > 0 && saldo <= 50) return 'info';
		if (saldo > 50 && saldo <= 200) return 'warning';
		return 'error';
	}

	function gotoNuevaConsulta() {
		// Navegación placeholder a una ruta futura
		window.location.href = `/pacientes/${pacienteId}/consultas/nueva`;
	}

	function gotoRegistrarPago(tratamientoId: number) {
		window.location.href = `/pacientes/${pacienteId}/tratamientos/${tratamientoId}/pagar`;
	}

	async function reloadData() {
		loading = true;
		error = null;
		try {
			if (pacienteId === null) {
				throw new Error('ID de paciente no válido');
			}

			const p = await getPacienteById(pacienteId);
			paciente = p;

			// Obtener consultas del paciente desde el backend
			const todasLasConsultas = await import('$lib/services/api/consultas').then((m) =>
				m.listConsultas()
			);
			consultas = todasLasConsultas.filter((c) => c.paciente_id === p.id);

			// Obtener todos los tratamientos de todas las consultas
			const promesasTratamientos = consultas.map((c) => listTratamientosConPagosByConsulta(c.id));
			const tratamientosPorConsulta = await Promise.all(promesasTratamientos);
			tratamientos = tratamientosPorConsulta.flat();

			// Obtener saldo pendiente real del backend
			try {
				saldoPaciente = await getSaldoPendientePaciente(p.id);
			} catch (err) {
				console.error('Error obteniendo saldo del paciente:', err);
				// Fallback: calcular manualmente
				saldoPaciente = {
					costo_total: tratamientos.reduce((sum, t) => sum + (t.costo_total || 0), 0),
					total_pagado: tratamientos.reduce((sum, t) => sum + (t.total_pagado || 0), 0),
					saldo_pendiente: tratamientos.reduce((sum, t) => sum + (t.saldo_pendiente || 0), 0),
					tratamientos_count: tratamientos.length
				};
			}
		} catch (e) {
			const err = e as Error;
			error = err?.message || 'Error cargando datos del paciente';
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		const $page = getStore(page);
		const rawId = $page?.params?.id;
		const parsed = Number(rawId);
		pacienteId = Number.isFinite(parsed) ? parsed : null;
		void reloadData();
	});

	// Expand/collapse pagos per tratamiento
	let openPagos: Record<number, boolean> = {};

	function togglePagos(tratamientoId: number) {
		openPagos = { ...openPagos, [tratamientoId]: !openPagos[tratamientoId] };
	}

	function getPagos(tratamientoId: number): Pago[] {
		return listPagosByTratamiento(tratamientoId);
	}
</script>

<section class="paciente-detalle">
	{#if loading}
		<Card padded outlined ariaLabel="Cargando paciente" title="" subtitle="">
			<div class="loading">
				<div class="spinner" aria-hidden="true"></div>
				<div>Cargando datos del paciente...</div>
			</div>
		</Card>
	{:else if error}
		<Card padded outlined ariaLabel="Error paciente" title="" subtitle="">
			<div class="error">
				<Badge variant="error" pill ariaLabel="Error">Error</Badge>
				<div class="msg">{error}</div>
			</div>
			<div class="row-actions">
				<Button variant="outline" ariaLabel="Reintentar" on:click={reloadData}>Reintentar</Button>
			</div>
		</Card>
	{:else if paciente}
		<!-- Resumen del paciente -->
		<Card
			title="Paciente"
			subtitle="Datos generales"
			hoverable
			outlined
			ariaLabel="Datos del paciente"
			className=""
		>
			<div class="grid-2">
				<div class="info-item">
					<div class="label">Nombre completo</div>
					<div class="value">{paciente.name} {paciente.lastname}</div>
				</div>
				<div class="info-item">
					<div class="label">Identificación</div>
					<div class="value">{paciente.dni}</div>
				</div>
				<div class="info-item">
					<div class="label">Teléfono</div>
					<div class="value">{paciente.phone || '—'}</div>
				</div>
				<div class="info-item">
					<div class="label">Fecha de creación</div>
					<div class="value">{formatDate(paciente.created_at)}</div>
				</div>
			</div>

			<div class="saldo-total">
				<div class="label">Saldo total pendiente</div>
				<div class="value">
					{#if saldoPaciente}
						<Badge
							variant={estadoSaldoBadgeVariant(saldoPaciente.saldo_pendiente)}
							pill
							ariaLabel="Saldo total"
						>
							{formatMoney(saldoPaciente.saldo_pendiente)}
						</Badge>
					{:else}
						<Badge variant="neutral" pill ariaLabel="Saldo no disponible">—</Badge>
					{/if}
				</div>
			</div>

			{#if saldoPaciente}
				<div class="resumen-financiero">
					<div class="resumen-item">
						<div class="resumen-label">Costo total tratamientos</div>
						<div class="resumen-value">{formatMoney(saldoPaciente.costo_total)}</div>
					</div>
					<div class="resumen-item">
						<div class="resumen-label">Total pagado</div>
						<div class="resumen-value text-success">
							{formatMoney(saldoPaciente.total_pagado)}
						</div>
					</div>
					<div class="resumen-item">
						<div class="resumen-label">Cantidad de tratamientos</div>
						<div class="resumen-value">{saldoPaciente.tratamientos_count}</div>
					</div>
				</div>
			{/if}

			<div class="row-actions">
				<Button variant="primary" ariaLabel="Nueva consulta" on:click={gotoNuevaConsulta}
					>Nueva consulta</Button
				>
				<Button variant="outline" on:click={() => (window.location.href = '/pacientes')}
					>Volver a listado</Button
				>
			</div>
		</Card>

		<!-- Historial de consultas -->
		<Card
			title="Historial de consultas"
			subtitle="Ordenadas por fecha"
			hoverable
			ariaLabel="Historial de consultas"
			className=""
		>
			<div class="tabla-wrapper">
				<table class="table">
					<thead>
						<tr>
							<th style="width:180px;">Fecha consulta</th>
							<th>Observaciones</th>
							<th style="width:160px;">Acciones</th>
						</tr>
					</thead>
					<tbody>
						{#if consultas.length === 0}
							<tr>
								<td colspan="3" class="text-soft">Sin consultas registradas.</td>
							</tr>
						{:else}
							{#each consultas as c (c.id)}
								<tr>
									<td>{formatDate(c.fecha_consulta)}</td>
									<td>{c.observaciones || '—'}</td>
									<td>
										<div class="row-actions">
											<Button
												variant="secondary"
												size="sm"
												ariaLabel="Ver consulta"
												on:click={() =>
													(window.location.href = `/pacientes/${paciente?.id}/consultas/${c.id}`)}
											>
												Ver
											</Button>
											<Button
												variant="outline"
												size="sm"
												ariaLabel="Editar consulta"
												on:click={() =>
													(window.location.href = `/pacientes/${paciente?.id}/consultas/${c.id}/editar`)}
											>
												Editar
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

		<!-- Tratamientos y saldos -->
		<Card
			title="Tratamientos"
			subtitle="Detalle y saldo por tratamiento"
			hoverable
			ariaLabel="Tratamientos"
			className=""
		>
			<div class="tabla-wrapper">
				<table class="table">
					<thead>
						<tr>
							<th style="width:90px;">ID</th>
							<th>Descripción</th>
							<th style="width:120px;">Estado</th>
							<th style="width:140px;">Fecha inicio</th>
							<th style="width:140px;">Fecha fin</th>
							<th style="width:140px;">Costo total</th>
							<th style="width:140px;">Pagado</th>
							<th style="width:160px;">Saldo</th>
							<th style="width:240px;">Acciones</th>
						</tr>
					</thead>
					<tbody>
						{#if tratamientos.length === 0}
							<tr>
								<td colspan="9" class="text-soft">Sin tratamientos registrados.</td>
							</tr>
						{:else}
							{#each tratamientos as t (t.id)}
								<tr>
									<td>#{t.id}</td>
									<td>
										<div class="col-main">
											<div class="name">{t.descripcion}</div>
										</div>
									</td>
									<td>
										<Badge variant={getEstadoBadgeVariant(t.estado)} ariaLabel="Estado tratamiento">
											{getEstadoLabel(t.estado)}
										</Badge>
									</td>
									<td>{formatDay(t.fecha_inicio)}</td>
									<td>{formatDay(t.fecha_fin)}</td>
									<td>{formatMoney(t.costo_total)}</td>
									<td>{formatMoney(t.total_pagado)}</td>
									<td>
										<Badge
											variant={estadoSaldoBadgeVariant(t.saldo_pendiente)}
											pill
											ariaLabel="Saldo tratamiento"
										>
											{formatMoney(t.saldo_pendiente)}
										</Badge>
									</td>
									<td>
										<div class="row-actions">
											<Button
												variant="secondary"
												size="sm"
												ariaLabel="Ver pagos"
												on:click={() => togglePagos(t.id)}
											>
												{openPagos[t.id] ? 'Ocultar pagos' : 'Ver pagos'}
											</Button>
											<Button
												variant="outline"
												size="sm"
												ariaLabel="Registrar pago"
												on:click={() => gotoRegistrarPago(t.id)}
											>
												Registrar pago
											</Button>
											<Button
												variant="outline"
												size="sm"
												ariaLabel="Crear trabajo de laboratorio"
												on:click={() =>
													(window.location.href = `/laboratorios/nuevo?tratamiento=${t.id}`)}
											>
												Trabajo laboratorio
											</Button>
										</div>
									</td>
								</tr>
								{#if openPagos[t.id]}
									<tr>
										<td colspan="9">
											<div class="pagos">
												<div class="subheader">Pagos del tratamiento #{t.id}</div>
												<table class="table">
													<thead>
														<tr>
															<th style="width:160px;">Fecha</th>
															<th style="width:140px;">Monto</th>
															<th style="width:160px;">Método</th>
															<th>Observaciones</th>
														</tr>
													</thead>
													<tbody>
														{#each getPagos(t.id) as p (p.id)}
															<tr>
																<td>{formatDay(p.fecha_pago)}</td>
																<td>{formatMoney(p.monto)}</td>
																<td>{getMetodoPagoLabel(p.metodo_pago)}</td>
																<td>{p.observaciones || '—'}</td>
															</tr>
														{:else}
															<tr>
																<td colspan="4" class="text-soft">Sin pagos registrados.</td>
															</tr>
														{/each}
													</tbody>
												</table>
											</div>
										</td>
									</tr>
								{/if}
							{/each}
						{/if}
					</tbody>
				</table>
			</div>
		</Card>
	{/if}
</section>

<style>
	.paciente-detalle {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	.loading {
		display: inline-flex;
		align-items: center;
		gap: var(--space-3);
	}
	.spinner {
		width: 1.25rem;
		height: 1.25rem;
		border: 2px solid var(--color-secondary-200);
		border-top-color: var(--color-secondary-600);
		border-radius: 50%;
		animation: spin 0.9s linear infinite;
	}
	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.error {
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
	}
	.msg {
		font-weight: 600;
	}

	.grid-2 {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: var(--space-3);
	}
	@media (max-width: 680px) {
		.grid-2 {
			grid-template-columns: 1fr;
		}
	}

	.info-item .label {
		font-size: var(--font-size-sm);
		color: var(--color-text-soft);
		margin-bottom: var(--space-1);
	}
	.info-item .value {
		font-weight: 600;
	}

	.saldo-total {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		margin-top: var(--space-3);
	}
	.saldo-total .label {
		font-size: var(--font-size-sm);
		color: var(--color-text-soft);
	}

	.resumen-financiero {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: var(--space-3);
		margin-top: var(--space-3);
		padding: var(--space-3);
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
	}

	@media (max-width: 768px) {
		.resumen-financiero {
			grid-template-columns: 1fr;
		}
	}

	.resumen-item {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}

	.resumen-label {
		font-size: var(--font-size-xs);
		color: var(--color-text-soft);
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.resumen-value {
		font-size: var(--font-size-lg);
		font-weight: 700;
		color: var(--color-text);
	}

	.resumen-value.text-success {
		color: var(--color-success);
	}

	.row-actions {
		display: inline-flex;
		gap: var(--space-2);
		flex-wrap: wrap;
		margin-top: var(--space-3);
	}

	.tabla-wrapper {
		overflow: auto;
		border-radius: var(--radius-sm);
	}

	.col-main .name {
		font-weight: 600;
	}

	.pagos .subheader {
		font-weight: 700;
		margin-bottom: var(--space-2);
	}
</style>
