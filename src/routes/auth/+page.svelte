<script lang="ts">
	import { Card, Input, Button, Badge } from '$lib/ui';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { login } from '$lib/services/api/auth';

	let username = '';
	let password = '';
	let loading = false;
	let errorMsg: string | null = null;

	const onSubmit = async (e: Event) => {
		e.preventDefault();
		errorMsg = null;
		loading = true;
		try {
			await login(username.trim(), password);
			await goto(resolve('/dashboard'));
		} catch (err: unknown) {
			errorMsg = err instanceof Error ? err.message : 'Error de autenticación';
		} finally {
			loading = false;
		}
	};
</script>

<section class="auth">
	<div class="auth-container">
		<Card
			padded
			hoverable
			outlined
			title="Bienvenido"
			subtitle="Accede al Sistema Odontológico"
			className=""
			ariaLabel="Formulario de inicio de sesión"
		>
			<div class="brand-head">
				<div class="brand-mark" aria-hidden="true">
					<svg
						width="32"
						height="32"
						viewBox="0 0 32 32"
						fill="none"
						xmlns="http://www.w3.org/2000/svg"
					>
						<path
							d="M16 4C10.48 4 6 8.48 6 14c0 3.5 1.8 6.6 4.5 8.4.3.2.5.5.5.8v2.3c0 .8.7 1.5 1.5 1.5h7c.8 0 1.5-.7 1.5-1.5v-2.3c0-.3.2-.6.5-.8 2.7-1.8 4.5-4.9 4.5-8.4 0-5.52-4.48-10-10-10zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z"
							fill="currentColor"
						/>
					</svg>
				</div>
				<div class="brand-text">
					<h1 class="brand-title">Sistema Odontológico</h1>
					<p class="brand-subtitle text-soft">Gestión Clínica Profesional</p>
				</div>
			</div>

			<form class="form-grid" on:submit|preventDefault={onSubmit}>
				{#if errorMsg}
					<div class="alert-error">
						<Badge variant="error" pill ariaLabel="Error de autenticación" className="">Error</Badge
						>
						<span>{errorMsg}</span>
					</div>
				{/if}
				<Input
					label="Usuario"
					placeholder="Tu usuario"
					bind:value={username}
					description="Ingresa tu usuario para continuar"
					name="username"
					id="username"
					disabled={loading}
					required
				/>
				<Input
					type="password"
					label="Contraseña"
					placeholder="••••••••"
					bind:value={password}
					description="Ingresa tu contraseña"
					name="password"
					id="password"
					disabled={loading}
					required
				/>

				<div class="actions">
					<Button
						variant="primary"
						type="submit"
						disabled={loading}
						ariaLabel="Iniciar sesión"
						block
					>
						{loading ? 'Ingresando...' : 'Entrar'}
					</Button>
					<Button
						variant="outline"
						on:click={() => goto(resolve('/dashboard'))}
						type="button"
						disabled={loading}
						ariaLabel="Ir al dashboard"
						block>Ir al dashboard</Button
					>
				</div>
			</form>
		</Card>
	</div>
</section>

<style>
	.auth {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: calc(100vh - 160px);
		padding: var(--space-6) var(--space-4);
		background:
			radial-gradient(1200px 600px at 10% -10%, var(--color-brand-50), transparent),
			radial-gradient(800px 400px at 110% 20%, var(--color-secondary-50), transparent);
	}

	.auth-container {
		width: 100%;
		max-width: 480px;
	}

	.brand-head {
		display: grid;
		grid-template-columns: 56px 1fr;
		gap: var(--space-3);
		align-items: center;
		margin-bottom: var(--space-2);
	}

	.brand-mark {
		width: 56px;
		height: 56px;
		display: grid;
		place-items: center;
		background: linear-gradient(135deg, var(--color-brand-500), var(--color-brand-600));
		color: var(--color-white);
		border-radius: var(--radius-md);
		box-shadow: var(--shadow-sm);
	}

	.brand-title {
		margin: 0;
		font-size: var(--font-size-2xl);
		line-height: var(--line-height-tight);
		font-weight: 700;
		letter-spacing: 0.2px;
	}

	.brand-subtitle {
		margin: 0;
		font-size: var(--font-size-sm);
	}

	.form-grid {
		display: grid;
		gap: var(--space-3);
		margin-top: var(--space-3);
	}

	.alert-error {
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-2);
		border: 1px solid var(--color-error-200);
		background: var(--color-error-50);
		color: var(--color-error-800);
		border-radius: var(--radius-sm);
	}

	.actions {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		margin-top: var(--space-4);
	}
</style>
