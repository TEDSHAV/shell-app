# Informe: módulo de Requisiciones (Shell)

**Alcance:** `shell-app/` (app Prisma / Shell).  
**Fecha del análisis:** 21 de septiembre de 2026.  
**Objetivo:** entender qué hace el módulo tal como está implementado hoy, para tomarlo de otro programador. No es un diseño ideal; es un mapa de lo que el código hace de verdad.

**Permisos (propuesta, no código):** `docs/requisiciones-permisos.md`.

---

## 1. Qué es y para qué sirve

Una **requisición** es una solicitud de compra o de recursos que alguien de la empresa envía a **Administración**.

Hay **dos tipos**:


| Tipo                                     | Nombre en pantalla | Qué pide                                                                                                      | OSI                                                                                                                   |
| ---------------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| **Interna** (`tipo_solicitud = Interno`) | Pestaña “Interna”  | Ítems libres (cantidad, unidad, descripción). **No pide precio** en el formulario.                            | No se asocia OSI                                                                                                      |
| **Externa** (`tipo_solicitud = Externo`) | Pestaña “Externa”  | Ítems con precio; en Capacitación también bloques fijos de la OSI (traslado, impresión, honorarios, informe). | Obligatoria. Capacitación: 1 OSI (+ sesión si hay varias). Servicios Técnicos: varias OSI. Otros departamentos: 1 OSI |


En la práctica:

- **Interna** = pedido interno del departamento (materiales, etc.). Pasa por **coordinador**, luego **Administración estima montos**; el **líder** solo si el total supera el umbral. Después Administración procesa.
- **Externa** = pedido ligado a un servicio/OSI (cliente). **Va directo a Administración**, sin cadena de aprobación.

El documento se imprime/PDF como formato RG-ADM-003 (revisión persistida en cada fila).

**No es** un módulo de inventario, ni de pagos, ni de facturación. Administración “procesa” o “rechaza” la solicitud; el solicitante puede dar **acuse de recibo** cuando ya está procesada.

---



## 2. Dónde vive el código


| Pieza                                                    | Ruta                                                                                                                               |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Acciones de servidor (crear, aprobar, verificar, listar) | `actions/requisiciones.ts` (~2.700 líneas; el corazón del módulo)                                                                  |
| Notificaciones                                           | `actions/requisicion-notifications.ts`                                                                                             |
| Formulario crear/editar                                  | `app/(shell)/requisiciones/components/RequisicionForm.tsx`                                                                         |
| Vista detalle / aprobación / gestión                     | `.../view/[id]/components/RequisicionView.tsx`                                                                                     |
| Listados                                                 | `RequisicionesTable.tsx`, `RequisicionRow.tsx`                                                                                     |
| Páginas                                                  | `/requisiciones` (mis + cola de aprobación), `/requisiciones/gestion` (solo Administración), `/create`, `/edit/[id]`, `/view/[id]` |
| Departamentos, gerencias, override temporal de líder     | `lib/requisiciones-gerencia.ts`                                                                                                    |
| Roles de coordinador                                     | `lib/requisiciones-approver-roles.ts`                                                                                              |
| Tipos                                                    | `types/requisiciones.ts`                                                                                                           |
| Tabla BD                                                 | `requisiciones` (+ `requisiciones_osis` para varias OSI)                                                                           |


Navegación: grupo “Requisiciones” en la app **Administración** del Shell (`config/apps.ts`). “Gestión de Requisiciones” solo si el usuario es de departamento Administración.

---



## 3. Usuarios y roles (cómo se decide quién es quién)

El módulo **no usa un rol único “requisiciones”**. Mezcla tres fuentes:

### 3.1 Departamento del usuario (tabla `usuarios`)

Cada usuario tiene **un solo** campo `usuarios.departamento` (FK a `departamentos.id`).  
Ese departamento trae `nombre` y `gerencia` (FK a `gerencias.nombre`).

**Administración (gestión):** no es el rol admin/superadmin de auth. Es: el nombre del departamento **contiene** `"admin"`. Quien cumple eso:

- Ve `/requisiciones/gestion` (bandeja de todas las que ya pasaron los filtros de aprobación).
- Puede marcar ítems Listo/Pendiente, procesar, rechazar, sincronizar costos con la OSI, editar datos bancarios del facilitador.
- En “Mis Requisiciones” solo ve **las que él creó**, no la bandeja de gestión.

**Capacitación:** el nombre del departamento contiene `"capacitacion"`. Efectos:

- En el listado “Mis Requisiciones” ve **todas las creadas por gente de Capacitación**, no solo las suyas.
- En **externas**, el formulario carga bloques fijos de costo desde la OSI/sesión y pide facilitador.



### 3.2 Coordinador (roles Prisma, no el campo `departamentos.coordinador`)

Hay un mapa fijo en código:


| Role id (prod) | App                       | Departamento que cubre            |
| -------------- | ------------------------- | --------------------------------- |
| 21             | `st` (Servicios Técnicos) | nombre con “servicios” y “tecnic” |
| 22             | `scapacitacion`           | nombre con “capacitacion”         |
| 23             | `sadministracion`         | nombre con “admin”                |


Se lee `authprisma.user_app_roles`. **No** se usa `departamentos.coordinador` para este flujo.

Un coordinador **aprueba internas de los departamentos que cubre su rol**, aunque su propio `usuarios.departamento` sea otro.

### 3.3 Líder

Principal: persona marcada en `gerencias.lider` (`usuarios.id`).

Extras:

- Rol `lider` de la app ST → trata como líder de **Servicios Técnicos**.
- Rol `lider` de `sadministracion` → trata como líder de **Administración**.

**Workaround temporal (importante):** las internas de Capacitación, Servicios Técnicos, Calidad, SIG, SSST y TED **no las aprueba el líder de Servicios**, sino el líder de **Negocios**. Está documentado en código como ausencia temporal del líder de Servicios. Cuando vuelva, hay que quitar `INTERNA_LIDER_GERENCIA_OVERRIDES` en `lib/requisiciones-gerencia.ts`.

### 3.4 Solicitante

Cualquier usuario autenticado puede crear. El nombre se precarga de `usuarios.nombre_apellido` y se puede editar. `created_by` es el UUID de auth.

**Regla:** nadie puede aprobar **su propia** requisición como coordinador o líder.

---



## 4. Cómo se elige departamento / gerencia al pedir

Al crear:

1. Se copia el **departamento del usuario logueado** (solo uno).
2. Se copia la **gerencia** de `departamentos.gerencia`. Si falta, un mapa hardcodeado: Capacitación/ST/Calidad/SIG/SSST → Servicios; TED/Marketing/Negocios → Negocios; Admin/RRHH/Contabilidad → Administración.
3. Ambos campos en el formulario son **solo lectura**. El usuario **no elige** “voy a pedir por otro departamento”.

Pestañas Interna / Externa:

- Capacitación y Servicios Técnicos: el default es **Externa**.
- El resto: default **Interna**.
- Todos pueden cambiar de pestaña.

Filtro de OSI en externas: por `tipo_servicio` de la OSI, salvo departamento Negocios (ve todas, menos nros que empiezan con `PEN`).

### ¿Quién “puede” pedir internas?

Existe `canPlaceInterna` (coordinador del depto, o cualquiera si el depto no tiene coordinador mapeado), **pero no se llama en el formulario ni al crear**. Hoy **cualquiera puede crear una interna** de su departamento.

### ¿Qué pasa si perteneces a dos departamentos?

**En este modelo no se puede.** Un usuario = un `departamento`. No hay tabla de membresía múltiple.

Lo que sí puede pasar:

- Una persona es de Marketing y además tiene rol coordinador de Capacitación: **pide** siempre como Marketing; **aprueba** internas de Capacitación.
- Una persona es líder de varias gerencias: aprueba internas de todos los departamentos de esas gerencias (más el override hacia Negocios).

Si en la vida real alguien “está en dos áreas”, el sistema solo reconoce el departamento que tenga en `usuarios`. Para pedir por el otro habría que cambiarle ese campo (o el código tendría que permitir elegir departamento; hoy no).

---



## 5. Flujo (paso a paso)



### 5.1 Interna

```
Solicitante crea
        │
        ├─ ¿El creador es coordinador de ese depto?
        │     SÍ → se salta coordinador
        │     NO → ¿existe algún usuario con rol coordinador de ese depto?
        │           SÍ → coordinador_estatus = pendiente  → notifica coordinador
        │           NO → se salta coordinador
        │
        ├─ (si se saltó coordinador)
        │     ¿El creador es el líder que aprueba ese depto (con override)?
        │           SÍ → llega ya a Administración; notifica admin
        │           NO → lider_estatus = pendiente; notifica líder
        │
        ├─ Coordinador aprueba (si aplicaba)
        │     → lider_estatus = pendiente (salvo que el creador sea ese líder)
        │     Coordinador rechaza → se traba; motivo; notifica al creador
        │
        ├─ Líder aprueba
        │     → Administración la ve; notifica admin
        │     Líder rechaza → se traba; motivo; notifica al creador
        │
        └─ Administración: verificar ítems → Procesada o Rechazada
              Procesada → notifica al creador → acuse de recibo opcional → notifica al admin que procesó
```

Administración **no ve** la interna hasta que `coordinador_estatus` y `lider_estatus` están en `null` (saltados) o `aprobada`. Si alguno sigue `pendiente` o `rechazada`, no entra a Gestión.

### 5.2 Externa

```
Solicitante crea (elige OSI; Capacitación: costos y facilitador)
        → estatus_admin = pendiente
        → notifica a Administración
        → Gestión: verificar / procesar / rechazar
        → acuse de recibo
```

`coordinador_estatus` y `lider_estatus` quedan en `null`.  
Ojo: hay **textos viejos** en la vista (“¿Aprobar esta requisición externa?”) y una función `notifyCoordinadorOfPendingExterna` que **en realidad se usa para internas**. El código de aprobación del coordinador **exige** `tipo_solicitud === Interno`. Las externas no pasan por coordinador/líder.

### 5.3 Edición

- El creador puede editar mientras Administración no procese/rechace **y** el aprobador no haya guardado cambios (`aprobador_edito`).
- Coordinador/líder pueden editar ítems, observaciones, prioridad, fecha, solicitante mientras está pendiente o ya aprobada (antes de que Admin cierre). Eso genera un diff vs `original_snapshot` y notifica al creador **la primera vez**.
- Rechazo de coordinador, líder o Admin **cierra** la edición del creador.

---



## 6. Pregunta: ¿quién pone el monto y cuándo?

No hay un campo “monto de la requisición” único. El dinero se arma por piezas.

### Internas

En el formulario **no hay columna de precio**. El solicitante pone cantidad, unidad y descripción. `costo_unitario` y `total` suelen quedar en **0**.

El “monto” no es el corazón de la interna: es un listado de cosas a conseguir. Administración marca cada ítem **Listo / Pendiente** (no un monto).

El líder/coordinador **sí puede** añadir o cambiar `costo_unitario` al editar como aprobador.

### Externas — ítems personalizados

El **solicitante** escribe `cant`, `costo_unitario`; el total es `cant × costo_unitario`, **en el momento de crear o editar**.

### Externas — Capacitación (bloques fijos)

Al elegir OSI (y sesión, si hay varias), el sistema **copia** costos de la vista `v_osi_formato_completo` / desglose por sesión:

- Traslado: días × costo (días arrancan en 1)
- Impresión
- Honorarios (horas × tarifa)
- Informe final (arranca en 0; el usuario lo llena)

El usuario **puede cambiar** esos números después. No quedan amarrados a la OSI salvo que Administración pulse sincronizar (`refreshRequisicionFromOSI`), que **vuelve a pisar** los fijos con la OSI actual (no toca ítems personalizados).

Si la OSI no tiene recursos por sesión, hay fallback a `osi_sesion` **sin costos** (quedan 0 hasta que alguien los escriba).

### Totales en pantalla

- Externa: “Total general” = fijos Capacitación + ítems extra.
- Al procesar, Administración puede copiar montos en VES usando tasa (se guarda `tasa_cambio` al marcar Procesada).
- El total “verificado” suma **solo ítems Listo** (útil para copiar a pagos).

**Resumen:** el monto lo pone **quien llena el formulario** (solicitante), con **autollenado desde OSI** en Capacitación externa, y **puede corregirlo el aprobador**. En internas, el monto casi no se usa en la UI de creación.

---



## 7. Pregunta: aprobación parcial (3 ítems: 2 sí, 1 no)

**No existe “aprobar 2 ítems y rechazar 1” como estados separados en coordinador/líder.**

### Coordinador y líder

La decisión es **sobre el documento entero**:

- Aprobar → toda la requisición sigue.
- Rechazar → toda se rechaza (motivo obligatorio). El ítem no tiene estatus propio.

Lo más parecido a “parcial” en esta etapa: **editar** (borrar el ítem no deseado o cambiar cantidades) y **luego aprobar el documento**. El creador ve el diff.

### Administración (esto sí es por ítem)

Cada ítem (y cada bloque fijo de Capacitación) tiene `verificacion`: `listo` o `pendiente`. **No hay** `rechazado` **por ítem.**

Si Admin marca 2 Listo y deja 1 Pendiente:

1. Puede pulsar **guardar avance** → notifica al creador: “tienes X de Y ítems verificados” (`requisicion_parcial`).
2. La requisición **sigue pendiente** a nivel documento (`estatus_admin`).
3. Si Admin pulsa **Procesada** con ítems aún pendientes, el sistema **pregunta** si quiere marcar **todos** Listo y procesar. Si acepta, **el ítem que no estaba listo también queda Listo**. No se procesa “a medias” dejando un ítem rechazado.
4. Para no dar el ítem 3, las opciones reales son: **no procesar todavía**, **editar/quitar el ítem** (si aún se puede), o **rechazar toda la requisición**.

El PDF muestra Listo/Pendiente por línea; no “aprobado/rechazado por línea”.

---



## 8. Qué activa (notificaciones y efectos)

Eventos (app slug `administracion`), modo TED o fallback legacy:


| Evento                            | Cuándo                                                     | A quién                                                               |
| --------------------------------- | ---------------------------------------------------------- | --------------------------------------------------------------------- |
| `requisicion_created`             | Externa nueva, o interna que ya no necesita más aprobación | Usuarios de dpto Administración (legacy) o destinatarios configurados |
| `requisicion_pending_coordinador` | Interna de un analista en depto con coordinador            | Quienes tienen el rol coordinador de ese depto                        |
| `requisicion_pending_lider`       | Interna que espera al líder                                | `gerencias.lider` (o override Negocios) + líderes ST/sadmin si aplica |
| `requisicion_procesada`           | Admin marca procesada                                      | Creador                                                               |
| `requisicion_rechazada`           | Admin, coordinador o líder rechazan                        | Creador                                                               |
| `requisicion_parcial`             | Admin guarda avance de verificación                        | Creador                                                               |
| `requisicion_aprobador_cambios`   | Primera edición del aprobador                              | Creador                                                               |
| `requisicion_acuse`               | Creador confirma recepción                                 | Admin que procesó                                                     |


Otros efectos:

- Soft delete (`deleted_at`) si borra Administración; hard delete si borra un no-admin (solo si no está cerrada).
- Snapshot `original_snapshot` al crear/guardar el creador.
- Capacitación: al guardar datos bancarios desde la vista admin, actualiza también maestro de facilitadores.
- PDF / impresión.

**No** crea automáticamente OSI, SOLPED, ECC ni movimientos de inventario.

---



## 9. Pantallas y listas

**Mis Requisiciones** (`/requisiciones`):

- No-admin: propias + (si es líder/coordinador) cola e historial de las que actuó. Líderes ven pendientes amplias; coordinadores solo de sus departamentos.
- Capacitación: todas las de su departamento.
- Usuario de Administración aquí: solo las que **él** creó.
- Pestañas: Todas / Por aprobar / Internas / Externas / Historial (historial solo líder/coordinador).

**Gestión** (`/requisiciones/gestion`): solo departamento Administración; internas ya aprobadas o sin gates; todas las externas.

---



## 10. Datos persistidos (idea)

Tabla `requisiciones`: encabezado (solicitante, depto, gerencia, tipo, prioridad, OSI, sesión, facilitador, observaciones), JSON `additional_items` y `osi_fixed_items`, `estatus_admin` (`pendiente` | `procesada` | `rechazada`), gates `coordinador_*` y `lider_*`, motivos, acuse, tasa, revisión PDF.

`id_estatus` se pone en 1 al crear y casi no se usa en la UI (manda `estatus_admin`).

---



## 11. Inconsistencias y riesgos al tomar el módulo

1. **Comentarios vs código:** varios comentarios dicen que las externas las aprueba el coordinador; el create las manda a Admin. La UI de aprobación aún habla de “externa” en un confirm.
2. `canPlaceInterna` **no se usa:** la regla de “solo el coordinador pide internas” no está en el formulario.
3. **Override de líder a Negocios:** temporal; fácil olvidarlo.
4. **Coordinador = roles hardcodeados (ids 21, 22, 23),** no el campo coordinador del departamento. Si cambian ids en otro ambiente, el fallback es app_id + slug `coordinador`.
5. **Un usuario = un departamento.** Doble pertenencia no está modelada.
6. **Aprobación no es por línea.** La “parcial” es verificación de Admin, y al procesar se tiende a marcar todo Listo.
7. **Internas sin monto** en UI; externas sí. Mezclar expectativas de “presupuesto de la req” puede confundir.
8. `actions/requisiciones.ts` **es un monolito** difícil de tocar sin regresiones.
9. **Capacitación ve el listado de todo el depto;** el resto no.
10. **Nombres engañosos:** `notifyCoordinadorOfPendingExterna` notifica internas; `is_general` = interna.

---



## 12. Respuestas cortas (las tres preguntas)

**¿Quién coloca el monto y cuándo?**  
En **externas**, el solicitante al crear (ítems: cantidad × precio; en Capacitación, primero se copian costos de la OSI/sesión y se pueden editar). El aprobador puede corregirlos. Administración no “carga el monto”: verifica ítems y, al procesar, congela la tasa USD/VES. En **internas**, el formulario no pide precio; el monto queda en 0 salvo edición del aprobador.

**¿Cómo se establece el departamento? ¿Y si eres de dos?**  
Se toma el **único** departamento del usuario en `usuarios`; gerencia de `departamentos.gerencia`. No se elige al pedir. Dos departamentos a la vez **no existen** en BD: el pedido sale siempre por ese departamento. Los roles de coordinador/líder sí pueden cubrir **varios** departamentos para **aprobar**, sin cambiar de dónde pides.

**¿Qué pasa si aprueban 2 de 3 ítems?**  
Coordinador/líder: o aprueban **toda** la req o la rechazan **toda**. Para dejar 2 ítems, hay que quitar/editar el tercero y luego aprobar. Administración puede dejar 2 Listo y 1 Pendiente y avisar al creador; **no** hay rechazo por ítem. Si marcan Procesada, el sistema pide pasar **todos** a Listo. El ítem 3 no queda “rechazado”: o sigue pendiente, o se procesa junto, o se rechaza el documento entero.