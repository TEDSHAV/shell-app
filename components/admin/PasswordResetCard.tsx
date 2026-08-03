"use client";

import { useState } from "react";
import {
  KeyRound,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { resetUserPassword } from "@/actions/admin-password";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

export function PasswordResetCard() {
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const resetState = () => {
    setError(null);
    setSuccess(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetState();

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !EMAIL_REGEX.test(trimmedEmail)) {
      setError("Ingresa un correo electrónico válido.");
      return;
    }
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setError(`La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);
    try {
      const result = await resetUserPassword(trimmedEmail, newPassword);
      if (result.error) {
        setError(result.error);
      } else {
        setSuccess("Contraseña actualizada correctamente.");
        setEmail("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch {
      setError("Error inesperado al actualizar la contraseña.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mb-6 bg-white rounded-xl border border-border p-6 pt-7 shadow-sm">
      <div className="flex items-start gap-3 mb-4">
        <div className="p-2.5 rounded-lg bg-amber-50 text-amber-600">
          <KeyRound className="h-5 w-5" />
        </div>
        <div>
          <h2 className="font-semibold text-foreground text-base">
            Restablecer contraseña de usuario
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Cambia la contraseña de Supabase de un usuario por su correo corporativo.
          </p>
        </div>
      </div>

      <div className="mb-4 flex items-start gap-2 rounded-lg bg-amber-50/60 border border-amber-200 p-3">
        <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
        <p className="text-xs text-amber-800">
          Esta acción cambia la contraseña de Supabase del usuario seleccionado.
          El usuario deberá iniciar sesión con la nueva contraseña.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="pr-email"
            className="block text-xs font-medium text-muted-foreground mb-1"
          >
            Correo del usuario
          </label>
          <input
            id="pr-email"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              resetState();
            }}
            placeholder="usuario@shadevenezuela.com.ve"
            className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40"
            disabled={loading}
            autoComplete="off"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="pr-new"
              className="block text-xs font-medium text-muted-foreground mb-1"
            >
              Nueva contraseña
            </label>
            <input
              id="pr-new"
              type="password"
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                resetState();
              }}
              placeholder={`Mín. ${MIN_PASSWORD_LENGTH} caracteres`}
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40"
              disabled={loading}
              autoComplete="new-password"
            />
          </div>
          <div>
            <label
              htmlFor="pr-confirm"
              className="block text-xs font-medium text-muted-foreground mb-1"
            >
              Confirmar contraseña
            </label>
            <input
              id="pr-confirm"
              type="password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                resetState();
              }}
              placeholder="Repite la nueva contraseña"
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/40"
              disabled={loading}
              autoComplete="new-password"
            />
          </div>
        </div>

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

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? "Actualizando..." : "Restablecer contraseña"}
          </button>
        </div>
      </form>
    </div>
  );
}
