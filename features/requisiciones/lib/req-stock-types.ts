export type ReqDeposito = "departamento" | "capacitacion" | "tecnico";

export type ReqStockMinimoAlcance = "general" | "categoria" | "item";

export type ReqStockRow = {
  id: number;
  id_item_costo: number;
  nombre_item: string;
  unidad: string | null;
  deposito: ReqDeposito;
  id_departamento?: number | null;
  departamento?: string | null;
  cantidad: number;
  id_categoria?: number | null;
  categoria?: string | null;
  minimo?: number;
};

export type ReqKardexRow = {
  id: number;
  id_stock: number;
  nombre_item: string;
  deposito: ReqDeposito;
  tipo: string;
  cantidad: number;
  id_requisicion: number | null;
  id_osi: number | null;
  notas: string | null;
  creado_en: string;
};

export type ReqOsiRepartoRow = {
  id_osi: number;
  nro_osi_secuencial: string;
  deposito: ReqDeposito;
  fecha_culminacion: string | null;
  fecha_emision: string | null;
};

export type ReqStockMinimoRow = {
  id: number;
  deposito: ReqDeposito;
  alcance: ReqStockMinimoAlcance;
  id_categoria: number | null;
  id_item_costo: number | null;
  cantidad_minima: number;
};

export type ReqIngresoPendiente = {
  id_requisicion: number;
  id_linea: number;
  cantidad: number;
  cantidad_entregada: number;
  pendiente: number;
};

export const DEPOSITO_LABEL: Record<ReqDeposito, string> = {
  departamento: "Departamental",
  capacitacion: "Ejecución Capacitación",
  tecnico: "Ejecución Servicios Técnicos",
};

export type ReqDepositoTab = ReqDeposito | "todos";

export const DEPOSITO_TABS: ReqDepositoTab[] = [
  "todos",
  "departamento",
  "capacitacion",
  "tecnico",
];

export const DEPOSITO_TAB_LABEL: Record<ReqDepositoTab, string> = {
  todos: "Todos",
  ...DEPOSITO_LABEL,
};
