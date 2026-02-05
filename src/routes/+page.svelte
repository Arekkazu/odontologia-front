<script lang="ts">
  import { onMount } from 'svelte';

  onMount(() => {
    // Redirect root route to /auth for now (no auth logic yet)
    window.location.href = '/auth';
  });
</script>

<section class="redirecting">
  <p>Redirigiendo a la pantalla de inicio de sesión...</p>
  <p>
    Si no ocurre automáticamente,
    <a href="/auth">haz clic aquí</a>.
  </p>
</section>
