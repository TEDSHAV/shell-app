-- Módulo transversal de requisiciones + slugs. No se cuelgan en roles.

alter table authprisma.permission_modules
  add column if not exists transversal boolean not null default false;

insert into authprisma.permission_actions (slug, nombre, descripcion)
values
  (
    'access-depto',
    'Acceder al departamento',
    'Ver los documentos del departamento de la persona, no solo los propios.'
  ),
  (
    'approve-coordinador',
    'Aprobar como coordinador',
    'Primer sello: aprueba o rechaza en la etapa de coordinación.'
  ),
  (
    'approve-lider',
    'Aprobar como líder',
    'Segundo sello. Incluye el primero: el líder no espera coordinación.'
  ),
  (
    'process',
    'Procesar',
    'Cerrar el trámite operativo: verificar, procesar o rechazar en bandeja.'
  )
on conflict (slug) do update set
  nombre = excluded.nombre,
  descripcion = excluded.descripcion;

insert into authprisma.permission_modules (slug, nombre, descripcion, app_id, transversal)
select
  'requisiciones',
  'Requisiciones',
  'Solicitudes de compra o recursos: pedir, sellar y procesar.',
  a.id,
  true
from authprisma.apps a
where a.slug = 'sadministracion'
on conflict (slug) do update set
  nombre = excluded.nombre,
  descripcion = excluded.descripcion,
  app_id = excluded.app_id,
  transversal = true;

insert into authprisma.permissions (slug, descripcion)
values
  (
    'requisiciones:solicitud:access',
    'Ver las requisiciones que creó la persona (Mis requisiciones).'
  ),
  (
    'requisiciones:solicitud:create',
    'Crear una requisición interna o externa.'
  ),
  (
    'requisiciones:solicitud:edit',
    'Editar la requisición propia mientras el flujo lo permita.'
  ),
  (
    'requisiciones:solicitud:access-depto',
    'Ver las requisiciones del departamento de la persona (mural de equipo).'
  ),
  (
    'requisiciones:gestion:access',
    'Entrar a la cola de trámite. El alcance (depto o general) lo marcan las otras acciones de gestión.'
  ),
  (
    'requisiciones:gestion:approve-coordinador',
    'Primer sello de internas en los departamentos que cubre el rol.'
  ),
  (
    'requisiciones:gestion:approve-lider',
    'Sello de líder; incluye el de coordinador. No exige espera del primer sello.'
  ),
  (
    'requisiciones:gestion:process',
    'Procesar o rechazar en Administración: ítems, tasa, OSI y cierre.'
  ),
  (
    'requisiciones:gestion:edit',
    'Editar una requisición ajena como tramitador (aprobador o proceso).'
  )
on conflict (slug) do update set
  descripcion = excluded.descripcion;
