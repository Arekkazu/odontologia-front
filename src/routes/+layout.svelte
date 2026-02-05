<script lang="ts">
	// Global styles
	import './layout.css';
	import '$lib/ui/theme.css';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();

	// Simple theme toggle (optional: can be wired later to settings)
	let theme: 'light' | 'dark' = 'light';
	function toggleTheme() {
		theme = theme === 'light' ? 'dark' : 'light';
	}
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<meta name="viewport" content="width=device-width, initial-scale=1" />
	<meta name="theme-color" content="#3aa375" />
</svelte:head>

<div class="app-shell" data-theme={theme === 'dark' ? 'dark' : undefined}>
	<header class="app-header">
		<div class="header-inner">
			<a class="brand" href="/dashboard">
				<span class="brand-mark" aria-hidden="true">🦷</span>
				<span class="brand-name">Odonto Gestión</span>
			</a>
			<nav class="nav">
				<a class="nav-link" href="/dashboard">Dashboard</a>
				<a class="nav-link" href="/pacientes">Pacientes</a>
				<a class="nav-link" href="/consultas">Consultas</a>
				<a class="nav-link" href="/laboratorios">Laboratorios</a>
				<a class="nav-link" href="/horario">Horario</a>
			</nav>
			<div class="header-actions">
				<button class="btn btn-outline" on:click={toggleTheme} aria-label="Cambiar tema">
					{theme === 'light' ? 'Modo oscuro' : 'Modo claro'}
				</button>
			</div>
		</div>
	</header>

	<main class="app-main">
		{@render children()}
	</main>

	<footer class="app-footer text-soft">
		<div class="footer-inner">
			<span>© {new Date().getFullYear()} Odonto Gestión</span>
			<span>Diseño clínico • Rápido • Responsable</span>
		</div>
	</footer>
</div>

<style>
	.app-header {
		position: sticky;
		top: 0;
		background: var(--color-bg);
		border-bottom: 1px solid var(--color-border);
		z-index: var(--z-sticky);
	}

	.header-inner {
		max-width: 1200px;
		margin: 0 auto;
		padding: var(--space-3) var(--space-4);
		display: grid;
		grid-template-columns: auto 1fr auto;
		align-items: center;
		gap: var(--space-4);
	}

	.brand {
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
		color: var(--color-text);
		text-decoration: none;
		font-weight: 800;
	}
	.brand-mark {
		font-size: var(--font-size-xl);
	}
	.brand-name {
		font-size: var(--font-size-lg);
		line-height: var(--line-height-tight);
	}

	.nav {
		display: inline-flex;
		align-items: center;
		gap: var(--space-4);
	}
	.nav-link {
		color: var(--color-text);
		text-decoration: none;
		font-weight: 600;
		opacity: 0.9;
	}
	.nav-link:hover {
		opacity: 1;
		text-decoration: underline;
		text-underline-offset: 6px;
	}

	.header-actions {
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
	}

	.app-main {
		max-width: 1200px;
		margin: 0 auto;
		padding: var(--space-6) var(--space-4);
		min-height: calc(100vh - 140px);
	}

	.app-footer {
		border-top: 1px solid var(--color-border);
		background: var(--color-surface);
	}
	.footer-inner {
		max-width: 1200px;
		margin: 0 auto;
		padding: var(--space-4);
		display: flex;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: var(--space-2);
	}

	@media (max-width: 768px) {
		.header-inner {
			grid-template-columns: 1fr auto;
		}
		.nav {
			display: none;
		}
	}
</style>
