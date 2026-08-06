import Link from "next/link";
import {
  ArrowLeftRight,
  FileText,
  Gauge,
  LayoutDashboard,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { getAppById } from "@/config/apps";
import {
  get_app_icon_style,
  get_app_strip_style,
  hex_to_rgba,
} from "@/lib/app-theme";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "Servicios Técnicos | PRISMA",
};

interface ProcessCard {
  label: string;
  path: string;
  icon: LucideIcon;
  description: string;
}

const PROCESOS: ProcessCard[] = [
  {
    label: "Dashboard",
    path: "/dashboard",
    icon: LayoutDashboard,
    description: "Vista general de indicadores de servicios técnicos.",
  },
  {
    label: "Control de Calibración",
    path: "/dashboard/control-calibracion",
    icon: Gauge,
    description: "Seguimiento de calibración de equipos e instrumentos.",
  },
  {
    label: "Entrada y Salida de Equipos",
    path: "/dashboard/entrada-salida-equipos",
    icon: ArrowLeftRight,
    description: "Registro de movimientos de entrada y salida de equipos.",
  },
  {
    label: "Formulario de Novedades",
    path: "/dashboard/formulario-novedades",
    icon: FileText,
    description: "Reporte de novedades ocurridas durante los servicios.",
  },
];

export default function ServiciosTecnicosPage() {
  const app = getAppById("servicios-tecnicos")!;
  const iconStyle = get_app_icon_style(app.brandColor);
  const stripStyle = get_app_strip_style(app.brandColor);
  const badgeBg = { backgroundColor: hex_to_rgba(app.brandColor, 0.14) };

  return (
    <div className="p-4 sm:p-8 w-full max-w-7xl mx-auto">
      <div className="mb-8 flex items-start gap-4">
        <div className="p-2.5 rounded-lg" style={badgeBg}>
          <app.icon className="h-6 w-6" style={iconStyle} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{app.name}</h1>
          <p className="mt-1 text-sm text-gray-600">
            {app.description}. Selecciona un proceso para continuar.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {PROCESOS.map((proceso) => {
          const fullPath = `${app.basePath}${proceso.path}`;
          return (
            <Link
              key={proceso.path}
              href={fullPath}
              className={cn(
                "group relative flex flex-col gap-4 p-6 pt-7 rounded-xl border border-border bg-white hover:bg-accent/40 hover:border-border/80 transition-all duration-150 overflow-hidden min-h-[180px] w-full",
              )}
            >
              <div
                className="absolute inset-x-0 top-0 h-1 rounded-t-xl"
                style={stripStyle}
              />
              <div className="flex items-start justify-between">
                <div className="p-2.5 rounded-lg" style={badgeBg}>
                  <proceso.icon className="h-5 w-5" style={iconStyle} />
                </div>
                <span
                  className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200"
                  title="Este proceso aún no está disponible"
                >
                  <Wrench className="h-3 w-3" />
                  En construcción
                </span>
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-base">
                  {proceso.label}
                </h3>
                <p className="mt-0.5 text-sm text-muted-foreground line-clamp-2">
                  {proceso.description}
                </p>
              </div>
              <p className="mt-auto text-xs text-muted-foreground/80">
                Próximamente disponible.
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
