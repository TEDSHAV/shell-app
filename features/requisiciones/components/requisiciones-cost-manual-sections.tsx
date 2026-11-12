import type { ReactNode } from "react";

import {
  usd,
  type ReqCostManualModel,
} from "../lib/req-cost-analysis-manual";

function Figure({
  title,
  caption,
  children,
}: {
  title: string;
  caption: string;
  children: ReactNode;
}) {
  return (
    <figure className="space-y-2">
      <figcaption className="text-sm font-medium text-slate-800">{title}</figcaption>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        {children}
      </div>
      <p className="text-sm leading-relaxed text-slate-500">{caption}</p>
    </figure>
  );
}

function EstadoDemo({
  estado,
  tone,
  headline,
  detail,
}: {
  estado: "base" | "moderado" | "riesgoso" | "aprobacion";
  tone: string;
  headline: string;
  detail: string;
}) {
  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-3">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-700">
          Estado del costo
        </p>
        <p className="mt-0.5 text-sm text-slate-600">
          Lo que pedís frente a lo previsto en esa jornada de la OSI.
        </p>
      </div>
      <div className={`rounded-xl border p-3 text-sm ${tone}`}>
        <p className="font-semibold">{headline}</p>
        <p className="mt-1 leading-relaxed">{detail}</p>
      </div>
      {estado === "riesgoso" || estado === "aprobacion" ? (
        <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-600">
          Justificación (obligatoria)
        </div>
      ) : null}
    </div>
  );
}

export type CostManualSubsection = {
  id: string;
  title: string;
  body: ReactNode;
};

/** Desplegables que van dentro de la tarjeta «Análisis de costos». */
export function operator_analisis_costos_subsections(): CostManualSubsection[] {
  return [
    {
      id: "manual-costo-operador",
      title: "Estado del costo",
      body: (
        <>
          <p>
            Solo aparece en pedidos de <strong>curso / servicio</strong> (los
            que van con una OSI). Compara lo que estás pidiendo ahora con lo
            que ya estaba previsto para <strong>esa jornada</strong> de la
            orden — no con todos los días del servicio.
          </p>
          <p>
            Ejemplo: el traslado de ese día estaba en {usd(20)} y lo subís a{" "}
            {usd(60)}. El recuadro marca un extra de {usd(40)} de esa jornada.
            Según cuán grande sea ese extra, el nivel de la utilidad baja de
            N3 · Utilidad sana hacia N0 · Sin utilidad, y puede pedir
            justificación o aprobación.
          </p>
          <Figure
            title="Así se ve al armar el pedido"
            caption="Si elegís otra OSI o cambiás ítems, el recuadro se actualiza solo."
          >
            <EstadoDemo
              estado="base"
              tone="border-emerald-200 bg-emerald-50 text-emerald-950"
              headline="Base"
              detail="Sin extra respecto a la jornada de la OSI. Podés emitir sin explicar ni pedir sello."
            />
          </Figure>
          <p>
            La requisición <strong>interna</strong> no usa este recuadro: ahí
            aprueban coordinador y líder del departamento, sin comparar con
            una OSI.
          </p>
        </>
      ),
    },
    {
      id: "manual-costo-niveles",
      title: "Los cuatro estados",
      body: (
        <>
          <p>
            Son las mismas gradas del pool de la OSI, con nombres más cortos
            porque al pedir importa si hay que explicar o si alguien debe
            sellar.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <EstadoDemo
              estado="base"
              tone="border-emerald-200 bg-emerald-50 text-emerald-950"
              headline="N3 · Utilidad sana"
              detail="No hay extra. Podés emitir sin explicar."
            />
            <EstadoDemo
              estado="moderado"
              tone="border-sky-200 bg-sky-50 text-sky-950"
              headline="Con extra · sin bajar de nivel"
              detail="Hay un ajuste chico; la utilidad no baja de nivel, sin justificación ni sello."
            />
            <EstadoDemo
              estado="riesgoso"
              tone="border-amber-200 bg-amber-50 text-amber-950"
              headline="N2 · En alerta · con justificación"
              detail="El extra baja el nivel de la utilidad: hay que explicar el ajuste para poder emitir."
            />
            <EstadoDemo
              estado="aprobacion"
              tone="border-rose-200 bg-rose-50 text-rose-950"
              headline="N0 · Sin utilidad · sujeta a aprobación"
              detail="Se pasó del pote que queda: además de explicar, un aprobador debe sellar el extra."
            />
          </div>
        </>
      ),
    },
    {
      id: "manual-costo-cuando",
      title: "Cuándo justificar y cuándo se espera aprobación",
      body: (
        <>
          <p>
            Si el extra deja la utilidad en el <strong>mismo nivel</strong> que
            ya tenía la OSI, no se vuelve a pedir la misma explicación.
          </p>
          <p>
            Hay que escribir la justificación cuando el extra{" "}
            <strong>baja el nivel</strong> de la utilidad hasta el umbral del
            catálogo, o cuando queda <strong>sujeta a aprobación</strong>.
          </p>
          <p>
            En el segundo caso, además de explicar, la solicitud queda
            pendiente de un aprobador antes de seguir el trámite.
          </p>
        </>
      ),
    },
  ];
}

export function sensitive_analisis_costos_subsection(
  model: ReqCostManualModel,
): CostManualSubsection {
  const just =
    model.justificacion_req >= 3
      ? "N3 · Utilidad sana"
      : model.justificacion_req === 2
        ? "N2 · En alerta"
        : model.justificacion_req === 1
          ? "N1 · En riesgo"
          : "N0 · Sin utilidad";
  return {
    id: "manual-costo-finanzas",
    title: "Análisis de costos OSI + ECC",
    body: (
      <>
        <p>
          OSI y requisición comparten el mismo pool y los mismos niveles: N3 ·
          Utilidad sana, N2 · En alerta, N1 · En riesgo y N0 · Sin utilidad.
          En la requisición, N0 queda sujeta a aprobación cuando el extra se
          pasa del pote que queda.
        </p>
        <Figure
          title="Mismas gradas, con los techos vigentes"
          caption={`Ejemplo con utilidad ${usd(model.utilidad_ejemplo)}. Si el catálogo cambia, estos montos se actualizan.`}
        >
          <div className="grid gap-2 sm:grid-cols-4">
            {[
              {
                name: "N3 · Utilidad sana",
                hasta: `Consumo hasta ${usd(model.cap_n1)}`,
                tone: "border-emerald-200 bg-emerald-50",
              },
              {
                name: "N2 · En alerta",
                hasta: `Hasta ${usd(model.cap_n2)}`,
                tone: "border-amber-200 bg-amber-50",
              },
              {
                name: "N1 · En riesgo",
                hasta: `Hasta ${usd(model.cap_n3)}`,
                tone: "border-orange-200 bg-orange-50",
              },
              {
                name: "N0 · Sin utilidad",
                hasta: `Más de ${usd(model.cap_n3)}`,
                tone: "border-rose-200 bg-rose-50",
              },
            ].map((card) => (
              <div
                key={card.name}
                className={`rounded-xl border px-2.5 py-2.5 text-sm ${card.tone}`}
              >
                <p className="font-semibold">{card.name}</p>
                <p className="opacity-80">{card.hasta}</p>
              </div>
            ))}
          </div>
        </Figure>
        <p>
          El extra se mide contra la jornada clonada. Traslado de {usd(20)} a{" "}
          {usd(60)} = extra {usd(40)}, aunque el resto de la OSI sume más.
        </p>
        <p>
          Hoy N3 llega al {model.n1}% ({usd(model.cap_n1)}), N2 al{" "}
          {model.n2}% ({usd(model.cap_n2)}) y N1 al {model.n3}% (
          {usd(model.cap_n3)}); más allá es N0. La justificación de
          requisición se pide al bajar de nivel, desde <strong>{just}</strong>
          hacia abajo. Si el extra se
          pasa de lo que queda del tope, queda sujeta a aprobación.
        </p>
      </>
    ),
  };
}

/** @deprecated Usar operator_analisis_costos_subsections — se mantiene por compat. */
export function operator_req_cost_sections() {
  return operator_analisis_costos_subsections();
}

/** @deprecated Usar sensitive_analisis_costos_subsection */
export function sensitive_req_cost_sections(model: ReqCostManualModel) {
  return [sensitive_analisis_costos_subsection(model)];
}
