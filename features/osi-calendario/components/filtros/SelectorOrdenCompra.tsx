"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { FileText, Loader2 } from "lucide-react";

import { getOrdenesCompra, type OrdenCompraOpcion } from "../../actions/oc-actions";
import { fecha_corta } from "../../lib/mes-grid";
import PopoverFiltro, { coincide, SinResultados } from "./PopoverFiltro";

type SelectorOrdenCompraProps = {
  valor: string;
  onChange: (numero: string) => void;
  /** Sesiones por N° de OC en el periodo visible (para ordenar y mostrar cuántas hay). */
  enPeriodo: Map<string, number>;
};

/**
 * Filtro por orden de compra: todas las OC con sus presupuestos y un buscador
 * (N° de OC, N° de presupuesto o empresa). Las que tienen sesiones en el periodo van primero.
 * La lista se pide la primera vez que se abre.
 */
export default function SelectorOrdenCompra({ valor, onChange, enPeriodo }: SelectorOrdenCompraProps) {
  const [texto, set_texto] = useState("");
  const [ocs, set_ocs] = useState<OrdenCompraOpcion[] | null>(null);
  const [error, set_error] = useState<string | null>(null);

  return (
    <PopoverFiltro
      vacio="Orden de compra"
      valor={valor ? `OC ${valor}` : null}
      icono={<FileText className="h-4 w-4" />}
      onLimpiar={() => onChange("")}
      buscar="N° de OC, presupuesto o empresa"
      texto={texto}
      onTexto={set_texto}
      ancho="sm:w-[24rem]"
    >
      {(cerrar) => (
        <ListaOrdenes
          ocs={ocs}
          error={error}
          onCargada={(r) => (r.ok ? set_ocs(r.data) : set_error(r.error))}
          texto={texto}
          valor={valor}
          enPeriodo={enPeriodo}
          onElegir={(numero) => {
            onChange(numero);
            cerrar();
          }}
        />
      )}
    </PopoverFiltro>
  );
}

function ListaOrdenes({ ocs, error, onCargada, texto, valor, enPeriodo, onElegir }: {
  ocs: OrdenCompraOpcion[] | null;
  error: string | null;
  onCargada: (r: Awaited<ReturnType<typeof getOrdenesCompra>>) => void;
  texto: string;
  valor: string;
  enPeriodo: Map<string, number>;
  onElegir: (numero: string) => void;
}) {
  const [cargando, iniciar] = useTransition();

  useEffect(() => {
    if (ocs || error) return;
    iniciar(async () => onCargada(await getOrdenesCompra()));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const lista = useMemo(() => {
    const filtradas = (ocs ?? []).filter(
      (oc) => !texto.trim() || coincide(oc.numero, texto) || oc.presupuestos.some((p) => coincide(`${p.nro_presupuesto ?? ""} ${p.empresa ?? ""}`, texto)),
    );
    return filtradas.sort((a, b) => Number((enPeriodo.get(b.numero) ?? 0) > 0) - Number((enPeriodo.get(a.numero) ?? 0) > 0));
  }, [ocs, texto, enPeriodo]);

  if (cargando || (!ocs && !error)) {
    return (
      <p className="flex items-center justify-center gap-2 py-8 text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Cargando órdenes de compra…
      </p>
    );
  }
  if (error) return <p className="px-3 py-6 text-center text-sm text-red-600">{error}</p>;
  if (lista.length === 0) return <SinResultados texto="Ninguna orden de compra coincide." />;

  return (
    <ul className="divide-y divide-slate-100">
      {lista.map((oc) => {
        const n = enPeriodo.get(oc.numero) ?? 0;
        return (
          <li key={oc.numero}>
            <button
              type="button"
              onClick={() => onElegir(oc.numero)}
              className={`flex w-full flex-col gap-1 px-3 py-2.5 text-left transition hover:bg-slate-50 ${oc.numero === valor ? "bg-sky-50" : ""}`}
            >
              <span className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-900">OC {oc.numero}</span>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${n ? "bg-sky-100 text-sky-800" : "bg-slate-100 text-slate-400"}`}>
                  {n ? `${n} en el periodo` : "Sin sesiones en el periodo"}
                </span>
              </span>
              <span className="flex flex-col gap-0.5">
                {oc.presupuestos.map((p) => (
                  <span key={p.id} className="truncate text-xs text-slate-500">
                    Presupuesto {p.nro_presupuesto ?? p.id}
                    {p.empresa ? ` · ${p.empresa}` : ""}
                  </span>
                ))}
              </span>
              {oc.fecha ? <span className="text-[11px] text-slate-400">Registrada el {fecha_corta(oc.fecha)}</span> : null}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
