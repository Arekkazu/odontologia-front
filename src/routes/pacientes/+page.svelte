<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { Card, Button, Input, Badge } from '$lib/ui';
	import type { Paciente as PacienteModel } from '$lib/services/api/pacientes';
	export let data: { pacientes: PacienteModel[]; error?: string | null };

	type Paciente = PacienteModel & {
		saldo_pendiente?: number;
	};

	let searchQuery = '';
	const basePacientes = (data?.pacientes ?? []).map((p) => ({
		...p,
		saldo_pendiente: 0
	}));
	// Log what we received from the server so we can debug if the page
	// isn't showing patients even when the backend returns data.
	console.log('Received pacientes from load:', data?.pacientes ?? []);
	let pacientes: Paciente[] = basePacientes;
	let loading = false;
	let error: string | null = data?.error ?? null;
	let filteredPacientes: Paciente[] = basePacientes;

	// Make DNI filtering robust: backend may return numeric DNIs, so convert to string.
	// Also add a debug log to see filtered results and the current query.
	function nombreCompleto(p: Paciente): string {
		return `${p.name || ''} ${p.lastname || ''}`.trim();
	}
	$: {
		const q = searchQuery.trim().toLowerCase();
		filteredPacientes = pacientes
			.filter((p) => {
				const fullName = nombreCompleto(p).toLowerCase();
				const dniStr = String(p.dni ?? '').toLowerCase();
				const matches = !q || fullName.includes(q) || dniStr.includes(q);
				return matches;
			})
			.sort((a, b) => nombreCompleto(a).localeCompare(nombreCompleto(b)));
		console.log('filteredPacientes count:', filteredPacientes.length, 'query:', searchQuery);
	}

	function nuevoPaciente() {
		goto(resolve('/pacientes/nuevo'));
	}

	function verPaciente(id: number) {
		goto(resolve(`/pacientes/${id}`));
	}

	function registrarPago(id: number) {
		goto(resolve(`/pacientes/${id}/pagar`));
	}
</script>

<section class="pacientes">
	<div class="header-row">
		<h1 class="title">Pacientes</h1>
		<div class="actions">
			<Button variant="primary" ariaLabel="Nuevo paciente" on:click={nuevoPaciente}
				>Nuevo paciente</Button
			>
		</div>
	</div>

	<Card
		title="Búsqueda"
		subtitle="Filtra por nombre o documento"
		hoverable
		ariaLabel="Búsqueda de pacientes"
	>
		<div class="filters">
			<Input
				type="search"
				label="Buscar"
				name="searchQuery"
				id="searchQuery"
				placeholder="Buscar por nombre o identificación"
				bind:value={searchQuery}
				description="Escribe parte del nombre o documento."
			/>
			<div class="status">
				{#if loading}
					<Badge pill variant="info" ariaLabel="Cargando">Cargando...</Badge>
				{:else if error}
					<Badge pill variant="error" ariaLabel="Error de carga">Error</Badge>
				{:else}
					<Badge pill variant="success" ariaLabel="Carga completa">Listo</Badge>
				{/if}
			</div>
		</div>
	</Card>

	{#if error}
		<Card hoverable>
			<div class="error-row">
				<Badge variant="error" pill>Error</Badge>
				<div class="msg">{error}</div>
				<Button
					variant="outline"
					size="sm"
					ariaLabel="Reintentar carga"
					on:click={() => location.reload()}>Reintentar</Button
				>
			</div>
		</Card>
	{/if}

	<Card
		title="Listado de pacientes"
		subtitle={`Total: ${filteredPacientes.length}`}
		hoverable
		ariaLabel="Listado de pacientes"
	>
		<div class="tabla-wrapper">
			<table class="table">
				<thead>
					<tr>
						<th>Nombre</th>
						<th>Identificación</th>
						<th>Teléfono</th>
						<th style="width:220px;">Acciones</th>
					</tr>
				</thead>
				<tbody>
					{#if loading}
						<tr>
							<td colspan="4" class="text-soft">Cargando pacientes...</td>
						</tr>
					{:else if filteredPacientes.length === 0}
						<tr>
							<td colspan="4" class="text-soft">No hay resultados para tu búsqueda.</td>
						</tr>
					{:else}
						{#each filteredPacientes as p (p.id)}
							<tr>
								<td>
									<div class="col-main">
										<div class="name">{nombreCompleto(p)}</div>
									</div>
								</td>
								<td>{p.dni}</td>
								<td>{p.phone || '—'}</td>
								<td>
									<div class="row-actions">
										<Button variant="secondary" size="sm" on:click={() => verPaciente(p.id)}
											>Ver</Button
										>
										<Button variant="outline" size="sm" on:click={() => registrarPago(p.id)}
											>Registrar pago</Button
										>
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
	.pacientes {
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

	.filters {
		display: grid;
		grid-template-columns: 1fr auto;
		gap: var(--space-3);
		align-items: center;
	}

	@media (max-width: 640px) {
		.filters {
			grid-template-columns: 1fr;
		}
	}

	.status {
		display: inline-flex;
		align-items: center;
		justify-content: flex-end;
	}

	.tabla-wrapper {
		overflow: auto;
		border-radius: var(--radius-sm);
	}

	.col-main .name {
		font-weight: 600;
	}

	.row-actions {
		display: inline-flex;
		flex-wrap: wrap;
		gap: var(--space-2);
	}

	.error-row {
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
		flex-wrap: wrap;
	}

	.msg {
		font-weight: 600;
	}
</style>
