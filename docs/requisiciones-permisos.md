# Permisos de requisiciones

**Estado:** el código de requisiciones **lee** estos slugs (globales, aplanados de todas las apps). TED los crea en la consola; este documento no inserta slugs.  
**Fecha:** 22 de septiembre de 2026.  
**Modelo RBAC:** `docs/accesos-rbac.md`.

Casa del módulo: app **Administración** (`sadministracion`). El permiso es global; **no** se clona. Quién lo tiene: **roles transversales estándar** en esa misma app (abajo).

---

## Decisiones cerradas

| # | Decisión | Cierre |
|---|----------|--------|
| 1 | ¿Un set de slugs global, no un clon por app? | **Sí.** Dónde se cuelga: protocolo abajo. |
| 2 | ¿`solicitud:access` = solo las propias? | **Sí.** |
| 3 | ¿`solicitud:access-depto` para el mural de equipo? | **Sí.** |
| 4 | ¿`approve-coordinador` y `approve-lider` (líder hereda el 1.er sello)? | El líder **no** hereda el 1.er sello en el flujo post-estimación. Coordinador sella antes de estimar. |
| 5 | ¿Recursos `solicitud` y `gestion`, sin `cola`? | **Sí.** |
| 6 | ¿Gestor de Admin crea y procesa sin sellos? | TED lo cuelga. |
| 7 | ¿Líder de Admin puede `process`? | **Sí.** |
| 8 | ¿Gente de otras apps pide? | **Sí.** Con rol transversal `solicitante-general` en Administración, no colgando `solicitud:*` en cada rol de producto. |
| 9 | ¿Protocolo de roles? | **Roles transversales estándar en Administración** (abajo). Un solo estilo. |
| 10 | ¿Un rol puede “incluir” otros? | **Sí, enfoque A (copia).** Sin tabla nueva. Ver *Composición de roles*. |

---

## Recursos

| Recurso | Para quién | Acciones |
|---------|------------|----------|
| `solicitud` | Solicitante: Mis requisiciones, crear, editar lo propio | `access`, `create`, `edit`, `access-depto` |
| `gestion` | Trámite: colas de sello y proceso de Administración | `access`, `approve-coordinador`, `approve-lider`, `process`, `edit` |
| `config` | Límite USD de internas (quién debe pasar por líder) | `manage` |

El permiso es global. No se duplica por app.

---

## `solicitud`

| Slug | Efecto |
|------|--------|
| `requisiciones:solicitud:access` | Ver **solo las que creé**. Acuse de recibo. |
| `requisiciones:solicitud:create` | Crear interna o externa. Conveniente colgarlo junto con `access`. |
| `requisiciones:solicitud:edit` | Editar **la propia** mientras el flujo lo permita. |
| `requisiciones:solicitud:access-depto` | Ver las del **departamento del usuario** (mural de equipo). No es la bandeja de aprobación. **Ya está en BD.** |

Interna vs externa no es un slug.

---

## `config`

Página **Límite de aprobación** (`/requisiciones/configuracion`). Define `requisiciones_ajustes.umbral_lider_usd` (columna histórica; en UI se llama **límite**): si Administración estima una interna por encima de ese monto, entra el sello del líder; si no, pasa directo a proceso.

| Slug | Efecto |
|------|--------|
| `requisiciones:config:manage` | Ver el ítem de menú, abrir la página y guardar el límite. Sin este slug el enlace no aparece (tampoco el atajo en Gestión). |

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

El depto que cubre un coordinador/líder **no** va en el slug: sale del **organigrama / depto de la persona** (no del rol de producto ST/Negocios). Los sellos viven en roles de Administración; la cobertura territorial es de la gente, no de la ficha `st:lider`.

**Notificaciones:** destinatarios se configuran en **TED → Notificaciones** (`notify.event_recipient_config`). El código solo dispara el `event_key`. Defaults: cola Admin = roles `gestor`+`coordinador`; sellos = organigrama ∩ permiso de sello.

### Sellos y proceso

| Slug | Efecto |
|------|--------|
| `requisiciones:gestion:approve-coordinador` | 1.er sello (internas). |
| `requisiciones:gestion:approve-lider` | 2.º sello **y** el 1.º (herencia). Si el creador es ese líder, se salta coordinación igual que hoy. |
| `requisiciones:gestion:process` | Verificar ítems, procesar, rechazar en Admin, tasa, OSI, banco del facilitador. |
| `requisiciones:gestion:edit` | Editar como tramitador (req ajena), con diff al creador. También permite a **Administración operativa** corregir el **departamento** de una requisición ya emitida (detalle). |

Nadie aprueba la suya. Externas hoy no usan sellos: las ve quien tiene `process`.

---

## Cómo crearlos en la consola

1. `/ted/usuarios/accesos` → pestaña **Permisos** → **Nuevo permiso** (o **Nuevo permiso** en el paso 2 al editar un rol).
2. App: **Administración** (casa del módulo).
3. Módulo: crea **Requisiciones** (`requisiciones`) la primera vez; después elígelo.
4. Recurso `solicitud`, `gestion` o `config`. Para `access-depto`, `approve-coordinador`, `approve-lider`, `process` y `manage`: **Nueva acción**, sin marcar “Agregar al catálogo de acciones” (solo viven en ese permiso).
5. Crear los **roles transversales** de abajo (pestaña Roles, app Administración) y colgarles los permisos (o usar **Colgar en roles** desde Permisos).
6. **Asignar a personas** (pestaña Roles) para dar el rol a la gente o a todos.

---

## Protocolo de roles (un solo estilo)

**Regla:** lo de requisiciones no se pega como sticker en `st:analista` ni en `sgestion:gestor_clientes`. Se resuelve con **roles transversales estándar en Administración**, configurables en la consola. El rol de producto (ST, Negocios, …) sigue describiendo el trabajo de esa app. Una función por app (`unique usuario_id, app_id`).

### Roles funcionales estándar (Administración)

Nombres reales en consola (no `solicitante-general`):

| Rol | Para quién | Permisos |
|-----|------------|----------|
| `solicitante-requisiciones` | Cualquier empleado de base que deba pedir compras | `requisiciones:solicitud:access`, `create`, `edit` (solo las propias). Si necesita mural de equipo: `requisiciones:solicitud:access-depto`. |
| `aprobador-coordinador-requisiciones` | Quien da el **1.er sello** | `requisiciones:gestion:access`, `approve-coordinador` (hoy el rol en BD **no** tiene `gestion:access`; colgarlo). |
| `aprobador-lider-requisiciones` | Líderes de departamento (2.º sello post-límite) | `requisiciones:gestion:access`, `approve-lider` |

En producción también sellan/procesan los roles operativos `coordinador`, `lider`, `gestor` y `admin-ted` de Administración, que ya tienen los slugs colgados. Coordinador y gestores de Admin cubren **también** el depto `recursos_humanos` (misma gerencia). La app `srh` no cuelga `requisiciones:*`.

Ejemplo: en ST sigue siendo `analista`; en Administración es `solicitante-general`. Dos apps, dos fichas, sin mezclar OSI con compras.

### Proceso (bandeja de Admin)

`gestion:process` (y `gestion:edit` de tramitador) **no** va en los tres roles de arriba. Se cuelga en quien opera la bandeja de Administración (`gestor`, `admin`, u otro rol operativo de Admin que TED defina). Quien solo sella no procesa; quien solo pide no ve la cola de trámite.

### Una ficha por app — qué implica

En Administración solo cabe **un** rol por persona. Sin el atajo de composición, eso obliga a marcar a mano `solicitud:*` en cada rol operativo. Con **composición A** (abajo), al editar `admin` / `gestor` se **pegan** los permisos de `solicitante-general` (y si aplica `aprobador-*`); TED desmarca lo que no quiera. Una sola ficha en la persona.

Sin composición todavía:

- Quien solo pide → `solicitante-general`.
- Quien sella → `aprobador-coordinador` o `aprobador-lider` (si también pide, hay que pegar `solicitud:*` a mano en ese rol).
- Quien es `gestor` / `admin` de Admin → ese rol debe llevar pedir / sellar / procesar a mano (o, cuando exista composición, incluir los roles base).

El helper **Asignar a personas** avisa si alguien cambia de rol en Admin (reemplazo).

### Composición de roles (enfoque A — copia editable)

**Decisión:** no hay `role_includes` ni grafo de roles. La estructura sigue plana: `rol → role_permissions`. “Incluir un rol” en la UI es un **atajo**: marca los permisos de ese rol en el editor; TED puede **desmarcar** los que no quiera y dejar el resto. Todo queda como filas normales en `role_permissions`.

```
admin (Administración) — al guardar solo importa el set marcado
  ├─ (atajo) desde solicitante-general → access/create/edit  [✓][✓][ ]
  ├─ (atajo) desde aprobador-lider     → access + approve-lider
  └─ propios                           → process, …
```

Agrupación visual por rol de origen al pegar; al guardar no se guarda el vínculo, solo los checks.

#### Por qué A y no B

- Sin migración, sin vista de permisos efectivos, sin ciclos.
- Runtime y helpers igual que hoy.
- Control fino: incluir el paquete y quitar 1–2 permisos sin inventar un rol intermedio.

El precio: si editas `solicitante-general` después, `admin` **no** se actualiza solo. Eso se mitiga con aviso en UI (abajo), no con schema.

#### Reglas de UI

1. **Misma app.** Solo ofrecer roles de la misma `app_id` como atajo de copia.
2. **Copiar ≠ bloquear.** Tras pegar, cada permiso es editable (marcar / desmarcar).
3. **Volver a pegar** el mismo rol de origen: suma/marca de nuevo lo que tenga ese rol; no borra lo que TED ya tenía marcado de más.
4. **Aviso al guardar (solo edición manual).** Si cambias permisos a mano en un rol que **ya** compartía permisos con otros de la misma app, aparece el diálogo para propagar el delta. Los peers se buscan por intersección con el set **antes** de guardar (quién ya coincidía), no con lo recién pegado.
5. **No sale el aviso** si en esa sesión usaste **Añadir desde otro rol** (componer/pegar). Pegar no es propagar: guardar y listo. Botón **Solo este rol** / **Actualizar seleccionados** solo en el caso 4.
6. El aviso es **conveniencia**, no herencia. Si no pulsas actualizar, cada rol sigue independiente.

#### Quién recibe qué (con A)

- Empleado base → ficha `solicitante-general`.
- Coordinador / líder → `aprobador-*`; si también pide, en el editor se pega `solicitante-general` y se ajustan checks.
- `gestor` / `admin` → se pegan los transversales que apliquen + `process` (y lo propio); se desmarca lo que no deba tener.

#### Qué no implica

- No rompe `unique (usuario_id, app_id)`.
- No es multi-rol en la persona; es un atajo de edición.
- No sustituye organigrama.

**Estado:** dirección cerrada (A). UI: atajo «Añadir desde otro rol» (sin diálogo de peers). Aviso de sincronizar solo al editar permisos a mano en un rol que ya compartía set con otros.

### Qué no hacer

- No colgar `solicitud:*` ni `gestion:approve-*` en roles de ST / Negocios / Capacitación **y** a la vez usar estos roles transversales. Eso son dos protocolos.
- No inventar un permiso raro por departamento: el depto sale de la persona; el poder sale del rol estándar.
- No meter `role_includes` / herencia viva “por ahora”: complica el modelo; el aviso al editar basta.

---

Orden sugerido: crear permisos → crear/ajustar roles transversales → componer `gestor`/`admin` con el atajo de copia → asignar gente. **Runtime:** slugs + territorio de ficha. Internas: coordinador → Admin estima → líder solo si total > límite (`requisiciones_ajustes.umbral_lider_usd`, default 100) → Admin procesa.

El depto de la solicitud: contexto `?from=` o el departamento de casa. El **selector** (Administración vs Recursos Humanos) solo lo ven miembros operativos de Administración (`gestor`, `coordinador`, `lider`, `admin-ted`, `aprobador-*`). Un `solicitante-requisiciones` de otra gerencia no elige depto. `usuarios.departamento` no es multi.

---

## Fuera del slug

- Tipo interna/externa, OSI, sesión, facilitador.
- Nombre del departamento dentro del slug.
- Recurso `cola`.
- Organigrama como llave de menú.
