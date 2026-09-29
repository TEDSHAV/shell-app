"use client";

import { cn } from "@/lib/utils";
import { signInAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { useActionState } from "react";

export function LoginForm({
  className,
  next,
  ...props
}: React.ComponentPropsWithoutRef<"form"> & { next?: string | null }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [state, formAction] = useActionState(signInAction, null);

  return (
    <form
      action={formAction}
      className={cn("flex flex-col gap-5", className)}
      {...props}
    >
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <div className="grid gap-1.5">
        <Label htmlFor="email" className="text-sm font-medium text-gray-700">
          Correo electrónico
        </Label>
        <Input
          id="email"
          type="email"
          name="email"
          placeholder="correo@ejemplo.com"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-11 rounded-lg border-gray-200 bg-gray-50 focus:bg-white text-sm transition-colors"
        />
      </div>

      <div className="grid gap-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="password" className="text-sm font-medium text-gray-700">
            Contraseña
          </Label>
          <Link
            href="/auth/forgot-password"
            className="text-xs hover:underline underline-offset-4 transition-colors"
            style={{ color: 'var(--primary-blue)' }}
          >
            ¿Olvidaste tu contraseña?
          </Link>
        </div>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            name="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-11 rounded-lg border-gray-200 bg-gray-50 focus:bg-white text-sm transition-colors pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {state?.error && (
        <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          {state.error}
        </p>
      )}

      <Button
        type="submit"
        className="w-full h-11 rounded-lg text-sm font-semibold text-white mt-1 transition-opacity hover:opacity-90"
        style={{ backgroundColor: 'var(--primary-blue)' }}
      >
        Iniciar sesión
      </Button>
    </form>
  );
}
