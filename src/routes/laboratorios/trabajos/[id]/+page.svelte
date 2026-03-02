<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { Card, Badge, Button } from '$lib/ui';
	import {
		getTrabajoLaboratorio,
		listLaboratorios,
		type TrabajoLaboratorio,
		type Laboratorio
	} from '$lib/services/api/laboratorios';

	export let data: { trabajoId: number | null };

	let trabajo: TrabajoLaboratorio | null = null;
	let loading = false;
	let error: string | null = null;
	let labName: string = '—';

	const estadoVariant = (estado: TrabajoLaboratorio['estado']) => {
		switch (estado) {
			case 'LISTO':
			case 'RECIBIDO':
				return 'success';
			case 'ENVIADO':
			case 'EN_PROCESO':
			case 'CREADO':
				return 'info';
			case 'ENTREGADO':
				return 'neutral';
			case 'CANCELADO':
				return 'error';
			case 'REHACER':
				return 'warning';
			default:
				return 'neutral';
		}
	};

	const formatDate = (date?: string | null) => {
		if (!date) return '—';
		const parsed = new Date(date);
		if (Number.isNaN(parsed.getTime())) return date;
		return parsed.toLocaleDateString('es-ES', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});
	};

	onMount(async () => {
		if (data?.trabajoId === null) {
			error = 'ID de trabajo inválido.';
			return;
		}
		const id = data?.trabajoId;
		if (!id) {
			error = 'No se pudo determinar el trabajo a mostrar.';
			return;
		}
		loading = true;
		try {
			const [trabajoResp, labs] = await Promise.all([
				getTrabajoLaboratorio(id),
				listLaboratorios()
			]);
			trabajo = trabajoResp;
			const lab = labs.find((l: Laboratorio) => l.id === trabajoResp.laboratorio_id);
			labName = lab?.nombre ?? `Laboratorio #${trabajoResp.laboratorio_id}`;
		} catch (err) {
			if (err instanceof Error) {
				error = err.message;
			} else {
				error = 'No se pudo cargar el trabajo.';
			}
		} finally {
			loading = false;
		}
	});
</script>

<section class="detalle-trabajo">
	<div class="header">
		<h1 class="title">
			{#if trabajo}
				Trabajo #{trabajo.id}
			{:else}
				Detalle del trabajo
			{/if}
		</h1>
		{#if trabajo}
			<Badge variant={estadoVariant(trabajo.estado)} pill>{trabajo.estado}</Badge>
		{/if}
	</div>

	{#if loading}
		<div class="placeholder">Cargando información del trabajo...</div>
	{:else if error}
		<div class="placeholder error">{error}</div>
	{:else if trabajo}
		<div class="cards">
			<Card title="Información general" hoverable outlined>
				<div class="info-grid">
					<div>
						<p class="label">Laboratorio</p>
						<p class="value">{labName}</p>
					</div>
					<div>
						<p class="label">Consulta</p>
						<p class="value">{trabajo.consulta_id ? `Consulta #${trabajo.consulta_id}` : '—'}</p>
					</div>
					<div>
						<p class="label">Descripción</p>
						<p class="value">{trabajo.descripcion ?? '—'}</p>
					</div>
					<div>
						<p class="label">Fecha de solicitud</p>
						<p class="value">{formatDate(trabajo.fecha_solicitud)}</p>
					</div>
				</div>
			</Card>

			<Card title="Fechas clave" hoverable outlined>
				<div class="info-grid">
					<div>
						<p class="label">Recepción</p>
						<p class="value">{formatDate(trabajo.fecha_recepcion)}</p>
					</div>
					<div>
						<p class="label">Entrega al paciente</p>
						<p class="value">{formatDate(trabajo.fecha_entrega_paciente)}</p>
					</div>
				</div>
			</Card>
		</div>
	{:else}
		<div class="placeholder">No hay datos disponibles.</div>
	{/if}

	<div class="actions">
		<Button variant="outline" on:click={() => goto('/laboratorios')}>Volver al listado</Button>
	</div>
</section>

<style>
	.detalle-trabajo {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
		padding-bottom: var(--space-5);
	}

	.header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-3);
	}

	.title {
		margin: 0;
		font-size: var(--font-size-2xl);
	}

	.cards {
		display: grid;
		gap: var(--space-4);
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
	}

	.info-grid {
		display: grid;
		gap: var(--space-3);
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
	}

	.label {
		margin: 0;
		font-size: var(--font-size-sm);
		color: var(--color-text-soft);
	}

	.value {
		margin: 0;
		font-weight: 600;
		font-size: var(--font-size-md);
	}

	.placeholder {
		border-radius: var(--radius-md);
		padding: var(--space-4);
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		color: var(--color-text-soft);
	}

	.placeholder.error {
		color: var(--color-error);
	}

	.actions {
		display: flex;
		gap: var(--space-2);
	}
</style>
