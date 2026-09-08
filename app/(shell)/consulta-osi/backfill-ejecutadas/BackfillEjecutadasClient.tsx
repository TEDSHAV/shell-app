"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  findBackfillCandidates,
  backfillEjecutadas,
  createSingleSessionAndMarkEjecutada,
  type BackfillCandidate,
  type BackfillReport,
} from "./actions";

type SingleResult = { pending?: boolean; success?: boolean; error?: string };

export default function BackfillEjecutadasClient() {
  const [days, setDays] = useState<number>(30);
  const [searching, setSearching] = useState(false);
  const [candidates, setCandidates] = useState<BackfillCandidate[] | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [report, setReport] = useState<BackfillReport | null>(null);
  const [singleResults, setSingleResults] = useState<Record<number, SingleResult>>({});

  const handleSearch = async () => {
    if (searching) return;
    setSearching(true);
    setSearchError(null);
    setCandidates(null);
    setReport(null);
    setSingleResults({});
    try {
      const res = await findBackfillCandidates(days);
      if (res.error) {
        setSearchError(res.error);
      } else {
        setCandidates(res.data ?? []);
      }
    } catch (err) {
      console.error("Search failed:", err);
      setSearchError(err instanceof Error ? err.message : "Error al buscar");
    } finally {
      setSearching(false);
    }
  };

  const handleRun = async () => {
    if (running || !candidates || candidates.length === 0) return;
    setRunning(true);
    setSingleResults({});
    try {
      const ids = candidates.map((c) => c.osiId);
      setReport(await backfillEjecutadas(ids));
    } catch (err) {
      console.error("Backfill failed:", err);
      alert(err instanceof Error ? err.message : "Error al ejecutar el backfill");
    } finally {
      setRunning(false);
    }
  };

  const handleCreateSingleSession = async (osiId: number, nroOsi: number) => {
    setSingleResults((prev) => ({ ...prev, [osiId]: { pending: true } }));
    try {
      const result = await createSingleSessionAndMarkEjecutada(osiId);
      setSingleResults((prev) => ({ ...prev, [osiId]: result }));
      if (result.success) {
        setReport((prev) => {
          if (!prev) return prev;
          const moved = prev.noSessions.find((n) => n.osiId === osiId);
          return {
            ...prev,
            processed: moved
              ? [...prev.processed, { nroOsi, osiId, sesiones: 1 }].sort(
                  (a, b) => a.nroOsi - b.nroOsi,
                )
              : prev.processed,
            noSessions: prev.noSessions.filter((n) => n.osiId !== osiId),
          };
        });
      }
    } catch (err) {
      setSingleResults((prev) => ({
        ...prev,
        [osiId]: { error: err instanceof Error ? err.message : "Error" },
      }));
    }
  };

  const totalSesiones = report?.processed.reduce((sum, p) => sum + p.sesiones, 0) ?? 0;

  return (
    <div className="h-full overflow-auto p-4 sm:p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">
          Backfill: Marcar OSIs legacy como Ejecutadas
        </h1>
        <p className="mt-1 text-sm text-gray-600 max-w-3xl">
          Busca OSIs de capacitación antiguas con sesiones pendientes y márcalas
          como <strong>Ejecutadas</strong> con{" "}
          <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">
            fecha_ejecutada = fecha_planificada
          </code>
          . Esto evita que aparezcan como pendientes o arrastradas de meses
          anteriores en los indicadores de la app de Capacitación.
        </p>
        <p className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2 max-w-3xl">
          ⚠️ Herramienta de desarrollo. Idempotente (se puede re-ejecutar sin
          riesgo). No disponible en producción.
        </p>
      </div>

      {/* ── Step 1: Search ─────────────────────────────────────────────── */}
      <div className="mb-6 max-w-md">
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Antigüedad mínima (días)
        </label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={1}
            max={3650}
            value={days}
            onChange={(e) => setDays(parseInt(e.target.value, 10) || 0)}
            className="w-32 px-3 py-1.5 border border-gray-200 rounded-lg text-sm"
            placeholder="30"
          />
          <Button onClick={() => void handleSearch()} disabled={searching || days <= 0}>
            {searching ? "Buscando..." : "Buscar OSIs candidatas"}
          </Button>
        </div>
        <p className="mt-1 text-xs text-gray-500">
          Devuelve OSIs cuya última fecha planificada es al menos esta antigua
          y que aún no están totalmente ejecutadas.
        </p>
      </div>

      {searchError && (
        <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3 max-w-3xl">
          {searchError}
        </div>
      )}

      {/* ── Step 2: Review ─────────────────────────────────────────────── */}
      {candidates && (
        <div className="mb-6">
          <div className="flex items-center justify-between gap-3 mb-3">
            <h2 className="text-sm font-semibold text-gray-700">
              OSIs candidatas ({candidates.length})
            </h2>
            {candidates.length > 0 && (
              <Button onClick={() => void handleRun()} disabled={running}>
                {running
                  ? "Procesando..."
                  : `Marcar ${candidates.length} OSI${candidates.length === 1 ? "" : "s"} como ejecutadas`}
              </Button>
            )}
          </div>

          {candidates.length === 0 ? (
            <p className="text-sm text-gray-500">
              No se encontraron OSIs candidatas con esa antigüedad.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border border-gray-200 rounded-lg">
                <thead className="bg-gray-50">
                  <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    <th className="px-3 py-2">N° OSI</th>
                    <th className="px-3 py-2">Empresa</th>
                    <th className="px-3 py-2">Última fecha planificada</th>
                    <th className="px-3 py-2 text-center">Sesiones</th>
                    <th className="px-3 py-2 text-right">Días antig.</th>
                    <th className="px-3 py-2">Estatus</th>
                  </tr>
                </thead>
                <tbody>
                  {candidates.map((c) => (
                    <tr key={c.osiId} className="border-t border-gray-100">
                      <td className="px-3 py-2 font-mono font-medium text-gray-900">
                        {c.nroOsi}
                      </td>
                      <td className="px-3 py-2 text-gray-600 truncate max-w-[200px]">
                        {c.empresa ?? "—"}
                      </td>
                      <td className="px-3 py-2 text-gray-600 tabular-nums">
                        {c.fechaPlanificada ?? "—"}
                      </td>
                      <td className="px-3 py-2 text-center tabular-nums text-gray-600">
                        {c.sesionesEjecutadas}/{c.sesionesTotal}
                        {!c.hasSessionData && (
                          <span className="ml-1 text-amber-600" title="Sin filas en osi_sesion">
                            ⚠
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        <span
                          className={
                            c.diasAntiguedad > 90
                              ? "text-red-600 font-semibold"
                              : c.diasAntiguedad > 30
                                ? "text-amber-600 font-medium"
                                : "text-gray-700"
                          }
                        >
                          {c.diasAntiguedad}d
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-600">
                        {c.estatus}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Step 3: Result ─────────────────────────────────────────────── */}
      {report && (
        <div className="space-y-4 max-w-4xl">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-lg border border-green-200 bg-green-50 p-3">
              <p className="text-2xl font-bold text-green-700">
                {report.processed.length}
              </p>
              <p className="text-xs text-green-700 font-medium">
                Procesadas ({totalSesiones} sesiones)
              </p>
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="text-2xl font-bold text-amber-700">
                {report.noSessions.length}
              </p>
              <p className="text-xs text-amber-700 font-medium">Sin sesiones</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
              <p className="text-2xl font-bold text-gray-700">
                {report.notFound.length}
              </p>
              <p className="text-xs text-gray-700 font-medium">No encontradas</p>
            </div>
            <div className="rounded-lg border border-red-200 bg-red-50 p-3">
              <p className="text-2xl font-bold text-red-700">
                {report.errors.length}
              </p>
              <p className="text-xs text-red-700 font-medium">Errores</p>
            </div>
          </div>

          {report.processed.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-green-700 mb-2">
                ✅ Procesadas ({report.processed.length})
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {report.processed.map((p) => (
                  <span
                    key={p.nroOsi}
                    className="inline-flex items-center px-2 py-0.5 rounded bg-green-100 text-green-800 text-xs font-mono"
                    title={`ejecucion_osi.id = ${p.osiId} · ${p.sesiones} sesión(es)`}
                  >
                    {p.nroOsi}
                    <span className="ml-1 text-green-600">({p.sesiones})</span>
                  </span>
                ))}
              </div>
              <p className="mt-1.5 text-xs text-gray-500">
                El número entre paréntesis es la cantidad de sesiones marcadas.
              </p>
            </div>
          )}

          {report.noSessions.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-amber-700 mb-2">
                ⚠️ Sin sesiones ({report.noSessions.length})
              </h3>
              <p className="text-xs text-gray-600 mb-3">
                Estas OSIs no tienen filas en <code>osi_sesion</code> ni en{" "}
                <code>sesiones_programadas</code>. Crea una sesión única usando{" "}
                <code>fecha_inicio_real</code> y márcala como ejecutada.
              </p>
              <div className="space-y-2">
                {report.noSessions.map((n) => {
                  const result = singleResults[n.osiId];
                  return (
                    <div
                      key={n.osiId}
                      className="flex items-center justify-between gap-3 rounded border border-amber-200 bg-amber-50 p-3"
                    >
                      <div className="text-sm">
                        <span className="font-mono font-semibold text-amber-900">
                          OSI {n.nroOsi}
                        </span>
                        <span className="ml-2 text-gray-500 text-xs">
                          (id {n.osiId})
                        </span>
                        <span className="ml-2 text-gray-500 text-xs">
                          fecha_inicio_real:{" "}
                          {n.fechaInicioReal
                            ? n.fechaInicioReal.split("T")[0]
                            : "—"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {result?.error && (
                          <span className="text-xs text-red-700">
                            ✗ {result.error}
                          </span>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void handleCreateSingleSession(n.osiId, n.nroOsi)}
                          disabled={result?.pending}
                        >
                          {result?.pending
                            ? "Creando..."
                            : result?.error
                              ? "Reintentar"
                              : "Crear sesión única y marcar"}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {report.notFound.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">
                ⃝ No encontradas ({report.notFound.length})
              </h3>
              <p className="text-xs text-gray-600 mb-2">
                Estos ids no existen en <code>ejecucion_osi</code>.
              </p>
              <div className="flex flex-wrap gap-1.5">
                {report.notFound.map((id) => (
                  <span
                    key={id}
                    className="inline-flex items-center px-2 py-0.5 rounded bg-gray-200 text-gray-700 text-xs font-mono"
                  >
                    {id}
                  </span>
                ))}
              </div>
            </div>
          )}

          {report.errors.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-red-700 mb-2">
                ❌ Errores ({report.errors.length})
              </h3>
              <div className="space-y-1">
                {report.errors.map((e, i) => (
                  <div
                    key={`${e.nroOsi}-${i}`}
                    className="text-xs text-red-700 bg-red-50 border border-red-200 rounded p-2"
                  >
                    <span className="font-mono font-semibold">
                      OSI {e.nroOsi || "—"}
                      {e.osiId != null ? ` (id ${e.osiId})` : ""}
                    </span>
                    : {e.error}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
