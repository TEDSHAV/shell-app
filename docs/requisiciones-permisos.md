# Permisos de requisiciones

**Estado:** decisiones cerradas. **Los permisos los crea TED en la consola** (`/ted/usuarios/accesos` → Permisos → Nuevo permiso, o desde el paso Permisos de un rol). Este documento no inserta slugs. El código de requisiciones **aún no los lee**.  
**Fecha:** 21 de septiembre de 2026.  
**Modelo RBAC:** `docs/accesos-rbac.md`.

Casa del módulo: app **Administración** (`sadministracion`). El módulo es **transversal**: aparece al editar el rol de **cualquier** app, para poder colgar el mismo slug en ST, Negocios, Capacitación, etc.

---

## Decisiones cerradas

| # | Decisión | Cierre |
|---|----------|--------|
| 1 | ¿Slug global (opción C), colgado en el rol de cada app? | **Sí.** Un set, no un clon por app. |
| 2 | ¿`solicitud:access` = solo las propias? | **Sí.** |
| 3 | ¿`solicitud:access-depto` para el mural de equipo (Capacitación hoy)? | **Sí.** Sustituye el if por nombre de depto cuando el código lo lea. |
| 4 | ¿Acciones `approve-coordinador` y `approve-lider`? | **Sí.** El **líder hereda el 1.er sello**: si eres líder, no hace falta aprobación de coordinador. En código, `approve-lider` implica `approve-coordinador`. En la consola basta colgar `approve-lider` al líder; no hace falta marcar también el de coordinador. |
| 5 | ¿Dos recursos (`solicitud`, `gestion`), sin `cola`? | **Sí.** `gestion` cubre **aprobar y procesar**. |
| 6 | ¿Gestor de Admin = `solicitud:*` + `process` sin sellos? | **No se fija aquí.** TED cuelga lo que corresponda en cada rol. |
| 7 | ¿Líder de Admin puede `process`? | **Sí, debe poder procesar.** Si ese humano es líder, TED le cuelga `gestion:process` (y el resto que decida). |
| 8 | ¿Negocios pide con `solicitud:create` en roles operativos? | **Sí.** TED lo cuelga en esos roles. |

---

## Recursos

| Recurso | Para quién | Acciones |
|---------|------------|----------|
| `solicitud` | Solicitante: Mis requisiciones, crear, editar lo propio | `access`, `create`, `edit`, `access-depto` |
| `gestion` | Trámite: colas de sello y proceso de Administración | `access`, `approve-coordinador`, `approve-lider`, `process`, `edit` |

El permiso es global. No se duplica por app.

---

## `solicitud`

| Slug | Efecto |
|------|--------|
| `requisiciones:solicitud:access` | Ver **solo las que creé**. Acuse de recibo. |
| `requisiciones:solicitud:create` | Crear interna o externa. Conveniente colgarlo junto con `access`. |
| `requisiciones:solicitud:edit` | Editar **la propia** mientras el flujo lo permita. |
| `requisiciones:solicitud:access-depto` | Ver las del **departamento del usuario** (mural de equipo). No es la bandeja de aprobación. |

Interna vs externa no es un slug.

---

## `gestion` — alcance de `access`

`requisiciones:gestion:access` abre la **cola de trámite**, no Mis requisiciones.

**Quién no debe tenerlo:** quien solo pide (analista/ejecutivo sin sello ni proceso).

**Qué cola ve**, según las otras acciones de `gestion` que tenga el mismo rol:

| Tiene… | Qué ve con `gestion:access` |
|--------|-----------------------------|
| `approve-coordinador` (y no `process`) | Bandeja de **sus departamentos** (1.er sello pendiente). |
| `approve-lider` (y no `process`) | Bandeja de **sus departamentos**, **ambos sellos** (el 1.º va incluido). |
| `process` | Cola **general**: todo lo tramitable (lo que ya llegó a proceso y lo que Admin opera). |

El procesador no necesita un segundo permiso de “ver todo”: `access` + `process` es la cola completa.

El depto que cubre un coordinador/líder **no** va en el slug: sale de la app del rol (ST, Capacitación, Admin, …), como hoy.

### Sellos y proceso

| Slug | Efecto |
|------|--------|
| `requisiciones:gestion:approve-coordinador` | 1.er sello (internas). |
| `requisiciones:gestion:approve-lider` | 2.º sello **y** el 1.º (herencia). Si el creador es ese líder, se salta coordinación igual que hoy. |
| `requisiciones:gestion:process` | Verificar ítems, procesar, rechazar en Admin, tasa, OSI, banco del facilitador. |
| `requisiciones:gestion:edit` | Editar como tramitador (req ajena), con diff al creador. |

Nadie aprueba la suya. Externas hoy no usan sellos: las ve quien tiene `process`.

---

## Cómo crearlos en la consola

1. `/ted/usuarios/accesos` → pestaña **Permisos** → **Nuevo permiso** (o **Nuevo permiso** en el paso 2 al editar un rol).
2. App: **Administración** (casa del módulo).
3. Módulo: crea **Requisiciones** (`requisiciones`) la primera vez; después elígelo.
4. Recurso `solicitud` o `gestion`; acción según la tabla de arriba; descripción a tu criterio.
5. El mismo slug se cuelga después en el rol de cada app (ST, Negocios, Capacitación…). No lo vuelvas a crear por app.

Orden sugerido: primero los de `solicitud`, luego los de `gestion`. El código del módulo se cambia cuando ya estén colgados.

---

## Fuera del slug

- Tipo interna/externa, OSI, sesión, facilitador.
- Nombre del departamento dentro del slug.
- Recurso `cola`.
- Organigrama como llave de menú.
