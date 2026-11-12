-- 20261105120000_osis_facturar_permiso.sql
-- Calendario de servicios: botón «Facturar» en las tarjetas (abre la solicitud de factura en Negocios).
-- Permiso propio para mostrar el botón; la creación de la solicitud la sigue validando Negocios
-- (finance:facturacion:create). Se asigna a todos los roles de sgestion.

insert into authprisma.permissions (slug, descripcion) values
  ('osis:facturar', 'Abrir la solicitud de factura de una OSI desde el Calendario de servicios')
on conflict (slug) do nothing;

insert into authprisma.role_permissions (role_id, permission_id)
select r.id, p.id
from authprisma.roles r
join authprisma.apps a on a.id = r.app_id and a.slug = 'sgestion'
join authprisma.permissions p on p.slug = 'osis:facturar'
on conflict do nothing;
