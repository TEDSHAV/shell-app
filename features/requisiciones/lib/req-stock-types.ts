export type ReqDeposito = "departamento" | "capacitacion" | "tecnico";

export type ReqStockRow = {
  id: number;
  id_item_costo: number;
  nombre_item: string;
  unidad: string | null;
  deposito: ReqDeposito;
  id_departamento?: number | null;
  departamento?: string | null;
  cantidad: number;
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

export const DEPOSITO_LABEL: Record<ReqDeposito, string> = {
  departamento: "Departamentos",
  capacitacion: "Capacitación",
  tecnico: "Servicios técnicos",
};
