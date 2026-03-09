<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { get as getStore } from 'svelte/store';
	import { Card, Input, Button, Badge } from '$lib/ui';

	import { getPacienteById, type Paciente as PacienteModel } from '$lib/services/api/pacientes';
	import { getTratamiento, type Tratamiento } from '$lib/services/api/tratamientos';
	import {
		listPagosByTratamiento,
		createPago,
		getTodayDate,
		getMetodoPagoLabel,
		type Pago
	} from '$lib/services/api/pagos';

	// Route params
	let pacienteId: number | null = null;
	let tratamientoId: number | null = null;

	// Data
	let paciente: PacienteModel | null = null;
	let tratamiento: Tratamiento | null = null;
	let pagos: Pago[] = [];
	let saldoPendiente = 0;

	// Form state
	let monto: string = '';
	let fecha_pago: string = '';
	let metodo_pago: string = '';
	let observaciones: string = '';

	// UI state
	let loading = true;
	let submitting = false;
	let error: string | null = null;

	function formatMoney(n: number | null | undefined): string {
		const v = typeof n === 'number' ? n : 0;
		return `$${v.toFixed(2)}`;
	}

	function formatDay(d: string | null | undefined): string {
		if (!d) return '—';
		return d;
	}

	function estadoSaldoBadgeVariant(
		saldo: number
	): 'success' | 'warning' | 'info' | 'error' | 'neutral' {
		if (saldo <= 0) return 'success';
		if (saldo > 0 && saldo <= 50) return 'info';
		if (saldo > 50 && saldo <= 200) return 'warning';
		return 'error';
	}

	async function reloadData() {
		loading = true;
		error = null;
		try {
			if (pacienteId === null || tratamientoId === null) {
				throw new Error('Parámetros de ruta inválidos.');
			}

			// Obtener paciente
			paciente = await getPacienteById(pacienteId);
			if (!paciente) throw new Error(`Paciente ${pacienteId} no encontrado.`);

			// Obtener tratamiento con información de pagos
			tratamiento = await getTratamiento(tratamientoId);
			if (!tratamiento)
				throw new Error(`Tratamiento ${tratamientoId} no encontrado para el paciente.`);

			// Cargar pagos existentes
			pagos = await listPagosByTratamiento(tratamientoId);

			// Calcular saldo pendiente manualmente si no viene del backend
			const totalPagado = pagos.reduce((sum, p) => sum + p.monto, 0);
			saldoPendiente = tratamiento.costo_total - totalPagado;

			// Defaults
			fecha_pago = getTodayDate();
			metodo_pago = '';
			observaciones = '';
			monto = '';

			loading = false;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Error cargando datos.';
			loading = false;
		}
	}

	onMount(() => {
		const $page = getStore(page);
		const rawPid = $page?.params?.id;
		const rawTid = $page?.params?.tid;
		const pParsed = Number(rawPid);
		const tParsed = Number(rawTid);
		pacienteId = Number.isFinite(pParsed) ? pParsed : null;
		tratamientoId = Number.isFinite(tParsed) ? tParsed : null;

		reloadData();
	});

	function goBack() {
		if (pacienteId !== null) {
			window.location.href = `/pacientes/${pacienteId}`;
		}
	}

	function validate(): string | null {
		if (!tratamientoId) return 'Tratamiento inválido.';
		const amt = Number(monto);
		if (Number.isNaN(amt) || amt <= 0) return 'El monto debe ser un número válido mayor a 0.';
		if (amt > saldoPendiente) {
			return `El monto excede el saldo pendiente (${formatMoney(saldoPendiente)})`;
		}
		return null;
	}

	async function handleSubmit() {
		const v = validate();
		if (v) {
			error = v;
			return;
		}

		error = null;
		submitting = true;
		try {
			await createPago({
				tratamiento_id: tratamientoId!,
				monto: Number(monto),
				fecha_pago: fecha_pago || getTodayDate(),
				metodo_pago: metodo_pago || undefined,
				observaciones: observaciones || undefined
			});

			// Navegar al detalle del paciente
			window.location.href = `/pacientes/${pacienteId}`;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Error registrando el pago.';
		} finally {
			submitting = false;
		}
	}
</script>

<section class="registrar-pago">
	{#if loading}
		<Card padded outlined title="" subtitle="" className="" ariaLabel="Cargando">
			<div class="loading">
				<div class="spinner" aria-hidden="true"></div>
				<div>Cargando tratamiento...</div>
			</div>
		</Card>
	{:else if error}
		<Card padded outlined title="" subtitle="" className="" ariaLabel="Error">
			<div class="error">
				<Badge variant="error" pill ariaLabel="Error" className="">Error</Badge>
				<div class="msg">{error}</div>
			</div>
			<div class="row-actions">
				<Button variant="outline" on:click={goBack} ariaLabel="Volver">Volver</Button>
			</div>
		</Card>
	{:else if paciente && tratamiento}
		<Card
			title="Registrar pago"
			subtitle={`Paciente: ${
				paciente.name
					? `${paciente.name} ${paciente.lastname ?? ''}`.trim()
					: paciente.nombre_completo
			}`}
			hoverable
			outlined
			className=""
			ariaLabel="Formulario de pago"
		>
			<div class="grid-2">
				<div class="info-item">
					<div class="label">Tratamiento</div>
					<div class="value">{tratamiento.descripcion}</div>
				</div>
				<div class="info-item">
					<div class="label">Costo total</div>
					<div class="value">{formatMoney(tratamiento.costo_total)}</div>
				</div>
				<div class="info-item">
					<div class="label">Pagado</div>
					<div class="value">{formatMoney(pagos.reduce((sum, p) => sum + p.monto, 0))}</div>
				</div>
				<div class="info-item">
					<div class="label">Saldo</div>
					<div class="value">
						<Badge
							variant={estadoSaldoBadgeVariant(saldoPendiente)}
							pill
							ariaLabel="Saldo"
							className=""
						>
							{formatMoney(saldoPendiente)}
						</Badge>
					</div>
				</div>
				<div class="info-item">
					<div class="label">Fecha inicio</div>
					<div class="value">{formatDay(tratamiento.fecha_inicio)}</div>
				</div>
				<div class="info-item">
					<div class="label">Fecha fin</div>
					<div class="value">{formatDay(tratamiento.fecha_fin)}</div>
				</div>
			</div>

			<div class="form-section">
				<h3 class="section-title">Datos del pago</h3>
				<div class="grid-2">
					<Input
						type="date"
						label="Fecha de pago"
						bind:value={fecha_pago}
						name="fecha_pago"
						id="fecha_pago"
						placeholder=""
						description=""
					/>
					<Input
						type="number"
						label="Monto"
						placeholder="0"
						bind:value={monto}
						name="monto"
						id="monto"
						required
						description="Máximo: {formatMoney(saldoPendiente)}"
					/>
				</div>
				<div class="grid-2">
					<Input
						type="text"
						label="Método de pago"
						placeholder="Efectivo / Tarjeta / Transferencia"
						bind:value={metodo_pago}
						name="metodo_pago"
						id="metodo_pago"
						description=""
					/>
					<Input
						type="text"
						label="Observaciones"
						placeholder="Opcional"
						bind:value={observaciones}
						name="observaciones"
						id="observaciones"
						description=""
					/>
				</div>
			</div>

			{#if error}
				<div class="error inline">
					<Badge variant="error" pill ariaLabel="Error" className="">Error</Badge>
					<div class="msg">{error}</div>
				</div>
			{/if}

			<div class="row-actions">
				<Button
					variant="primary"
					on:click={handleSubmit}
					type="button"
					disabled={submitting}
					ariaLabel="Guardar pago"
				>
					{submitting ? 'Guardando...' : 'Guardar pago'}
				</Button>
				<Button variant="outline" on:click={goBack} type="button" ariaLabel="Cancelar"
					>Cancelar</Button
				>
			</div>
		</Card>

		<Card
			title="Pagos registrados"
			subtitle={`Tratamiento #${tratamiento.id}`}
			hoverable
			className=""
			ariaLabel="Lista de pagos"
		>
			<div class="tabla-wrapper">
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
						{#each pagos as p (p.id)}
							<tr>
								<td>{formatDay(p.fecha_pago)}</td>
								<td>{formatMoney(p.monto)}</td>
								<td>{getMetodoPagoLabel(p.metodo_pago)}</td>
								<td>{p.observaciones || '—'}</td>
							</tr>
						{:else}
							<tr>
								<td colspan="4" class="text-soft">Aún no hay pagos registrados.</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</Card>
	{/if}
</section>

<style>
	.registrar-pago {
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
	.error.inline {
		margin-top: var(--space-2);
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

	.form-section {
		margin-top: var(--space-3);
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}
	.section-title {
		margin: 0;
		font-size: var(--font-size-lg);
		line-height: var(--line-height-tight);
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
</style>
