"use client";

import type {
  OsiBadgeTone,
  OsiRecursosLayout,
  OsiVariacionCelda,
} from "./osi-recursos-layout";

function badge_class(tone: OsiBadgeTone): string {
  const base =
    "inline-flex max-w-full items-center justify-center gap-0.5 rounded " +
    "px-1.5 py-0.5 text-[10px] font-semibold whitespace-nowrap";
  if (tone === "up") {
    return `${base} bg-amber-100 text-amber-950 ring-1 ring-amber-300/80`;
  }
  return `${base} bg-sky-100 text-sky-950 ring-1 ring-sky-300/80`;
}

function CellValue({
  celda,
  allow_badge,
}: {
  celda: OsiVariacionCelda;
  allow_badge: boolean;
}) {
  if (celda.texto === "N/A") {
    return <span className="text-[10px] text-slate-500">N/A</span>;
  }
  // TOTAL SESIÓN y tonos base: siempre texto plano.
  if (!allow_badge || celda.tone === "base") {
    return (
      <span className="text-[10px] font-medium tabular-nums text-slate-900 whitespace-nowrap">
        {celda.texto}
      </span>
    );
  }
  const arrow = celda.tone === "up" ? "↗" : "↘";
  return (
    <span className={badge_class(celda.tone)}>
      <span className="tabular-nums">{celda.texto}</span>
      <span aria-hidden="true">{arrow}</span>
    </span>
  );
}

function format_footer_money(value: number | undefined): string {
  if (value == null || !(value > 0)) return "N/A";
  return `$${value.toFixed(2)}`;
}

/**
 * Daily detail table: every session cost column + TOTALES footer
 * that mirrors the upper resumen 1:1.
 */
export function OsiRecursosVariacionesTable({
  layout,
}: {
  layout: OsiRecursosLayout;
}) {
  const columnas = layout.variacionColumnas;
  const filas = layout.variaciones;
  const footer = layout.variacionTotales;
  if (columnas.length === 0 || filas.length === 0) return null;

  return (
    <table className="w-full border-collapse [&_td]:border [&_td]:border-slate-400 [&_th]:border [&_th]:border-slate-400">
      <thead>
        <tr className="bg-slate-100">
          {columnas.map((col) => (
            <th
              key={col.key}
              className="px-1.5 py-1.5 text-center text-[9px] font-bold uppercase leading-tight tracking-tight text-slate-700"
            >
              {col.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {filas.map((fila, idx) => {
          const nro = fila.nroSesion ? `Sesión ${fila.nroSesion}` : "Sesión";
          const fecha = fila.fecha ? ` (${fila.fecha})` : "";
          return (
            <tr key={`osi-var-row-${idx}`} className="align-middle">
              {columnas.map((col) => {
                if (col.key === "sesion") {
                  return (
                    <td
                      key={col.key}
                      className="px-1.5 py-1.5 text-left text-[10px] font-semibold leading-snug"
                    >
                      {nro}
                      {fecha}
                    </td>
                  );
                }
                const celda = fila.celdas[col.key];
                return (
                  <td key={col.key} className="px-1.5 py-1.5 text-center">
                    {celda ? (
                      <CellValue
                        celda={celda}
                        allow_badge={col.key !== "total_sesion"}
                      />
                    ) : (
                      "N/A"
                    )}
                  </td>
                );
              })}
            </tr>
          );
        })}
        <tr className="bg-slate-50 font-bold">
          {columnas.map((col) => {
            if (col.key === "sesion") {
              return (
                <td
                  key={col.key}
                  className="px-1.5 py-1.5 text-left text-[10px] uppercase"
                >
                  Totales
                </td>
              );
            }
            const amount = footer[col.key];
            return (
              <td
                key={col.key}
                className="px-1.5 py-1.5 text-center text-[10px] tabular-nums"
              >
                {format_footer_money(amount)}
              </td>
            );
          })}
        </tr>
      </tbody>
    </table>
  );
}
