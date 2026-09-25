# TED — roles y permisos (authprisma)

App `ted` en Accesos. El runtime de Shell lee roles/permisos; el departamento
ya **no** abre menús ni gates.

## Roles

| Rol | Quién | Qué hace |
|-----|-------|----------|
| `ted` | Operadores del equipo TED | Hub TED, planificación (escritura), tickets, usuarios/accesos, notify |
| `gerencia` | Dirección / líderes de negocio | Objetivos del periodo (crear/editar), Cubrir e Informe en lectura de avance |

Asignados hoy (referencia): operadores 8 y 14; gerencia 1 y 13.

## Permisos

| Slug | En rol | Uso en Shell |
|------|--------|--------------|
| `planificacion-ted:access-all` | `ted`, `gerencia` | Nav de planificación; escritura de plan solo con rol `ted` |
| `objetivos-ted:access-all` | `ted`, `gerencia` | Objetivos / Cubrir / Informe; escritura de objetivos con este permiso |
| `gestion-usuarios-prisma:access-all` | `ted` | Consola accesos + manejo de usuarios |

## Código

- Slugs: `lib/ted-slugs.ts`
- Gates: `actions/ted.ts` (`isTedMember`, `isPlanGerenciaUser`, `canReadObjetivosArea`, …)
- Assert planificación: `features/planificacion/actions/assert-ted.ts`
- Assert accesos: `features/accesos/actions/assert-ted.ts` → `canManageUsuariosPrisma`
