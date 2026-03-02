<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { Card, Input, Button, Badge } from '$lib/ui';
	import { createPaciente, type CreatePacienteInput } from '$lib/services/api/pacientes';

	// Tipos de identificación (mock local por ahora).
	// En una iteración posterior se leerá de un servicio dedicado.
	const tiposIdentificacionMock = [
		{ id: 1, codigo: 'CC', descripcion: 'Cédula de ciudadanía' },
		{ id: 2, codigo: 'CE', descripcion: 'Cédula de extranjería' },
		{ id: 3, codigo: 'TI', descripcion: 'Tarjeta de identidad' },
		{ id: 4, codigo: 'PAS', descripcion: 'Pasaporte' }
	];

	// Form state
	let name = '';
	let lastname = '';
	let email = '';
	let phone = '';
	let typeDni: string = tiposIdentificacionMock[0]?.codigo ?? 'CC';
	let dni = '';

	// UI state
	let error: string | null = null;
	let submitting = false;

	function validate(): string | null {
		if (!name.trim()) return 'El nombre es requerido.';
		if (!lastname.trim()) return 'Los apellidos son requeridos.';
		if (!dni.trim()) return 'El número de identificación es requerido.';
		if (!typeDni.trim()) {
			return 'Selecciona un tipo de identificación válido.';
		}
		if (phone && phone.length < 7) return 'El teléfono debe tener al menos 7 dígitos.';
		if (email && !email.includes('@')) return 'Ingresa un email válido.';
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
			const payload: CreatePacienteInput = {
				dni: dni.trim(),
				name: name.trim(),
				lastname: lastname.trim(),
				email: email ? email.trim() : null,
				phone: phone ? phone.trim() : null,
				typeDni,
				created_at: new Date().toISOString()
			};
			await createPaciente(payload);
			goto(resolve('/pacientes'));
		} catch (e) {
			const err = e as Error;
			error = err?.message || 'Error al crear el paciente.';
		} finally {
			submitting = false;
		}
	}

	function cancelar() {
		goto(resolve('/pacientes'));
	}
</script>

<section class="nuevo-paciente">
	<Card
		title="Nuevo paciente"
		subtitle="Registra los datos del paciente"
		hoverable
		outlined
		ariaLabel="Formulario nuevo paciente"
		className=""
	>
		<div class="form-grid">
			<div class="row-2">
				<Input
					type="text"
					label="Nombre"
					placeholder="Ej: Juan"
					bind:value={name}
					required
					name="name"
					id="name"
					description="Nombre del paciente"
				/>
				<Input
					type="text"
					label="Apellidos"
					placeholder="Ej: Pérez Gómez"
					bind:value={lastname}
					required
					name="lastname"
					id="lastname"
					description="Apellidos del paciente"
				/>
			</div>

			<div class="row-2">
				<label class="field">
					<span class="label">Tipo de identificación</span>
					<select bind:value={typeDni} class="input" name="typeDni" id="typeDni">
						{#each tiposIdentificacionMock as t (t.id)}
							<option value={t.codigo}>{t.codigo} — {t.descripcion}</option>
						{/each}
					</select>
				</label>

				<Input
					type="text"
					label="DNI / Número de identificación"
					placeholder="Ej: 1012345678"
					bind:value={dni}
					required
					name="dni"
					id="dni"
					description="Documento del paciente"
				/>
			</div>

			<Input
				type="tel"
				label="Teléfono"
				placeholder="Ej: 3001234567"
				bind:value={phone}
				name="phone"
				id="phone"
				description="Opcional"
			/>
			<Input
				type="email"
				label="Email"
				placeholder="Ej: correo@dominio.com"
				bind:value={email}
				name="email"
				id="email"
				description="Opcional"
			/>
		</div>

		{#if error}
			<div class="error">
				<Badge variant="error" pill ariaLabel="Error">Error</Badge>
				<div class="msg">{error}</div>
			</div>
		{/if}

		<div class="actions">
			<Button
				variant="primary"
				type="button"
				ariaLabel="Guardar paciente"
				on:click={handleSubmit}
				disabled={submitting}
			>
				{submitting ? 'Guardando...' : 'Guardar paciente'}
			</Button>
			<Button variant="outline" type="button" ariaLabel="Cancelar" on:click={cancelar}
				>Cancelar</Button
			>
		</div>
	</Card>

	<Card hoverable ariaLabel="Nota sobre backend" title="Nota" subtitle="" className="">
		<div class="tips">
			<Badge variant="info" pill ariaLabel="Nota">Nota</Badge>
			<div class="text-soft">
				Este formulario ya envía al backend real usando sesión con cookies. Asegúrate de estar
				autenticado.
			</div>
		</div>
	</Card>
</section>

<style>
	.nuevo-paciente {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
	}

	.form-grid {
		display: grid;
		gap: var(--space-3);
	}

	.row-2 {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: var(--space-3);
	}

	@media (max-width: 680px) {
		.row-2 {
			grid-template-columns: 1fr;
		}
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

	.error {
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
		margin-top: var(--space-2);
	}

	.msg {
		font-weight: 600;
	}

	.actions {
		display: inline-flex;
		gap: var(--space-2);
		flex-wrap: wrap;
		margin-top: var(--space-3);
	}

	.tips {
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
		flex-wrap: wrap;
	}
</style>
