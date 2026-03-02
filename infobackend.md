# INFORMACION BACKEND

Guía rápida de endpoints, payloads y requisitos de autenticación por sesión.

## General
- Base URLs:
  - Auth: `/auth`
  - API: `/api`
- Autenticación: sesión de `express-session` (cookie `connect.sid`). En frontend, llamar con `credentials: "include"`.
- CORS: `FRONTEND_ORIGIN` (por defecto `http://localhost:5173`), `SESSION_SECRET` requerido en backend.
- Todas las rutas bajo `/api` requieren sesión activa, salvo `/auth/login` y `/auth/logout`.

## Auth
- POST `/auth/login`
  - Body: `{ "username": string, "password": string }`
  - Respuesta 200: `{ message: "correcto inicio", data: { username, role } }`
  - Crea cookie de sesión.
- POST `/auth/logout`
  - Sin body. Cierra sesión y limpia cookie.

## Pacientes (requiere sesión)
- POST `/api/patient/register`
  - Body: `{ nombre, apellidos, telefono, tipo_identificacion_id, numero_identificacion, fecha_creacion? }`
- GET `/api/patient/:id`
  - Path: `id` (numérico)
- PUT `/api/patient/:id`
  - Body: mismos campos de registro (actualización)

## Laboratorios (requiere sesión)
- POST `/api/laboratorios`
  - Body: `{ nombre, direccion?, telefono?, email?, activo?, tiempo_estimado_dias? }`
- GET `/api/laboratorios`
  - Lista todos
- GET `/api/laboratorios/:id`
- PUT `/api/laboratorios/:id`
  - Body: mismos campos que create
- DELETE `/api/laboratorios/:id`

### Trabajos de laboratorio (requiere sesión)
- POST `/api/trabajos-laboratorio`
  - Body: `{ laboratorio_id: number, consulta_id?: number, descripcion?: string, estado: "SOLICITADO"|"ENVIADO"|"RECIBIDO"|"ENTREGADO", fecha_recepcion?: date, fecha_entrega_paciente?: date }`
- GET `/api/trabajos-laboratorio`
  - Lista todos
- GET `/api/trabajos-laboratorio/:id`
- PATCH `/api/trabajos-laboratorio/:id`
  - Body: cualquier campo editable de arriba

## Consultas (requiere sesión)
- POST `/api/consultas`
  - Body: `{ paciente_id: number, motivo: string, diagnostico: string, fecha_consulta?: datetime, observaciones?: string }`
- GET `/api/consultas`
- GET `/api/consultas/:id`
- PUT `/api/consultas/:id`
  - Body: mismos campos que create
- DELETE `/api/consultas/:id`

## Horario (requiere sesión)
Notas:
- `usuario_id` se envía en body/query hoy; ideal usar el de la sesión en el futuro.
- Campos fecha en formato `YYYY-MM-DD` para día; timestamps en ISO UTC para horas.

- POST `/api/horario/entry`
  - Body: `{ usuario_id: number, fecha: "YYYY-MM-DD", hora_entrada?: datetime }`
- POST `/api/horario/pause/start`
  - Body: `{ usuario_id: number, fecha: "YYYY-MM-DD", hora_inicio?: datetime }`
- POST `/api/horario/pause/end`
  - Body: `{ usuario_id: number, fecha: "YYYY-MM-DD", hora_fin?: datetime }`
- POST `/api/horario/exit`
  - Body: `{ usuario_id: number, fecha: "YYYY-MM-DD", hora_salida?: datetime }`
- GET `/api/horario/today`
  - Query: `usuario_id`
- GET `/api/horario/day/:date`
  - Path: `date` (`YYYY-MM-DD`), Query: `usuario_id`
- PUT `/api/horario/day/:date`
  - Path: `date`
  - Body (ajuste manual): `{ usuario_id, hora_entrada?, hora_salida?, pausas?: [{hora_inicio, hora_fin}], notas?, tipo? }`
- POST `/api/horario/snapshot`
  - Body: `{ usuario_id, fecha: "YYYY-MM-DD", hora_entrada?, accumulated_ms?, is_running?, is_paused?, last_autosave_at? }`
- GET `/api/horario/snapshot`
  - Query: `usuario_id`, `fecha: YYYY-MM-DD`
- GET `/api/horario/month`
  - Query: `usuario_id`, `year`, `month` (numéricos)

## Reglas y validaciones principales
- Trabajos de laboratorio: `estado` debe ser uno de `SOLICITADO|ENVIADO|RECIBIDO|ENTREGADO`; `laboratorio_id` requerido; si se envía `consulta_id`, debe existir la consulta.
- Consultas: `paciente_id` debe existir; `motivo` y `diagnostico` no vacíos.
- Horario:
  - Jornada única por `usuario_id` + `fecha`.
  - No iniciar pausa si ya hay una abierta.
  - Al cerrar pausa, `hora_fin` > `hora_inicio`.
  - Al cerrar jornada, `total_ms = (salida - entrada) - sum(pausas)`.
  - `tipo`: `none` (0), `normal` (<=8h), `extra` (>8h).
  - Snapshots: upsert por `usuario_id` + `fecha`.

## Notas de integración frontend (Svelte)
- Siempre llamar con `credentials: "include"` para mantener la sesión.
- Asegurar que `FRONTEND_ORIGIN` en backend coincide con la URL del frontend.
- Cookie de sesión actual: `connect.sid`, `sameSite: "lax"`, `secure: false` (cambiar a `true` en producción con HTTPS).
