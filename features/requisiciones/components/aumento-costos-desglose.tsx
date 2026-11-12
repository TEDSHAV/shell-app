type Analisis = {
  extra?: number | null;
  from_pool?: number | null;
  from_colchon?: number | null;
  from_gadmin?: number | null;
  perdida?: number | null;
  gadmin_ecc?: number | null;
};

function usd(value: number | null | undefined): string {
  const amount = Number(value ?? 0);
  return `$ ${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`;
}

/**
 * De dónde sale el extra de la requisición, en el orden en que se consume:
 * utilidad (pote) → diferencial ECC-OSI → gasto administrativo de la ECC → pérdida.
 * Análisis guardados antes del cambio no traen gasto administrativo ni pérdida: no se muestran esas filas.
 */
export function AumentoCostosDesglose({ analisis, className }: { analisis: Analisis | null | undefined; className?: string }) {
  if (!analisis || !(Number(analisis.extra ?? 0) > 0)) return null;
  const tiene_gadmin = analisis.from_gadmin != null || analisis.perdida != null;
  const filas: Array<{ label: string; monto: number; tono?: string; nota?: string }> = [
    { label: "Utilidad (pote de la OSI)", monto: Number(analisis.from_pool ?? 0) },
    { label: "Diferencial ECC-OSI", monto: Number(analisis.from_colchon ?? 0) },
  ];
  if (tiene_gadmin) {
    filas.push({
      label: "Gasto administrativo",
      monto: Number(analisis.from_gadmin ?? 0),
      tono: Number(analisis.from_gadmin ?? 0) > 0 ? "text-amber-800" : undefined,
      nota: analisis.gadmin_ecc != null ? `de ${usd(analisis.gadmin_ecc)} disponibles` : undefined,
    });
    filas.push({
      label: "Pérdida (por debajo del costo)",
      monto: Number(analisis.perdida ?? 0),
      tono: Number(analisis.perdida ?? 0) > 0 ? "font-semibold text-rose-700" : undefined,
    });
  }
  return (
    <div className={`rounded-lg border bg-white/70 p-2 text-xs text-slate-800 ${className ?? ""}`}>
      <p className="mb-1 font-medium uppercase tracking-wide text-slate-500">De dónde sale el extra</p>
      <dl className="space-y-0.5">
        {filas.map((fila) => (
          <div key={fila.label} className="flex items-baseline justify-between gap-2">
            <dt>
              {fila.label}
              {fila.nota ? <span className="ml-1 text-slate-500">({fila.nota})</span> : null}
            </dt>
            <dd className={`tabular-nums ${fila.tono ?? ""}`}>{usd(fila.monto)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
