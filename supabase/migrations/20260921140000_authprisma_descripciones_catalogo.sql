-- Catalog copy for TED access console + /manual.
-- Role/app text describes the function, not the current permission set.

update authprisma.apps set descripcion = v.descripcion
from (values
  ('sgestion', 'Prisma Negocios: proceso comercial, costos, presupuestos, facturación y reportes.'),
  ('sadministracion', 'Emisión fiscal y operación administrativa.'),
  ('st', 'Servicios Técnicos: ejecución de OSI en campo y gestión de ese departamento.'),
  ('scalidad', 'Control de procesos y calidad corporativa.'),
  ('scapacitacion', 'Formación: cursos, participantes y operación de Capacitación.'),
  ('srh', 'Gestión de personas: altas, bajas y trámites de Recursos Humanos.'),
  ('inventario', 'Control de inventario y almacén.'),
  ('shell', 'Puerta de Prisma: menú e inicio. Cada aplicación se abre con el rol de esa app.')
) as v(slug, descripcion)
where authprisma.apps.slug = v.slug
  and authprisma.apps.descripcion is null;

update authprisma.roles r set descripcion = v.descripcion
from authprisma.apps a,
(values
  ('sgestion', 'superadmin', 'Supervisa Negocios: visibilidad total del proceso comercial y la última palabra en aprobaciones de la gerencia.'),
  ('sgestion', 'admin', 'Opera y configura Negocios: directorio, embudo, costos, facturación y reportes del día a día.'),
  ('sgestion', 'gestor_clientes', 'Ejecutivo comercial: atiende el embudo, la cartera de clientes y las órdenes de servicio de su equipo.'),
  ('sgestion', 'gestor_financiero', 'Ingeniería y finanzas de Negocios: costea, arma presupuestos y lleva la facturación del proceso comercial.'),
  ('sgestion', 'gestor_marketing', 'Captación: leads, contactos y el embudo de marketing.'),
  ('sadministracion', 'admin', 'Administra la app de Administración y las bandejas de emisión fiscal.'),
  ('sadministracion', 'gestor', 'Opera Administración: registra la factura fiscal cuando el proceso comercial ya está listo para emitir.'),
  ('sadministracion', 'coordinador', 'Coordina el trabajo diario de Administración y las requisiciones del área.'),
  ('sadministracion', 'lider', 'Lidera Administración y aprueba las requisiciones de ese departamento.'),
  ('st', 'analista', 'Ejecuta órdenes de servicio en campo: visita, informe y cierre operativo.'),
  ('st', 'coordinador', 'Coordina la ejecución de OSI en Servicios Técnicos y las requisiciones del equipo.'),
  ('st', 'lider', 'Lidera Servicios Técnicos y aprueba las requisiciones de ese departamento.'),
  ('scalidad', 'analista', 'Ejecuta el control de procesos y registros de Calidad.'),
  ('scalidad', 'superadmin', 'Supervisa Calidad: políticas, auditorías y el estándar del módulo.'),
  ('scapacitacion', 'admin', 'Administra Capacitación: catálogo de cursos, participantes y operación del módulo.'),
  ('scapacitacion', 'analista', 'Opera el día a día de Capacitación: inscripciones, asistencia y seguimiento.'),
  ('scapacitacion', 'coordinador', 'Coordina la operación de Capacitación y las requisiciones de ese equipo.'),
  ('scapacitacion', 'lider', 'Lidera Capacitación y aprueba las requisiciones de ese departamento.'),
  ('scapacitacion', 'superadmin', 'Supervisa Capacitación a nivel de módulo: estándares y operación completa.'),
  ('srh', 'admin', 'Administra Recursos Humanos: personas, solicitudes y trámites del área.'),
  ('inventario', 'admin', 'Administra inventario: catálogo, movimientos y control de almacén.'),
  ('inventario', 'analista', 'Opera inventario: entradas, salidas y consulta de existencias.')
) as v(app_slug, role_slug, descripcion)
where r.app_id = a.id
  and a.slug = v.app_slug
  and r.slug = v.role_slug
  and r.descripcion is null;

update authprisma.permissions
set descripcion = 'Entrar al directorio (empresas y personas, lectura)'
where slug = 'directorio:access';

update authprisma.permissions
set descripcion = 'Ver y trabajar presupuestos en Negocios'
where slug = 'finance:presupuestos:access';
