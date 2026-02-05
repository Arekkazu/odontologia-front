<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { Card, Input, Button, Badge } from '$lib/ui';

  import {
    seedLaboratoriosMock,
    listLaboratorios,
    createTrabajo,
    type Laboratorio,
    type EstadoTrabajoLaboratorio
  } from '$lib/services/api/laboratorios';

  // Form state
  let tratamiento_id: string = '';
  let laboratorio_id: number | null = null;
  let descripcion_trabajo: string = '';
  let estado: EstadoTrabajoLaboratorio = 'CREADO';
  let fecha_solicitud: string = '';
  let fecha_envio: string = '';
  let fecha_estimada_entrega: string = '';
  let fecha_recepcion: string = '';
  let fecha_entrega_paciente: string = '';
  let costo_laboratorio: string = '';

  // UI state
  let labs: Laboratorio[] = [];
  let loading = true;
  let submitting = false;
  let error: string | null = null;

  function todayIsoDate(): string {
    const d = new Date();
    // Normalize to local date string YYYY-MM-DD
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().substring(0, 10);
  }

  onMount(() => {
    try {
      // Seed mock labs and load list
      seedLaboratoriosMock();
      labs = listLaboratorios();
      if (labs.length > 0) {
        laboratorio_id = labs[0].id;
      }
      // Defaults
      fecha_solicitud = todayIsoDate();
      estado = 'CREADO';
      loading = false;
    } catch (e: any) {
      error = e?.message || 'Error cargando laboratorios.';
      loading = false;
    }
  });

  function validate(): string | null {
    const tId = Number(tratamiento_id);
    if (Number.isNaN(tId) || tId <= 0) return 'Debes ingresar un ID de tratamiento válido (número mayor a 0).';
    if (laboratorio_id === null) return 'Selecciona un laboratorio.';
    // Costo opcional; si se suministra, debe ser válido
    if (costo_laboratorio) {
      const c = Number(costo_laboratorio);
      if (Number.isNaN(c) || c < 0) return 'El costo del laboratorio debe ser un número válido mayor o igual a 0.';
    }
    // Estado debe ser uno permitido; el select garantiza esto.
    return null;
  }

  async function handleSubmit() {
    const v = validate();
    if (v) {
      error = v;
      return;
    }
    error = null;
    submitting = true;

    try {
      const payload = {
        tratamiento_id: Number(tratamiento_id),
        laboratorio_id: laboratorio_id!,
        descripcion_trabajo: descripcion_trabajo ? descripcion_trabajo.trim() : null,
        estado,
        fecha_solicitud: fecha_solicitud || todayIsoDate(),
        fecha_envio: fecha_envio || null,
        fecha_estimada_entrega: fecha_estimada_entrega || null,
        fecha_recepcion: fecha_recepcion || null,
        fecha_entrega_paciente: fecha_entrega_paciente || null,
        costo_laboratorio: costo_laboratorio ? Number(costo_laboratorio) : null
      };

      const saved = createTrabajo(payload);
      // Navegar al listado de laboratorios (o al detalle del trabajo si existiera esa ruta)
      goto('/laboratorios');
      // Si deseas ir al detalle del trabajo en el futuro:
      // goto(`/laboratorios/trabajos/${saved.id}`);
    } catch (e: any) {
      error = e?.message || 'Error al crear el trabajo de laboratorio.';
    } finally {
      submitting = false;
    }
  }

  function cancelar() {
    goto('/laboratorios');
  }
</script>

<section class="nuevo-trabajo">
  {#if loading}
    <Card padded outlined>
      <div class="loading">
        <div class="spinner" aria-hidden="true"></div>
        <div>Cargando datos...</div>
      </div>
    </Card>
  {:else}
    <Card title="Nuevo trabajo de laboratorio" subtitle="Registra el envío al laboratorio" hoverable outlined>
      <div class="form-grid">
        <div class="row-2">
          <Input
            type="number"
            label="ID de tratamiento"
            placeholder="Ej: 101"
            bind:value={tratamiento_id}
            required
            name="tratamiento_id"
            id="tratamiento_id"
            description="Número del tratamiento asociado"
          />

          <label class="field">
            <span class="label">Laboratorio</span>
            <select class="input" bind:value={laboratorio_id} name="laboratorio_id" id="laboratorio_id">
              {#each labs as lab}
                <option value={lab.id}>{lab.nombre}</option>
              {/each}
            </select>
          </label>
        </div>

        <Input
          type="text"
          label="Descripción del trabajo"
          placeholder="Ej: Corona cerámica premolar"
          bind:value={descripcion_trabajo}
          name="descripcion_trabajo"
          id="descripcion_trabajo"
          description="Detalle de lo solicitado al laboratorio"
        />

        <div class="row-2">
          <label class="field">
            <span class="label">Estado</span>
            <select class="input" bind:value={estado} name="estado" id="estado">
              <option value="CREADO">CREADO</option>
              <option value="ENVIADO">ENVIADO</option>
              <option value="EN_PROCESO">EN_PROCESO</option>
              <option value="LISTO">LISTO</option>
              <option value="RECIBIDO">RECIBIDO</option>
              <option value="ENTREGADO">ENTREGADO</option>
              <option value="CANCELADO">CANCELADO</option>
              <option value="REHACER">REHACER</option>
            </select>
          </label>

          <Input
            type="number"
            label="Costo del laboratorio"
            placeholder="Ej: 120.00"
            bind:value={costo_laboratorio}
            name="costo_laboratorio"
            id="costo_laboratorio"
            description="Opcional"
          />
        </div>

        <div class="row-2">
          <Input
            type="date"
            label="Fecha de solicitud"
            bind:value={fecha_solicitud}
            name="fecha_solicitud"
            id="fecha_solicitud"
          />
          <Input
            type="date"
            label="Fecha de envío"
            bind:value={fecha_envio}
            name="fecha_envio"
            id="fecha_envio"
          />
        </div>

        <div class="row-2">
          <Input
            type="date"
            label="Fecha estimada de entrega"
            bind:value={fecha_estimada_entrega}
            name="fecha_estimada_entrega"
            id="fecha_estimada_entrega"
          />
          <Input
            type="date"
            label="Fecha de recepción"
            bind:value={fecha_recepcion}
            name="fecha_recepcion"
            id="fecha_recepcion"
          />
        </div>

        <div class="row-2">
          <Input
            type="date"
            label="Fecha de entrega al paciente"
            bind:value={fecha_entrega_paciente}
            name="fecha_entrega_paciente"
            id="fecha_entrega_paciente"
          />
        </div>
      </div>

      {#if error}
        <div class="error">
          <Badge variant="error" pill>Error</Badge>
          <div class="msg">{error}</div>
        </div>
      {/if}

      <div class="actions">
        <Button variant="primary" type="button" on:click={handleSubmit} disabled={submitting}>
          {submitting ? 'Guardando...' : 'Guardar trabajo'}
        </Button>
        <Button variant="outline" type="button" on:click={cancelar}>Cancelar</Button>
      </div>
    </Card>

    <Card hoverable>
      <div class="tips">
        <Badge variant="info" pill>Nota</Badge>
        <div class="text-soft">
          Esta pantalla usa servicios mock. Cuando el backend esté listo, conectaremos los endpoints y mantendremos esta UX.
        </div>
      </div>
    </Card>
  {/if}
</section>

<style>
  .nuevo-trabajo {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .loading {
    display: inline-flex;
    align-items: center;
    gap: var(--space-3);
  }
  .spinner {
    width: 1.25rem;
    height: 1.25rem;
    border: 2px solid var(--color-secondary-200);
    border-top-color: var(--color-secondary-600);
    border-radius: 50%;
    animation: spin 0.9s linear infinite;
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .form-grid {
    display: grid;
    gap: var(--space-3);
  }

  .row-2 {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-3);
  }

  @media (max-width: 680px) {
    .row-2 {
      grid-template-columns: 1fr;
    }
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .label {
    font-size: var(--font-size-sm);
    color: var(--color-text-soft);
    font-weight: 600;
  }

  .error {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    margin-top: var(--space-2);
  }

  .msg {
    font-weight: 600;
  }

  .actions {
    display: inline-flex;
    gap: var(--space-2);
    flex-wrap: wrap;
    margin-top: var(--space-3);
  }

  .tips {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    flex-wrap: wrap;
  }
</style>
