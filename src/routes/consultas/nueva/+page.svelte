<script lang="ts">
	import { Card, Button, Input, Badge } from '$lib/ui';
	import { onMount } from 'svelte';
	import { listPacientes, seedMockData, createTratamiento } from '$lib/services/api/pacientes';
	import { createConsulta } from '$lib/services/api/consultas';
	import type { Paciente } from '$lib/services/api/pacientes';

	let pacientes: Paciente[] = [];
	let pacienteSeleccionado: number | null = null;
	let motivo = '';
	let diagnostico = '';
	let observaciones = '';
	let descripcionTratamiento = '';
	let costoTratamiento = '';

	let loading = false;
	let error = '';
	let success = '';

	onMount(() => {
		seedMockData();
		pacientes = listPacientes();
	});

	async function submitForm(e: Event) {
		e.preventDefault();
		error = '';
		success = '';

		// Validaciones
		if (!pacienteSeleccionado) {
			error = 'Debes seleccionar un paciente';
			return;
		}
		if (!motivo.trim()) {
			error = 'El motivo de la consulta es requerido';
			return;
		}

		loading = true;

		try {
			// Crear consulta
			const consulta = createConsulta({
				paciente_id: pacienteSeleccionado,
				motivo: motivo.trim(),
				diagnostico: diagnostico.trim() || undefined,
				observaciones: observaciones.trim() || undefined
			});

			// Crear tratamiento si se especifica
			if (descripcionTratamiento.trim() && costoTratamiento) {
				createTratamiento({
					consulta_id: consulta.id,
					descripcion: descripcionTratamiento.trim(),
					costo_total: parseFloat(costoTratamiento) || 0
				});
			}

			success = '✓ Consulta creada exitosamente';

			// Redirigir a la consulta o al paciente después de 1.5s
			setTimeout(() => {
				window.location.href = `/consultas/${consulta.id}`;
			}, 1500);
		} catch (err) {
			error = 'Ocurrió un error al guardar la consulta. Intenta nuevamente.';
			console.error(err);
		} finally {
			loading = false;
		}
	}

	function irAConsultas() {
		window.location.href = '/consultas';
	}

	function irAlPaciente(pacienteId: number) {
		window.location.href = `/pacientes/${pacienteId}`;
	}
</script>

<section class="nueva-consulta">
	<div class="header-row">
		<div>
			<h1 class="title">Nueva consulta</h1>
			<p class="subtitle">Registra una nueva consulta dental</p>
		</div>
		<div class="actions">
			<Button variant="outline" on:click={irAConsultas}>Volver a consultas</Button>
		</div>
	</div>

	<div class="grid">
		<!-- Formulario -->
		<Card title="Datos de la consulta" hoverable>
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

				<!-- Seleccionar paciente -->
				<div class="form-group">
					<label for="paciente" class="label">
						Paciente <span class="required">*</span>
					</label>
					<select
						id="paciente"
						bind:value={pacienteSeleccionado}
						class="input"
						required
						disabled={loading}
					>
						<option value={null}>— Selecciona un paciente —</option>
						{#each pacientes as p}
							<option value={p.id}>
								{p.nombre_completo} ({p.numero_identificacion})
							</option>
						{/each}
					</select>
					<p class="help">Selecciona el paciente que está siendo atendido.</p>
				</div>

				<!-- Motivo de la consulta -->
				<div class="form-group">
					<label for="motivo" class="label">
						Motivo de la consulta <span class="required">*</span>
					</label>
					<Input
						id="motivo"
						type="text"
						placeholder="Ej: Dolor en molar, Limpieza, Revisión"
						bind:value={motivo}
						required
						disabled={loading}
						description="Razón principal de la consulta"
					/>
				</div>

				<!-- Diagnóstico -->
				<div class="form-group">
					<label for="diagnostico" class="label">Diagnóstico</label>
					<textarea
						id="diagnostico"
						bind:value={diagnostico}
						placeholder="Ej: Caries en premolar inferior izquierdo"
						class="textarea"
						disabled={loading}
						rows="3"
					/>
					<p class="help">Descripción del diagnóstico o hallazgos clínicos.</p>
				</div>

				<!-- Observaciones -->
				<div class="form-group">
					<label for="observaciones" class="label">Observaciones</label>
					<textarea
						id="observaciones"
						bind:value={observaciones}
						placeholder="Notas adicionales sobre la consulta..."
						class="textarea"
						disabled={loading}
						rows="3"
					/>
					<p class="help">Observaciones o notas relevantes.</p>
				</div>

				<!-- Separador -->
				<hr class="form-divider" />

				<p class="form-subtitle">Datos del tratamiento (opcional)</p>

				<!-- Descripción del tratamiento -->
				<div class="form-group">
					<label for="descripcion-trat" class="label">Descripción del tratamiento</label>
					<Input
						id="descripcion-trat"
						type="text"
						placeholder="Ej: Endodoncia, Limpieza profunda"
						bind:value={descripcionTratamiento}
						disabled={loading}
						description="Si deseas registrar un tratamiento en esta consulta."
					/>
				</div>

				<!-- Costo del tratamiento -->
				<div class="form-group">
					<label for="costo-trat" class="label">Costo del tratamiento ($)</label>
					<Input
						id="costo-trat"
						type="number"
						placeholder="0.00"
						bind:value={costoTratamiento}
						disabled={loading}
						step="0.01"
						min="0"
						description="Costo total del tratamiento en COP."
					/>
				</div>

				<!-- Botones -->
				<div class="form-actions">
					<Button
						variant="primary"
						type="submit"
						disabled={loading || !pacienteSeleccionado || !motivo.trim()}
					>
						{loading ? 'Guardando...' : 'Guardar consulta'}
					</Button>
					<Button variant="outline" type="button" on:click={irAConsultas} disabled={loading}>
						Cancelar
					</Button>
				</div>
			</form>
		</Card>

		<!-- Panel de referencia rápida -->
		<Card title="Referencia rápida" hoverable>
			<div class="reference">
				<h3 class="ref-title">Pacientes registrados</h3>
				{#if pacientes.length > 0}
					<div class="ref-list">
						{#each pacientes as p}
							<div class="ref-item">
								<div class="ref-name">{p.nombre_completo}</div>
								<div class="ref-meta">ID: {p.numero_identificacion}</div>
								<Button variant="outline" size="sm" on:click={() => irAlPaciente(p.id)}>
									Ver perfil
								</Button>
							</div>
						{/each}
					</div>
				{:else}
					<p class="text-soft">No hay pacientes registrados aún.</p>
				{/if}

				<hr class="ref-divider" />

				<h3 class="ref-title">Consejos</h3>
				<ul class="ref-tips">
					<li>Siempre selecciona el paciente correcto</li>
					<li>Describe el motivo de forma clara</li>
					<li>Incluye diagnóstico para el historial</li>
					<li>Puedes agregar tratamiento después si deseas</li>
				</ul>
			</div>
		</Card>
	</div>
</section>

<style>
	.nueva-consulta {
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

	.label {
		font-size: var(--font-size-sm);
		font-weight: 600;
		color: var(--color-text);
	}

	.required {
		color: var(--color-error);
	}

	.help {
		margin: 0;
		font-size: var(--font-size-xs);
		color: var(--color-text-soft);
	}

	.textarea {
		font-family: var(--font-sans);
		padding: var(--control-padding-y) var(--control-padding-x);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		background: var(--color-white);
		color: var(--color-text);
		font-size: var(--font-size-md);
		line-height: var(--line-height-normal);
		transition: border-color var(--transition-fast);
	}

	.textarea:hover {
		border-color: var(--color-gray-300);
	}

	.textarea:focus {
		outline: none;
		border-color: var(--color-focus);
		box-shadow: var(--shadow-focus);
	}

	.form-divider {
		border: none;
		border-top: 1px solid var(--color-border);
		margin: var(--space-2) 0;
	}

	.form-subtitle {
		margin: var(--space-3) 0 0 0;
		font-size: var(--font-size-md);
		font-weight: 600;
		color: var(--color-text-soft);
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

	/* Panel de referencia */
	.reference {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
	}

	.ref-title {
		margin: 0;
		font-size: var(--font-size-md);
		font-weight: 600;
	}

	.ref-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		max-height: 300px;
		overflow-y: auto;
	}

	.ref-item {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		padding: var(--space-3);
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
	}

	.ref-name {
		font-weight: 600;
		font-size: var(--font-size-sm);
	}

	.ref-meta {
		font-size: var(--font-size-xs);
		color: var(--color-text-soft);
	}

	.ref-divider {
		border: none;
		border-top: 1px solid var(--color-border);
		margin: 0;
	}

	.ref-tips {
		margin: 0;
		padding-left: var(--space-4);
		font-size: var(--font-size-sm);
		color: var(--color-text-soft);
	}

	.ref-tips li {
		margin-bottom: var(--space-2);
	}
</style>
