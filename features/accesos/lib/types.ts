export type AccesoApp = {
  id: number;
  slug: string;
  nombre: string;
  descripcion: string | null;
  role_count: number;
  user_count: number;
};

export type AccesoRole = {
  id: number;
  app_id: number;
  slug: string;
  nombre: string;
  descripcion: string | null;
  permission_slugs: string[];
  user_ids: number[];
  user_labels: string[];
};

export type AccesoPermission = {
  id: number;
  slug: string;
  descripcion: string | null;
};

export type AccesoUsuarioAssignment = {
  app_id: number;
  app_slug: string;
  app_nombre: string;
  role_nombre: string;
  role_slug: string;
  role_descripcion: string | null;
};

export type AccesoUsuarioListItem = {
  id: number;
  nombre: string;
  email: string | null;
  cargo: string | null;
  activo: boolean | null;
  departamento: string | null;
  app_count: number;
  assignments: AccesoUsuarioAssignment[];
};

export type AccesoUsuarioApp = {
  app_id: number;
  app_slug: string;
  app_nombre: string;
  role_id: number;
  role_slug: string;
  role_nombre: string;
  role_descripcion: string | null;
  permission_slugs: string[];
  asignacion_fecha: string | null;
};

export type AccesoUsuarioFicha = {
  id: number;
  nombre: string;
  email: string | null;
  cargo: string | null;
  activo: boolean | null;
  departamento: string | null;
  apps: AccesoUsuarioApp[];
};

export type AccesoCatalog = {
  apps: AccesoApp[];
  roles: AccesoRole[];
  permissions: AccesoPermission[];
  users: AccesoUsuarioListItem[];
};
