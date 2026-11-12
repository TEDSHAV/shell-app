"use client";

import { useState } from "react";

import PopoverFiltro, { coincide, OpcionFiltro, SinResultados } from "./PopoverFiltro";

type ListaBuscableProps = {
  /** Texto sin valor: "Todas las ciudades". */
  vacio: string;
  icono: React.ReactNode;
  valor: string;
  opciones: Array<{ valor: string; etiqueta: string }>;
  onChange: (valor: string) => void;
  buscar: string;
};

/** Lista con buscador para un filtro de un solo valor (tipo, ejecutivo, ciudad). */
export default function ListaBuscable({ vacio, icono, valor, opciones, onChange, buscar }: ListaBuscableProps) {
  const [texto, set_texto] = useState("");
  const elegida = opciones.find((o) => o.valor === valor);
  const lista = opciones.filter((o) => !texto.trim() || coincide(o.etiqueta, texto));

  return (
    <PopoverFiltro vacio={vacio} valor={elegida?.etiqueta ?? null} icono={icono} onLimpiar={() => onChange("")} buscar={buscar} texto={texto} onTexto={set_texto}>
      {(cerrar) => (
        <>
          {!texto.trim() ? (
            <OpcionFiltro
              activa={!valor}
              onClick={() => {
                onChange("");
                cerrar();
              }}
            >
              {vacio}
            </OpcionFiltro>
          ) : null}
          {lista.map((o) => (
            <OpcionFiltro
              key={o.valor}
              activa={o.valor === valor}
              onClick={() => {
                onChange(o.valor);
                cerrar();
              }}
            >
              {o.etiqueta}
            </OpcionFiltro>
          ))}
          {lista.length === 0 ? <SinResultados /> : null}
        </>
      )}
    </PopoverFiltro>
  );
}
