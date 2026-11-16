"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { buildFrameUrl } from "@/lib/frame-url";

/** Por debajo de esto el marco está vacío (el usuario no tiene permisos para ninguna tarjeta). */
const ALTO_VACIO = 24;
const ALTO_INICIAL = 320;

/**
 * Las tarjetas reales de Presupuesto mensual (Nómina, APU y Presupuesto) dentro del inicio de
 * Administración. Salen de la propia app, con sus mismos cálculos y permisos: Shell solo las muestra.
 * La app avisa su alto (SHA_WIDGET_HEIGHT) y manda los clics a Shell (SHELL_NAVIGATE).
 */
export function PresupuestoWidgetsFrame() {
  const marco = useRef<HTMLIFrameElement>(null);
  const [alto, setAlto] = useState(ALTO_INICIAL);
  const src = useMemo(() => buildFrameUrl("presupuesto-mensual", "widgets"), []);

  useEffect(() => {
    const al_mensaje = (event: MessageEvent) => {
      if (event.source !== marco.current?.contentWindow) return;
      if (event.data?.type !== "SHA_WIDGET_HEIGHT") return;
      const siguiente = Number(event.data.height);
      if (Number.isFinite(siguiente) && siguiente >= 0) setAlto(Math.ceil(siguiente));
    };
    window.addEventListener("message", al_mensaje);
    return () => window.removeEventListener("message", al_mensaje);
  }, []);

  const vacio = alto <= ALTO_VACIO;
  return (
    <section aria-label="Nómina, APU y presupuesto" className={vacio ? "hidden" : undefined}>
      <div className="mb-3 px-1">
        <h2 className="m-0 text-base font-semibold text-slate-900">
          Presupuesto mensual
        </h2>
        <p className="m-0 text-[13px] text-slate-500">
          Cómo va la nómina, el APU y el presupuesto de este mes.
        </p>
      </div>
      <iframe
        ref={marco}
        src={src}
        title="Presupuesto mensual: nómina, APU y presupuesto"
        scrolling="no"
        className="block w-full border-0 bg-transparent"
        style={{ height: alto }}
      />
    </section>
  );
}
