# Relay — PRD (Product Requirements Document)

## 1. Resumen

**Relay** es una herramienta interna para reportar bugs y solicitar
funcionalidades nuevas ("features") desde cualquiera de las apps internas,
y centralizar esos reportes en un solo lugar para darles seguimiento y
priorizarlos.

No es un producto de cara al público: es infraestructura interna, pensada
para que cualquier app del catálogo pueda ofrecer un botón de "Reportar un
bug" sin tener que construir su propio sistema de tickets.

## 2. Problema

Hoy, cuando algo falla o falta una función en una de las apps internas, no
hay un canal consistente para reportarlo: queda en un chat, un correo, o se
olvida. No hay forma de ver todos los reportes juntos, ni de saber cuáles
son más urgentes.

## 3. Objetivos

- Un botón de "Reportar un bug" disponible desde cualquier app, sin salir
  de la app ni iniciar sesión de nuevo.
- Un lugar donde cada persona pueda ver el estado de lo que ella misma
  reportó ("Mis Reportes").
- Un panel de administración donde se vean **todos** los reportes de
  **todas** las apps, con severidad y urgencia, para poder priorizar qué
  se atiende primero.
- Aislamiento de datos: cada usuario solo ve sus propios reportes, salvo
  quien tenga rol de administrador de Relay.

## 4. Fuera de alcance (por ahora)

- Asignar reportes a una persona específica.
- Notificaciones automáticas (correo/push) cuando cambia el estado de un
  reporte.
- Adjuntar capturas de pantalla o archivos al reporte.
- Comentarios/hilo de conversación dentro de un reporte.

## 5. Usuarios

| Rol | Qué puede hacer |
|-----|------------------|
| Usuario de cualquier app | Crear un reporte desde esa app; ver solo sus propios reportes en "Mis Reportes". |
| Administrador de Relay | Ver todos los reportes de todas las apps; cambiar su estado; priorizar. |

## 6. Flujos / Pantallas

### 6.1 Reportar un bug (modal)

Se abre como un modal dentro de la misma app, sin pedir login nuevo
(reutiliza la sesión ya activa de esa app).

Campos del formulario:

| Campo | Tipo | Obligatorio | Notas |
|-------|------|:---:|-------|
| Tipo | Bug / Mejora (feature) | Sí | Determina el ícono y el texto en el listado. |
| Título | Texto corto | Sí | Resumen de una línea. |
| Descripción | Texto largo | Sí | Qué pasó / qué se necesita, pasos para reproducir si es un bug. |
| Severidad | Baja / Media / Alta / Crítica | Sí | Qué tan grave es el impacto (ej. "rompe la app" vs. "detalle visual"). |
| Urgencia | Baja / Media / Alta | Sí | Qué tan pronto se necesita resuelto, independiente de la severidad. |
| Nombre | Texto corto | Sí | Tomado de la sesión activa, no se escribe a mano. |
| Apellido | Texto corto | Sí | Tomado de la sesión activa, no se escribe a mano. |
| Correo | Texto corto | Sí | Tomado de la sesión activa, no se escribe a mano. |

La app de origen (`source_app_name`) y la identidad de quién reporta
(nombre, apellido y correo) se guardan automáticamente desde la sesión ya
activa, sin que el usuario tenga que escribirlos a mano. Nombre, apellido
y correo **no son opcionales**: todo reporte queda siempre asociado a una
persona identificada — nunca se guarda un reporte anónimo o incompleto.

### 6.2 Mis Reportes (cada app decide si la incluye, dentro de esa misma app)

Lista de los reportes que **esa persona** ha enviado, desde cualquier app,
con: título, tipo, app de origen, severidad, urgencia, estado, fecha.
Solo lectura — no se puede editar un reporte después de enviado (en esta
versión).

### 6.3 Priorización (panel de administración, app Relay)

Vista de administrador con **todos** los reportes de **todas** las apps,
ordenable/filtrable por severidad y urgencia, para decidir qué atender
primero. Incluye quién reportó (nombre, apellido y correo), cuándo, y el
estado actual (`nuevo` / `en progreso` / `resuelto` / `descartado`).

## 7. Modelo de datos (alto nivel)

**Reporte** (`relay_reports`)

- id
- source_app_name — de qué app vino
- type — bug | feature
- title
- description
- severity — low | medium | high | critical
- urgency — low | medium | high
- reporter_first_name — nombre de quién lo creó (obligatorio)
- reporter_last_name — apellido de quién lo creó (obligatorio)
- reporter_email — correo de quién lo creó (obligatorio)
- status — new | in_progress | resolved | discarded
- created_at

**Administrador de Relay** (`relay_admins`)

- Lista de correos con permiso para ver/priorizar todos los reportes
  (en vez de solo los propios).

## 8. Requisitos no funcionales

- **Aislamiento de datos**: un usuario normal nunca debe poder ver
  reportes de otra persona, ni editando la URL ni inspeccionando
  peticiones de red. La regla se aplica en la base de datos (no solo en
  la pantalla), para que sea real y no solo cosmética.
- **Sin login adicional**: reportar un bug no debe interrumpir el trabajo
  del usuario en la app donde está.
- **Accesibilidad**: el modal de reporte y la pantalla de Mis Reportes
  deben ser usables con teclado y lector de pantalla (foco atrapado
  dentro del modal, se puede cerrar con Escape, el foco vuelve al botón
  que abrió el modal).

## 9. Identidad visual

- Nombre: **Relay**.
- Color de acento propuesto: morado (`#5B4B8A`), para distinguirlo del
  resto del catálogo de apps.
- Logo: a definir — placeholder de texto mientras tanto.

## 10. Métricas de éxito

- Cada app del catálogo tiene el botón de reportar visible.
- Los reportes de todas las apps aparecen en un solo panel.
- Cero reportes de un usuario visibles para otro usuario que no sea
  administrador.
