# Proveedores (deprecado)

Módulo de **Gestión de Proveedores** retirado de la UI del Shell
(septiembre 2026). El código se conserva aquí por si hay que reactivarlo.

## Contenido

| Ruta | Rol |
|------|-----|
| `actions/proveedores.ts` | Server actions (CRUD, bancos, notas) |
| `types/proveedores.ts` | Tipos y labels |
| `ui/` | Página y componentes de la antigua ruta `/administracion/proveedores` |

## Cómo reactivar

1. Volver a montar la ruta Next, por ejemplo:
   `app/(shell)/administracion/proveedores/` → copiar desde `ui/`
2. Restaurar imports a `@/actions/proveedores` y `@/types/proveedores`
   (o reexportar desde `actions/` / `types/` del package).
3. Volver a añadir el grupo de navegación en `config/apps.ts`
   (`administracionProveedoresNavGroup`) y la tarjeta del dashboard
   de Administración.
4. Revisar breadcrumb `proveedores` en `components/shell/AppBreadcrumb.tsx`.

Las tablas de BD (`proveedores`, etc.) **no** se eliminan con este
deprecado; solo se oculta el producto en Shell.
