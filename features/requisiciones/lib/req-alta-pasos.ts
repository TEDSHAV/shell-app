import type { DestinoPedido, ServicioKind } from "./req-destino";

export type PasoAlta =
  | "destino"
  | "uso"
  | "creacion"
  | "confirmar"
  | "listo";

export type PasoAltaMeta = {
  id: PasoAlta;
  n: number;
  label: string;
  hint: string;
  skipped: boolean;
};

export function pasos_visibles_alta(
  destino: DestinoPedido | null,
  _servicio: ServicioKind | null,
): PasoAltaMeta[] {
  const skip_uso = destino === "departamento";
  const rows: Array<Omit<PasoAltaMeta, "n">> = [
    {
      id: "destino",
      label: "Para quién",
      hint: "Departamento o servicio",
      skipped: false,
    },
    {
      id: "uso",
      label: "Uso",
      hint: skip_uso ? "No aplica" : "OSI o depósito",
      skipped: skip_uso,
    },
    {
      id: "creacion",
      label: "Pedido",
      hint: "Documento RG-ADM-003",
      skipped: false,
    },
    {
      id: "confirmar",
      label: "Revisar",
      hint: "Resumen y crear",
      skipped: false,
    },
    {
      id: "listo",
      label: "Listo",
      hint: "Documento creado",
      skipped: false,
    },
  ];
  let n = 0;
  return rows.map((row) => {
    if (!row.skipped) n += 1;
    return { ...row, n };
  });
}

export function indice_paso_activo(
  pasos: PasoAltaMeta[],
  paso: PasoAlta,
): number {
  return pasos.findIndex((row) => row.id === paso);
}
