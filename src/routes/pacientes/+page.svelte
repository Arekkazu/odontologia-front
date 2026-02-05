<script lang="ts">
  import { Card, Button, Input, Badge } from '$lib/ui';
  import { listPacientes, seedMockData, type Paciente as PacienteModel } from '$lib/services/api/pacientes';

  // Inicializar datos mock si no existen (solo en dev/mock)
  seedMockData();

  // Placeholder state simulating patients list and filters
  type Paciente = PacienteModel & {
    saldo_pendiente?: number;
  };

  let searchQuery = '';
  let filterSaldoPendiente = false;

  // Cargar pacientes desde servicio mock
  let pacientes: Paciente[] = listPacientes().map((p) => ({
    ...p,
    // saldo_pendiente se calculará en otra iteración con tratamientos/pagos;
    // por ahora, lo dejamos como 0 para la lista.
    saldo_pendiente: 0
  }));

  $: filteredPacientes = pacientes
    .filter((p) => {
      const q = searchQuery.trim().toLowerCase();
      const matches =
        !q ||
        p.nombre_completo.toLowerCase().includes(q) ||
        p.numero_identificacion.toLowerCase().includes(q);
      const bySaldo = filterSaldoPendiente ? p.saldo_pendiente > 0 : true;
      return matches && bySaldo;
    })
    .sort((a, b) => a.nombre_completo.localeCompare(b.nombre_completo));

  function nuevoPaciente() {
    window.location.href = '/pacientes/nuevo';
  }

  function verPaciente(id: number) {
    window.location.href = `/pacientes/${id}`;
  }

  function registrarPago(id: number) {
    window.location.href = `/pacientes/${id}/pagar`;
  }
</script>

<section class="pacientes">
  <div class="header-row">
    <h1 class="title">Pacientes</h1>
    <div class="actions">
      <Button variant="primary" on:click={nuevoPaciente}>Nuevo paciente</Button>
    </div>
  </div>

  <Card title="Búsqueda y filtros" hoverable>
    <div class="filters">
      <Input
        type="search"
        placeholder="Buscar por nombre o identificación"
        bind:value={searchQuery}
        description="Escribe parte del nombre o documento."
      />
      <label class="checkbox">
        <input type="checkbox" bind:checked={filterSaldoPendiente} />
        <span>Solo con saldo pendiente</span>
      </label>
    </div>
  </Card>

  <Card title="Listado de pacientes" subtitle={`Total: ${filteredPacientes.length}`} hoverable>
    <div class="tabla-wrapper">
      <table class="table">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Identificación</th>
            <th>Teléfono</th>
            <th>Saldo</th>
            <th>Estado</th>
            <th style="width:220px;">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {#if filteredPacientes.length === 0}
            <tr>
              <td colspan="6" class="text-soft">No hay resultados para tu búsqueda.</td>
            </tr>
          {:else}
            {#each filteredPacientes as p}
              <tr>
                <td>
                  <div class="col-main">
                    <div class="name">{p.nombre_completo}</div>
                    {#if p.direccion}
                      <div class="muted">{p.direccion}</div>
                    {/if}
                  </div>
                </td>
                <td>{p.numero_identificacion}</td>
                <td>{p.telefono || '—'}</td>
                <td>
                  {#if p.saldo_pendiente > 0}
                    <span class="saldo-deuda">${p.saldo_pendiente.toFixed(2)}</span>
                  {:else}
                    <span class="saldo-cero">$0.00</span>
                  {/if}
                </td>
                <td>
                  <Badge variant={p.activo ? 'success' : 'neutral'} pill>
                    {p.activo ? 'Activo' : 'Inactivo'}
                  </Badge>
                </td>
                <td>
                  <div class="row-actions">
                    <Button variant="secondary" size="sm" on:click={() => verPaciente(p.id)}>Ver</Button>
                    <Button variant="outline" size="sm" on:click={() => registrarPago(p.id)}>Registrar pago</Button>
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
  .pacientes {
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
    grid-template-columns: 1fr auto;
    gap: var(--space-3);
    align-items: center;
  }

  @media (max-width: 640px) {
    .filters {
      grid-template-columns: 1fr;
    }
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

  .muted {
    font-size: var(--font-size-sm);
    color: var(--color-muted);
  }

  .row-actions {
    display: inline-flex;
    flex-wrap: wrap;
    gap: var(--space-2);
  }

  .saldo-deuda {
    color: var(--color-error);
    font-weight: 700;
  }

  .saldo-cero {
    color: var(--color-success);
    font-weight: 700;
  }
</style>
