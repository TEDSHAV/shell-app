"use client";

import { createContext, useContext } from "react";
import { Award, Building2, ExternalLink, MapPin, Receipt, ReceiptText } from "lucide-react";

import { estatus_factura, etiqueta_factura, se_puede_facturar } from "../lib/factura";
import { url_factura, url_facturar } from "../lib/negocios-url";
import type { EventoCalendario } from "../lib/types";

/**
 * Indicadores de la OSI en las tarjetas. Dos tamaños:
 *  - «icono»: solo el ícono con su título (grilla del mes, donde no cabe texto);
 *  - «etiqueta»: ícono y texto (semana, día, detalle y agenda).
 */
type Variante = "icono" | "etiqueta";

/** Permiso osis:facturar del usuario; lo provee CalendarioServicios. */
export const PuedeFacturarContext = createContext(false);

const no_propagar = (e: React.SyntheticEvent) => e.stopPropagation();

/** Dónde se dicta: «SHA» si es en las instalaciones; si no, la ciudad de la dirección de ejecución. */
export function UbicacionSesion({ evento, className = "" }: { evento: EventoCalendario; className?: string }) {
  if (evento.en_sha) {
    return (
      <span className={`inline-flex min-w-0 items-center gap-1 text-sky-800 ${className}`} title="Se dicta en las instalaciones de SHA">
        <Building2 className="h-3 w-3 shrink-0" />
        <span className="truncate font-medium">{evento.salon ? `En SHA · ${evento.salon}` : "En SHA"}</span>
      </span>
    );
  }
  if (!evento.ciudad) return null;
  return (
    <span className={`inline-flex min-w-0 items-center gap-1 ${className}`} title={`Se ejecuta en ${evento.ciudad}`}>
      <MapPin className="h-3 w-3 shrink-0 text-slate-400" />
      <span className="truncate">{evento.ciudad}</span>
    </span>
  );
}

export function IndicadorCertificado({ evento, variante }: { evento: EventoCalendario; variante: Variante }) {
  const n = evento.certificados;
  if (n <= 0) return null;
  const titulo = n === 1 ? "1 certificado listo" : `${n} certificados listos`;
  if (variante === "icono") {
    return (
      <span title={titulo} aria-label={titulo} className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-300 text-amber-900 ring-1 ring-amber-400/60">
        <Award className="h-3 w-3" strokeWidth={2.5} />
      </span>
    );
  }
  return (
    <span title={titulo} className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-900 ring-1 ring-amber-300">
      <Award className="h-3 w-3" />
      Certificado listo{n > 1 ? ` · ${n}` : ""}
    </span>
  );
}

/**
 * Facturada: enlace a la solicitud de factura (otra pestaña).
 * Sin facturar y con permiso: botón «Facturar», que abre la solicitud nueva con el presupuesto de la OSI.
 */
export function BotonFactura({ evento, variante }: { evento: EventoCalendario; variante: Variante }) {
  const puedeFacturar = useContext(PuedeFacturarContext);
  const f = evento.factura;
  if (f) {
    const estatus = estatus_factura(f);
    const titulo = `${etiqueta_factura(f)}${estatus ? ` · ${estatus}` : ""}. Abrir en otra pestaña`;
    return (
      <a
        href={url_factura(f.id_solicitud)}
        target="_blank"
        rel="noopener noreferrer"
        onClick={no_propagar}
        onKeyDown={no_propagar}
        draggable={false}
        title={titulo}
        aria-label={titulo}
        className={
          variante === "icono"
            ? "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white transition hover:bg-emerald-700"
            : "inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-600 px-2 py-0.5 text-[11px] font-semibold text-white transition hover:bg-emerald-700"
        }
      >
        <ReceiptText className="h-3 w-3" strokeWidth={2.5} />
        {variante === "etiqueta" ? (
          <>
            <span className="truncate">{f.nro_factura?.trim() ? `Facturada · ${f.nro_factura.trim()}` : "En facturación"}</span>
            <ExternalLink className="h-3 w-3 shrink-0 opacity-80" />
          </>
        ) : null}
      </a>
    );
  }
  if (!se_puede_facturar(evento, puedeFacturar) || evento.id_presupuesto == null) return null;
  // En la grilla del mes («icono») solo aparece al pasar el mouse, para no repetirlo en cada tarjeta.
  const titulo = "Facturar: abre la solicitud de factura en Negocios (otra pestaña)";
  return (
    <a
      href={url_facturar(evento.id_presupuesto)}
      target="_blank"
      rel="noopener noreferrer"
      onClick={no_propagar}
      onKeyDown={no_propagar}
      draggable={false}
      title={titulo}
      aria-label={titulo}
      className={
        variante === "icono"
          ? "hidden h-5 w-5 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-600 transition hover:border-emerald-500 hover:text-emerald-700 focus-visible:inline-flex group-hover:inline-flex group-focus-within:inline-flex"
          : "inline-flex shrink-0 items-center gap-1 rounded-full border border-slate-300 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-700 transition hover:border-emerald-500 hover:text-emerald-700"
      }
    >
      <Receipt className="h-3 w-3" strokeWidth={2.5} />
      {variante === "etiqueta" ? "Facturar" : null}
    </a>
  );
}
