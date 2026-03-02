<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { Card, Input, Button, Badge } from '$lib/ui';

	import {
		listLaboratorios,
		createTrabajoLaboratorio,
		type Laboratorio,
		type TrabajoEstado
	} from '$lib/services/api/laboratorios';

	// Data injected by the +page.ts loader (may be undefined on client navigation)
	export let data: { labs?: Laboratorio[]; error?: string | null } | undefined;

	// Form state
	let consultaId: string = '';
	let laboratorio_id: number | null = null;
	let descripcion_trabajo: string = '';
	let estado: TrabajoEstado = 'SOLICITADO';
	let fecha_recepcion: string = ''; // YYYY-MM-DD from <input type="date">
	let fecha_entrega_paciente: string = '';

	// UI state
	let labs: Laboratorio[] = data?.labs ?? [];
	let loading = false;
	let submitting = false;
	let error: string | null = data?.error ?? null;
	let successMsg: string | null = null;

	// Defaults
	function todayIsoDate(): string {
		const d = new Date();
		return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().substring(0, 10);
	}

	// If loader provided labs, preselect first; otherwise, fetch on mount as fallback.
	if (Array.isArray(labs) && labs.length > 0 && laboratorio_id === null) {
		laboratorio_id = labs[0].id;
	}

	onMount(async () => {
		if (Array.isArray(labs) && labs.length > 0) {
			return;
		}
		// fallback fetch if page data not present (client navigation)
		try {
			loading = true;
			const fetched = await listLaboratorios();
			labs = Array.isArray(fetched) ? fetched : [];
			if (labs.length > 0 && laboratorio_id === null) laboratorio_id = labs[0].id;
		} catch (e: unknown) {
			error = e instanceof Error ? e.message : String(e ?? 'Error cargando laboratorios');
		} finally {
			loading = false;
		}
	});

	function validate(): string | null {
		const cid = Number(consultaId);
		if (Number.isNaN(cid) || cid <= 0)
			return 'Debes ingresar un ID de consulta/tratamiento válido.';
		if (laboratorio_id === null) return 'Selecciona un laboratorio.';
		if (!estado) return 'Selecciona un estado.';
		return null;
	}

	// Helper to convert date input (YYYY-MM-DD) to ISO datetime string with zero time (UTC)
	function dateInputToIso(dateStr: string | undefined | null): string | null {
		if (!dateStr) return null;
		// Construct Date in local timezone from YYYY-MM-DD and then normalize to UTC ISO
		const d = new Date(dateStr + 'T00:00:00Z');
		if (Number.isNaN(d.getTime())) return null;
		return d.toISOString();
	}

	async function handleSubmit() {
		const v = validate();
		if (v) {
			error = v;
			successMsg = null;
			return;
		}

		error = null;
		successMsg = null;
		submitting = true;

		try {
			// Build DTO exactly as backend expects:
			const dto = {
				laboratorio_id: laboratorio_id!,
				consulta_id: Number(consultaId),
				descripcion: descripcion_trabajo ? descripcion_trabajo.trim() : undefined,
				estado,
				fecha_recepcion: dateInputToIso(fecha_recepcion) ?? undefined,
				fecha_entrega_paciente: dateInputToIso(fecha_entrega_paciente) ?? undefined
			};

			await createTrabajoLaboratorio(dto);

			successMsg = 'Trabajo de laboratorio creado correctamente.';
			// navigate to list using resolve for correct base path
			goto(resolve('/laboratorios'));
		} catch (e: unknown) {
			// Extract useful message where possible
			if (e instanceof Error) {
				error = e.message;
			} else if (typeof e === 'object' && e !== null && 'message' in (e as any)) {
				error = String((e as any).message);
			} else {
				error = String(e ?? 'Error desconocido al crear el trabajo');
			}
			successMsg = null;
		} finally {
			submitting = false;
		}
	}

	function handleCancel() {
		goto(resolve('/laboratorios'));
	}
</script>

<section class="nuevo-trabajo" aria-labelledby="nuevo-trabajo-title">
	<div class="header-row">
		<h1 id="nuevo-trabajo-title" class="title">Nuevo trabajo de laboratorio</h1>
	</div>

	<Card
		title="Registrar trabajo"
		subtitle="Envía un trabajo al laboratorio"
		hoverable
		outlined
		className=""
		ariaLabel="Formulario nuevo trabajo de laboratorio"
	>
		{#if loading}
			<div class="loading">
				<div class="spinner" aria-hidden="true"></div>
				<div>Cargando laboratorios...</div>
			</div>
		{:else}
			<div class="form-grid">
				<div class="row-2">
					<Input
						type="number"
						label="ID de consulta / tratamiento"
						placeholder="Ej: 10"
						bind:value={consultaId}
						name="consultaId"
						id="consultaId"
						description="ID de la consulta o del tratamiento asociado (número)"
						ariaLabel="ID de consulta"
					/>

					<label class="field">
						<span class="label">Laboratorio</span>
						<select
							class="input"
							bind:value={laboratorio_id}
							name="laboratorio_id"
							id="laboratorio_id"
							aria-label="Seleccionar laboratorio"
						>
							<option value={null} disabled selected={laboratorio_id === null}
								>Selecciona un laboratorio</option
							>
							{#each labs as lab (lab.id)}
								<option value={lab.id}>{lab.nombre}</option>
							{/each}
						</select>
					</label>
				</div>

				<Input
					type="text"
					label="Descripción del trabajo"
					placeholder="Ej: Impresión 3D de modelo"
					bind:value={descripcion_trabajo}
					name="descripcion_trabajo"
					id="descripcion_trabajo"
					description="Detalle de lo solicitado al laboratorio (opcional)"
					ariaLabel="Descripción del trabajo"
				/>

				<div class="row-2">
					<label class="field">
						<span class="label">Estado</span>
						<select
							class="input"
							bind:value={estado}
							name="estado"
							id="estado"
							aria-label="Estado del trabajo"
						>
							<option value="SOLICITADO">SOLICITADO</option>
							<option value="ENVIADO">ENVIADO</option>
							<option value="RECIBIDO">RECIBIDO</option>
							<option value="ENTREGADO">ENTREGADO</option>
							<option value="CREADO">CREADO</option>
							<option value="EN_PROCESO">EN_PROCESO</option>
							<option value="LISTO">LISTO</option>
							<option value="CANCELADO">CANCELADO</option>
							<option value="REHACER">REHACER</option>
						</select>
					</label>

					<div class="form-field">
						<Input
							type="text"
							label="Costo (opcional)"
							placeholder="Ej: 120.00"
							name="costo_laboratorio"
							id="costo_laboratorio"
							description="Campo informativo (si el backend soporta, se añadirá posteriormente)"
							ariaLabel="Costo del laboratorio"
						/>
					</div>
				</div>

				<div class="form-row row-2">
					<Input
						type="date"
						label="Fecha de recepción"
						placeholder="YYYY-MM-DD"
						bind:value={fecha_recepcion}
						name="fecha_recepcion"
						id="fecha_recepcion"
						description="Fecha en que el laboratorio recibió el trabajo (opcional)"
						ariaLabel="Fecha de recepción"
					/>
					<Input
						type="date"
						label="Fecha entrega al paciente"
						placeholder="YYYY-MM-DD"
						bind:value={fecha_entrega_paciente}
						name="fecha_entrega_paciente"
						id="fecha_entrega_paciente"
						description="Fecha prevista o real de entrega al paciente (opcional)"
						ariaLabel="Fecha de entrega al paciente"
					/>
				</div>
			</div>

			{#if error}
				<div class="error" role="alert" aria-live="assertive">
					<Badge variant="error" pill ariaLabel="Error">Error</Badge>
					<div class="msg">{error}</div>
				</div>
			{/if}

			{#if successMsg}
				<div class="success" role="status" aria-live="polite">
					<Badge variant="success" pill ariaLabel="Éxito">Éxito</Badge>
					<div class="msg">{successMsg}</div>
				</div>
			{/if}

			<div class="actions">
				<Button
					variant="primary"
					ariaLabel="Guardar trabajo"
					type="button"
					on:click={handleSubmit}
					disabled={submitting}
				>
					{submitting ? 'Guardando...' : 'Guardar trabajo'}
				</Button>
				<Button variant="outline" ariaLabel="Cancelar" type="button" on:click={handleCancel}
					>Cancelar</Button
				>
			</div>
		{/if}
	</Card>

	<Card hoverable className="" ariaLabel="Notas sobre el formulario" title="Nota" subtitle="">
		<div class="tips">
			<Badge variant="info" pill ariaLabel="Información">Info</Badge>
			<div class="text-soft">
				El formulario envía un payload con las fechas en formato ISO completo (ej.
				2025-03-01T00:00:00.000Z). Si tu backend requiere campos adicionales modifica el DTO en el
				servicio.
			</div>
		</div>
	</Card>
</section>

<style>
	.nuevo-trabajo {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	.header-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.title {
		margin: 0;
		font-size: var(--font-size-2xl);
	}

	.form-grid {
		display: grid;
		gap: var(--space-4);
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
	}

	.row-2 {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
		gap: var(--space-3);
		align-items: start;
	}

	.form-field {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		padding-top: var(--space-2);
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.label {
		font-size: var(--font-size-sm);
		color: var(--color-text-soft);
		font-weight: 600;
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

	.actions {
		display: inline-flex;
		gap: var(--space-2);
		margin-top: var(--space-3);
	}

	.error,
	.success {
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
		margin-top: var(--space-2);
	}

	.msg {
		font-weight: 600;
	}

	.tips {
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
	}

	@media (max-width: 680px) {
		.row-2 {
			grid-template-columns: 1fr;
		}
	}
</style>
