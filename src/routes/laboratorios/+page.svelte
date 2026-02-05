<script lang="ts">
  import { Card, Button, Input, Badge } from '$lib/ui';
  import { onMount } from 'svelte';
  import {
    seedLaboratoriosMock,
    seedTrabajosMock,
    listLaboratorios,
    listTrabajos,
    marcarEntregado,
    type Laboratorio,
    type TrabajoLaboratorio as Trabajo,
    estadoVariant
  } from '$lib/services/api/laboratorios';

  type Trabajo = {
    id: number;
    paciente: string;
    laboratorio: string;
    estado:
      | 'CREADO'
      | 'ENVIADO'
      | 'EN_PROCESO'
      | 'LISTO'
      | 'RECIBIDO'
      | 'ENTREGADO'
      | 'CANCELADO'
      | 'REHACER';
    fecha_solicitud?: string;
    fecha_estimada_entrega?: string;
    costo_laboratorio?: number | null;
  };

  // Catálogo de laboratorios (mock service)
  let laboratoriosCatalogo: string[] = [];

  // Estado de filtros
  let searchQuery = '';
  let filtroEstado: Trabajo['estado'] | 'TODOS' = 'TODOS';
  let filtroLaboratorio: string | 'TODOS' = 'TODOS';
  let mostrarSoloPendientes = true; // pendientes de recoger (no ENTREGADOS/CANCELADOS)

  // Datos desde servicio mock
  let trabajos: Trabajo[] = [];

  // estadoVariant importado del servicio (si no está, mantener esta función)

  // Filtro y búsqueda
  $: filteredTrabajos = trabajos
    .filter((t) => {
      const q = searchQuery.trim().toLowerCase();
      const matchesQ =
        !q ||
        t.paciente.toLowerCase().includes(q) ||
        t.laboratorio.toLowerCase().includes(q) ||
        String(t.id).includes(q);

      const byEstado = filtroEstado === 'TODOS' ? true : t.estado === filtroEstado;
      const byLab = filtroLaboratorio === 'TODOS' ? true : t.laboratorio === filtroLaboratorio;
      const byPendiente = mostrarSoloPendientes ? !['ENTREGADO', 'CANCELADO'].includes(t.estado) : true;

      return matchesQ && byEstado && byLab && byPendiente;
    })
    .sort((a, b) => {
      // Orden: prioridad a estados avanzados (LISTO/RECIBIDO), luego por fecha estimada
      const priority = (estado: Trabajo['estado']) =>
        estado === 'LISTO' ? 4 :
        estado === 'RECIBIDO' ? 3 :
        estado === 'EN_PROCESO' ? 2 :
        estado === 'ENVIADO' ? 1 :
        0;
      const pDiff = priority(b.estado) - priority(a.estado);
      if (pDiff !== 0) return pDiff;

      const da = a.fecha_estimada_entrega ? new Date(a.fecha_estimada_entrega).getTime() : 0;
      const db = b.fecha_estimada_entrega ? new Date(b.fecha_estimada_entrega).getTime() : 0;
      return da - db;
    });

  // Acciones rápidas
  function nuevoTrabajo() {
    window.location.href = '/laboratorios/nuevo';
  }
  function verTrabajo(id: number) {
    window.location.href = `/laboratorios/trabajos/${id}`;
  }
  function marcarEntregadoClick(id: number) {
    // Actualizar estado en mock service y refrescar la lista
    marcarEntregado(id);
    trabajos = listTrabajos();
  }
  onMount(() => {
    // Semilla de datos en mocks
    seedLaboratoriosMock();
    seedTrabajosMock();
    // Cargar catálogo y trabajos
    laboratoriosCatalogo = listLaboratorios().map((l: Laboratorio) => l.nombre);
    trabajos = listTrabajos();
  });
</script>

<section class="laboratorios">
  <div class="header-row">
    <h1 class="title">Trabajos de laboratorio</h1>
    <div class="actions">
      <Button variant="primary" on:click={nuevoTrabajo}>Nuevo trabajo</Button>
    </div>
  </div>

  <Card title="Búsqueda y filtros" hoverable>
    <div class="filters">
      <Input
        type="search"
        placeholder="Buscar por paciente, laboratorio o ID"
        bind:value={searchQuery}
        description="Escribe texto para filtrar rápidamente."
      />
      <div class="filter-row">
        <label class="filter">
          <span>Estado:</span>
          <select bind:value={filtroEstado} class="input">
            <option value="TODOS">Todos</option>
            <option value="CREADO">Creado</option>
            <option value="ENVIADO">Enviado</option>
            <option value="EN_PROCESO">En proceso</option>
            <option value="LISTO">Listo</option>
            <option value="RECIBIDO">Recibido</option>
            <option value="ENTREGADO">Entregado</option>
            <option value="CANCELADO">Cancelado</option>
            <option value="REHACER">Rehacer</option>
          </select>
        </label>

        <label class="filter">
          <span>Laboratorio:</span>
          <select bind:value={filtroLaboratorio} class="input">
            <option value="TODOS">Todos</option>
            {#each laboratoriosCatalogo as lab}
              <option value={lab}>{lab}</option>
            {/each}
          </select>
        </label>

        <label class="checkbox">
          <input type="checkbox" bind:checked={mostrarSoloPendientes} />
          <span>Solo pendientes de recoger</span>
        </label>

        <Button variant="outline" size="sm" on:click={() => { searchQuery=''; filtroEstado='TODOS'; filtroLaboratorio='TODOS'; mostrarSoloPendientes=true; }}>
          Limpiar filtros
        </Button>
      </div>
    </div>
  </Card>

  <Card title="Listado de trabajos" subtitle={`Total: ${filteredTrabajos.length}`} hoverable>
    <div class="tabla-wrapper">
      <table class="table">
        <thead>
          <tr>
            <th style="width:90px;">ID</th>
            <th>Paciente</th>
            <th>Laboratorio</th>
            <th style="width:160px;">Estado</th>
            <th style="width:180px;">Fecha solicitud</th>
            <th style="width:200px;">Est. entrega</th>
            <th style="width:160px;">Costo</th>
            <th style="width:240px;">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {#if filteredTrabajos.length === 0}
            <tr>
              <td colspan="8" class="text-soft">No hay trabajos que coincidan con tus filtros.</td>
            </tr>
          {:else}
            {#each filteredTrabajos as t}
              <tr>
                <td>#{t.id}</td>
                <td>
                  <div class="col-main">
                    <div class="name">{t.paciente}</div>
                  </div>
                </td>
                <td>{t.laboratorio}</td>
                <td>
                  <Badge variant={estadoVariant(t.estado)} pill>{t.estado}</Badge>
                </td>
                <td>{t.fecha_solicitud || '—'}</td>
                <td>{t.fecha_estimada_entrega || '—'}</td>
                <td>
                  {#if t.costo_laboratorio !== null && t.costo_laboratorio !== undefined}
                    ${Number(t.costo_laboratorio).toFixed(2)}
                  {:else}
                    —
                  {/if}
                </td>
                <td>
                  <div class="row-actions">
                    <Button variant="secondary" size="sm" on:click={() => verTrabajo(t.id)}>Ver</Button>
                    {#if t.estado !== 'ENTREGADO' && t.estado !== 'CANCELADO'}
                      <Button variant="outline" size="sm" on:click={() => marcarEntregadoClick(t.id)}>Marcar entregado</Button>
                    {/if}
                  </div>
                </td>
              </tr>
            {/each}
          {/if}
        </tbody>
      </table>
    </div>
  </Card>
</section>

<style>
  .laboratorios {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .header-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
  }

  .title {
    margin: 0;
    font-size: var(--font-size-2xl);
    line-height: var(--line-height-tight);
  }

  .actions {
    display: inline-flex;
    gap: var(--space-2);
  }

  .filters {
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--space-3);
  }

  .filter-row {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-3);
    align-items: center;
  }

  .filter {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    font-size: var(--font-size-sm);
  }

  .checkbox {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    font-size: var(--font-size-sm);
    color: var(--color-text);
    user-select: none;
  }

  .tabla-wrapper {
    overflow: auto;
    border-radius: var(--radius-sm);
  }

  .col-main .name {
    font-weight: 600;
  }

  .row-actions {
    display: inline-flex;
    flex-wrap: wrap;
    gap: var(--space-2);
  }
</style>
