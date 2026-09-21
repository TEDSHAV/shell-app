-- Catálogo de módulos (por app) y acciones reutilizables para armar slugs.

create table if not exists authprisma.permission_modules (
  slug text primary key,
  nombre text not null,
  descripcion text,
  app_id bigint references authprisma.apps (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists authprisma.permission_actions (
  slug text primary key,
  nombre text not null,
  descripcion text,
  created_at timestamptz not null default now()
);

alter table authprisma.permission_modules enable row level security;
alter table authprisma.permission_actions enable row level security;

grant select, insert, update, delete on authprisma.permission_modules to service_role;
grant select, insert, update, delete on authprisma.permission_actions to service_role;

insert into authprisma.permission_actions (slug, nombre, descripcion)
values
  ('access', 'Acceder', 'Entrar al módulo o pantalla y ver que existe.'),
  ('read', 'Leer', 'Consultar registros sin modificarlos.'),
  ('write', 'Escribir', 'Crear o cambiar datos (atajo amplio).'),
  ('create', 'Crear', 'Dar de alta registros nuevos.'),
  ('edit', 'Editar', 'Modificar registros que ya existen.'),
  ('approve', 'Aprobar', 'Aprobar o rechazar una solicitud o documento.'),
  ('manage', 'Gestionar', 'Administrar el recurso o la configuración del módulo.'),
  ('export', 'Exportar', 'Descargar o extraer información.'),
  ('config', 'Configurar', 'Cambiar ajustes del módulo, no los datos de negocio.'),
  ('executive', 'Ejecutivo', 'Operar el flujo de campo o de ejecución (p. ej. OSI).')
on conflict (slug) do nothing;

insert into authprisma.permission_modules (slug, nombre, descripcion, app_id)
select v.slug, v.nombre, v.descripcion, a.id
from (
  values
    ('finance', 'Finanzas', 'ECC, presupuestos, facturación y catálogo financiero.', 'sgestion'),
    ('sales', 'Ventas', 'Clientes, tratos, solpeds y operación comercial.', 'sgestion'),
    ('mkt', 'Marketing', 'Leads y contactos de marketing.', 'sgestion'),
    ('reportes', 'Reportes', 'Tableros, metas, cierres y comprobantes.', 'sgestion'),
    ('directorio', 'Directorio', 'Personas y organigrama visible en Negocios.', 'sgestion'),
    ('pipeline', 'Pipeline', 'Embudo comercial y seguimiento de tratos.', 'sgestion'),
    ('clientes', 'Clientes', 'Cuentas y relación con el cliente.', 'sgestion'),
    ('admin', 'Administración', 'Operación administrativa y emisión fiscal.', 'sadministracion'),
    ('scalidad', 'Calidad', 'Procesos y control de calidad.', 'scalidad'),
    ('scapacitacion', 'Capacitación', 'Cursos, participantes y operación de formación.', 'scapacitacion'),
    ('srh', 'Recursos Humanos', 'Altas, bajas y trámites de personas.', 'srh'),
    ('st', 'Servicios Técnicos', 'OSI en campo y gestión del departamento técnico.', 'st'),
    ('inventario', 'Inventario', 'Control de inventario y almacén.', 'inventario'),
    ('shell', 'Shell', 'Puerta de entrada: menú e inicio de cada app.', 'shell')
) as v(slug, nombre, descripcion, app_slug)
join authprisma.apps a on a.slug = v.app_slug
on conflict (slug) do nothing;
