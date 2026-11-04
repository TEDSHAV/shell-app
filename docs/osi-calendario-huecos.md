# Calendario de servicios: huecos de lógica y de UI/UX

Revisión del 2026-11-04 sobre `dev` (sin commitear) en Shell: `features/osi-calendario/**`, la migración
`supabase/migrations/20261104120000_osi_sesion_reagenda_calendario.sql` y las vistas `/consulta-osi` y `/consulta-osi/calendario`.
Los números de prod salen de consultas de solo lectura del mismo día.

Prioridad: **P0** rompe datos o deja al usuario sin poder trabajar · **P1** produce información equivocada o confusa · **P2** mejora.

---

## 1. Lógica de ejecutado / reagendado / cancelado

### P0. Las reagendas hechas desde Capacitación aparecen "sin fecha"
- El módulo de Capacitación registra el estatus 46 en `historial_cambios_estado`, pero no conoce `osi_sesion.fecha_reagendada`.
- `estado_sesion()` (`lib/estado-sesion.ts`) trata cualquier sesión con último estatus 46 y sin `fecha_reagendada` como **"Reagendada · sin fecha"**.
- Prod hoy: **7 sesiones** con último estatus 46 y sin ejecutar. Al publicar, todas caen en la lista "Reagendadas sin fecha", aunque Capacitación quizá ya les cambió la fecha.
- No sabemos si Capacitación, al reagendar, sobrescribe `osi_sesion.fecha`. Si lo hace, pisa la fecha planificada legal y `fn_sync_osi_dates_from_sessions` mueve `fecha_inicio_real` y `fecha_fin_real` de la OSI.
- **Decidir:** que haya un solo lugar para reagendar (el calendario), o que Capacitación use la RPC `osi_sesion_registrar_accion`. Además hace falta un backfill de esas 7 sesiones.

> **Actualización (misma fecha):** la migración `20261104170000_osi_sesion_permisos_por_accion.sql` (pendiente de aplicar)
> separa el permiso en `osis:sesion:ejecutar`, `:reagendar` y `:cancelar`, agrega el estado «No se dio» (columnas
> `osi_sesion.no_se_dio*`, sin tocar historial ni estatus de la OSI) y rechaza ejecuciones con fecha futura en la RPC.
> Siguen asignados solo a roles de `sgestion`.

### P0. Solo los roles de `sgestion` tienen el permiso
- `osis:sesion:gestionar` se asignó a todos los roles de la app `sgestion`, como se pidió.
- Quien hoy marca la ejecución en el día a día es Capacitación (roles de `scapacitacion`) y Servicios Técnicos. Esos usuarios ven el calendario pero no pueden registrar nada.
- `authprisma.can_access(..., 'sgestion')` está fijo en la RPC. Si se amplía a otras apps, hay que cambiar la RPC además de `role_permissions`.

### P0. La migración no está registrada ni en prod
- En staging se aplicó a mano: sus objetos existen, pero no aparece en `supabase_migrations.schema_migrations`.
- En prod no existe. Sin ella, el calendario no carga y las burbujas de comentarios de Consulta de OSIs salen en 0 (solo queda un log de error).
- `types/supabase.ts` no se regeneró, así que las RPC y la vista nuevas no tienen tipos.

### P1. Pasar una OSI a "Ejecutado" tiene efectos laterales
- Cuando todas las sesiones quedan cerradas, la RPC cambia `ejecucion_osi.id_estatus` a 12. Eso dispara:
  - `trg_tareas_ejecucion_osi_solicitud_facturas`
  - `notify_shell_osi_status_changed`
  - `trg_osi_to_activity_update`
- Hoy el usuario no ve ningún aviso de que su clic cierra la OSI y pide facturación. Habría que mostrarlo en el modal ("Es la última sesión: la OSI pasará a Ejecutada").

### P1. Reagendar o cancelar una sesión ya ejecutada reabre la OSI
- Desde una sesión ejecutada el detalle ofrece "Reagendar" y "Cancelar". La RPC borra `fecha_ejecutada` y regresa la OSI de 12 a 11.
- Si ya se pidió la factura, el estatus retrocede y la factura sigue ahí.
- Falta decidir si esto se permite, a quién, y con qué confirmación.

### P1. OSI con correlativo `PEN-`: el cierre se omite sin decir nada
- Si todas las sesiones están ejecutadas pero la OSI sigue con `PEN-`, la RPC no la pasa a 12, para no chocar con `fn_ejecucion_osi_block_ejecutada_sin_emision`, y no lo avisa.
- El calendario excluye las `PEN-%`, pero una OSI puede volver a `PEN-` o emitirse después.
- Debería devolver un aviso ("sesiones listas; la OSI no se cerró porque el correlativo está pendiente").

### P1. Las fechas no se validan en el servidor
- **Ejecutar con fecha futura:** solo lo impide el `max` del `<input type="date">`. Ni la RPC ni Zod lo rechazan.
- **Reagendar a una fecha pasada o a la misma fecha:** la sesión queda de inmediato como "Sin estatus". Al arrastrar a un día anterior a hoy no hay ningún aviso.
- **Orden de sesiones:** se puede reagendar la S2 antes de la S1. En prod ya hay **9 pares** de sesiones con la fecha planificada fuera de orden.

### P1. Datos de prod que el calendario va a mostrar raros
| Caso | Prod | Qué se ve |
|---|---:|---|
| `fecha_ejecutada` con último estatus distinto de 12 | 8 | "Ejecutada", porque la fecha manda, aunque el historial diga otra cosa |
| OSI en 12 con sesiones sin cerrar | 1 | Sesiones "Sin estatus" de una OSI ya ejecutada |
| OSIs sin filas en `osi_sesion` | 4 (2 activas) | No aparecen en el calendario |
| Sesiones sin hora | 2 | "Sin hora" al final del día |
| Cambios de estatus sin `id_usuario_cambio` | 548 de 633 | El historial de reagendas no puede decir quién lo hizo en lo viejo |

### P1. El estatus 46 de la OSI no se usa
- La RPC solo pone 46 en la sesión. La OSI queda en 10 u 11 aunque todas sus sesiones pendientes estén reagendadas.
- `conf_estatus` 46 existe para `ejecucion_osi` (0 OSIs lo usan en prod), así que la Consulta de OSIs no permite filtrar las reagendadas.
- Hay que decidir si una OSI con todas sus sesiones abiertas reagendadas debe verse como "Re-agendado".

### P2. Otros
- **Corrección de ejecución:** "Corregir fecha de ejecución" sobre una sesión ejecutada vuelve a escribir 12 en el historial sin dejar rastro del valor anterior, que se pierde.
- **Revertir una cancelación:** no hay un "Deshacer cancelación". Solo se puede pasar a Ejecutada o Reagendada.
- **Notificaciones:** `notifySessionStatusChange` no incluye la fecha nueva de la reagenda ni el motivo.
- **Fecha de hoy:** `hoy` se calcula en el servidor al cargar la página. Si la pestaña queda abierta de un día a otro, "Sin estatus" y los atajos Hoy/Ayer quedan desfasados.
- **Volumen de "Reagendadas sin fecha":** la lista trae todas las de la historia, sin filtro de fecha. Con volumen puede crecer sin límite.

---

## 2. UI/UX

### P1. Lo que se reagenda fuera del mes "desaparece"
- Si una sesión planificada en octubre se reagenda a noviembre, en octubre no queda ninguna marca.
- Hace falta un "fantasma" en la fecha original (borde punteado, "movida al 4 nov") para que el planificado legal siga visible.

### P1. Consulta de OSIs y calendario no se hablan
- `canChangeOSIStatus` sigue en `false`, así que la tabla de consulta no permite gestionar sesiones.
- Tampoco hay un enlace "ver en calendario" desde una OSI, ni "ver en consulta" desde el calendario. El usuario tiene que saber que el control está en la otra página.

### P1. La vista y los filtros no están en la URL
- Al recargar, la vista vuelve a "Mes", se pierden los filtros y la semana elegida, y el botón Atrás no deshace el cambio de semana.
- Lo mismo pasa con el filtro de la tabla y con "En SHA". Tampoco se puede compartir un enlace a "semana del 5 oct, En SHA".

### P1. No hay estado de carga al cambiar de mes
- `router.push(?mes=)` deja la grilla anterior visible hasta que llega la nueva, porque no hay `loading.tsx` ni skeleton en `/consulta-osi/calendario`.
- En una conexión lenta parece que el botón no hizo nada.

### P1. Arrastrar y soltar
- **Navegación:** solo se puede soltar dentro de la grilla ya cargada. No se puede llevar una sesión a la semana o al mes siguiente arrastrando.
- **Teclado y teléfono:** no hay arrastre con teclado ni en teléfono. La alternativa es "Reagendar" en el detalle, pero no se indica.
- **Deshacer:** después de confirmar no hay "Deshacer". El aviso verde no ofrece revertir.
- **Fechas pasadas:** al soltar sobre un día pasado no hay advertencia.

### P2. Accesibilidad
- La etiqueta es `role="button"` y tiene dentro otro botón (la burbuja de comentarios). Esos interactivos anidados confunden a los lectores de pantalla.
- La tarjeta flotante del hover no aparece con el foco del teclado y no se mueve si se hace scroll con el mouse encima.
- Los colores de estado se distinguen bien entre sí, pero "Sin estatus" (gris) y "Planificada" (azul claro) dependen solo del color en la grilla del mes. Solo la leyenda tiene texto.

### P2. Pequeños
- **Mes vacío:** muestra la grilla en blanco, sin un mensaje ("No hay sesiones en octubre con estos filtros").
- **Aviso verde:** no se cierra solo y se queda hasta cerrarlo a mano.
- **Leyenda en teléfono:** se desliza en horizontal sin barra visible. No es obvio que hay más estados a la derecha.
- **Recargas:** después de cerrar el chat se recarga todo el mes (`router.refresh()`) para actualizar una sola burbuja.
- **Tabla en vista semana:** también lista las reagendadas sin fecha de toda la historia, así que el contador no cuadra con la semana.
- **Ítem del chat:** `a_osi_item()` arma un `OSIListItem` falso para reutilizar `OSICommentsSheet`. Si el panel empieza a usar más campos, se rompe sin avisar.
- **"S7/10":** la etiqueta del mes lo abrevia. Se entiende con el hover, pero no en teléfono ni con lector de pantalla.

---

## 3. Propuesta de orden

1. **Antes de prod (P0):**
   - Decidir quién reagenda (calendario o Capacitación) y alinear Capacitación con la RPC.
   - Hacer el backfill de las 7 sesiones con estatus 46.
   - Ampliar el permiso a Capacitación y ST.
   - Registrar la migración en staging, aplicarla en prod con aprobación y regenerar tipos.
2. **Reglas en la RPC (P1):**
   - Rechazar ejecución con fecha futura.
   - Avisar el cierre de la OSI y el caso `PEN-`.
   - Confirmar antes de reabrir una sesión ejecutada.
   - Decidir sobre el estatus 46 de la OSI.
3. **UX (P1):**
   - Fantasma en la fecha original.
   - Vista y filtros en la URL.
   - `loading.tsx`.
   - Enlaces entre consulta y calendario.
   - Aviso al soltar en una fecha pasada.
4. **Pulido (P2):** accesibilidad, mes vacío, aviso que se cierra solo, recarga puntual de la burbuja.
