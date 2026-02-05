<script lang="ts">
  import { inputClasses } from './index';
  import type { InputType } from './index';

  // Props
  export let type: InputType = 'text';
  export let value: string | number | undefined = undefined;
  export let placeholder: string | undefined;
  export let disabled: boolean = false;
  export let readonly: boolean = false;
  export let required: boolean = false;
  export let invalid: boolean = false;
  export let label: string | undefined;
  export let description: string | undefined;
  export let name: string | undefined;
  export let id: string | undefined;

  // Optional controlled formatting for number
  let internalValue: string | number | undefined = value;

  // Sync internal and external value
  $: internalValue = value;

  // Emit custom events for parent forms when input changes
  function handleInput(e: Event) {
    const target = e.target as HTMLInputElement;
    internalValue = type === 'number' ? (target.value === '' ? '' : Number(target.value)) : target.value;
    const detail = { value: internalValue, raw: target.value };
    const customEvent = new CustomEvent('valuechange', { detail });
    dispatchEvent(customEvent);
  }

  // Svelte will forward native events (on:input / on:change)
  // Consumers can also listen for our custom event `on:valuechange`.

  // ARIA
  $: describedById = description ? `${id || name || 'input'}-desc` : undefined;
</script>

<div class="input-field">
  {#if label}
    <label class="input-label" for={id || name}>{label}{required ? ' *' : ''}</label>
  {/if}

  <input
    class={inputClasses({ invalid, disabled, readonly })}
    {type}
    bind:value={internalValue}
    {placeholder}
    {disabled}
    {readonly}
    {required}
    name={name}
    id={id || name}
    aria-invalid={invalid ? 'true' : 'false'}
    aria-describedby={describedById}
    on:input={handleInput}
  />

  {#if description}
    <div class="input-description text-soft" id={describedById}>
      {description}
    </div>
  {/if}

  {#if invalid}
    <div class="input-error text-error">
      <!-- Slot for error message, otherwise generic -->
      <slot name="error">Verifica este campo.</slot>
    </div>
  {/if}
</div>

<style>
  .input-field {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .input-label {
    font-size: var(--font-size-sm);
    color: var(--color-text-soft);
    font-weight: 600;
  }

  .input-description {
    font-size: var(--font-size-sm);
  }

  .input-error {
    font-size: var(--font-size-sm);
    font-weight: 600;
  }

  /* State modifiers aligning with tokens */
  .is-invalid {
    border-color: var(--color-error);
  }

  .is-invalid:focus {
    box-shadow: 0 0 0 3px rgba(214, 78, 78, 0.25);
  }

  .is-disabled {
    background: var(--color-surface-2);
    color: var(--color-muted);
    cursor: not-allowed;
  }

  .is-readonly {
    background: var(--color-surface-2);
  }
</style>
