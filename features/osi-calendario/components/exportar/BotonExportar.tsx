"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Download, FileImage, FileText, Loader2 } from "lucide-react";

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { descargar, type DatosExportacion } from "../../lib/exportar";
import VistaExportacion from "./VistaExportacion";

type BotonExportarProps = {
  /** Se arma al exportar, con el periodo y los filtros del momento. */
  obtenerDatos: () => DatosExportacion;
  /** Nombre del archivo sin extensión. */
  archivo: string;
  onError: (mensaje: string) => void;
};

/**
 * Exportar: PNG con el calendario completo (todas las sesiones de cada día) o
 * PDF con el calendario y la tabla de servicios. Respeta el periodo y los filtros visibles.
 */
export default function BotonExportar({ obtenerDatos, archivo, onError }: BotonExportarProps) {
  const [generando, set_generando] = useState<"png" | "pdf" | null>(null);
  // Datos que se dibujan fuera de pantalla para la captura del PNG.
  const [para_png, set_para_png] = useState<DatosExportacion | null>(null);
  const nodo = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!para_png) return;
    let vivo = true;
    // Un cuadro para que el navegador pinte la vista antes de capturarla.
    requestAnimationFrame(async () => {
      try {
        const { toPng } = await import("html-to-image");
        if (!nodo.current || !vivo) return;
        const url = await toPng(nodo.current, { pixelRatio: 2, backgroundColor: "#ffffff", cacheBust: true });
        descargar(url, `${archivo}.png`);
      } catch (e) {
        console.error("Error exportando PNG del calendario:", e);
        onError("No se pudo generar la imagen del calendario");
      } finally {
        if (vivo) {
          set_para_png(null);
          set_generando(null);
        }
      }
    });
    return () => {
      vivo = false;
    };
  }, [para_png]); // eslint-disable-line react-hooks/exhaustive-deps

  const exportar_png = () => {
    set_generando("png");
    set_para_png(obtenerDatos());
  };

  const exportar_pdf = async () => {
    set_generando("pdf");
    try {
      const [{ pdf }, { CalendarioPdfDocument }] = await Promise.all([import("@react-pdf/renderer"), import("./CalendarioPdf")]);
      const blob = await pdf(<CalendarioPdfDocument datos={obtenerDatos()} />).toBlob();
      const url = URL.createObjectURL(blob);
      descargar(url, `${archivo}.pdf`);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      console.error("Error exportando PDF del calendario:", e);
      onError("No se pudo generar el PDF del calendario");
    } finally {
      set_generando(null);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            disabled={!!generando}
            title="Exportar el calendario"
            className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-[15px] font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
          >
            {generando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            <span className="hidden sm:inline">{generando ? "Generando…" : "Exportar"}</span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuItem onSelect={exportar_png} className="flex items-start gap-2 py-2">
            <FileImage className="mt-0.5 h-4 w-4 text-slate-500" />
            <span>
              <span className="block text-sm font-medium">Imagen PNG</span>
              <span className="block text-xs text-slate-500">El calendario completo, con todas las sesiones</span>
            </span>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => void exportar_pdf()} className="flex items-start gap-2 py-2">
            <FileText className="mt-0.5 h-4 w-4 text-slate-500" />
            <span>
              <span className="block text-sm font-medium">PDF</span>
              <span className="block text-xs text-slate-500">El calendario y la tabla de servicios</span>
            </span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {para_png
        ? createPortal(
            <div aria-hidden style={{ position: "fixed", left: -100000, top: 0, pointerEvents: "none" }}>
              <VistaExportacion ref={nodo} datos={para_png} />
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
