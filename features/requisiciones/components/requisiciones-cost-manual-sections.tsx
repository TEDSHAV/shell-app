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
          Lo que pides frente a la jornada de la OSI.
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

export function operator_req_cost_sections(): Array<{
  id: string;
  title: string;
  body: ReactNode;
}> {
  return [
    {
      id: "manual-costo-operador",
      title: "Qué mira el recuadro",
      body: (
        <>
          <p>
            En una requisición <strong>externa</strong> se copia una jornada
            de la OSI: ese día, con su traslado, impresión y honorarios. El
            recuadro <strong>Estado del costo</strong> compara lo que pides
            con esa jornada, no con todos los días de la orden.
          </p>
          <Figure
            title="Así se ve al armar el pedido"
            caption="Si eliges otra OSI o cambias ítems, el recuadro se actualiza solo."
          >
            <EstadoDemo
              estado="base"
              tone="border-emerald-200 bg-emerald-50 text-emerald-950"
              headline="Base"
              detail="Sin extra respecto a la OSI. No hace falta justificación ni aprobación."
            />
          </Figure>
          <p>
            Ejemplo: el traslado de ese día estaba en {usd(20)} y lo subes a{" "}
            {usd(60)}. El extra es {usd(40)} de esa jornada.
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
            Son las mismas gradas que usa la OSI. Aquí se nombran más corto,
            porque lo que importa al pedir es si hay que explicar o si
            alguien debe sellar.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <EstadoDemo
              estado="base"
              tone="border-emerald-200 bg-emerald-50 text-emerald-950"
              headline="Base"
              detail="No hay extra. Puedes emitir sin explicar."
            />
            <EstadoDemo
              estado="moderado"
              tone="border-sky-200 bg-sky-50 text-sky-950"
              headline="Moderado"
              detail="Hay un ajuste, todavía sin justificación ni sello extra."
            />
            <EstadoDemo
              estado="riesgoso"
              tone="border-amber-200 bg-amber-50 text-amber-950"
              headline="Riesgoso"
              detail="Hay que explicar el ajuste para poder emitir."
            />
            <EstadoDemo
              estado="aprobacion"
              tone="border-rose-200 bg-rose-50 text-rose-950"
              headline="Riesgoso · sujeta a aprobación"
              detail="Además de explicar, un aprobador debe sellar el extra."
            />
          </div>
        </>
      ),
    },
    {
      id: "manual-costo-cuando",
      title: "Cuándo justificar y cuándo se espera un sello",
      body: (
        <>
          <p>
            Si el extra se queda en el mismo estado que ya tenía la OSI, no
            se vuelve a pedir la misma explicación.
          </p>
          <p>
            Hay que escribir la justificación cuando el recuadro pasa a{" "}
            <strong>Riesgoso</strong> o a{" "}
            <strong>Riesgoso · sujeta a aprobación</strong>. En el segundo
            caso, además, la solicitud queda pendiente de un aprobador.
          </p>
          <p>
            Interna no usa este recuadro: ahí aprueban coordinador y líder
            del departamento, sin comparar con una OSI.
          </p>
        </>
      ),
    },
  ];
}

export function sensitive_req_cost_sections(model: ReqCostManualModel): Array<{
  id: string;
  title: string;
  body: ReactNode;
}> {
  const just =
    model.justificacion_req <= 1
      ? "Moderado"
      : model.justificacion_req === 2
        ? "Riesgoso"
        : "Máximo";
  return [
    {
      id: "manual-costo-finanzas",
      title: "Lectura completa (finanzas, coordinador, superadmin)",
      body: (
        <>
          <p>
            OSI y requisición comparten el mismo pool. En la OSI las gradas
            se ven N0 · Base, N1 · Moderado, N2 · Riesgoso, N3 · Máximo. En
            la requisición, la última se lee como Riesgoso · sujeta a
            aprobación cuando el extra se pasa del tope que queda.
          </p>
          <Figure
            title="Mismas gradas, con los techos vigentes"
            caption={`Ejemplo con utilidad ${usd(model.utilidad_ejemplo)}. Si el catálogo cambia, estos montos se actualizan.`}
          >
            <div className="grid gap-2 sm:grid-cols-4">
              {[
                { name: "Base", hasta: usd(0), tone: "border-emerald-200 bg-emerald-50" },
                {
                  name: "Moderado",
                  hasta: `Hasta ${usd(model.cap_n1)}`,
                  tone: "border-sky-200 bg-sky-50",
                },
                {
                  name: "Riesgoso",
                  hasta: `Hasta ${usd(model.cap_n2)}`,
                  tone: "border-amber-200 bg-amber-50",
                },
                {
                  name: "Máximo",
                  hasta: `Hasta ${usd(model.cap_n3)}`,
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
            El extra se mide contra la jornada clonada. Traslado de {usd(20)}{" "}
            a {usd(60)} = extra {usd(40)}, aunque el resto de la OSI sume más.
          </p>
          <p>
            Hoy Moderado llega al {model.n1}% ({usd(model.cap_n1)}), Riesgoso
            al {model.n2}% ({usd(model.cap_n2)}) y el tope al {model.n3}% (
            {usd(model.cap_n3)}). La justificación de requisición se pide al
            subir de grada, a partir de <strong>{just}</strong>. Si el extra
            se pasa de lo que queda del tope, queda sujeta a aprobación.
          </p>
        </>
      ),
    },
  ];
}
