export const REQ_SOLICITUD_ACCESS = "requisiciones:solicitud:access";
export const REQ_SOLICITUD_CREATE = "requisiciones:solicitud:create";
export const REQ_SOLICITUD_EDIT = "requisiciones:solicitud:edit";
export const REQ_SOLICITUD_ACCESS_DEPTO = "requisiciones:solicitud:access-depto";
export const REQ_GESTION_ACCESS = "requisiciones:gestion:access";
export const REQ_GESTION_EDIT = "requisiciones:gestion:edit";
export const REQ_GESTION_PROCESS = "requisiciones:gestion:process";
export const REQ_GESTION_APPROVE_COORD = "requisiciones:gestion:approve-coordinador";
export const REQ_GESTION_APPROVE_LIDER = "requisiciones:gestion:approve-lider";
export const REQ_CONFIG_MANAGE = "requisiciones:config:manage";

export const ADMIN_APP_SLUG = "sadministracion";

export const ADMIN_OPERATIVE_ROLE_SLUGS = new Set([
  "coordinador",
  "lider",
  "gestor",
  "admin-ted",
  "aprobador-coordinador-requisiciones",
  "aprobador-lider-requisiciones",
]);

export const PRODUCT_COORD_ROLE_SLUGS = new Set([
  "coordinador",
  "aprobador-coordinador-requisiciones",
]);

export const PRODUCT_LIDER_ROLE_SLUGS = new Set([
  "lider",
  "aprobador-lider-requisiciones",
  "admin-ted",
]);
