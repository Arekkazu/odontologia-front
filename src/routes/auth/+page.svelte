<script lang="ts">
  import { Card, Input, Button, Badge } from '$lib/ui';
  import { goto } from '$app/navigation';

  // UI state (no real auth for now)
  let username = '';
  let password = '';
  let remember = true;

  function login() {
    // Navegación sin auth real por ahora
    goto('/dashboard');
  }
</script>

<section class="auth">
  <div class="auth-container">
    <Card padded hoverable outlined title="Bienvenido" subtitle="Accede a Odonto Gestión">
      <div class="brand-head">
        <div class="brand-mark" aria-hidden="true">🦷</div>
        <div class="brand-text">
          <h1 class="brand-title">Odonto Gestión</h1>
          <p class="brand-subtitle text-soft">Sistema de gestión dental</p>
        </div>
      </div>

      <div class="form-grid">
        <Input
          label="Usuario"
          placeholder="Tu usuario"
          bind:value={username}
          description="Ingresa tu usuario para continuar"
          name="username"
          id="username"
        />
        <Input
          type="password"
          label="Contraseña"
          placeholder="••••••••"
          bind:value={password}
          description="No se validará por ahora"
          name="password"
          id="password"
        />
        <label class="remember">
          <input type="checkbox" bind:checked={remember} />
          <span>Recordarme</span>
        </label>
      </div>

      <div class="actions">
        <Button variant="primary" on:click={login} type="button">Entrar</Button>
        <Button variant="outline" on:click={() => goto('/dashboard')} type="button">Ir al dashboard</Button>
      </div>

      <div class="tips">
        <Badge variant="info" pill>Acceso básico temporal</Badge>
        <span class="text-muted">Más adelante activaremos validación real y roles.</span>
      </div>
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
    background: var(--color-brand-100);
    color: var(--color-brand-700);
    border-radius: var(--radius-md);
    border: 1px solid var(--color-brand-200);
    font-size: var(--font-size-xl);
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

  .remember {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    font-size: var(--font-size-sm);
    color: var(--color-text);
    user-select: none;
  }

  .actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-2);
    margin-top: var(--space-3);
  }

  @media (max-width: 520px) {
    .actions {
      grid-template-columns: 1fr;
    }
  }

  .tips {
    display: flex;
    gap: var(--space-2);
    align-items: center;
    margin-top: var(--space-3);
    flex-wrap: wrap;
  }
</style>
