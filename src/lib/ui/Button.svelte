<script lang="ts">
	import { buttonClasses, ariaBusy, ariaDisabled } from './index';
	import type { ButtonVariant, ButtonSize } from './index';
	import { createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher();

	export let variant: ButtonVariant = 'primary';
	export let size: ButtonSize = 'md';
	export let loading: boolean = false;
	export let disabled: boolean = false;
	export let block: boolean = false;
	export let ariaLabel: string | undefined;

	// Native button type: commonly 'button' (default), 'submit' or 'reset'
	export let type: 'button' | 'submit' | 'reset' = 'button';

	function handleClick(event: MouseEvent) {
		// Prevent emitting when disabled/loading
		if (disabled || loading) return;
		dispatch('click', event);
	}
</script>

<button
	class={buttonClasses({ variant, size, loading, disabled, block })}
	{type}
	aria-label={ariaLabel}
	{...ariaBusy(loading)}
	{...ariaDisabled(disabled)}
	disabled={disabled || loading}
	on:click={handleClick}
>
	{#if loading}
		<span class="btn-spinner" aria-hidden="true"></span>
	{/if}
	<slot />
</button>

<style>
	/* Size variants extension (aligned with tokens in theme.css) */
	.btn-sm {
		height: calc(var(--btn-height) - 6px);
		padding: 0 calc(var(--control-padding-x) - 4px);
		font-size: var(--font-size-sm);
		border-radius: var(--radius-sm);
	}
	.btn-md {
		height: var(--btn-height);
		padding: 0 var(--control-padding-x);
		font-size: var(--font-size-md);
	}
	.btn-lg {
		height: calc(var(--btn-height) + 6px);
		padding: 0 calc(var(--control-padding-x) + 4px);
		font-size: var(--font-size-lg);
		border-radius: var(--radius-md);
	}

	.btn-block {
		width: 100%;
		display: inline-flex;
		justify-content: center;
	}

	.is-disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.is-loading {
		position: relative;
	}

	/* Additional variants (danger, ghost) mapped to existing token palette */
	.btn-danger {
		background: var(--color-error);
		color: var(--color-white);
	}
	.btn-danger:hover {
		background: #bb3f3f;
	}

	.btn-ghost {
		background: transparent;
		color: var(--color-text);
		border-color: transparent;
	}
	.btn-ghost:hover {
		background: var(--color-surface-2);
	}

	/* Button spinner (minimal, uses token colors) */
	.btn-spinner {
		width: 1em;
		height: 1em;
		border: 2px solid rgba(255, 255, 255, 0.6);
		border-top-color: rgba(255, 255, 255, 1);
		border-radius: 50%;
		display: inline-block;
		animation: btn-spin var(--transition-slow) infinite linear;
		margin-right: var(--space-2);
	}

	/* Adjust spinner color for non-filled variants */
	.btn-outline .btn-spinner,
	.btn-ghost .btn-spinner {
		border: 2px solid var(--color-muted);
		border-top-color: var(--color-text);
	}

	@keyframes btn-spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
