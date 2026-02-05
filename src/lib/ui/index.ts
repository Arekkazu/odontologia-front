/**
 * Odontología UI - Base components barrel and design utilities
 *
 * This file defines shared types and utilities for base UI components
 * (Button, Input, Card, Badge) and re-exports Svelte components that
 * will be implemented alongside this index.
 *
 * Usage (Svelte):
 *  <script lang="ts">
 *    import { Button, Input, Card, Badge } from '$lib/ui';
 *  </script>
 *
 *  <Card>
 *    <h2>Registro de Paciente</h2>
 *    <Input placeholder="Nombre completo" />
 *    <Button variant="primary">Guardar</Button>
 *    <Badge variant="success">Activo</Badge>
 *  </Card>
 */

// Barrel exports (the .svelte components will be implemented separately)
export { default as Button } from './Button.svelte';
export { default as Input } from './Input.svelte';
export { default as Card } from './Card.svelte';
export { default as Badge } from './Badge.svelte';

/* -------------------------------------------
 * Shared types for consistency across UI
 * ------------------------------------------- */

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';
export interface ButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  block?: boolean; // full width
  // aria
  ariaLabel?: string;
}

export type InputType =
  | 'text'
  | 'number'
  | 'email'
  | 'tel'
  | 'date'
  | 'time'
  | 'password'
  | 'search';

export interface InputProps {
  type?: InputType;
  value?: string | number;
  placeholder?: string;
  disabled?: boolean;
  readonly?: boolean;
  required?: boolean;
  invalid?: boolean;
  label?: string;
  description?: string;
  name?: string;
  id?: string;
  // events: on:input, on:change handled in the component
}

export interface CardProps {
  padded?: boolean; // apply default padding
  hoverable?: boolean; // elevate on hover
  outlined?: boolean; // stronger border
}

export type BadgeVariant = 'success' | 'warning' | 'info' | 'error' | 'neutral';
export interface BadgeProps {
  variant?: BadgeVariant;
  pill?: boolean;
  // semantic mapping: success -> brand, warning -> accent, etc.
}

/* -------------------------------------------
 * Design helpers
 * ------------------------------------------- */

/**
 * Concatenate class names, ignoring falsy values.
 */
export function classNames(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(' ');
}

/**
 * Map Button variant to CSS classes based on theme tokens from theme.css.
 * These classes should align with styles defined in theme.css.
 */
export function buttonClasses(props: ButtonProps = {}): string {
  const { variant = 'primary', size = 'md', block, disabled, loading } = props;

  const base =
    'btn ' +
    (size === 'sm'
      ? 'btn-sm'
      : size === 'lg'
      ? 'btn-lg'
      : 'btn-md');

  const variantClass =
    variant === 'primary'
      ? 'btn-primary'
      : variant === 'secondary'
      ? 'btn-secondary'
      : variant === 'outline'
      ? 'btn-outline'
      : variant === 'danger'
      ? 'btn-danger'
      : 'btn-ghost';

  const state = classNames(
    block ? 'btn-block' : '',
    disabled ? 'is-disabled' : '',
    loading ? 'is-loading' : ''
  );

  return classNames(base, variantClass, state);
}

/**
 * Map Input props to CSS classes.
 */
export function inputClasses(props: InputProps = {}): string {
  const { invalid, disabled, readonly } = props;
  return classNames(
    'input',
    invalid ? 'is-invalid' : '',
    disabled ? 'is-disabled' : '',
    readonly ? 'is-readonly' : ''
  );
}

/**
 * Map Card props to CSS classes.
 */
export function cardClasses(props: CardProps = {}): string {
  const { padded = true, hoverable, outlined } = props;
  return classNames(
    'card',
    padded ? 'card-padded' : '',
    hoverable ? 'card-hoverable' : '',
    outlined ? 'card-outlined' : ''
  );
}

/**
 * Map Badge variant to CSS classes.
 */
export function badgeClasses(props: BadgeProps = {}): string {
  const { variant = 'neutral', pill } = props;
  const base = 'badge';
  const variantClass =
    variant === 'success'
      ? 'badge-success'
      : variant === 'warning'
      ? 'badge-warning'
      : variant === 'info'
      ? 'badge-info'
      : variant === 'error'
      ? 'badge-error'
      : 'badge-neutral';
  return classNames(base, variantClass, pill ? 'badge-pill' : '');
}

/* -------------------------------------------
 * Optional ARIA helpers
 * ------------------------------------------- */

export function ariaBusy(loading?: boolean): { 'aria-busy'?: 'true' | 'false' } {
  if (loading === undefined) return {};
  return { 'aria-busy': loading ? 'true' : 'false' };
}

export function ariaDisabled(disabled?: boolean): { 'aria-disabled'?: 'true' | 'false' } {
  if (disabled === undefined) return {};
  return { 'aria-disabled': disabled ? 'true' : 'false' };
}
