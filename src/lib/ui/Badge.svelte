<script lang="ts">
  import type { BadgeVariant } from './index';
  import { badgeClasses, classNames } from './index';

  // Props
  export let variant: BadgeVariant = 'neutral';
  export let pill: boolean = false;
  export let small: boolean = false; // size modifier

  // ARIA (role=status for semantic status chips)
  export let role: string = 'status';
  export let ariaLabel: string | undefined;

  // Additional custom classes
  export let className: string | undefined;

  $: classes = classNames(badgeClasses({ variant, pill }), small ? 'badge-sm' : '', className || '');
</script>

<span class={classes} {role} {ariaLabel}>
  <slot />
</span>

<style>
  /* Base styling comes from theme.css (.badge and variant classes).
     Here we provide small size modifier and neutral variant fallback. */

  .badge-sm {
    height: 1.5rem;
    font-size: var(--font-size-xs);
    padding: 0 var(--space-2);
  }

  /* Neutral variant if not defined in theme.css */
  .badge-neutral {
    background: var(--color-surface-2);
    color: var(--color-text);
    border-color: var(--color-border);
  }

  /* Pill shape if not defined in theme.css */
  .badge-pill {
    border-radius: var(--radius-full);
  }
</style>
