# Campaign Flow Builder — Frontend

Angular 19 SPA para el MVP de la plataforma de automatización de campañas. Consume la API REST del backend y expone tres vistas: listado de campañas, canvas visual de flujos, y maestro de contactos.

## Stack

| Capa | Tecnología |
|---|---|
| Framework | Angular 19 |
| Lenguaje | TypeScript 5.6 (strict mode) |
| Estado | Signals API (`signal`, `computed`) |
| Formularios | `FormsModule` (two-way binding) |
| HTTP | `HttpClient` + `HttpParams` |
| Routing | Angular Router (lazy-loaded por página) |
| Estilo | CSS puro por componente (sin frameworks UI) |

---

## Instalación

**Prerequisitos:** Node.js >= 18 LTS, backend corriendo en `http://localhost:3000`

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar el endpoint del backend
# Editar src/app/environments/environment.ts
# (por defecto apunta a http://localhost:3000/)

# 3. Levantar el servidor de desarrollo
ng serve
# → http://localhost:4200
```

Para producción:

```bash
ng build
# Los artefactos quedan en dist/mvp-campaign/
```

---

## Variables de entorno

El archivo `src/app/environments/environment.ts` expone un único valor:

| Variable | Descripción | Default |
|---|---|---|
| `endpoint` | URL base del backend (con trailing slash) | `http://localhost:3000/` |

Para producción, editar `environment.prod.ts` con la URL del servidor desplegado.

---

## Arquitectura

```
src/app/
├── pages/
│   ├── campaigns/          — Listado, crear, editar campañas
│   ├── canvas/             — Editor visual de flujos (nodos + aristas)
│   └── contacts/           — Listado, crear, editar contactos
├── shared/
│   ├── components/
│   │   ├── layout/         — Shell de la app (sidebar + router-outlet)
│   │   └── toast/          — Sistema de notificaciones flotantes
│   ├── models/             — Interfaces TypeScript (Campaign, Contact, CanvasNode, etc.)
│   └── services/           — Servicios HTTP (CampaignService, ContactService, CanvasService, SegmentService, ToastService)
├── app.routes.ts           — Rutas lazy-loaded
└── app.config.ts           — Configuración standalone (HttpClient, Router)
```

Cada página es un **standalone component**: sin `NgModule`, imports declarados directamente en el decorador.

---

## Decisiones técnicas

### Angular 19 Standalone + Signals

Se adoptó la arquitectura standalone (sin módulos) y la Signals API de Angular 19 para el estado reactivo. Esto elimina el boilerplate de `NgModule` y evita incorporar NgRx para un MVP donde el estado es local a cada componente.

- `signal()` para estado mutable (nodos, aristas, loading, saving)
- `computed()` para estado derivado (`invalidNodeIds`, `selectedNode`, `canUndo`, `totalPages`)
- No hay estado global compartido: cada vista maneja el suyo

### Canvas sin librería externa

El canvas visual se implementó desde cero sin dependencias de terceros:

- **Nodos**: `div` con `position: absolute` dentro de un contenedor de 2400×1400px
- **Aristas**: `<path>` SVG con curvas de Bézier cúbicas (`M sx sy C cp1x cp1y, cp2x cp2y, tx ty`)
- **Drag & drop**: captura de `mousedown` en el nodo, `mousemove`/`mouseup` en `document` vía `@HostListener`; los deltas se dividen por el zoom activo para mantener coherencia
- **Puertos de conexión**: click en el puerto de salida activa modo "connecting"; el siguiente click en otro nodo crea la arista
- **Zoom**: `transform: scale(n)` sobre el contenedor interno con `transform-origin: top left`; botones +/−/⊡ en esquina inferior derecha

Esto resultó suficiente para el alcance del MVP y mantuvo el bundle sin dependencias de canvas (~0 KB extra).

### Sistema de toasts con detalles de error de API

El backend devuelve errores con la forma `{ "error": { "code": "...", "message": "..." } }`. El `ToastService` expone un método `showError(err, fallback)` que extrae `err?.error?.error?.message` antes de caer al mensaje genérico. Esto permite mostrar al usuario el motivo exacto del error (email duplicado, validación, etc.) sin lógica duplicada en cada componente.

### Detección GSM-7 / Unicode en SMS

El nodo SMS detecta en tiempo real si el mensaje contiene caracteres fuera del set GSM-7 básico + extendido usando una expresión regular. Si hay Unicode, el límite cambia de 160 a 70 caracteres y el contador lo refleja instantáneamente. El número de segmentos SMS se calcula como `Math.ceil(chars / limit)`.

### Debounce en buscadores

Los inputs de búsqueda usan `setTimeout/clearTimeout` (350 ms) para no disparar una request HTTP por cada tecla. Los selects de filtro disparan inmediatamente (sin debounce) ya que el usuario hace una acción explícita al cambiarlos.

### Undo (deshacer)

En lugar de un historial de acciones, se guarda un snapshot JSON del estado en el momento del último guardado exitoso (`savedJson = signal('')`). DESHACER restaura ese snapshot. El botón se habilita solo cuando el estado actual difiere del snapshot, usando `computed()`. Esto cubre el caso de uso principal (revertir cambios no guardados) con mínima complejidad.

---

## Funcionalidades implementadas

### Campañas (`/campaigns`)
- Listado paginado con búsqueda por nombre/descripción y filtro por estado
- Columna "Nodos" muestra el conteo real desde el backend (subquery SQL en `GET /campaigns`)
- Crear campaña (modal) → redirige al canvas al crear
- Editar nombre, descripción y estado (draft/active)
- Eliminar con confirmación

### Canvas (`/campaigns/:id`)
- Drag & drop de nodos sobre un canvas de 2400×1400px
- Conexiones entre nodos con aristas SVG bezier y punta de flecha
- Eliminar aristas con botón ✕ en el punto medio de la curva
- Zoom in / zoom out / reset con botones +/−/⊡
- DESHACER: restaura el último estado guardado
- Guardado atómico contra el backend con feedback de estado

**Nodo Segmento:**
- Condiciones con campo, operador y valor (lógica AND/OR)
- Campos directos: `country`, `status`, `created_at`
- Atributos dinámicos: `attributes.age`, `attributes.plan`, `attributes.last_purchase_days`
- Operadores: `eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `contains`, `in` (lista separada por comas)
- Botón RECALCULAR: guarda y consulta `POST /segments/:id/audience`; muestra el conteo dentro del nodo

**Nodo SMS:**
- Textarea con contador de caracteres dinámico (GSM-7: 160 / Unicode: 70)
- Indicador de encoding (GSM / Unicode) en tiempo real
- Contador de segmentos SMS cuando supera el límite de un mensaje

**Validaciones (Bonus B1 + B3):**
- Badge naranja `!` en nodos incompletos (Segmento sin condiciones, SMS sin mensaje)
- Bloqueo de guardado con toast de error descriptivo
- SMS requiere Segmento conectado como prerequisito (regla de grafo B1)

### Contactos (`/contacts`)
- Listado paginado con búsqueda y filtros (país, estado, fecha de creación)
- Filtro "Fecha creación": últimos 7 / 30 / 90 días
- Chips de filtros activos con botón ✕ para limpiar individualmente
- Crear y editar contactos (modales con todos los campos)
- Eliminación con confirmación

---

## Niveles completados

| # | Descripción | Estado |
|---|---|---|
| 1 | Motor de filtros dinámicos seguro + endpoint de audiencia | ✅ (backend) |
| 2 | Canvas drag & drop, conexiones y persistencia transaccional | ✅ |
| 3 | CRUD campañas + listado filtrable de contactos + CRUD contactos | ✅ |
| 4 | Panel SMS con validación de longitud + panel Segmento configurable | ✅ |
| 5 | Tests del motor de filtros + README + ADR | ✅ (backend) |

**Bonus implementados:**
- B1 · SMS requiere Segmento previo conectado ✅
- B3 · Validaciones UX: SMS vacío, segmento sin filtros, nodos desconectados ✅

---

## Lo que quedó fuera y por qué

| Feature | Motivo |
|---|---|
| Variables `{{name}}`, `{{country}}`, `{{city}}` en SMS | Bonus B2, no requerido en el núcleo |
| Import / Export JSON de campañas | Bonus B4, no requerido en el núcleo |
| Tests e2e / docker-compose | Bonus B5, fuera del alcance temporal |
| Grupos anidados en UI del Segmento | El backend soporta `FilterGroup` anidado; la UI expone condiciones planas porque el wireframe no muestra cómo construir grupos anidados y el caso de uso principal está cubierto |
| Autenticación | Fuera de alcance según especificación |
| Envío real de SMS | Fuera de alcance — la configuración queda persistida y lista para conectar un proveedor |

---

## Estructura de servicios HTTP

| Servicio | Método | Endpoint |
|---|---|---|
| `CampaignService` | `getCampaigns(filters)` | `GET /api/campaigns` |
| | `getCampaignById(id)` | `GET /api/campaigns/:id` |
| | `createCampaign(dto)` | `POST /api/campaigns` |
| | `updateCampaign(id, dto)` | `PUT /api/campaigns/:id` |
| | `deleteCampaign(id)` | `DELETE /api/campaigns/:id` |
| `CanvasService` | `saveCanvas(id, payload)` | `PUT /api/campaigns/:id/canvas` |
| `ContactService` | `getContacts(filters)` | `GET /api/contacts` |
| | `createContact(dto)` | `POST /api/contacts` |
| | `updateContact(id, dto)` | `PUT /api/contacts/:id` |
| | `deleteContact(id)` | `DELETE /api/contacts/:id` |
| `SegmentService` | `getAudience(id, filters)` | `POST /api/segments/:id/audience` |
