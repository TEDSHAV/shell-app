"use client";

import { ManualArticle } from "@/components/manual/ManualArticle";
import type { MapaRequisiciones } from "@/actions/requisiciones-mapa";

function names_or(empty: string, names: string[]) {
  if (names.length === 0) return empty;
  return names.join(", ");
}

function InternaDeptTable({
  rows,
}: {
  rows: MapaRequisiciones["departamentos"];
}) {
  const groups = new Map<string, typeof rows>();
  for (const row of rows) {
    const key = row.gerencia || "Sin gerencia";
    const list = groups.get(key) ?? [];
    list.push(row);
    groups.set(key, list);
  }

  return (
    <div className="space-y-5">
      {[...groups.entries()].map(([gerencia, depts]) => (
        <div key={gerencia}>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            {gerencia}
          </p>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-3 py-2 font-semibold">Departamento</th>
                  <th className="px-3 py-2 font-semibold">Coordinador</th>
                  <th className="px-3 py-2 font-semibold">Líder</th>
                </tr>
              </thead>
              <tbody>
                {depts.map((row) => (
                  <tr
                    key={`${gerencia}-${row.departamento}`}
                    className="border-t border-slate-100"
                  >
                    <td className="px-3 py-2 font-medium text-slate-900">
                      {row.departamento}
                    </td>
                    <td className="px-3 py-2 text-slate-700">
                      {names_or("Pasa al líder", row.coordinadores)}
                    </td>
                    <td className="px-3 py-2 text-slate-700">
                      {names_or("Pasa a Administración", row.lideres)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

export function RequisicionesManual({ mapa }: { mapa: MapaRequisiciones }) {
  return (
    <ManualArticle
      kicker="Administración"
      title="Manual de requisiciones"
      lead="Cómo pedir un gasto y quién lo aprueba en cada departamento."
      chips={[
        { id: "manual-interna", label: "Interna" },
        { id: "manual-externa", label: "Externa" },
        { id: "manual-mapa-interna", label: "Quién aprueba" },
        { id: "manual-mapa-externa", label: "Quién tramita" },
      ]}
      sections={[
        {
          id: "manual-interna",
          title: "Requisición interna",
          body: (
            <>
              <p>
                Sirve para pedir materiales, insumos, equipos o gastos del
                departamento: lo que el área necesita para trabajar, sin estar
                ligado a un servicio de un cliente.
              </p>
              <p>
                La aprueban el coordinador del departamento y el líder de la
                gerencia. Administración tramita la compra.
              </p>
            </>
          ),
        },
        {
          id: "manual-externa",
          title: "Requisición externa",
          body: (
            <>
              <p>
                Pedido ligado a un servicio (OSI) con alta prioridad de
                procesamiento: honorarios, traslado, impresión u otros costos
                de esa orden. Administración lo ve de inmediato y lo tramita.
              </p>
            </>
          ),
        },
        {
          id: "manual-mapa-interna",
          title: "Quién aprueba cada departamento",
          body: (
            <>
              <p>
                Coordinador y líder que sellan las internas de cada
                departamento.
              </p>
              <InternaDeptTable rows={mapa.departamentos} />
            </>
          ),
        },
        {
          id: "manual-mapa-externa",
          title: "Quién tramita",
          body: (
            <>
              <p>
                Administración tramita las externas de todos los departamentos.
              </p>
              <p className="font-medium text-slate-800">
                {mapa.tramite_nombres.length > 0
                  ? mapa.tramite_nombres.join(", ")
                  : "Equipo de Administración"}
              </p>
            </>
          ),
        },
      ]}
    />
  );
}
