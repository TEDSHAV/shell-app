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

interface ProcessInfo {
  label: string;
  path: string;
  icon: LucideIcon;
  description: string;
}

const PROCESOS: ProcessInfo[] = [
  {
    label: "Dashboard",
    path: "dashboard",
    icon: LayoutDashboard,
    description: "Vista general de indicadores de servicios técnicos.",
  },
  {
    label: "Control de Calibración",
    path: "dashboard/control-calibracion",
    icon: Gauge,
    description: "Seguimiento de calibración de equipos e instrumentos.",
  },
  {
    label: "Entrada y Salida de Equipos",
    path: "dashboard/entrada-salida-equipos",
    icon: ArrowLeftRight,
    description: "Registro de movimientos de entrada y salida de equipos.",
  },
  {
    label: "Formulario de Novedades",
    path: "dashboard/formulario-novedades",
    icon: FileText,
    description: "Reporte de novedades ocurridas durante los servicios.",
  },
];

function findProcess(joinedPath: string): ProcessInfo | undefined {
  const normalized = joinedPath.replace(/^\//, "");
  return PROCESOS.find((p) => p.path === normalized);
}

const ServiciosTecnicosSubPage = async ({
  params,
}: {
  params: Promise<{ path: string[] }>;
}) => {
  const { path } = await params;
  const app = getAppById("servicios-tecnicos")!;
  const joined = path.join("/");
  const proceso = findProcess(joined);

  const Icon = proceso?.icon ?? Wrench;
  const label = proceso?.label ?? "Servicios Técnicos";
  const description =
    proceso?.description ??
    "Esta sección de Servicios Técnicos aún no está disponible.";

  const iconStyle = get_app_icon_style(app.brandColor);
  const stripStyle = get_app_strip_style(app.brandColor);
  const badgeBg = { backgroundColor: hex_to_rgba(app.brandColor, 0.14) };

  return (
    <div className="p-4 sm:p-8 w-full max-w-3xl mx-auto">
      <div
        className="absolute inset-x-0 top-0 h-1"
        style={stripStyle}
        aria-hidden="true"
      />
      <div className="flex flex-col items-center text-center gap-5 py-12 px-6 rounded-xl border border-border bg-white">
        <div className="p-3 rounded-lg" style={badgeBg}>
          <Icon className="h-7 w-7" style={iconStyle} />
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-bold text-gray-900">{label}</h1>
          <p className="text-sm text-muted-foreground max-w-md">
            {description}
          </p>
        </div>
        <span
          className="inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200"
          title="Este proceso aún no está disponible"
        >
          <Wrench className="h-3.5 w-3.5" />
          En construcción
        </span>
        <p className="text-xs text-muted-foreground/80 max-w-sm">
          Estamos trabajando en habilitar este proceso. Mientras tanto,
          Requisiciones y Nuevos Servicios siguen disponibles en el menú lateral.
        </p>
        <Link
          href={app.basePath}
          className="mt-2 inline-flex items-center justify-center px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Volver a Servicios Técnicos
        </Link>
      </div>
    </div>
  );
};

export default ServiciosTecnicosSubPage;
