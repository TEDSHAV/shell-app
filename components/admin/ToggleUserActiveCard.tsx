"use client";

import { useState } from "react";
import {
  Power,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { setUserActiveStatus, type AdminUserRow } from "@/actions/admin-users";

interface ToggleUserActiveCardProps {
  users: AdminUserRow[];
}

export function ToggleUserActiveCard({ users }: ToggleUserActiveCardProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  // Local mirror of esta_activo so the UI updates immediately after a toggle
  // without needing to refetch the entire user list from the server.
  const [activeOverride, setActiveOverride] = useState<Record<number, boolean | null>>({});

  const selectedUser = users.find((u) => u.id === Number(selectedUserId));
  const currentActive =
    selectedUser != null
      ? activeOverride[selectedUser.id] ?? selectedUser.esta_activo
      : null;

  const resetState = () => {
    setError(null);
    setSuccess(null);
  };

  const handleToggle = async () => {
    resetState();
    if (!selectedUser) return;

    const newActive = currentActive !== true;
    setLoading(true);
    try {
      const result = await setUserActiveStatus({
        usuarioId: selectedUser.id,
        isActive: newActive,
      });
      if (result.error) {
        setError(result.error);
      } else {
        setActiveOverride((prev) => ({
          ...prev,
          [selectedUser.id]: newActive,
        }));
        setSuccess(
          newActive
            ? "Usuario activado correctamente."
            : "Usuario desactivado correctamente. Su sesión será invalidada.",
        );
      }
    } catch {
      setError("Error inesperado al actualizar el estado del usuario.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-border p-6 pt-7 shadow-sm">
      <div className="flex items-start gap-3 mb-4">
        <div className="p-2.5 rounded-lg bg-amber-50 text-amber-600">
          <Power className="h-5 w-5" />
        </div>
        <div>
          <h2 className="font-semibold text-foreground text-base">
            Activar / Desactivar usuario
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Suspende o reactiva el acceso de un usuario a la plataforma.
          </p>
        </div>
      </div>

      <div className="mb-4 flex items-start gap-2 rounded-lg bg-amber-50/60 border border-amber-200 p-3">
        <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
        <p className="text-xs text-amber-800">
          Al desactivar, el usuario será desconectado en su próxima recarga de
          página y no podrá iniciar sesión. Al reactivar, recupera el acceso
          inmediatamente.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label
            htmlFor="tu-user"
            className="block text-xs font-medium text-muted-foreground mb-1"
          >
            Usuario
          </label>
          <select
            id="tu-user"
            value={selectedUserId}
            onChange={(e) => {
              setSelectedUserId(e.target.value);
              resetState();
            }}
            className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40"
            disabled={loading || users.length === 0}
          >
            <option value="">Selecciona un usuario</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nombre_apellido}
                {u.email_corporativo ? ` — ${u.email_corporativo}` : ""}
              </option>
            ))}
          </select>
        </div>

        {selectedUser && (
          <div className="flex items-center justify-between rounded-lg border border-border bg-slate-50 px-3 py-2.5">
            <div>
              <p className="text-xs text-muted-foreground">Estado actual</p>
              <p
                className={`text-sm font-medium ${
                  currentActive === false ? "text-red-600" : "text-emerald-600"
                }`}
              >
                {currentActive === false ? "Inactivo" : "Activo"}
              </p>
            </div>
            <button
              type="button"
              onClick={handleToggle}
              disabled={loading}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-60 disabled:cursor-not-allowed transition-colors ${
                currentActive === false
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-red-600 hover:bg-red-700"
              }`}
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading
                ? "Actualizando..."
                : currentActive === false
                  ? "Activar"
                  : "Desactivar"}
            </button>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 p-3">
            <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
            <p className="text-xs text-red-700">{error}</p>
          </div>
        )}

        {success && (
          <div className="flex items-start gap-2 rounded-lg bg-emerald-50 border border-emerald-200 p-3">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
            <p className="text-xs text-emerald-700">{success}</p>
          </div>
        )}
      </div>
    </div>
  );
}
