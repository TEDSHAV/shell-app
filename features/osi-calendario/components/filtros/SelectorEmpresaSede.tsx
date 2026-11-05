"use client";

import { useState } from "react";
import { Building, ChevronLeft, ChevronRight } from "lucide-react";

import type { EmpresaOpcion } from "../../lib/filtros";
import PopoverFiltro, { coincide, OpcionFiltro, SinResultados } from "./PopoverFiltro";

type SelectorEmpresaSedeProps = {
  empresa: string;
  sede: string;
  empresas: EmpresaOpcion[];
  onChange: (empresa: string, sede: string) => void;
};

/**
 * Empresa y sede en un solo filtro. Al elegir una empresa con sedes, la lista pasa a sus sedes
 * («Todas las sedes» o una); si la empresa no tiene sedes, se elige y se cierra.
 */
export default function SelectorEmpresaSede({ empresa, sede, empresas, onChange }: SelectorEmpresaSedeProps) {
  const [texto, set_texto] = useState("");
  // Empresa cuyas sedes se están mostrando (segundo paso).
  const [paso_sedes, set_paso_sedes] = useState<EmpresaOpcion | null>(null);
  const valor = empresa ? (sede ? `${empresa} · ${sede}` : empresa) : null;

  return (
    <PopoverFiltro
      vacio="Todas las empresas"
      valor={valor}
      icono={<Building className="h-4 w-4" />}
      onLimpiar={() => onChange("", "")}
      buscar={paso_sedes ? `Buscar sede de ${paso_sedes.empresa}` : "Buscar empresa"}
      texto={texto}
      onTexto={set_texto}
      onCerrar={() => set_paso_sedes(null)}
      ancho="sm:w-[26rem]"
    >
      {(cerrar) => {
        if (paso_sedes) {
          const sedes = paso_sedes.sedes.filter((s) => !texto.trim() || coincide(s, texto));
          return (
            <>
              <button
                type="button"
                onClick={() => {
                  set_paso_sedes(null);
                  set_texto("");
                }}
                className="flex w-full items-center gap-1 border-b border-slate-100 px-3 py-2 text-left text-xs font-medium text-slate-500 hover:bg-slate-50"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Empresas
              </button>
              <p className="px-3 pb-1 pt-2 text-xs font-semibold text-slate-900">{paso_sedes.empresa}</p>
              {!texto.trim() ? (
                <OpcionFiltro
                  activa={empresa === paso_sedes.empresa && !sede}
                  onClick={() => {
                    onChange(paso_sedes.empresa, "");
                    cerrar();
                  }}
                >
                  Todas las sedes
                </OpcionFiltro>
              ) : null}
              {sedes.map((s) => (
                <OpcionFiltro
                  key={s}
                  activa={empresa === paso_sedes.empresa && sede === s}
                  onClick={() => {
                    onChange(paso_sedes.empresa, s);
                    cerrar();
                  }}
                >
                  {s}
                </OpcionFiltro>
              ))}
              {sedes.length === 0 ? <SinResultados /> : null}
            </>
          );
        }

        const lista = empresas.filter((e) => !texto.trim() || coincide(e.empresa, texto) || e.sedes.some((s) => coincide(s, texto)));
        return (
          <>
            {!texto.trim() ? (
              <OpcionFiltro
                activa={!empresa}
                onClick={() => {
                  onChange("", "");
                  cerrar();
                }}
              >
                Todas las empresas
              </OpcionFiltro>
            ) : null}
            {lista.map((e) => (
              <OpcionFiltro
                key={e.empresa}
                activa={e.empresa === empresa}
                onClick={() => {
                  if (e.sedes.length === 0) {
                    onChange(e.empresa, "");
                    cerrar();
                    return;
                  }
                  // Con sedes: se filtra ya por la empresa y se ofrecen sus sedes.
                  onChange(e.empresa, "");
                  set_paso_sedes(e);
                  set_texto("");
                }}
                extra={
                  e.sedes.length ? (
                    <span className="inline-flex shrink-0 items-center gap-0.5 text-xs text-slate-400">
                      {e.sedes.length} {e.sedes.length === 1 ? "sede" : "sedes"}
                      <ChevronRight className="h-3.5 w-3.5" />
                    </span>
                  ) : null
                }
              >
                {e.empresa}
              </OpcionFiltro>
            ))}
            {lista.length === 0 ? <SinResultados /> : null}
          </>
        );
      }}
    </PopoverFiltro>
  );
}
