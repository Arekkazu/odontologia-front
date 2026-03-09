<script lang="ts">
	// Global styles
	import './layout.css';
	import '$lib/ui/theme.css';
	import favicon from '$lib/assets/favicon.svg';
	import { resolve } from '$app/paths';
	import { logout } from '$lib/services/api/auth';

	const { children, data } = $props();
	const isAuthRoute = $derived(data?.isAuthRoute ?? false);

	let theme = $state<'light' | 'dark'>('light');
	const toggleTheme = () => {
		theme = theme === 'light' ? 'dark' : 'light';
	};

	const handleLogout = async () => {
		try {
			await logout();
		} catch (err) {
			console.error('No se pudo cerrar sesión', err);
		} finally {
			window.location.href = '/auth';
		}
	};
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<meta name="viewport" content="width=device-width, initial-scale=1" />
	<meta name="theme-color" content="#3b82f6" />
	<title>Odonto Gestión - Sistema de Gestión Odontológica</title>
</svelte:head>

<div class="app-shell" data-theme={theme === 'dark' ? 'dark' : undefined}>
	{#if !isAuthRoute}
		<header class="app-header">
			<div class="header-inner">
				<a class="brand" href={resolve('/dashboard')}>
					<div class="brand-icon">
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
						<span class="brand-name">Sistema Odontológico</span>
						<span class="brand-subtitle">Gestión Clínica</span>
					</div>
				</a>
				<nav class="nav">
					<a class="nav-link" href={resolve('/dashboard')}>
						<span>Inicio</span>
					</a>
					<a class="nav-link" href={resolve('/pacientes')}>
						<span>Pacientes</span>
					</a>
					<a class="nav-link" href={resolve('/consultas')}>
						<span>Consultas</span>
					</a>
					<a class="nav-link" href={resolve('/laboratorios')}>
						<span>Laboratorios</span>
					</a>
					<a class="nav-link" href={resolve('/horario')}>
						<span>Horario</span>
					</a>
				</nav>
				<div class="header-actions">
					<button class="btn btn-ghost btn-sm" onclick={toggleTheme} aria-label="Cambiar tema">
						{theme === 'light' ? 'Oscuro' : 'Claro'}
					</button>
					<button class="btn btn-outline btn-sm" onclick={handleLogout}>Cerrar sesión</button>
				</div>
			</div>
		</header>
	{/if}

	<main class="app-main">
		{@render children()}
	</main>

	{#if !isAuthRoute}
		<footer class="app-footer">
			<div class="footer-inner">
				<div class="footer-section">
					<span class="footer-text">© {new Date().getFullYear()} Sistema Odontológico</span>
				</div>
				<div class="footer-section">
					<span class="footer-badge">Gestión Clínica Profesional</span>
				</div>
			</div>
		</footer>
	{/if}
</div>

<style>
	.app-header {
		position: sticky;
		top: 0;
		background: var(--color-white);
		border-bottom: 1px solid var(--color-border);
		box-shadow: var(--shadow-sm);
		z-index: var(--z-sticky);
		backdrop-filter: blur(8px);
	}

	.header-inner {
		max-width: 1400px;
		margin: 0 auto;
		padding: var(--space-4) var(--space-6);
		display: grid;
		grid-template-columns: auto 1fr auto;
		align-items: center;
		gap: var(--space-6);
	}

	.brand {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		color: var(--color-text);
		text-decoration: none;
		transition: opacity var(--transition-fast);
	}

	.brand:hover {
		opacity: 0.8;
	}

	.brand-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2.5rem;
		height: 2.5rem;
		background: linear-gradient(135deg, var(--color-brand-500), var(--color-brand-600));
		border-radius: var(--radius-md);
		color: white;
		box-shadow: var(--shadow-sm);
	}

	.brand-text {
		display: flex;
		flex-direction: column;
		gap: 0;
	}

	.brand-name {
		font-size: var(--font-size-lg);
		font-weight: var(--font-weight-bold);
		line-height: 1.2;
		color: var(--color-gray-900);
	}

	.brand-subtitle {
		font-size: var(--font-size-xs);
		font-weight: var(--font-weight-medium);
		color: var(--color-text-soft);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.nav {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		justify-self: center;
	}

	.nav-link {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-2) var(--space-4);
		color: var(--color-text-soft);
		text-decoration: none;
		font-weight: var(--font-weight-semibold);
		font-size: var(--font-size-sm);
		border-radius: var(--radius-md);
		transition: all var(--transition-fast);
		white-space: nowrap;
	}

	.nav-link:hover {
		background: var(--color-brand-50);
		color: var(--color-brand-700);
	}

	.header-actions {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}

	.app-main {
		max-width: 1400px;
		margin: 0 auto;
		padding: var(--space-8) var(--space-6);
		min-height: calc(100vh - 180px);
	}

	.app-footer {
		border-top: 1px solid var(--color-border);
		background: var(--color-surface-2);
	}

	.footer-inner {
		max-width: 1400px;
		margin: 0 auto;
		padding: var(--space-6);
		display: flex;
		justify-content: space-between;
		align-items: center;
		flex-wrap: wrap;
		gap: var(--space-4);
	}

	.footer-section {
		display: flex;
		align-items: center;
		gap: var(--space-3);
	}

	.footer-text {
		font-size: var(--font-size-sm);
		color: var(--color-text-soft);
	}

	.footer-badge {
		display: inline-flex;
		align-items: center;
		padding: var(--space-1) var(--space-3);
		background: var(--color-brand-100);
		color: var(--color-brand-700);
		border-radius: var(--radius-full);
		font-size: var(--font-size-xs);
		font-weight: var(--font-weight-medium);
	}

	@media (max-width: 1024px) {
		.header-inner {
			padding: var(--space-4);
		}

		.app-main {
			padding: var(--space-6) var(--space-4);
		}
	}

	@media (max-width: 768px) {
		.header-inner {
			grid-template-columns: 1fr auto;
			gap: var(--space-4);
		}

		.nav {
			display: none;
		}

		.brand-icon {
			width: 2rem;
			height: 2rem;
		}

		.brand-name {
			font-size: var(--font-size-md);
		}

		.brand-subtitle {
			display: none;
		}

		.app-main {
			padding: var(--space-4);
		}

		.footer-inner {
			flex-direction: column;
			text-align: center;
		}
	}
</style>
