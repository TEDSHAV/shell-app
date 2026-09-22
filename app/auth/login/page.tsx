import { LoginForm } from "@/components/login-form";
import Image from "next/image";
import logo from "@/app/logo.png";
import { cookies } from "next/headers";
import {
  DEV_DB_COOKIE,
  is_dev_db_switcher_enabled,
  parse_dev_db_target,
} from "@/lib/supabase/dev-db";

export default async function Page() {
  const cookieStore = await cookies();
  const dev_target = is_dev_db_switcher_enabled()
    ? parse_dev_db_target(cookieStore.get(DEV_DB_COOKIE)?.value)
    : null;

  return (
    <div className="min-h-svh flex">

      {/* ── Left panel: branded photo ───────────────────────────── */}
      <div
        className="hidden lg:flex lg:w-[58%] relative flex-col justify-between p-12 overflow-hidden"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1920&q=80')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {/* Brand-blue gradient overlay */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(135deg, rgba(12,63,105,0.93) 0%, rgba(12,63,105,0.72) 55%, rgba(12,63,105,0.45) 100%)",
          }}
        />

        {/* Top: logo on white pill */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="bg-white rounded-lg px-3 py-1.5 shadow-md">
            <Image
              src={logo}
              alt="SHA de Venezuela, C.A."
              height={30}
              className="h-7 w-auto object-contain"
              priority
            />
          </div>
          <div className="w-px h-6 bg-white/20" />
          <span className="text-white/80 font-semibold text-sm tracking-wide">PRISMA</span>
        </div>

        {/* Middle: headline */}
        <div className="relative z-10 space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-300/70">
            SHA de Venezuela, C.A.
          </p>
          <h2 className="text-4xl font-bold text-white leading-tight">
            Gestión empresarial<br />
            <span className="text-blue-200">integrada.</span>
          </h2>
          <p className="text-blue-100/60 text-sm leading-relaxed max-w-xs">
            Accede a todos los módulos de la plataforma desde un único punto de entrada seguro.
          </p>
        </div>

        {/* Bottom: copyright */}
        <p className="relative z-10 text-[11px] text-white/25">
          &copy; {new Date().getFullYear()} SHA de Venezuela, C.A. Todos los derechos reservados.
        </p>
      </div>

      {/* ── Right panel: form ───────────────────────────────────── */}
      <div className="flex flex-1 flex-col">
        {/* Accent bar at very top */}
        <div className="h-1 w-full shrink-0" style={{ backgroundColor: 'var(--primary-blue)' }} />

        <div className="flex flex-1 items-center justify-center px-8 py-12">
          <div className="w-full max-w-[360px]">

            {/* Mobile-only logo */}
            <div className="lg:hidden flex items-center gap-3 mb-10">
              <Image
                src={logo}
                alt="SHA de Venezuela, C.A."
                height={32}
                className="h-8 w-auto object-contain"
                priority
              />
            </div>

            {/* Heading */}
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                Iniciar sesión
              </h1>
              <p className="text-sm text-gray-400 mt-1">
                Ingresa tus credenciales para acceder
              </p>
              {dev_target ? (
                <p
                  className={
                    dev_target === "production"
                      ? "mt-3 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-md px-2 py-1"
                      : "mt-3 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-md px-2 py-1"
                  }
                >
                  next dev → {dev_target === "production" ? "producción (o)" : "staging (g)"}
                </p>
              ) : null}
            </div>

            <LoginForm />

            <p className="text-center text-[11px] text-gray-300 mt-10">
              &copy; {new Date().getFullYear()} SHA de Venezuela, C.A.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
