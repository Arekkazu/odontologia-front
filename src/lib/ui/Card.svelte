<script lang="ts">
  import { cardClasses, classNames } from './index';
  import type { CardProps } from './index';

  // Props controlling the look & feel
  export let padded: CardProps['padded'] = true;
  export let hoverable: CardProps['hoverable'] = false;
  export let outlined: CardProps['outlined'] = false;

  // Optional visual sections
  export let title: string | undefined;
  export let subtitle: string | undefined;

  // Optional header/footer visibility toggles
  export let showHeader: boolean = true;
  export let showFooter: boolean = false;

  // Custom classes for root wrapper
  export let className: string | undefined;

  // Build classes
  $: rootClasses = classNames(cardClasses({ padded, hoverable, outlined }), className || '');

  // ARIA landmark role (optional): users can override via spread if needed
  export let role: string | undefined = 'region';
  export let ariaLabel: string | undefined;
</script>

<section class={rootClasses} {role} {ariaLabel}>
  {#if showHeader}
    <header class="card-header">
      {#if title}
        <h3 class="card-title">{title}</h3>
      {/if}
      {#if subtitle}
        <p class="card-subtitle text-soft">{subtitle}</p>
      {/if}
      <slot name="header" />
    </header>
  {/if}

  <div class="card-content">
    <slot />
  </div>

  {#if showFooter}
    <footer class="card-footer">
      <slot name="footer" />
    </footer>
  {/if}
</section>

<style>
  /* Base card styles are provided by theme.css (.card).
     Here we add structural styles and optional modifiers */
  .card-header {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    margin-bottom: var(--space-3);
  }

  .card-title {
    margin: 0;
    font-size: var(--font-size-lg);
    line-height: var(--line-height-tight);
  }

  .card-subtitle {
    margin: 0;
    font-size: var(--font-size-sm);
  }

  .card-content {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .card-footer {
    margin-top: var(--space-4);
    display: flex;
    justify-content: flex-end;
    gap: var(--space-2);
  }

  /* Modifiers compatible with cardClasses mapping */
  .card-padded {
    padding: var(--space-4);
  }

  .card-hoverable {
    transition: box-shadow var(--transition-base), transform var(--transition-base);
  }
  .card-hoverable:hover {
    box-shadow: var(--shadow-md);
    transform: translateY(-1px);
  }

  .card-outlined {
    border-color: var(--color-gray-300);
  }

  /* Responsive adjustments */
  @media (max-width: 640px) {
    .card-footer {
      justify-content: stretch;
      flex-wrap: wrap;
    }
  }
</style>
