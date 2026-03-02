<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { get as getStore } from 'svelte/store';
	import { goto } from '$app/navigation';
	import { Card, Input, Button, Badge } from '$lib/ui';
	import {
		getPacienteById,
		createConsulta,
		createTratamiento,
		type Paciente as PacienteModel
	} from '$lib/services/api/pacientes';

	// Route params
	let pacienteId: number | null = null;

	// Patient info
	let paciente: PacienteModel | null = null;

	// Form state - Consulta
	let fecha_consulta: string = '';
	let motivo: string = '';
	let diagnostico: string = '';
	let observaciones: string = '';

	// Form state - Tratamiento
	let descripcion_tratamiento: string = '';
	let fecha_inicio: string = '';
	let fecha_fin: string = '';
	let costo_total: string = '0';

	// UI State
	let loading: boolean = true;
	let submitting: boolean = false;
	let error: string | null = null;

	// Helpers
	function todayIsoDate(): string {
		const d = new Date();
		// YYYY-MM-DD
		return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().substring(0, 10);
	}

	function validate(): string | null {
		if (!pacienteId) return 'Paciente no válido.';
		if (!motivo.trim()) return 'El motivo de la consulta es requerido.';
		if (!diagnostico.trim()) return 'El diagnóstico es requerido.';
		if (!descripcion_tratamiento.trim()) return 'La descripción del tratamiento es requerida.';
		// costo_total numeric
		const ct = Number(costo_total);
		if (Number.isNaN(ct) || ct < 0)
			return 'El costo total debe ser un número válido mayor o igual a 0.';
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
			const consulta = await createConsulta({
				paciente_id: pacienteId!,
				motivo: motivo.trim(),
				diagnostico: diagnostico.trim(),
				fecha_consulta: fecha_consulta ? new Date(fecha_consulta).toISOString() : undefined,
				observaciones: observaciones || undefined
			});

			createTratamiento({
				consulta_id: consulta.id,
				descripcion: descripcion_tratamiento.trim(),
				fecha_inicio: fecha_inicio || null,
				fecha_fin: fecha_fin || null,
				costo_total: Number(costo_total)
			});

			// Navegar al detalle paciente
			goto(`/pacientes/${pacienteId}`);
		} catch (e: any) {
			error = e?.message || 'Error al registrar la consulta y tratamiento.';
		} finally {
			submitting = false;
		}
	}

	onMount(async () => {
		const $page = getStore(page);
		const rawId = $page?.params?.id;
		const parsed = Number(rawId);
		pacienteId = Number.isFinite(parsed) ? parsed : null;

		try {
			if (!pacienteId) {
				throw new Error('ID de paciente no válido');
			}
			paciente = await getPacienteById(pacienteId);

			// Default form values
			fecha_consulta = ''; // dejar vacío para usar timestamp actual si no se provee
			fecha_inicio = todayIsoDate();
			fecha_fin = '';
			costo_total = '0';
			motivo = '';
			diagnostico = '';
			observaciones = '';
			loading = false;
		} catch (e: any) {
			error = e?.message || 'Error cargando datos';
			loading = false;
		}
	});

	function goBack() {
		goto(`/pacientes/${pacienteId}`);
	}
</script>

<section class="nueva-consulta">
	{#if loading}
		<Card padded outlined>
			<div class="loading">
				<div class="spinner" aria-hidden="true"></div>
				<div>Cargando datos del paciente...</div>
			</div>
		</Card>
	{:else if error}
		<Card padded outlined>
			<div class="error">
				<Badge variant="error" pill>Error</Badge>
				<div class="msg">{error}</div>
			</div>
			<div class="row-actions">
				<Button variant="outline" on:click={goBack}>Volver</Button>
			</div>
		</Card>
	{:else if paciente}
		<Card
			title="Nueva consulta"
			subtitle={`Paciente: ${paciente.name} ${paciente.lastname}`}
			hoverable
			outlined
		>
			<div class="grid-2">
				<div class="info-item">
					<div class="label">Identificación</div>
					<div class="value">{paciente.dni}</div>
				</div>
				<div class="info-item">
					<div class="label">Teléfono</div>
					<div class="value">{paciente.phone || '—'}</div>
				</div>
			</div>

			<div class="form-section">
				<h3 class="section-title">Datos de la consulta</h3>
				<div class="grid-2">
					<Input
						type="text"
						label="Motivo de consulta"
						placeholder="Ej: Dolor, chequeo, control"
						bind:value={motivo}
						required
						name="motivo"
						id="motivo"
					/>
					<Input
						type="text"
						label="Diagnóstico"
						placeholder="Ej: Caries, gingivitis"
						bind:value={diagnostico}
						required
						name="diagnostico"
						id="diagnostico"
					/>
				</div>
				<div class="grid-2">
					<Input
						type="date"
						label="Fecha de consulta"
						description="Opcional. Si lo dejas vacío se usará la fecha y hora actuales."
						bind:value={fecha_consulta}
						name="fecha_consulta"
						id="fecha_consulta"
					/>
					<Input
						type="text"
						label="Observaciones"
						placeholder="Notas/observaciones de la consulta"
						bind:value={observaciones}
						name="observaciones"
						id="observaciones"
					/>
				</div>
			</div>

			<div class="form-section">
				<h3 class="section-title">Tratamiento asociado</h3>
				<div class="grid-2">
					<Input
						type="text"
						label="Descripción del tratamiento"
						placeholder="Ej: Endodoncia Molar Superior"
						bind:value={descripcion_tratamiento}
						required
						name="descripcion_tratamiento"
						id="descripcion_tratamiento"
					/>
					<Input
						type="number"
						label="Costo total"
						placeholder="0"
						bind:value={costo_total}
						name="costo_total"
						id="costo_total"
					/>
				</div>
				<div class="grid-2">
					<Input
						type="date"
						label="Fecha de inicio"
						bind:value={fecha_inicio}
						name="fecha_inicio"
						id="fecha_inicio"
					/>
					<Input
						type="date"
						label="Fecha de finalización"
						bind:value={fecha_fin}
						name="fecha_fin"
						id="fecha_fin"
					/>
				</div>
			</div>

			{#if error}
				<div class="error inline">
					<Badge variant="error" pill>Error</Badge>
					<div class="msg">{error}</div>
				</div>
			{/if}

			<div class="row-actions">
				<Button variant="primary" on:click={handleSubmit} type="button" disabled={submitting}>
					{submitting ? 'Guardando...' : 'Guardar consulta'}
				</Button>
				<Button variant="outline" on:click={goBack} type="button">Cancelar</Button>
			</div>
		</Card>
	{/if}
</section>

<style>
	.nueva-consulta {
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
</style>
