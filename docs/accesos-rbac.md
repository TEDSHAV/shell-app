# Accesos y roles (authprisma)

Consola TED: `/ted/usuarios/accesos`. Manual in-app: `/ted/usuarios/accesos/manual`.
SGestion y las demás apps **consumen** slugs; no administran el catálogo.

La `descripcion` de app y rol habla de la **función** (para qué existe), no de
qué permisos tiene hoy. Los permisos se ven en la matriz y pueden cambiar sin
reescribir esa frase.

## Modelo RBAC

El empleado no recibe permisos sueltos. Recibe **un rol por aplicación**. El rol
tiene el set de permisos.

```
public.usuarios
  → authprisma.user_app_roles  unique (usuario_id, app_id)
      → authprisma.roles       unique (app_id, slug)
          → authprisma.role_permissions
              → authprisma.permissions  slug global
authprisma.apps
```

Vista de lectura: `authprisma.vw_permisos_usuarios` (una fila = app + rol +
usuario; `usuario_id` puede ser null si nadie tiene ese rol).

Organigrama (`gerencias` / `departamentos`) **no** concede acceso. En la ficha
solo se muestra depto y cargo, de `public.usuarios`.

## Convención de slugs (a partir de ahora)

| Pieza   | Convención                                      | Qué no hacemos                         |
|---------|--------------------------------------------------|----------------------------------------|
| App     | kebab corto: `sgestion`, `st`, `scapacitacion`   | Duplicar el slug de la app en el rol   |
| Rol     | función kebab, único por app: `lider`            | `prisma-superadmin` (el app ya está)   |
| Permiso | `modulo:accion` o `modulo:recurso:accion`        | Puntos; rename masivo de slugs viejos  |

Acciones nuevas: `access`, `read`, `write`, `create`, `edit`, `approve`,
`manage`, `export`. No exigir `.ver` si el código ya usa `read`.

La matriz agrupa por `slug.split(':')[0]`. El **recurso es opcional**:

- Módulo chico o permiso general: `directorio:access`, `pipeline:access`.
- Módulo con varias piezas: `finance:ecc:approve`.

El formulario arma el slug y rechaza duplicados. Permisos nuevos sin recurso
quedan en dos segmentos. Los slugs vivos de SGestion **no se renombran**.
Requisiciones: guía `docs/requisiciones-permisos.md` (módulo transversal). TED
crea y cuelga los slugs en la consola. El runtime del módulo aún busca
`lider`/`coordinador` por app hasta que se implemente la lectura.

## Superficie TED

- Listado: `/ted/usuarios/accesos` (tabs Personas / Aplicaciones / **Roles** / Permisos).
- Crear/editar rol (pantalla completa, stepper datos → permisos → revisar):
  `/ted/usuarios/accesos/apps/{appId}/roles/nuevo` y `.../roles/{roleId}`.
- Elegir rol de una app para una persona (fichas técnicas, no un select):
  `/ted/usuarios/accesos/usuario/{usuarioId}/app/{appId}`.

## Límites de producto

- Crear una fila en `authprisma.apps` **no** registra ícono ni rutas del Shell.
  Eso sigue en `shell-app/config/apps.ts` (y el despliegue en Coolify).
- Escrituras de la consola van con `service_role` (`createAdminClient`) tras
  `isTedMember()`. `authenticated` solo tiene SELECT en catálogo;
  `user_app_roles` solo SELECT propio.
- No se borra un rol si todavía hay asignaciones (CASCADE sería peligroso).
- Gate v1: miembro TED. Más adelante se puede exigir `shell:accesos:manage`.

## UX de referencia

El wireframe ASCII de `SGestion/apps/web/docs/user-roles-permissions.md` ilustra
las vistas (persona / catálogo / wizard). Los nombres de apps de ese mock
(PRISMA, Trinorma, “SGestion logística”) no son el catálogo real
(`sgestion`, `scapacitacion`, `st`, `sadministracion`, `scalidad`,
`inventario`, `srh`, `shell`).
