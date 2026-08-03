"use client";

import { useState } from "react";
import {
  UserPlus,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import type { Department } from "@/types/directory";
import { createUser } from "@/actions/admin-users";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

interface CreateUserCardProps {
  departments: Department[];
}

export function CreateUserCard({ departments }: CreateUserCardProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [nombre, setNombre] = useState("");
  const [departamento, setDepartamento] = useState<string>("");
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
    if (!nombre.trim()) {
      setError("El nombre y apellido son requeridos.");
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`);
      return;
    }
    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);
    try {
      const result = await createUser({
        email: trimmedEmail,
        password,
        nombre_apellido: nombre.trim(),
        departamento: departamento ? Number(departamento) : null,
      });
      if (result.error) {
        setError(result.error);
      } else {
        setSuccess("Usuario creado correctamente.");
        setEmail("");
        setPassword("");
        setConfirmPassword("");
        setNombre("");
        setDepartamento("");
      }
    } catch {
      setError("Error inesperado al crear el usuario.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-border p-6 pt-7 shadow-sm">
      <div className="flex items-start gap-3 mb-4">
        <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600">
          <UserPlus className="h-5 w-5" />
        </div>
        <div>
          <h2 className="font-semibold text-foreground text-base">
            Crear usuario
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Crea una cuenta de Supabase y su registro en usuarios.
          </p>
        </div>
      </div>

      <div className="mb-4 flex items-start gap-2 rounded-lg bg-emerald-50/60 border border-emerald-200 p-3">
        <AlertCircle className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
        <p className="text-xs text-emerald-800">
          El correo se confirma automáticamente y el usuario podrá iniciar sesión
          de inmediato con la contraseña indicada.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="cu-nombre"
            className="block text-xs font-medium text-muted-foreground mb-1"
          >
            Nombre y apellido
          </label>
          <input
            id="cu-nombre"
            type="text"
            value={nombre}
            onChange={(e) => {
              setNombre(e.target.value);
              resetState();
            }}
            placeholder="Nombre Apellido"
            className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
            disabled={loading}
            autoComplete="off"
          />
        </div>

        <div>
          <label
            htmlFor="cu-email"
            className="block text-xs font-medium text-muted-foreground mb-1"
          >
            Correo electrónico
          </label>
          <input
            id="cu-email"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              resetState();
            }}
            placeholder="usuario@shadevenezuela.com.ve"
            className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
            disabled={loading}
            autoComplete="off"
          />
        </div>

        <div>
          <label
            htmlFor="cu-depto"
            className="block text-xs font-medium text-muted-foreground mb-1"
          >
            Departamento
          </label>
          <select
            id="cu-depto"
            value={departamento}
            onChange={(e) => {
              setDepartamento(e.target.value);
              resetState();
            }}
            className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
            disabled={loading}
          >
            <option value="">Sin departamento</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.nombre}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="cu-pass"
              className="block text-xs font-medium text-muted-foreground mb-1"
            >
              Contraseña
            </label>
            <input
              id="cu-pass"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                resetState();
              }}
              placeholder={`Mín. ${MIN_PASSWORD_LENGTH} caracteres`}
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              disabled={loading}
              autoComplete="new-password"
            />
          </div>
          <div>
            <label
              htmlFor="cu-confirm"
              className="block text-xs font-medium text-muted-foreground mb-1"
            >
              Confirmar contraseña
            </label>
            <input
              id="cu-confirm"
              type="password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                resetState();
              }}
              placeholder="Repite la contraseña"
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
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
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? "Creando..." : "Crear usuario"}
          </button>
        </div>
      </form>
    </div>
  );
}
