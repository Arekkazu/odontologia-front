<script lang="ts">
	import { Card, Button, Badge } from '$lib/ui';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { getPacienteById } from '$lib/services/api/pacientes';
	import { getConsulta } from '$lib/services/api/consultas';
	import type { Consulta } from '$lib/services/api/consultas';
	import type { Paciente } from '$lib/services/api/pacientes';
	import {
		listTratamientosConPagosByConsulta,
		cambiarEstadoTratamiento,
		getEstadoLabel,
		getEstadoBadgeVariant,
		type TratamientoConPagos,
		type EstadoTratamiento
	} from '$lib/services/api/tratamientos';

	let consultaId: number | null = null;
	let consulta: Consulta | null = null;
	let paciente: Paciente | null = null;
	let tratamientos: TratamientoConPagos[] = [];
	let loading = true;
	let error = '';
	let cambiandoEstado: { [key: number]: boolean } = {};

	function formatMoney(amount: number): string {
		return new Intl.NumberFormat('es-ES', {
			style: 'currency',
			currency: 'COP',
			minimumFractionDigits: 0,
			maximumFractionDigits: 2
		}).format(amount);
	}

	function formatDate(date?: string | null): string {
		if (!date) return '—';
		const parsed = new Date(date);
		if (Number.isNaN(parsed.getTime())) return date;
		return parsed.toLocaleDateString('es-ES', {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function irAConsultas() {
		window.location.href = '/consultas';
	}

	function irAlPaciente(pacienteId: number) {
		window.location.href = `/pacientes/${pacienteId}`;
	}

	function nuevoTratamiento(consultaIdParam: number) {
		window.location.href = `/consultas/${consultaIdParam}/tratamiento/nuevo`;
	}

	function registrarPago(tratamientoId: number) {
		window.location.href = `/pacientes/${consulta?.paciente_id}/tratamientos/${tratamientoId}/pagar`;
	}

	async function cargarTratamientos() {
		if (!consultaId) return;
		try {
			tratamientos = await listTratamientosConPagosByConsulta(consultaId);
		} catch (err) {
			console.error('Error cargando tratamientos:', err);
		}
	}

	async function handleCambiarEstado(tratamientoId: number, nuevoEstado: EstadoTratamiento) {
		if (!consultaId) return;
		cambiandoEstado[tratamientoId] = true;
		try {
			await cambiarEstadoTratamiento(tratamientoId, nuevoEstado);
			await cargarTratamientos();
		} catch (err) {
			console.error('Error cambiando estado:', err);
			error = err instanceof Error ? err.message : 'Error al cambiar el estado';
		} finally {
			cambiandoEstado[tratamientoId] = false;
		}
	}

	onMount(async () => {
		// Obtener el ID de la consulta desde la URL
		const cid = $page.params.cid;
		if (!cid) {
			error = 'No se especificó una consulta';
			loading = false;
			return;
		}

		consultaId = parseInt(cid, 10);

		if (isNaN(consultaId)) {
			error = 'ID de consulta inválido';
			loading = false;
			return;
		}

		try {
			// Obtener consulta desde el backend
			consulta = await getConsulta(consultaId);

			// Obtener datos del paciente
			if (consulta.paciente_id) {
				try {
					paciente = await getPacienteById(consulta.paciente_id);
				} catch (err) {
					console.error('Error cargando paciente:', err);
				}
			}

			// Cargar tratamientos desde el backend
			await cargarTratamientos();
		} catch (err) {
			console.error('Error cargando consulta:', err);
			error = err instanceof Error ? err.message : 'Consulta no encontrada';
		} finally {
			loading = false;
		}
	});
</script>

<section class="consulta-detalle">
	<div class="header-row">
		<div>
			<h1 class="title">Detalle de consulta</h1>
			{#if consulta}
				<p class="subtitle">
					#{consulta.id}
					{#if paciente}
						• {paciente.name} {paciente.lastname}
					{/if}
				</p>
			{/if}
		</div>
		<div class="actions">
			<Button variant="outline" on:click={irAConsultas}>Volver a consultas</Button>
		</div>
	</div>

	{#if error}
		<Card title="Error" hoverable>
			<p class="text-error">{error}</p>
			<Button variant="primary" on:click={irAConsultas}>Volver a consultas</Button>
		</Card>
	{:else if loading}
		<Card title="Cargando..." hoverable>
			<p class="text-soft">Cargando datos de la consulta...</p>
		</Card>
	{:else if consulta}
		<div class="grid">
			<!-- Información de la consulta -->
			<Card title="Información de la consulta" hoverable>
				<div class="info-grid">
					<div class="info-item">
						<div class="label">Paciente</div>
						<div class="value">
							{#if paciente}
								<button class="link-btn" on:click={() => irAlPaciente(consulta.paciente_id)}>
									{paciente.name}
									{paciente.lastname}
								</button>
							{:else}
								Paciente #{consulta.paciente_id}
							{/if}
						</div>
					</div>

					<div class="info-item">
						<div class="label">Fecha de consulta</div>
						<div class="value">{formatDate(consulta.fecha_consulta)}</div>
					</div>

					<div class="info-item">
						<div class="label">Motivo</div>
						<div class="value">{consulta.motivo || '—'}</div>
					</div>

					<div class="info-item">
						<div class="label">Diagnóstico</div>
						<div class="value">{consulta.diagnostico || '—'}</div>
					</div>

					{#if consulta.observaciones}
						<div class="info-item full-width">
							<div class="label">Observaciones</div>
							<div class="value">{consulta.observaciones}</div>
						</div>
					{/if}
				</div>
			</Card>

			<!-- Resumen financiero -->
			<Card title="Resumen financiero" hoverable>
				<div class="summary-grid">
					<div class="summary-item">
						<div class="summary-label">Costo total</div>
						<div class="summary-value">
							{formatMoney(tratamientos.reduce((sum, t) => sum + (t.costo_total || 0), 0))}
						</div>
					</div>

					<div class="summary-item">
						<div class="summary-label">Total pagado</div>
						<div class="summary-value text-success">
							{formatMoney(tratamientos.reduce((sum, t) => sum + (t.totalPagos || 0), 0))}
						</div>
					</div>

					<div class="summary-item">
						<div class="summary-label">Saldo pendiente</div>
						<div
							class="summary-value"
							class:text-warning={tratamientos.some((t) => t.saldoPendiente > 0)}
						>
							{formatMoney(tratamientos.reduce((sum, t) => sum + (t.saldoPendiente || 0), 0))}
						</div>
					</div>

					<div class="summary-item">
						<div class="summary-label">Tratamientos</div>
						<div class="summary-value">{tratamientos.length}</div>
					</div>
				</div>

				<div class="actions-footer">
					<Button variant="primary" on:click={() => nuevoTratamiento(consulta.id)}>
						Registrar tratamiento
					</Button>
				</div>
			</Card>

			<!-- Tratamientos de la consulta -->
			<Card
				title="Tratamientos"
				subtitle={`${tratamientos.length} tratamiento${tratamientos.length !== 1 ? 's' : ''}`}
				hoverable
			>
				{#if tratamientos.length === 0}
					<div class="empty-state">
						<p>No hay tratamientos registrados en esta consulta.</p>
						<Button variant="primary" on:click={() => nuevoTratamiento(consulta.id)}>
							Agregar tratamiento
						</Button>
					</div>
				{:else}
					<div class="treatments-list">
						{#each tratamientos as tratamiento}
							<div class="treatment-card">
								<div class="treatment-header">
									<div class="treatment-title">
										<strong>{tratamiento.descripcion}</strong>
										<Badge variant="info">#{tratamiento.id}</Badge>
										<Badge variant={getEstadoBadgeVariant(tratamiento.estado)}>
											{getEstadoLabel(tratamiento.estado)}
										</Badge>
									</div>
									<div class="treatment-cost">
										{formatMoney(tratamiento.costo_total)}
									</div>
								</div>

								<div class="treatment-details">
									{#if tratamiento.fecha_inicio}
										<div class="detail-item">
											<span class="detail-label">Inicio:</span>
											<span>{tratamiento.fecha_inicio}</span>
										</div>
									{/if}
									{#if tratamiento.fecha_fin}
										<div class="detail-item">
											<span class="detail-label">Fin:</span>
											<span>{tratamiento.fecha_fin}</span>
										</div>
									{/if}
								</div>

								<div class="treatment-state">
									<label for="estado-{tratamiento.id}" class="state-label">Estado:</label>
									<select
										id="estado-{tratamiento.id}"
										class="state-select"
										value={tratamiento.estado}
										on:change={(e) => handleCambiarEstado(tratamiento.id, e.currentTarget.value)}
										disabled={cambiandoEstado[tratamiento.id]}
									>
										<option value="propuesto">Propuesto</option>
										<option value="aceptado">Aceptado</option>
										<option value="en_curso">En curso</option>
										<option value="finalizado">Finalizado</option>
										<option value="cancelado">Cancelado</option>
									</select>
								</div>

								<div class="treatment-financials">
									<div class="financial-item">
										<span class="label">Pagado:</span>
										<span class="text-success">{formatMoney(tratamiento.total_pagado)}</span>
									</div>
									<div class="financial-item">
										<span class="label">Saldo:</span>
										<Badge variant={tratamiento.saldo_pendiente > 0 ? 'warning' : 'success'}>
											{formatMoney(tratamiento.saldo_pendiente)}
										</Badge>
									</div>
								</div>

								<div class="treatment-actions">
									{#if tratamiento.saldo_pendiente > 0}
										<Button
											variant="primary"
											size="sm"
											on:click={() => registrarPago(tratamiento.id)}
										>
											Registrar pago
										</Button>
									{:else}
										<Badge variant="success">Pagado completo</Badge>
									{/if}
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</Card>

			<!-- Acciones rápidas -->
			<Card title="Acciones" hoverable>
				<div class="actions-grid">
					<Button variant="secondary" on:click={() => irAlPaciente(consulta.paciente_id)}>
						Ver perfil del paciente
					</Button>
					<Button variant="outline" on:click={irAConsultas}>Volver a consultas</Button>
				</div>
			</Card>
		</div>
	{/if}
</section>

<style>
	.consulta-detalle {
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

	.header-row div {
		flex: 1;
	}

	.title {
		margin: 0;
		font-size: var(--font-size-2xl);
		line-height: var(--line-height-tight);
	}

	.subtitle {
		margin: var(--space-2) 0 0 0;
		font-size: var(--font-size-sm);
		color: var(--color-text-soft);
	}

	.actions {
		display: inline-flex;
		gap: var(--space-2);
	}

	.grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: var(--space-4);
	}

	@media (min-width: 960px) {
		.grid {
			grid-template-columns: 2fr 1fr;
		}
	}

	/* Info grid */
	.info-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: var(--space-4);
	}

	.info-item {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.info-item.full-width {
		grid-column: 1 / -1;
	}

	.info-item .label {
		font-size: var(--font-size-sm);
		font-weight: 600;
		color: var(--color-text-soft);
	}

	.info-item .value {
		font-size: var(--font-size-md);
		color: var(--color-text);
		word-break: break-word;
	}

	.link-btn {
		background: none;
		border: none;
		color: var(--color-brand-500);
		cursor: pointer;
		font-weight: 600;
		padding: 0;
		text-decoration: none;
	}

	.link-btn:hover {
		text-decoration: underline;
	}

	/* Summary grid */
	.summary-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: var(--space-3);
		margin-bottom: var(--space-4);
	}

	.summary-item {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		padding: var(--space-3);
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.summary-label {
		font-size: var(--font-size-sm);
		color: var(--color-text-soft);
		font-weight: 600;
	}

	.summary-value {
		font-size: var(--font-size-xl);
		font-weight: 700;
		color: var(--color-text);
	}

	.summary-value.text-warning {
		color: var(--color-warning);
	}

	.summary-value.text-success {
		color: var(--color-success);
	}

	.actions-footer {
		display: flex;
		gap: var(--space-2);
		margin-top: var(--space-3);
	}

	/* Treatments list */
	.treatments-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}

	.treatment-card {
		background: var(--color-surface-2);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		padding: var(--space-4);
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}

	.treatment-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-2);
	}

	.treatment-title {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}

	.treatment-title strong {
		font-size: var(--font-size-md);
		flex: 1;
	}

	.treatment-cost {
		font-size: var(--font-size-lg);
		font-weight: 700;
		color: var(--color-brand-600);
	}

	.treatment-details {
		display: flex;
		gap: var(--space-3);
		flex-wrap: wrap;
		font-size: var(--font-size-sm);
	}

	.detail-item {
		display: flex;
		gap: var(--space-2);
	}

	.detail-label {
		color: var(--color-text-soft);
		font-weight: 600;
	}

	.treatment-state {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-2) 0;
	}

	.state-label {
		font-size: var(--font-size-sm);
		font-weight: 600;
		color: var(--color-text-soft);
	}

	.state-select {
		font-family: var(--font-sans);
		padding: var(--space-1) var(--space-2);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		background: var(--color-white);
		color: var(--color-text);
		font-size: var(--font-size-sm);
		cursor: pointer;
		transition: border-color var(--transition-fast);
	}

	.state-select:hover:not(:disabled) {
		border-color: var(--color-gray-300);
	}

	.state-select:focus {
		outline: none;
		border-color: var(--color-focus);
		box-shadow: var(--shadow-focus);
	}

	.state-select:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.treatment-financials {
		display: flex;
		gap: var(--space-4);
		align-items: center;
		padding: var(--space-2) 0;
		border-top: 1px solid var(--color-border);
		border-bottom: 1px solid var(--color-border);
	}

	.financial-item {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		font-size: var(--font-size-sm);
	}

	.financial-item .label {
		color: var(--color-text-soft);
		font-weight: 600;
	}

	.treatment-actions {
		display: flex;
		gap: var(--space-2);
	}

	.empty-state {
		text-align: center;
		padding: var(--space-6);
		color: var(--color-text-soft);
	}

	.empty-state p {
		margin: 0 0 var(--space-3) 0;
	}

	.actions-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: var(--space-2);
	}

	.text-error {
		color: var(--color-error);
	}

	.text-success {
		color: var(--color-success);
	}

	.text-warning {
		color: var(--color-warning);
	}
</style>
