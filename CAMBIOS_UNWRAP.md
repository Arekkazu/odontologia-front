# Cambios realizados: Soporte para respuestas envueltas del backend

## Problema
El backend devuelve respuestas en formato:
```json
{
  "ok": true,
  "message": "Operación exitosa",
  "data": { ...datos reales... }
}
```

Pero el frontend esperaba directamente los datos sin el wrapper.

## Solución
Se agregó la función helper `unwrapPayload<T>()` en todos los servicios de API para extraer automáticamente el campo `data` cuando está presente.

## Archivos modificados

### 1. `/src/lib/services/api/laboratorios.ts`
- ✅ Agregada función `unwrapPayload<T>()`
- ✅ Actualizado `ensureArray` para soportar arrays envueltos
- ✅ Aplicado `unwrapPayload` en:
  - `createLaboratorio()`
  - `updateLaboratorio()`
  - `getLaboratorio()`
  - `createTrabajoLaboratorio()`
  - `updateTrabajoLaboratorio()`
  - `getTrabajoLaboratorio()` ← **Resuelve el problema del trabajo #1**
- ✅ Agregado campo `fecha_solicitud` al interface `TrabajoLaboratorio`

### 2. `/src/lib/services/api/consultas.ts`
- ✅ Agregada función `unwrapPayload<T>()`
- ✅ Actualizado `ensureArray` para soportar arrays envueltos
- ✅ Aplicado `unwrapPayload` en:
  - `createConsulta()`
  - `getConsulta()`
  - `updateConsulta()`

### 3. `/src/lib/services/api/pacientes.ts`
- ✅ Agregada función `unwrapPayload<T>()`
- ✅ Refactorizado para usar `unwrapPayload` consistentemente
- ✅ Aplicado en:
  - `createPaciente()`
  - `getPacienteById()`
  - `updatePaciente()`
  - `createConsulta()`
  - `getConsulta()`
  - `updateConsulta()`
- ✅ Mejorado `ensureArray` para soportar wrappers

## Resultado
Ahora todas las páginas pueden recibir y mostrar correctamente los datos del backend:

- ✅ `/laboratorios/trabajos/1` mostrará correctamente el trabajo
- ✅ `/consultas/nueva` podrá crear y mostrar consultas
- ✅ `/pacientes/:id` mostrará correctamente los datos del paciente
- ✅ Todas las operaciones CRUD funcionan con el formato del backend

## Compatibilidad
La función `unwrapPayload` es retrocompatible:
- Si recibe `{ok, message, data}` → extrae `data`
- Si recibe directamente los datos → los retorna tal cual
