export type PlanSalud =
  | "Planificado"
  | "En Marcha"
  | "En Riesgo"
  | "Completado";

export type PlanTrimestre = "T1" | "T2" | "T3" | "T4";

export type PlanOrigen =
  | "PLAN"
  | "TICKET"
  | "GERENCIA"
  | "USUARIO"
  | "REQUERIMIENTO"
  | "ADICIONAL";

export type EntregableTipo = "ninguno" | "vista" | "version" | "comentario";

export type PlanAppOrigen = "shell" | "custom";

export type PlanAppSection = "home" | "custom" | "utilidades";

export type PlanHitoIcono = "deploy" | "engine" | "team";

export type PlanHito = {
  id: number;
  app_id: number;
  modulo_id: number | null;
  titulo: string;
  descripcion: string | null;
  trimestre: PlanTrimestre;
  anio: number;
  icono: PlanHitoIcono;
};

export type PlanParticipante = {
  usuario_id: number;
  nombre: string;
  initials: string;
};

export type PlanObjetivoEstado = "abierto" | "cumplido" | "cancelado";

export type PlanObjetivo = {
  id: number;
  titulo: string;
  descripcion: string | null;
  fecha_inicio: string;
  fecha_fin: string;
  app_id: number | null;
  app_nombre: string | null;
  estado: PlanObjetivoEstado;
  tarea_count: number;
  avance: number;
};

export type PlanTarea = {
  id: number;
  modulo_id: number;
  titulo: string;
  descripcion: string | null;
  origen: PlanOrigen;
  avance: number;
  no_solicitada: boolean;
  completada: boolean;
  completada_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  entregable_tipo: EntregableTipo;
  entregable_ruta: string | null;
  entregable_unidad: string | null;
  entregable_version: string | null;
  entregable_comentario: string | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  orden: number;
  trimestre: PlanTrimestre | null;
  asignado_id: number | null;
  asignado: PlanParticipante | null;
  asignados: PlanParticipante[];
  en_planificacion: boolean;
  ticket_id: number | null;
  objetivo_id: number | null;
  objetivo_titulo: string | null;
};

export type PlanModulo = {
  id: number;
  app_id: number;
  app_ids: number[];
  nombre: string;
  subtitulo: string | null;
  trimestre_entrega: PlanTrimestre;
  anio: number;
  fecha_objetivo: string | null;
  salud_override: PlanSalud | null;
  done_count: number;
  left_count: number;
  progress: number;
  salud: PlanSalud;
  participantes: PlanParticipante[];
  tareas: PlanTarea[];
};

export type PlanApp = {
  id: number;
  slug: string;
  nombre: string;
  subtitulo: string | null;
  origen: PlanAppOrigen;
  section: PlanAppSection;
  done_count: number;
  left_count: number;
  progress: number;
  salud: PlanSalud;
  modulo_count: number;
  modulos: PlanModulo[];
  hitos: PlanHito[];
};

export type PlanUsuarioOption = {
  id: number;
  label: string;
};

export type PlanWorkspaceData = {
  apps: PlanApp[];
  usuarios: PlanUsuarioOption[];
};
