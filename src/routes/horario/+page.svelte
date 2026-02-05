<script lang="ts">
  import { Card, Button, Badge, Input } from '$lib/ui';

  // Cronómetro (placeholder local; luego se conectará a store/servicio)
  let isRunning = true;
  let isPaused = false;
  let startTime: Date | null = new Date(); // se registra al abrir la app
  let pauseStart: Date | null = null;
  let accumulatedMs = 0; // ms acumulados (pausas incluidas)
  let displayToday = '0h 00m';

  // Autosave y simulación de guardado cada 5 min
  let lastAutosave: Date | null = null;

  const AUTOSAVE_MS = 5 * 60 * 1000; // 5 minutos
  const TICK_MS = 60 * 1000; // actualizar cada minuto

  let tickTimer: number | null = null;
  let autosaveTimer: number | null = null;

  function computeDisplay(ms: number): string {
    const totalMinutes = Math.floor(ms / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}h ${String(minutes).padStart(2, '0')}m`;
  }

  function updateCounter() {
    if (!startTime) {
      displayToday = computeDisplay(accumulatedMs);
      return;
    }
    const now = new Date().getTime();
    const base = accumulatedMs + (now - startTime.getTime());
    displayToday = computeDisplay(base);
  }

  function startTicking() {
    stopTicking();
    updateCounter();
    tickTimer = window.setInterval(updateCounter, TICK_MS);
  }

  function stopTicking() {
    if (tickTimer) {
      window.clearInterval(tickTimer);
      tickTimer = null;
    }
  }

  function startAutosave() {
    stopAutosave();
    autosaveTimer = window.setInterval(() => {
      lastAutosave = new Date();
      // En implementación real: persistir en backend o IndexedDB/LocalStorage
      // saveHorarioSnapshot({ startTime, accumulatedMs, isRunning, isPaused, date: new Date() });
    }, AUTOSAVE_MS);
  }

  function stopAutosave() {
    if (autosaveTimer) {
      window.clearInterval(autosaveTimer);
      autosaveTimer = null;
    }
  }

  function pauseTimer() {
    if (!isRunning || isPaused || !startTime) return;
    isPaused = true;
    pauseStart = new Date();
    // Al pausar, acumulamos tiempo hasta ahora y detenemos tick
    accumulatedMs += pauseStart.getTime() - startTime.getTime();
    startTime = null;
    stopTicking();
    updateCounter();
  }

  function resumeTimer() {
    if (!isRunning || !isPaused) return;
    isPaused = false;
    pauseStart = null;
    startTime = new Date();
    startTicking();
  }

  function stopTimerConfirm() {
    // Confirmación (placeholder)
    const ok = confirm('¿Guardar salida y finalizar jornada de hoy?');
    if (!ok) return;
    stopTimer();
  }

  function stopTimer() {
    if (!isRunning) return;
    const now = new Date();
    // Acumular el último tramo si estaba corriendo
    if (startTime) {
      accumulatedMs += now.getTime() - startTime.getTime();
      startTime = null;
    }
    isRunning = false;
    isPaused = false;
    stopTicking();
    stopAutosave();
    displayToday = computeDisplay(accumulatedMs);

    // En implementación real: persistir registro del día (horario_laboral y pausas)
    // saveHorario({ fecha: new Date(), hora_entrada, hora_salida, total_ms: accumulatedMs, ... })
    alert(`Jornada guardada: ${displayToday}`);
  }

  // Simular recuperación de sesión si la app se cerró
  function recoverSessionIfAny() {
    // En implementación real, cargar snapshot del almacenamiento
    // const snapshot = loadHorarioSnapshot();
    // if (snapshot) { ... }
    // Aquí solo mostramos un aviso visual si hubiera
    // Placeholder: Nada que recuperar
  }

  // Lifecycle
  onMount(() => {
    startTicking();
    startAutosave();
    recoverSessionIfAny();
    return () => {
      stopTicking();
      stopAutosave();
    };
  });

  // En SvelteKit, onMount debe ser importado
  import { onMount } from 'svelte';

  // Calendario mensual (placeholder)
  let currentDate = new Date();
  let monthDays: Array<{
    date: Date;
    label: string;
    type: 'normal' | 'extra' | 'none';
    workedMs: number;
  }> = [];

  function buildMonth(date: Date) {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const totalDays = lastDay.getDate();

    const days: typeof monthDays = [];
    for (let d = 1; d <= totalDays; d++) {
      const dayDate = new Date(year, month, d);

      // Placeholder: lógica de ejemplo
      const weekend = dayDate.getDay() === 0 || dayDate.getDay() === 6;
      const workedMs = weekend ? 0 : Math.floor(Math.random() * 5 * 60 * 60 * 1000); // hasta 5h simuladas
      const type: 'normal' | 'extra' | 'none' =
        workedMs === 0 ? 'none' : workedMs > 8 * 60 * 60 * 1000 ? 'extra' : 'normal';

      days.push({
        date: dayDate,
        label: String(d),
        type,
        workedMs
      });
    }
    monthDays = days;
  }

  function prevMonth() {
    currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
    buildMonth(currentDate);
  }

  function nextMonth() {
    currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
    buildMonth(currentDate);
  }

  $: buildMonth(currentDate);

  // Resumen del mes (placeholder)
  $: resumenMes = (() => {
    const totalMs = monthDays.reduce((sum, d) => sum + d.workedMs, 0);
    const extrasMs = monthDays
      .filter((d) => d.type === 'extra')
      .reduce((sum, d) => sum + d.workedMs, 0);
    const normalesMs = totalMs - extrasMs;
    const diasTrabajados = monthDays.filter((d) => d.workedMs > 0).length;
    const promedioDiarioMs = diasTrabajados > 0 ? Math.floor(totalMs / diasTrabajados) : 0;

    return {
      total: computeDisplay(totalMs),
      normales: computeDisplay(normalesMs),
      extras: computeDisplay(extrasMs),
      diasTrabajados,
      promedioDiario: computeDisplay(promedioDiarioMs)
    };
  })();
</script>

<section class="horario">
  <!-- Panel Cronómetro -->
  <Card title="Control de horario" subtitle="Cronómetro en tiempo real" hoverable>
    <div class="cronometro">
      <div class="indicadores">
        <div class="contador">
          <span class="label">Hoy:</span>
          <span class="value">{displayToday}</span>
        </div>
        <div class="estado">
          {#if isRunning && !isPaused}
            <Badge variant="success" pill>Activo</Badge>
          {:else if isPaused}
            <Badge variant="info" pill>Pausado</Badge>
          {:else}
            <Badge variant="neutral" pill>Finalizado</Badge>
          {/if}
        </div>
      </div>
      <div class="acciones">
        <Button variant="outline" size="sm" on:click={pauseTimer} disabled={!isRunning || isPaused}>Pausar</Button>
        <Button variant="outline" size="sm" on:click={resumeTimer} disabled={!isRunning || !isPaused}>Reanudar</Button>
        <Button variant="danger" size="sm" on:click={stopTimerConfirm} disabled={!isRunning}>Guardar salida</Button>
      </div>
      <div class="autosave text-soft">
        {#if lastAutosave}
          Último guardado automático: {lastAutosave.toLocaleTimeString()}
        {:else}
          Guardado automático cada 5 minutos
        {/if}
      </div>
    </div>
  </Card>

  <!-- Panel Registro Diario -->
  <Card title="Registro diario" subtitle="Entrada / Salida / Pausas / Notas" hoverable>
    <div class="registro-diario">
      <div class="row">
        <Input type="time" label="Hora de entrada" description="Se registra automáticamente al abrir la app" />
        <Input type="time" label="Hora de salida" description="Se registra automáticamente al cerrar la app" />
      </div>
      <div class="row">
        <Input type="text" label="Notas" placeholder="Observaciones del día" />
      </div>
      <div class="row">
        <Badge variant="success">Día normal</Badge>
        <Badge variant="warning">Hora extra</Badge>
      </div>
      <div class="row actions">
        <Button variant="primary">Guardar registro</Button>
        <Button variant="outline">Ajuste manual</Button>
      </div>
    </div>
  </Card>

  <!-- Panel Calendario -->
  <Card title="Calendario mensual" subtitle={`${currentDate.toLocaleString('default', { month: 'long' })} ${currentDate.getFullYear()}`} hoverable>
    <div class="calendar-controls">
      <Button variant="outline" size="sm" on:click={prevMonth}>← Mes anterior</Button>
      <Button variant="outline" size="sm" on:click={nextMonth}>Mes siguiente →</Button>
    </div>
    <div class="calendar-legend">
      <Badge variant="success" pill>Normal (verde)</Badge>
      <Badge variant="warning" pill>Extra (naranja)</Badge>
      <Badge variant="neutral" pill>No trabajado (gris)</Badge>
    </div>
    <div class="calendar-grid">
      {#each monthDays as d}
        <div class={`calendar-day ${d.type}`}>
          <div class="day-header">
            <span class="day-number">{d.label}</span>
            {#if d.type === 'extra'}
              <span class="extra-indicator">EX</span>
            {/if}
          </div>
          <div class="day-body">
            {#if d.workedMs > 0}
              <span class="worked">{computeDisplay(d.workedMs)}</span>
            {:else}
              <span class="worked text-soft">—</span>
            {/if}
          </div>
          <div class="day-actions">
            <Button variant="outline" size="sm">Ver detalle</Button>
          </div>
        </div>
      {/each}
    </div>
  </Card>

  <!-- Panel Resumen -->
  <Card title="Resumen del mes" hoverable>
    <div class="resumen-grid">
      <div class="resumen-item">
        <div class="label">Total</div>
        <div class="value">{resumenMes.total}</div>
      </div>
      <div class="resumen-item">
        <div class="label">Normales</div>
        <div class="value text-success">{resumenMes.normales}</div>
      </div>
      <div class="resumen-item">
        <div class="label">Extras</div>
        <div class="value text-warning">{resumenMes.extras}</div>
      </div>
      <div class="resumen-item">
        <div class="label">Días trabajados</div>
        <div class="value">{resumenMes.diasTrabajados}</div>
      </div>
      <div class="resumen-item">
        <div class="label">Promedio diario</div>
        <div class="value">{resumenMes.promedioDiario}</div>
      </div>
    </div>
    <div class="resumen-actions">
      <Button variant="secondary">Exportar reporte</Button>
      <Button variant="outline">Ver meses anteriores</Button>
    </div>
  </Card>
</section>

<style>
  .horario {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  /* Cronómetro */
  .cronometro {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }
  .indicadores {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: var(--space-3);
  }
  .contador .label {
    font-size: var(--font-size-sm);
    color: var(--color-text-soft);
    margin-right: var(--space-2);
  }
  .contador .value {
    font-weight: 800;
    font-size: var(--font-size-xl);
  }
  .acciones {
    display: inline-flex;
    gap: var(--space-2);
    flex-wrap: wrap;
  }
  .autosave {
    font-size: var(--font-size-sm);
  }

  /* Registro diario */
  .registro-diario .row {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-3);
  }
  .registro-diario .row.actions {
    display: inline-flex;
    gap: var(--space-2);
  }
  @media (max-width: 640px) {
    .registro-diario .row {
      grid-template-columns: 1fr;
    }
  }

  /* Calendario */
  .calendar-controls {
    display: flex;
    justify-content: space-between;
    margin-bottom: var(--space-3);
  }
  .calendar-legend {
    display: inline-flex;
    gap: var(--space-2);
    margin-bottom: var(--space-2);
    align-items: center;
    flex-wrap: wrap;
  }
  .calendar-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: var(--space-2);
  }
  .calendar-day {
    background: var(--calendar-day-bg);
    border: 1px solid var(--calendar-day-border);
    border-radius: var(--radius-sm);
    min-height: 90px;
    padding: var(--space-2);
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }
  .calendar-day.normal { background: var(--calendar-day-normal); }
  .calendar-day.extra { background: var(--calendar-day-extra); }
  .calendar-day.none { background: var(--calendar-day-none); }

  .day-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .day-number {
    font-weight: 700;
  }
  .extra-indicator {
    font-size: var(--font-size-xs);
    background: var(--color-accent-500);
    color: var(--color-black);
    border-radius: var(--radius-full);
    padding: 0 var(--space-2);
    height: 1.25rem;
    display: inline-flex;
    align-items: center;
    border: 1px solid rgba(0, 0, 0, 0.08);
  }
  .day-body {
    display: flex;
    align-items: center;
    min-height: 24px;
  }
  .worked {
    font-weight: 600;
  }
  .day-actions {
    display: flex;
    justify-content: flex-end;
  }

  /* Resumen */
  .resumen-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: var(--space-3);
    margin-bottom: var(--space-3);
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
  .resumen-actions {
    display: inline-flex;
    gap: var(--space-2);
  }
</style>
