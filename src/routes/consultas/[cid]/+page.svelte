<script lang="ts">
	import { Card, Button, Badge } from '$lib/ui';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { seedMockData, listTratamientosByConsulta, listPagosByTratamiento, computeTratamientoSaldo } from '$lib/services/api/pacientes';
	import { getConsulta, seedConsultasMock } from '$lib/services/api/consultas';
	import type { ConsultaConDetalles } from '$lib/services/api/consultas';
	import type { TratamientoConSaldo } from '$lib/services/api/pacientes';

	let consultaId: number | null = null;
	let consulta: ConsultaConDetalles | null = null;
	let tratamientos: TratamientoConSaldo[] = [];
	let loading = true;
	let error = '';

	function formatMoney(amount: number): string {
		return new Intl.NumberFormat('es-ES', {
			style: 'currency',
			currency: 'COP',
			minimumFractionDigits: 0,
			maximumFractionDigits: 2
		}).format(amount);
	}

	function irAConsultas() {
		window.location.href = '/consultas';
	}

	function irAlPaciente(pacienteId: number) {
		window.location.href = `/pacientes/${pacienteId}`;
	}

	function nuevoTratamiento(consultaIdParam: number) {
		window.location.href = `/pacientes/${consulta?.paciente_id}/consultas/${consultaIdParam}/tratamiento/nuevo`;
	}

	function registrarPago(tratamientoId: number) {
		window.location.href = `/pacientes/${consulta?.paciente_id}/tratamientos/${tratamientoId}/pagar`;
	}

	onMount(() => {
		seedMockData();
		seedConsultasMock();

		// Obtener el ID de la consulta desde la URL
		const cid = $page.params.cid;
		if (cid) {
			consultaId = parseInt(cid, 10);

			if (!isNaN(consultaId)) {
				const consultaData = getConsulta(consultaId);

				if (consultaData) {
					consulta = consultaData;
					tratamientos = listTratamientosByConsulta(consultaId).map(computeTratamientoSaldo);
				} else {
					error = 'Consulta no encontrada';
				}
			} else {
				error = 'ID de consulta inválido';
			}
		} else {
			error = 'No se especificó una consulta';
		}

		loading = false;
	});
</script>

<section class="consulta-detalle">
	<div class="header-row">
		<div>
			<h1 class="title">Detalle de consulta</h1>
			{#if consulta}
				<p class="subtitle">#{consulta.id} • {consulta.paciente_nombre}</p>
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
							<button class="link-btn" on:click={() => irAlPaciente(consulta.paciente_id)}>
								{consulta.paciente_nombre}
							</button>
						</div>
					</div>

					<div class="info-item">
						<div class="label">Fecha de consulta</div>
						<div class="value">{consulta.fecha_formato}</div>
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
						<div class="summary-value">{formatMoney(consulta.costo_total_tratamientos)}</div>
					</div>

					<div class="summary-item">
						<div class="summary-label">Total pagado</div>
						<div class="summary-value text-success">{formatMoney(consulta.total_pagos)}</div>
					</div>

					<div class="summary-item">
						<div class="summary-label">Saldo pendiente</div>
						<div class="summary-value" class:text-warning={consulta.saldo_pendiente > 0}>
							{formatMoney(consulta.saldo_pendiente)}
						</div>
					</div>

					<div class="summary-item">
						<div class="summary-label">Tratamientos</div>
						<div class="summary-value">{consulta.tratamientos_count}</div>
					</div>
				</div>

				<div class="actions-footer">
					{#if consulta.saldo_pendiente > 0}
						<Button variant="primary" on:click={() => nuevoTratamiento(consulta.id)}>
							Registrar tratamiento
						</Button>
					{/if}
				</div>
			</Card>

			<!-- Tratamientos de la consulta -->
			<Card title="Tratamientos" subtitle={`${tratamientos.length} tratamiento${tratamientos.length !== 1 ? 's' : ''}`} hoverable>
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

								<div class="treatment-financials">
									<div class="financial-item">
										<span class="label">Pagado:</span>
										<span class="text-success">{formatMoney(tratamiento.totalPagos)}</span>
									</div>
									<div class="financial-item">
										<span class="label">Saldo:</span>
										<Badge variant={tratamiento.saldoPendiente > 0 ? 'warning' : 'success'}>
											{formatMoney(tratamiento.saldoPendiente)}
										</Badge>
									</div>
								</div>

								<div class="treatment-actions">
									{#if tratamiento.saldoPendiente > 0}
										<Button variant="primary" size="sm" on:click={() => registrarPago(tratamiento.id)}>
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
					<Button variant="outline" on:click={irAConsultas}>
						Volver a consultas
					</Button>
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
