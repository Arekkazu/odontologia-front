# Requisitos del Frontend para el aplicativo web (Odontología)

Este documento describe de forma consolidada los requisitos funcionales, técnicos y el estado actual del código en `src`. Está pensado como especificación práctica para desarrolladores, QA y DevOps: qué necesita el frontend, qué ya existe en este repo y próximos pasos recomendados.

---

## 1. Propósito
Definir los requisitos funcionales, técnicos y no funcionales del frontend para la aplicación web de gestión odontológica. Incluir pantallas, componentes, integraciones con backend, consideraciones de seguridad, accesibilidad, testing y entrega.

## 2. Alcance
- Interfaz web responsiva (desktop / tablet / móvil).
- Comunicación con backend por API (REST o GraphQL).
- Roles: administrador, odontólogo, asistente, paciente.
- Módulos principales: agenda/citas, pacientes, historias clínicas, tratamientos, pagos/facturación, reportes, configuración.

---

## 3. Resumen funcional (alto nivel)
- Autenticación (login, logout, recuperación).
- Autorización por roles y visibilidad de acciones.
- CRUD para pacientes, consultas/citas, historias clínicas, tratamientos y pagos.
- Agenda/Calendario (día/semana/mes) con vistas y gestión de citas.
- Formularios robustos con validaciones (cliente + servidor).
- Gestión de archivos (imágenes, radiografías, PDFs).
- Reportes y exportes (PDF, CSV).
- Notificaciones en tiempo real (websocket / SSE) y sistema de alerts/toasts.
- Internacionalización (soporte multi-idioma cuando sea necesario).
- Accesibilidad (WCAG 2.1 AA objetivo mínimo).
- PWA/offline parcial (opcional, cache y sincronización).

---

## 4. Arquitectura y decisiones recomendadas
- Framework: SvelteKit (este repo usa SvelteKit) — o React/Vue si se decide otra dirección, pero el código actual está en Svelte.
- TypeScript obligatorio para seguridad tipada.
- Estado y datos remotos: Svelte stores para estado local, y una librería de data fetching/caching (equivalente a React Query para Svelte) o wrappers con control de cache.
- Cliente HTTP centralizado con manejo de `credentials`, serialización y errores.
- Design system: componentes base y tokens CSS (variables CSS).
- Organización por dominio: `lib/modules/<dominio>` y `lib/stores` para stores compartidos.

---

## 5. Componentes y utilidades esperadas
- Componentes base (ya presentes): `Button`, `Input`, `Card`, `Badge`, `theme.css`.
- Componentes a construir: `AuthForm`, `ProtectedRoute/AuthGuard` (guardas de rutas), `Calendar`, `PatientList`, `PatientCard`, `PatientForm`, `AppointmentForm`, `ClinicalRecordEditor`, `FileUploader`, `DataTable` (con paginación/filtrado/export), `NotificationsCenter`, `PDFViewer`.
- Utilidades: `ApiClient` central, helpers de `storage` (mocks/local cache), generación de IDs y formateo dinero/fechas.

---

## 6. Integración con backend (contratos y prácticas)
- Todos los endpoints deben documentarse (OpenAPI/Swagger o GraphQL schema).
- Autenticación: preferir cookies HttpOnly + SameSite para seguridad; si se usa JWT, definir almacenamiento y refresco seguro.
- Manejar paginación, filtros y ordenamiento en endpoints de listados.
- Subida de archivos: `multipart/form-data` o flujo de pre-signed URLs.
- Estándar de errores consistente (estructura JSON que incluya `message`, `code`).

---

## 7. Seguridad y privacidad
- Evitar almacenar secretos en front; variables públicas en build-time only.
- Preferir cookies HttpOnly para tokens; si usan storage, aplicar mitigaciones contra XSS.
- Sanitizar entradas que se renderizan (especial atención a rich text).
- Control de sesiones inactivas y logout automático por timeout (si aplica).
- Protección CSRF si se usa cookies.

---

## 8. Testing y calidad
- Unit tests: utilidades y componentes (Vitest/Jest + Testing Library para Svelte).
- Integration tests: flujos críticos (login, crear cita, adjuntar archivo).
- E2E: Cypress o Playwright para pruebas completas de usuario.
- Linters/formatters: ESLint + Prettier.
- CI: ejecutar lint, tests y build en cada PR.

---

## 9. Performance y entrega
- Code-splitting / lazy routes para reducir bundle inicial.
- Optimizar imágenes y fonts; usar lazy-loading.
- Cache HTTP y SW (PWA) si se requiere soporte offline.
- CI/CD: builds reproducibles, despliegues a staging y production, medidas de rollback.

---

## 10. Estado actual del código en `src` (qué ya existe)
A continuación detallo lo que está presente actualmente en `src` dentro de este repositorio y una breve descripción de cada archivo/carpeta. Esto te da una base para trabajar y priorizar tareas.

- `src/app.html`  
  Plantilla HTML principal de SvelteKit. Incluye carga de la fuente `Poppins` y los placeholders de SvelteKit (`%sveltekit.head%` y `%sveltekit.body%`).

- `src/app.d.ts`  
  Declaraciones globales (tipos) para SvelteKit. Archivo estándar con plantilla vacía para ampliar tipos (`App.Error`, `App.Locals`, etc.).

- `src/lib/index.ts`  
  Barrel/entrada para `$lib`. Actualmente contiene un comentario instructivo indicando que los archivos colocados aquí estarán disponibles a través del alias `$lib`.

- `src/lib/ui/`  
  Componentes UI base y tema:
  - `src/lib/ui/index.ts` — Barrel que exporta componentes y utilidades (clase de botones, inputs, badges, helpers de clase y ARIA helpers).
  - `src/lib/ui/Button.svelte` — Componente `Button` con variantes (`primary`, `secondary`, `outline`, `danger`, `ghost`), tamaños y estados (`loading`, `disabled`). Maneja accesibilidad básica.
  - `src/lib/ui/Input.svelte` — Componente de `Input` controlado, emite eventos `valuechange` y expone props (`invalid`, `readonly`, `description`, etc.).
  - `src/lib/ui/Card.svelte` — Componente `Card` para paneles con `title`, `subtitle`, header/footer opcionales, props visuales (`padded`, `hoverable`, `outlined`).
  - `src/lib/ui/Badge.svelte` — Badge/Chip con variantes semánticas (`success`, `warning`, `info`, `error`, `neutral`) y soporte `pill`.
  - `src/lib/ui/theme.css` — Design tokens (variables CSS) y estilos base (botones, inputs, tarjetas, badges, tablas y estilos de calendario). Representa el design system base.

- `src/lib/services/`  
  Servicios y utilidades:
  - `src/lib/services/storage.ts` — Helper avanzado para `localStorage`: namespaced keys, TTL, save/load/clear, generación de IDs secuenciales y UUID-like, helpers para colecciones (upsert/remove), y funciones de seed para mocks. Muy útil para desarrollo offline/mocks.
  - `src/lib/services/api/http.ts` — `ApiClient` genérico que construye URLs con query params, maneja `credentials` (`include` por defecto), serializa JSON, detecta `content-type` y devuelve `ApiResponse<T>`. Define `AUTH_BASE` y `API_BASE` por `import.meta.env`.
  - `src/lib/services/api/auth.ts` — Servicio de autenticación que usa `authClient`. Implementa `login` y `logout` (manejo de errores y tipos `AuthUser`, `LoginResult`).
  - `src/lib/services/api/pacientes.ts` — Servicio para `pacientes` y `consultas`. Incluye:
    - Tipos: `Paciente`, `Consulta`, `Tratamiento`, `Pago`, `PacienteResumen`, etc.
    - Funciones que llaman a endpoints (`createPaciente`, `getPacienteById`, `updatePaciente`, `listPacientes`).
    - Funciones para `consultas` (create/get/update/delete/list).
    - Stubs en memoria para `tratamientos` y `pagos` (funciones `createTratamiento`, `createPago`, `listTratamientosByConsulta`, `listPagosByTratamiento`, `computeTratamientoSaldo`, `seedMockData`) — usados por la UI hasta que existan endpoints reales.
  - `src/lib/services/api/consultas.ts` — CRUD y utilidades de búsqueda/filtrado para `consultas`. Usa `apiClient` y proporciona `listConsultas`, `getConsulta`, `createConsulta`, etc.
  - `src/lib/services/api/laboratorios.ts` — Presente como cliente para laboratorios (revisar su contenido si se integran trabajos de laboratorio).  

- `src/lib/stores/`  
  Carpeta creada pero actualmente vacía: espacio previsto para stores (auth store, paciente store, ui store, etc.).

- `src/lib/modules/`  
  Carpeta prevista para agrupar lógica por dominio (e.g. `pacientes`, `citas`) — actualmente vacía.

- `src/routes/`  
  Carpeta de rutas de SvelteKit. Existe la carpeta; revisar su contenido en el repo para conocer las páginas ya implementadas o las que faltan (no todas las rutas propuestas en este documento están necesariamente creadas).

---

## 11. Observaciones sobre el estado actual
- Ya hay una base sólida de UI (componentes y tokens) que permite iterar interfaces rápidamente.
- El cliente HTTP (`ApiClient`) y servicios (`auth`, `pacientes`, `consultas`) cubren la mayoría de la comunicación con backend esperada; sin embargo:
  - Los `tratamientos` y `pagos` son actualmente stubs en memoria: deben migrarse cuando existan endpoints.
  - No hay stores centrales implementados todavía (`src/lib/stores` está vacío). Recomiendo crear stores para `auth`, `session`, `pacientes` y `ui` (toasts, carga global).
  - Faltan rutas/páginas concretas (ver `src/routes`) respecto a las rutas propuestas; mapear y priorizar la implementación.
- `storage.ts` es ideal para datos de desarrollo y para persistencia local temporal, pero evaluar su uso en producción (p. ej. solo para caches o feature offline).

---

## 12. Checklist de prioridades (tareas sugeridas)
1. Revisar `src/routes` y mapear rutas existentes contra el listado de pantallas propuesto. Crear las rutas faltantes prioritarias: `/login`, `/dashboard`, `/pacientes`, `/agenda`.
2. Implementar stores:
   - `authStore` (usuario, estado, logout automático).
   - `pacientesStore` (cache de pacientes, revalidación).
   - `uiStore` (toasts, loading global).
3. Migrar stubs:
   - Reemplazar stubs de `tratamientos`/`pagos` con endpoints reales cuando estén disponibles; mantener adaptadores si la API cambia.
4. Construir componentes de dominio usando los componentes base (`Card`, `Input`, `Button`, `Badge`).
5. Añadir tests unitarios e integración para los servicios (`auth`, `pacientes`, `consultas`) y componentes críticos.
6. Configurar CI (lint, test, build). Incluir checks de accesibilidad básicos (axe).
7. Documentar contractos backend: solicitar/OpenAPI del backend e integrarlo como referencia.
8. Decidir política de autenticación (cookies HttpOnly vs JWT) y aplicar en `http.ts` y servicios.

---

## 13. Próximos pasos (opciones que puedo ejecutar para ayudar)
- Generar una `lista de issues` / historias de usuario por módulo (pacientes, citas, historial, facturación).
- Crear plantillas de stores (`authStore`, `pacientesStore`) en `src/lib/stores`.
- Crear las rutas SvelteKit base y componentes de pantalla skeleton.
- Proponer `package.json` y dependencias mínimas recomendadas para arrancar (SvelteKit + TypeScript + testing + lint).

Indícame cuál de los pasos quieres que haga ahora: generar los stores, mapear `src/routes` (listar archivos y proponer qué falta), convertir los stubs en adaptadores o generar historias de usuario. De la acción que elijas puedo producir el contenido necesario (archivos, checklist o código ejemplo) en el siguiente paso.