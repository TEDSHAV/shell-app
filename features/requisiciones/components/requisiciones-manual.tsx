"use client";

import Link from "next/link";
import { ManualArticle } from "@/components/manual/ManualArticle";
import type { MapaRequisiciones } from "@/actions/requisiciones-mapa";
import { MANUAL_INVENTARIO } from "@/lib/help/manual-registry";
import type { ReqCostManualModel } from "../lib/req-cost-analysis-manual";
import {
  operator_analisis_costos_subsections,
  sensitive_analisis_costos_subsection,
} from "./requisiciones-cost-manual-sections";
import {
  DemoReqPasoComoSeUsa,
  DemoReqPasoParaQuien,
  DemoReqLinea,
  DemoStockAnalisis,
  ManualFigure,
} from "./manual-ui-demos";

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

export function RequisicionesManual({
  mapa,
  sensitive,
  model,
}: {
  mapa: MapaRequisiciones;
  sensitive: boolean;
  model: ReqCostManualModel | null;
}) {
  const analisis_subsections = [
    ...operator_analisis_costos_subsections(),
    ...(sensitive && model
      ? [sensitive_analisis_costos_subsection(model)]
      : []),
  ];

  return (
    <ManualArticle
      kicker="Administración"
      title="Manual de requisiciones"
      lead="Cómo pedir algo, quién lo aprueba y qué mirar en la pantalla — con las mismas preguntas y recuadros que ves al crear el pedido."
      chips={[
        { id: "manual-interna", label: "Interna" },
        { id: "manual-externa", label: "Curso / servicio" },
        { id: "manual-inventario-req", label: "Reponer inventario" },
        { id: "manual-analisis-costos", label: "Análisis de costos" },
        { id: "manual-mapa-externa", label: "Quién tramita" },
      ]}
      sections={[
        {
          id: "manual-interna",
          title: "Requisición interna",
          body: (
            <>
              <p>
                Pedí materiales o gastos del <strong>departamento</strong>:
                papelería, limpieza, equipos de oficina. No va ligado a un
                curso ni a un servicio de cliente.
              </p>
              <ManualFigure
                title="Paso «Para quién»"
                caption="Elegí «Mi departamento». No aparece el paso «Uso» (OSI / depósito)."
              >
                <DemoReqPasoParaQuien selected="departamento" />
              </ManualFigure>
              <p>
                Pasos: Nueva → Para quién (Mi departamento) → Pedido → Revisar →
                enviá. Primero sella el coordinador del área y después el
                líder; Administración compra.
              </p>
              <ManualFigure
                title="Detalle del pedido"
                caption="Cada fila es un ítem. La cantidad de la tabla es lo que pedís comprar o reponer."
              >
                <DemoReqLinea />
              </ManualFigure>
            </>
          ),
          subsections: [
            {
              id: "manual-mapa-interna",
              title: "Quién aprueba en cada departamento",
              body: (
                <>
                  <p>
                    Coordinador y líder que sellan las internas de cada
                    departamento. Si no hay coordinador, pasa directo al
                    líder; si no hay líder, a Administración.
                  </p>
                  <InternaDeptTable rows={mapa.departamentos} />
                </>
              ),
            },
          ],
        },
        {
          id: "manual-externa",
          title: "Requisición de curso / servicio",
          body: (
            <>
              <p>
                Pedido ligado a una orden de servicio (la OSI del curso o del
                trabajo técnico): honorarios, traslado, impresión u otros
                costos de esa jornada. Administración lo ve con prioridad y lo
                tramita.
              </p>
              <ManualFigure
                title="Paso 1 — Para quién"
                caption="Esto decide si hay OSI, si entra a un depósito y quién sella después."
              >
                <DemoReqPasoParaQuien selected="servicio" />
              </ManualFigure>
              <ManualFigure
                title="Paso 2 — Uso"
                caption="Solo aparece si elegiste «Dar un servicio». Directo e inventario no comparten el mismo número."
              >
                <DemoReqPasoComoSeUsa selected="directo" />
              </ManualFigure>
              <ul className="list-disc space-y-1 pl-5">
                <li>
                  <strong>Se gasta en esta OSI</strong> — honorarios, traslado,
                  impresión u otro gasto del curso. Hay que elegir la OSI. Ahí
                  aparece <strong>Estado del costo</strong> (ver Análisis de
                  costos).
                </li>
                <li>
                  <strong>Solo reponer depósito</strong> — compra para el
                  almacén de capacitación o ST, sin OSI. El reparto a cursos se
                  confirma después.
                </li>
              </ul>
              <p>
                Al elegir el servicio y la sesión (si vas por OSI), el sistema
                trae lo previsto. Si agregás de más, Estado del costo indica si
                hay que explicar o pedir sello.
              </p>
              <ManualFigure
                title="Análisis de stock junto al pedido"
                caption="Si el pedido toca inventario: cuenta Stock − Consumo + Pedido, y abajo los bloques para ajustar pedido o marcar consumo."
              >
                <DemoStockAnalisis />
              </ManualFigure>
            </>
          ),
        },
        {
          id: "manual-inventario-req",
          title: "Reponer inventario",
          body: (
            <>
              <p>
                Cuando pedís ítems del almacén (aguas, galletas, insumos de
                ejecución), debajo de la tabla aparece el análisis de stock:
                cuánto hay hoy y cuánto estás pidiendo.
              </p>
              <ManualFigure
                title="Stock junto a la requisición"
                caption="Podés subir la cantidad del pedido o registrar un consumo, sin mezclar las dos cosas."
              >
                <DemoStockAnalisis />
              </ManualFigure>
              <p>
                Si además estás armando un pedido de curso y necesitás
                reponer depósito, en el paso final podés marcar{" "}
                <strong>También reponer depósito</strong>: se crea un segundo
                documento de inventario.
              </p>
              <p>
                Para el día a día del almacén (consumo, historial, pestañas
                Serv. capacitación / Serv. técnico), abrí el{" "}
                <Link
                  href={MANUAL_INVENTARIO}
                  className="font-semibold text-sky-700 underline"
                >
                  manual de inventario
                </Link>
                .
              </p>
            </>
          ),
        },
        {
          id: "manual-analisis-costos",
          title: "Análisis de costos",
          body: (
            <p>
              En pedidos de curso/servicio, el sistema compara lo que pedís
              con lo previsto en la jornada de la OSI. Abrí cada tema para ver
              el recuadro, los cuatro estados y cuándo hay que justificar o
              pedir aprobación.
            </p>
          ),
          subsections: analisis_subsections,
        },
        {
          id: "manual-mapa-externa",
          title: "Quién tramita / procesa",
          body: (
            <>
              <p>
                Administración tramita las de curso/servicio de todos los
                departamentos (compra, seguimiento y cierre del pedido).
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
