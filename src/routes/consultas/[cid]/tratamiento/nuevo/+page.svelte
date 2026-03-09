<script lang="ts">
	import { Card, Button, Input } from '$lib/ui';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { getConsulta } from '$lib/services/api/consultas';
	import { getPacienteById } from '$lib/services/api/pacientes';
	import { createTratamiento } from '$lib/services/api/tratamientos';
	import type { Consulta } from '$lib/services/api/consultas';
	import type { Paciente } from '$lib/services/api/pacientes';

	let consultaId: number | null = null;
	let consulta: Consulta | null = null;
	let paciente: Paciente | null = null;

	// Form fields
	let descripcion = '';
	let costo_total = '';
	let fecha_inicio = '';
	let fecha_fin = '';

	// UI state
	let loading = true;
	let submitting = false;
	let error = '';
	let success = '';

	function getTodayDate(): string {
		const today = new Date();
		const year = today.getFullYear();
		const month = String(today.getMonth() + 1).padStart(2, '0');
		const day = String(today.getDate()).padStart(2, '0');
		return `${year}-${month}-${day}`;
	}

	function formatDate(date?: string | null): string {
		if (!date) return '—';
		const parsed = new Date(date);
		if (Number.isNaN(parsed.getTime())) return date;
		return parsed.toLocaleDateString('es-ES', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});
	}

	function irAConsulta() {
		window.location.href = `/consultas/${consultaId}`;
	}

	function irAlPaciente(pacienteId: number) {
		window.location.href = `/pacientes/${pacienteId}`;
	}

	async function submitForm(e: Event) {
		e.preventDefault();
		error = '';
		success = '';

		// Validaciones
		if (!descripcion.trim()) {
			error = 'La descripción del tratamiento es requerida';
			return;
		}

		const costoNumerico = parseFloat(costo_total);
		if (isNaN(costoNumerico) || costoNumerico < 0) {
			error = 'El costo debe ser un número válido mayor o igual a 0';
			return;
		}

		if (!consultaId) {
			error = 'ID de consulta inválido';
			return;
		}

		submitting = true;

		try {
			await createTratamiento({
				consulta_id: consultaId,
				descripcion: descripcion.trim(),
				costo_total: costoNumerico,
				fecha_inicio: fecha_inicio || undefined,
				fecha_fin: fecha_fin || undefined,
				estado: 'propuesto' // Estado por defecto
			});

			success = '✓ Tratamiento registrado exitosamente';

			// Redirigir al detalle de la consulta después de 1.5s
			setTimeout(() => {
				irAConsulta();
			}, 1500);
		} catch (err) {
			error =
				err instanceof Error ? err.message : 'Ocurrió un error al registrar el tratamiento';
			console.error('Error creando tratamiento:', err);
		} finally {
			submitting = false;
		}
	}

	onMount(async () => {
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
			// Obtener consulta
			consulta = await getConsulta(consultaId);

			// Obtener paciente
			if (consulta.paciente_id) {
				try {
					paciente = await getPacienteById(consulta.paciente_id);
				} catch (err) {
					console.error('Error cargando paciente:', err);
				}
			}

			// Establecer fecha de inicio por defecto
			fecha_inicio = getTodayDate();
		} catch (err) {
			console.error('Error cargando consulta:', err);
			error = err instanceof Error ? err.message : 'Consulta no encontrada';
		} finally {
			loading = false;
		}
	});
</script>

<section class="nuevo-tratamiento">
	<div class="header-row">
		<div>
			<h1 class="title">Registrar tratamiento</h1>
			{#if consulta && paciente}
				<p class="subtitle">
					Consulta #{consulta.id} • {paciente.name}
					{paciente.lastname}
				</p>
			{/if}
		</div>
		<div class="actions">
			<Button variant="outline" on:click={irAConsulta} disabled={submitting}>
				Volver a consulta
			</Button>
		</div>
	</div>

	{#if error && !consulta}
		<Card title="Error" hoverable>
			<p class="text-error">{error}</p>
			<Button variant="primary" on:click={() => window.history.back()}>Volver</Button>
		</Card>
	{:else if loading}
		<Card title="Cargando..." hoverable>
			<p class="text-soft">Cargando datos de la consulta...</p>
		</Card>
	{:else if consulta}
		<div class="grid">
			<!-- Formulario -->
			<Card title="Datos del tratamiento" hoverable>
				<form on:submit={submitForm} class="form">
					<!-- Mensajes de estado -->
					{#if error}
						<div class="alert alert-error">
							<strong>Error:</strong>
							{error}
						</div>
					{/if}

					{#if success}
						<div class="alert alert-success">
							{success}
						</div>
					{/if}

					<!-- Descripción del tratamiento -->
					<div class="form-group">
						<label for="descripcion" class="label">
							Descripción del tratamiento <span class="required">*</span>
						</label>
						<Input
							id="descripcion"
							type="text"
							placeholder="Ej: Endodoncia, Corona, Limpieza profunda"
							bind:value={descripcion}
							required
							disabled={submitting}
							description="Descripción clara y detallada del tratamiento a realizar"
						/>
					</div>

					<!-- Costo total -->
					<div class="form-group">
						<label for="costo_total" class="label">
							Costo total (COP) <span class="required">*</span>
						</label>
						<Input
							id="costo_total"
							type="number"
							placeholder="0"
							bind:value={costo_total}
							required
							disabled={submitting}
							step="0.01"
							min="0"
							description="Costo total del tratamiento en pesos colombianos"
						/>
					</div>

					<!-- Fechas (opcionales) -->
					<div class="form-row">
						<div class="form-group">
							<label for="fecha_inicio" class="label">Fecha de inicio (opcional)</label>
							<Input
								id="fecha_inicio"
								type="date"
								bind:value={fecha_inicio}
								disabled={submitting}
								description="Fecha estimada de inicio del tratamiento"
							/>
						</div>

						<div class="form-group">
							<label for="fecha_fin" class="label">Fecha de fin (opcional)</label>
							<Input
								id="fecha_fin"
								type="date"
								bind:value={fecha_fin}
								disabled={submitting}
								description="Fecha estimada de finalización"
							/>
						</div>
					</div>

					<!-- Información adicional -->
					<div class="info-box">
						<p class="info-text">
							<strong>Nota:</strong> El tratamiento se creará con estado "Propuesto". Podrás cambiar
							el estado posteriormente desde el detalle de la consulta.
						</p>
					</div>

					<!-- Botones -->
					<div class="form-actions">
						<Button
							variant="primary"
							type="submit"
							disabled={submitting || !descripcion.trim() || !costo_total}
						>
							{submitting ? 'Guardando...' : 'Registrar tratamiento'}
						</Button>
						<Button variant="outline" type="button" on:click={irAConsulta} disabled={submitting}>
							Cancelar
						</Button>
					</div>
				</form>
			</Card>

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

				<hr class="divider" />

				<div class="tips">
					<h3 class="tips-title">Consejos</h3>
					<ul class="tips-list">
						<li>Describe el tratamiento de forma clara y específica</li>
						<li>El costo puede incluir materiales y procedimientos</li>
						<li>Las fechas son estimadas y puedes ajustarlas después</li>
						<li>El estado inicial será "Propuesto" hasta que el paciente acepte</li>
					</ul>
				</div>
			</Card>
		</div>
	{/if}
</section>

<style>
	.nuevo-tratamiento {
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

	/* Formulario */
	.form {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.form-row {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: var(--space-3);
	}

	@media (max-width: 640px) {
		.form-row {
			grid-template-columns: 1fr;
		}
	}

	.label {
		font-size: var(--font-size-sm);
		font-weight: 600;
		color: var(--color-text);
	}

	.required {
		color: var(--color-error);
	}

	.info-box {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		padding: var(--space-3);
	}

	.info-text {
		margin: 0;
		font-size: var(--font-size-sm);
		color: var(--color-text-soft);
		line-height: var(--line-height-relaxed);
	}

	.form-actions {
		display: flex;
		gap: var(--space-2);
		margin-top: var(--space-2);
	}

	/* Alertas */
	.alert {
		padding: var(--space-3) var(--space-4);
		border-radius: var(--radius-sm);
		font-size: var(--font-size-sm);
		line-height: var(--line-height-normal);
	}

	.alert-error {
		background: #fde7e7;
		color: #9b2c2c;
		border: 1px solid #f6bcbc;
	}

	.alert-success {
		background: var(--color-brand-100);
		color: var(--color-brand-700);
		border: 1px solid var(--color-brand-200);
	}

	/* Info grid */
	.info-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: var(--space-3);
	}

	.info-item {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}

	.info-item.full-width {
		grid-column: 1 / -1;
	}

	.info-item .label {
		font-size: var(--font-size-xs);
		font-weight: 600;
		color: var(--color-text-soft);
		text-transform: uppercase;
		letter-spacing: 0.05em;
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
		font-size: inherit;
	}

	.link-btn:hover {
		text-decoration: underline;
	}

	.divider {
		border: none;
		border-top: 1px solid var(--color-border);
		margin: var(--space-3) 0;
	}

	.tips {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.tips-title {
		margin: 0;
		font-size: var(--font-size-md);
		font-weight: 600;
	}

	.tips-list {
		margin: 0;
		padding-left: var(--space-4);
		font-size: var(--font-size-sm);
		color: var(--color-text-soft);
		line-height: var(--line-height-relaxed);
	}

	.tips-list li {
		margin-bottom: var(--space-2);
	}

	.text-error {
		color: var(--color-error);
	}

	.text-soft {
		color: var(--color-text-soft);
	}
</style>
