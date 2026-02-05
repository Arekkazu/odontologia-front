<script lang="ts">
  import { goto } from '$app/navigation';
  import { Card, Input, Button, Badge } from '$lib/ui';
  import {
    createPaciente,
    seedMockData,
    type CreatePacienteInput
  } from '$lib/services/api/pacientes';

  // Tipos de identificación (mock local por ahora).
  // En una iteración posterior se leerá de un servicio dedicado.
  const tiposIdentificacionMock = [
    { id: 1, codigo: 'CC', descripcion: 'Cédula de ciudadanía' },
    { id: 2, codigo: 'CE', descripcion: 'Cédula de extranjería' },
    { id: 3, codigo: 'TI', descripcion: 'Tarjeta de identidad' },
    { id: 4, codigo: 'PAS', descripcion: 'Pasaporte' }
  ];

  // Form state
  let nombre_completo = '';
  let telefono = '';
  let direccion = '';
  let tipo_identificacion_id: number = tiposIdentificacionMock[0]?.id ?? 1;
  let numero_identificacion = '';
  let activo = true;

  // UI state
  let error: string | null = null;
  let submitting = false;

  // Seed mock data to keep consistency (optional, does not affect creation)
  seedMockData();

  function validate(): string | null {
    if (!nombre_completo.trim()) return 'El nombre completo es requerido.';
    if (!numero_identificacion.trim()) return 'El número de identificación es requerido.';
    if (!tipo_identificacion_id || !Number.isFinite(tipo_identificacion_id)) {
      return 'Selecciona un tipo de identificación válido.';
    }
    // Teléfono opcional: si se suministra, validar formato básico
    if (telefono && telefono.length < 7) return 'El teléfono debe tener al menos 7 dígitos.';
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
      const payload: CreatePacienteInput = {
        nombre_completo: nombre_completo.trim(),
        telefono: telefono ? telefono.trim() : null,
        direccion: direccion ? direccion.trim() : null,
        tipo_identificacion_id,
        numero_identificacion: numero_identificacion.trim(),
        activo
      };
      const saved = createPaciente(payload);
      // Navegar al detalle del paciente recién creado
      goto(`/pacientes/${saved.id}`);
    } catch (e: any) {
      error = e?.message || 'Error al crear el paciente.';
    } finally {
      submitting = false;
    }
  }

  function cancelar() {
    goto('/pacientes');
  }
</script>

<section class="nuevo-paciente">
  <Card title="Nuevo paciente" subtitle="Registra los datos del paciente" hoverable outlined>
    <div class="form-grid">
      <Input
        type="text"
        label="Nombre completo"
        placeholder="Ej: Juan Pérez"
        bind:value={nombre_completo}
        required
        name="nombre_completo"
        id="nombre_completo"
      />
      <div class="row-2">
        <label class="field">
          <span class="label">Tipo de identificación</span>
          <select bind:value={tipo_identificacion_id} class="input" name="tipo_identificacion_id" id="tipo_identificacion_id">
            {#each tiposIdentificacionMock as t}
              <option value={t.id}>{t.codigo} — {t.descripcion}</option>
            {/each}
          </select>
        </label>

        <Input
          type="text"
          label="Número de identificación"
          placeholder="Ej: 1012345678"
          bind:value={numero_identificacion}
          required
          name="numero_identificacion"
          id="numero_identificacion"
        />
      </div>

      <div class="row-2">
        <Input
          type="tel"
          label="Teléfono"
          placeholder="Ej: 3001234567"
          bind:value={telefono}
          name="telefono"
          id="telefono"
          description="Opcional"
        />
        <Input
          type="text"
          label="Dirección"
          placeholder="Ej: Calle 10 # 20-30"
          bind:value={direccion}
          name="direccion"
          id="direccion"
          description="Opcional"
        />
      </div>

      <label class="checkbox">
        <input type="checkbox" bind:checked={activo} />
        <span>Paciente activo</span>
      </label>
    </div>

    {#if error}
      <div class="error">
        <Badge variant="error" pill>Error</Badge>
        <div class="msg">{error}</div>
      </div>
    {/if}

    <div class="actions">
      <Button variant="primary" type="button" on:click={handleSubmit} disabled={submitting}>
        {submitting ? 'Guardando...' : 'Guardar paciente'}
      </Button>
      <Button variant="outline" type="button" on:click={cancelar}>Cancelar</Button>
    </div>
  </Card>

  <Card hoverable>
    <div class="tips">
      <Badge variant="info" pill>Nota</Badge>
      <div class="text-soft">
        Este formulario usa servicios mock. Cuando el backend esté listo, conectaremos los endpoints sin cambiar la UX.
      </div>
    </div>
  </Card>
</section>

<style>
  .nuevo-paciente {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
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

  .checkbox {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    font-size: var(--font-size-sm);
    color: var(--color-text);
    user-select: none;
    margin-top: var(--space-2);
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
