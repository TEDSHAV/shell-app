"use client";

import { useState, useRef, useEffect } from "react";
import {
  UserCheck,
  Search,
  Copy,
  Check,
  Clock,
  Trash2,
  AlertCircle,
  Loader2,
  X,
  CreditCard,
  ShieldCheck,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { verifyCedulaAction, type CitizenLookupResponse } from "@/actions/cedula";

interface RecentSearch {
  nacionalidad: "V" | "E";
  cedula: string;
  name: string;
  rif?: string;
  timestamp: number;
}

const STORAGE_KEY = "prisma_cedula_recent_history";

export function VerificarCedulaClient() {
  const [nacionalidad, setNacionalidad] = useState<"V" | "E">("V");
  const [cedulaInput, setCedulaInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<CitizenLookupResponse | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load search history from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setRecentSearches(JSON.parse(stored));
      }
    } catch {
      // LocalStorage unavailable
    }
  }, []);

  const saveRecentSearch = (item: RecentSearch) => {
    try {
      const updated = [
        item,
        ...recentSearches.filter(
          (s) => !(s.nacionalidad === item.nacionalidad && s.cedula === item.cedula),
        ),
      ].slice(0, 8);
      setRecentSearches(updated);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // LocalStorage error
    }
  };

  const clearHistory = () => {
    setRecentSearches([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore
    }
  };

  const handleVerify = async (nac = nacionalidad, num = cedulaInput) => {
    const cleanNum = num.replace(/\D/g, "");
    if (!cleanNum || cleanNum.length < 5) return;

    setIsLoading(true);
    setResult(null);

    try {
      const res = await verifyCedulaAction(nac, cleanNum);
      setResult(res);

      if (res.success && res.name) {
        saveRecentSearch({
          nacionalidad: nac,
          cedula: cleanNum,
          name: res.name,
          rif: res.rif,
          timestamp: Date.now(),
        });
      }
    } catch (err) {
      setResult({
        success: false,
        error:
          err instanceof Error
            ? err.message
            : "Error inesperado al consultar la cédula.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (text: string, fieldId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldId);
      setTimeout(() => setCopiedField(null), 1800);
    } catch {
      // Clipboard failed
    }
  };

  const handleSelectRecent = (recent: RecentSearch) => {
    setNacionalidad(recent.nacionalidad);
    setCedulaInput(recent.cedula);
    handleVerify(recent.nacionalidad, recent.cedula);
  };

  const formatCedulaDisplay = (nac: string, num: string) => {
    const formattedNum = Number(num).toLocaleString("es-VE");
    return `${nac}-${formattedNum}`;
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 text-sky-600 font-semibold text-xs uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4" />
            Utilidades PRISMA
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Verificación de Cédula
          </h1>
          <p className="text-slate-600 text-sm mt-1">
            Consulta oficial y validación de identidad ciudadana (CNE / SENIAT).
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Main Search Panel */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 space-y-5">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleVerify();
              }}
              className="space-y-4"
            >
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                Número de Documento
              </label>

              <div className="flex gap-2">
                {/* Nationality select */}
                <div className="relative">
                  <select
                    value={nacionalidad}
                    onChange={(e) => setNacionalidad(e.target.value as "V" | "E")}
                    className="h-12 px-3.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all cursor-pointer"
                  >
                    <option value="V">V - Venezolano</option>
                    <option value="E">E - Extranjero</option>
                  </select>
                </div>

                {/* Number input */}
                <div className="relative flex-1">
                  <input
                    ref={inputRef}
                    type="text"
                    inputMode="numeric"
                    autoFocus
                    placeholder="Ej. 12345678"
                    value={cedulaInput}
                    onChange={(e) => {
                      const clean = e.target.value.replace(/\D/g, "").slice(0, 9);
                      setCedulaInput(clean);
                      if (result) setResult(null);
                    }}
                    className="w-full h-12 pl-4 pr-10 bg-slate-50 border border-slate-300 rounded-xl text-base font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all"
                  />
                  {cedulaInput && (
                    <button
                      type="button"
                      onClick={() => {
                        setCedulaInput("");
                        setResult(null);
                        inputRef.current?.focus();
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-md transition-colors"
                      title="Borrar"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Action button */}
              <button
                type="submit"
                disabled={isLoading || !cedulaInput || cedulaInput.length < 5}
                className="w-full h-12 flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-700 active:bg-sky-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-xl shadow-sm shadow-sky-600/20 transition-all cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verificando identidad...</span>
                  </>
                ) : (
                  <>
                    <UserCheck className="w-4 h-4" />
                    <span>Verificar cédula</span>
                  </>
                )}
              </button>
            </form>

            <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Caché instantánea activada
              </span>
              <span>Presiona <strong>Enter</strong> para consultar</span>
            </div>
          </div>

          {/* Verification Result Card */}
          {result && (
            <div
              className={`rounded-2xl border transition-all animate-in fade-in-50 duration-200 overflow-hidden shadow-sm ${
                result.success
                  ? "bg-white border-sky-200 ring-1 ring-sky-500/10"
                  : "bg-red-50/70 border-red-200"
              }`}
            >
              {result.success && result.name ? (
                <div>
                  <div className="bg-sky-50/80 px-6 py-3.5 border-b border-sky-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        <Check className="w-3 h-3" />
                        Verificado
                      </span>
                      {result.fromCache && (
                        <span className="text-[11px] font-medium text-sky-700 bg-sky-100/70 px-2 py-0.5 rounded-full">
                          Caché ultrarrápida
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-500">
                      {formatCedulaDisplay(result.nacionalidad!, result.cedula!)}
                    </span>
                  </div>

                  <div className="p-6 space-y-5">
                    {/* Full Name */}
                    <div>
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Nombre completo
                      </span>
                      <div className="flex items-center justify-between gap-3 mt-1">
                        <p className="text-xl font-bold text-slate-900 tracking-tight">
                          {result.name}
                        </p>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(result.name!, "name")}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-colors shrink-0"
                          title="Copiar nombre completo"
                        >
                          {copiedField === "name" ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-emerald-700">Copiado</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copiar</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Metadata Grid */}
                    <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100">
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <span className="text-[11px] font-medium text-slate-500 uppercase">
                          Cédula
                        </span>
                        <div className="flex items-center justify-between mt-0.5">
                          <span className="font-semibold text-slate-800 text-sm">
                            {result.nacionalidad}-{result.cedula}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              copyToClipboard(
                                `${result.nacionalidad}-${result.cedula}`,
                                "cedula",
                              )
                            }
                            className="p-1 text-slate-400 hover:text-slate-600 rounded transition-colors"
                            title="Copiar cédula"
                          >
                            {copiedField === "cedula" ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <span className="text-[11px] font-medium text-slate-500 uppercase">
                          RIF Estimado
                        </span>
                        <div className="flex items-center justify-between mt-0.5">
                          <span className="font-semibold text-slate-800 text-sm">
                            {result.rif || `${result.nacionalidad}-${result.cedula}`}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              copyToClipboard(
                                result.rif || `${result.nacionalidad}-${result.cedula}`,
                                "rif",
                              )
                            }
                            className="p-1 text-slate-400 hover:text-slate-600 rounded transition-colors"
                            title="Copiar RIF"
                          >
                            {copiedField === "rif" ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Copy All */}
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() =>
                          copyToClipboard(
                            `${result.nacionalidad}-${result.cedula} - ${result.name}`,
                            "all",
                          )
                        }
                        className="w-full py-2 px-3 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors"
                      >
                        {copiedField === "all" ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Copiado: Cédula + Nombre</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-slate-400" />
                            <span>Copiar Cédula y Nombre en un solo texto</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-6 flex items-start gap-3 text-red-800">
                  <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-semibold text-red-900">
                      No se pudo verificar la cédula
                    </h3>
                    <p className="text-xs text-red-700 mt-1">
                      {result.error ||
                        "El número de cédula no se encuentra registrado o hubo un error en la consulta."}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Recent Searches Sidebar */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-slate-800 font-semibold text-sm">
                <Clock className="w-4 h-4 text-slate-400" />
                <span>Consultas Recientes</span>
              </div>
              {recentSearches.length > 0 && (
                <button
                  type="button"
                  onClick={clearHistory}
                  className="text-xs text-slate-400 hover:text-red-600 transition-colors flex items-center gap-1"
                  title="Limpiar historial"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Limpiar</span>
                </button>
              )}
            </div>

            {recentSearches.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-300" />
                <p>No tienes consultas recientes en este equipo.</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Las personas que verifiques se guardarán aquí para acceso rápido.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100 -mx-2">
                {recentSearches.map((item) => (
                  <li
                    key={`${item.nacionalidad}-${item.cedula}`}
                    onClick={() => handleSelectRecent(item)}
                    className="p-2.5 rounded-xl hover:bg-slate-50 cursor-pointer group flex items-center justify-between gap-3 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-slate-800 truncate group-hover:text-sky-600 transition-colors">
                        {item.name}
                      </p>
                      <p className="text-[11px] font-mono text-slate-500 mt-0.5">
                        {item.nacionalidad}-{Number(item.cedula).toLocaleString("es-VE")}
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-sky-500 group-hover:translate-x-0.5 transition-all shrink-0" />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
