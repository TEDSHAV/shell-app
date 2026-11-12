import { AlertCircle, CheckCircle2, X } from "lucide-react";

/** Aviso en línea del calendario: resultado de una acción (ok) o un error (por ejemplo, al exportar). */
export default function Aviso({ tipo, texto, onCerrar }: { tipo: "ok" | "error"; texto: string; onCerrar: () => void }) {
  const ok = tipo === "ok";
  const Icono = ok ? CheckCircle2 : AlertCircle;
  return (
    <div className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm ${ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`} role={ok ? "status" : "alert"}>
      <Icono className="h-4 w-4 shrink-0" />
      <span className="min-w-0 flex-1">{texto}</span>
      <button type="button" onClick={onCerrar} aria-label="Cerrar aviso" className={`rounded p-0.5 ${ok ? "hover:bg-emerald-100" : "hover:bg-red-100"}`}>
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
