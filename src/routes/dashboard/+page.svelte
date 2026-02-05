<script lang="ts">
  import { Card, Button, Badge, Input } from '$lib/ui';

  // Placeholder state (to be replaced with real data/services)
  let hoyTiempo = '0h 00m';
  let totalMes = '0h 00m';
  let pacientesConSaldo = [
    { id: 1, nombre: 'Juan Pérez', saldo: 120.5 },
    { id: 2, nombre: 'María Gómez', saldo: 80.0 }
  ];
  let trabajosPendientes = [
    { id: 101, paciente: 'Ana Ruiz', laboratorio: 'Lab Dental Pro', estado: 'LISTO' },
    { id: 102, paciente: 'Carlos López', laboratorio: 'Smile Lab', estado: 'EN_PROCESO' }
  ];
  let horasResumen = {
    mes: 'Febrero',
    total: '45h 30m',
    normales: '40h 00m',
    extras: '5h 30m',
    diasTrabajados: 12,
    promedioDiario: '3h 47m'
  };

  // Quick actions handlers (to be wired to real routes)
  function goNuevoPaciente() {
    window.location.href = '/pacientes/nuevo';
  }
  function goNuevoTrabajoLab() {
    window.location.href = '/laboratorios/nuevo';
  }
  function goRegistrarPago() {
    window.location.href = '/pacientes/pagos/registrar';
  }
  function goBuscarPaciente() {
    window.location.href = '/pacientes';
  }
</script>

<section class="dashboard">
  <div class="grid">
    <!-- Cronómetro y estado horario -->
    <Card title="Horario laboral" subtitle="Seguimiento del día" hoverable>
      <div class="horario-panel">
        <div class="horario-info">
          <div class="contador">
            <span class="label">Hoy:</span>
            <span class="value">{hoyTiempo}</span>
          </div>
          <div class="contador">
            <span class="label">Total mes:</span>
            <span class="value">{totalMes}</span>
          </div>
        </div>
        <div class="horario-actions">
          <Button variant="primary" size="sm" on:click={() => (window.location.href = '/horario')}>Ir al horario</Button>
          <Button variant="outline" size="sm">Pausar</Button>
          <Button variant="outline" size="sm">Reanudar</Button>
        </div>
      </div>
      <div class="alertas mt-4">
        <Badge variant="info">Alerta: completarás 8h en breve</Badge>
        <Badge variant="warning" pill>Tiempo extra</Badge>
      </div>
    </Card>

    <!-- Pacientes con saldo pendiente -->
    <Card title="Pacientes con saldo pendiente" subtitle="Últimos casos" hoverable>
      <div class="tabla-wrapper">
        <table class="table">
          <thead>
            <tr>
              <th>Paciente</th>
              <th>Saldo</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {#each pacientesConSaldo as p}
              <tr>
                <td>{p.nombre}</td>
                <td>${p.saldo.toFixed(2)}</td>
                <td>
                  <Button variant="secondary" size="sm" on:click={() => (window.location.href = `/pacientes/${p.id}`)}>
                    Ver
                  </Button>
                  <Button variant="outline" size="sm" on:click={() => (window.location.href = `/pacientes/${p.id}/pagar`)}>
                    Registrar pago
                  </Button>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
      <div class="acciones-footer">
        <Button variant="primary" on:click={goRegistrarPago}>Registrar pago</Button>
        <Button variant="outline" on:click={goBuscarPaciente}>Buscar paciente</Button>
      </div>
    </Card>

    <!-- Trabajos de laboratorio -->
    <Card title="Trabajos de laboratorio pendientes" subtitle="Seguimiento rápido" hoverable>
      <div class="filtros">
        <Input type="search" placeholder="Buscar por paciente o laboratorio" />
        <Button variant="outline" size="sm">Filtrar</Button>
      </div>
      <div class="tabla-wrapper">
        <table class="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Paciente</th>
              <th>Laboratorio</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {#each trabajosPendientes as t}
              <tr>
                <td>#{t.id}</td>
                <td>{t.paciente}</td>
                <td>{t.laboratorio}</td>
                <td>
                  <Badge variant={t.estado === 'LISTO' ? 'success' : t.estado === 'EN_PROCESO' ? 'info' : 'neutral'}>
                    {t.estado}
                  </Badge>
                </td>
                <td>
                  <Button variant="secondary" size="sm" on:click={() => (window.location.href = `/laboratorios/trabajos/${t.id}`)}>
                    Ver
                  </Button>
                  <Button variant="outline" size="sm">Marcar entregado</Button>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
      <div class="acciones-footer">
        <Button variant="primary" on:click={goNuevoTrabajoLab}>Nuevo trabajo</Button>
      </div>
    </Card>

    <!-- Resumen horas extras del mes -->
    <Card title="Resumen de horas del mes" subtitle={horasResumen.mes} hoverable>
      <div class="resumen-grid">
        <div class="resumen-item">
          <div class="label">Total</div>
          <div class="value">{horasResumen.total}</div>
        </div>
        <div class="resumen-item">
          <div class="label">Normales</div>
          <div class="value text-success">{horasResumen.normales}</div>
        </div>
        <div class="resumen-item">
          <div class="label">Extras</div>
          <div class="value text-warning">{horasResumen.extras}</div>
        </div>
        <div class="resumen-item">
          <div class="label">Días trabajados</div>
          <div class="value">{horasResumen.diasTrabajados}</div>
        </div>
        <div class="resumen-item">
          <div class="label">Promedio diario</div>
          <div class="value">{horasResumen.promedioDiario}</div>
        </div>
      </div>
      <div class="acciones-footer">
        <Button variant="secondary" on:click={() => (window.location.href = '/horario')}>Ver calendario</Button>
        <Button variant="outline">Exportar reporte</Button>
      </div>
    </Card>

    <!-- Accesos rápidos -->
    <Card title="Accesos rápidos" hoverable>
      <div class="acciones-rapidas">
        <Button variant="primary" on:click={goNuevoPaciente}>Registrar nuevo paciente</Button>
        <Button variant="secondary" on:click={goNuevoTrabajoLab}>Registrar trabajo de laboratorio</Button>
        <Button variant="outline" on:click={goRegistrarPago}>Registrar pago</Button>
        <Button variant="outline" on:click={goBuscarPaciente}>Buscar paciente</Button>
      </div>
    </Card>
  </div>
</section>

<style>
  .dashboard .grid {
    display: grid;
    grid-template-columns: repeat(12, 1fr);
    gap: var(--space-4);
  }

  /* Layout: top panels full-width, lists half-width on desktop */
  .dashboard .grid > :global(section.card) {
    grid-column: span 12;
  }

  /* Make middle sections split into two columns on larger screens */
  .dashboard .grid > :global(section.card:nth-child(2)),
  .dashboard .grid > :global(section.card:nth-child(3)) {
    grid-column: span 12;
  }

  @media (min-width: 960px) {
    .dashboard .grid > :global(section.card:nth-child(2)),
    .dashboard .grid > :global(section.card:nth-child(3)) {
      grid-column: span 6;
    }
  }

  .horario-panel {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-4);
    flex-wrap: wrap;
  }
  .horario-info {
    display: flex;
    gap: var(--space-6);
    align-items: center;
  }
  .contador .label {
    font-size: var(--font-size-sm);
    color: var(--color-text-soft);
    display: inline-block;
    margin-right: var(--space-2);
  }
  .contador .value {
    font-weight: 800;
    font-size: var(--font-size-xl);
  }
  .horario-actions {
    display: flex;
    gap: var(--space-2);
  }

  .tabla-wrapper {
    overflow: auto;
    border-radius: var(--radius-sm);
  }

  .acciones-footer {
    margin-top: var(--space-3);
    display: flex;
    justify-content: flex-end;
    gap: var(--space-2);
  }

  .filtros {
    display: flex;
    gap: var(--space-2);
    align-items: center;
    margin-bottom: var(--space-3);
  }

  .resumen-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: var(--space-3);
  }
  @media (max-width: 768px) {
    .resumen-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }
  .resumen-item {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    padding: var(--space-3);
  }
  .resumen-item .label {
    font-size: var(--font-size-sm);
    color: var(--color-text-soft);
    margin-bottom: var(--space-2);
  }
  .resumen-item .value {
    font-size: var(--font-size-xl);
    font-weight: 700;
  }

  .acciones-rapidas {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--space-2);
  }
  @media (max-width: 640px) {
    .acciones-rapidas {
      grid-template-columns: 1fr;
    }
  }

  .mt-4 {
    margin-top: var(--space-4);
  }
</style>
