"use client";

import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { getAppByPath, apps } from "@/config/apps";
import { NavLink, NavGroup } from "@/types";

const SEGMENT_LABELS: Record<string, string> = {
  dashboard: "Inicio",
  capacitacion: "Capacitación",
  negocios: "Negocios",
  administracion: "Administración",
  marketing: "Marketing",
  crm: "CRM",
  leads: "Leads",
  "gestion-cursos": "Gestión de Cursos",
  "gestion-certificados": "Gestión de Certificados",
  "generacion-certificado": "Generación de Certificados",
  "gestion-de-facilitadores": "Gestión de Facilitadores",
  "gestion-de-firmas": "Gestión de Firmas",
  configuracion: "Configuración",
  "secuencias-control": "Control de Secuencia",
  "plantillas-certificados": "Plantillas de Certificados",
  "plantillas-carnets": "Plantillas de Carnets",
  "gestion-plantillas-cursos": "Plantillas de Cursos",
  "consulta-participantes": "Consulta de Participantes",
  participantes: "Participantes",
  reportes: "Reportes",
  // presupuestos: "Indicador Presupuesto",
  // "mi-avance": "Mi avance",
  cierres: "Administración de cierres",
  manual: "Manual",
  "gestion-osi": "Gestión de OSI",
  "planificacion-servicios": "Planificación de Servicios",
  inventario: "Inventario",
  drive: "Drive",
  tareas: "Tareas",
  comentarios: "Comentarios",
  requisiciones: "Requisiciones",
  create: "Nueva",
  edit: "Editar",
  lista: "Lista",
  view: "Ver",
  solicitud: "Solicitud",
  "solicitud-requisiciones": "Solicitud de Requisiciones",
  "servicios-tecnicos": "Servicios Técnicos",
  "control-calibracion": "Control de Calibración",
  "entrada-salida-equipos": "Entrada y Salida de Equipos",
  "formulario-novedades": "Formulario de Novedades",
};

function isNavGroup(item: NavLink | NavGroup): item is NavGroup {
  return "groupLabel" in item;
}

export const AppBreadcrumb = () => {
  const nextPathname = usePathname();
  const [currentPathname, setCurrentPathname] = useState(nextPathname);

  // Sync state with next/navigation pathname
  useEffect(() => {
    setCurrentPathname(nextPathname);
  }, [nextPathname]);

  // Handle manual URL updates (e.g. from ShellURLSync)
  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPathname(window.location.pathname);
    };

    window.addEventListener('shell-url-change', handleLocationChange);
    window.addEventListener('popstate', handleLocationChange);
    return () => {
      window.removeEventListener('shell-url-change', handleLocationChange);
      window.removeEventListener('popstate', handleLocationChange);
    };
  }, []);

  const currentApp = getAppByPath(currentPathname);

  if (currentPathname === "/dashboard") {
    return (
      <div className="flex items-center gap-2 text-sm">
        <span className="font-semibold text-slate-800 flex items-center gap-1.5">
          <Home className="h-3.5 w-3.5" />
          PRISMA
        </span>
      </div>
    );
  }

  const segments = currentPathname.split("/").filter(Boolean);
  
  // Build crumbs
  const crumbs = segments.map((segment, index) => {
    const href = "/" + segments.slice(0, index + 1).join("/");
    const isLast = index === segments.length - 1;
    
    // Try to find label
    let label = SEGMENT_LABELS[segment];

    if (!label && currentApp) {
      // Search in app navLinks
      const allLinks: NavLink[] = [];
      currentApp.navLinks.forEach(item => {
        if (isNavGroup(item)) {
          allLinks.push(...item.links);
        } else {
          allLinks.push(item);
        }
      });

      const foundLink = allLinks.find(link => {
        const fullLinkPath = `${currentApp.basePath}${link.path === "/" ? "" : link.path}`;
        return fullLinkPath === href;
      });

      if (foundLink) {
        label = foundLink.label;
      }
    }

    if (!label) {
      // Fallback: format string
      label = segment
        .replace(/-/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
    }

    return { label, href, isLast };
  });

  return (
    <nav aria-label="Breadcrumb" className="flex items-center text-sm overflow-hidden">
      <ol className="flex items-center gap-2 whitespace-nowrap">
        <li>
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 font-semibold text-slate-800 hover:text-blue-600 transition-colors"
          >
            <Home className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">PRISMA</span>
          </Link>
        </li>

        {crumbs.map((crumb, index) => (
          <li key={crumb.href} className="flex items-center gap-2">
            <ChevronRight className="h-3.5 w-3.5 text-slate-300 shrink-0" />
            {crumb.isLast ? (
              <span className="text-slate-500 font-medium truncate max-w-[150px] sm:max-w-[250px]">
                {crumb.label}
              </span>
            ) : (
              crumb.href === currentApp?.basePath ? (
                <a
                  href={crumb.href}
                  className="text-slate-400 hover:text-blue-600 transition-colors truncate max-w-[100px] sm:max-w-[200px]"
                >
                  {crumb.label}
                </a>
              ) : (
                <Link
                  href={crumb.href}
                  className="text-slate-400 hover:text-blue-600 transition-colors truncate max-w-[100px] sm:max-w-[200px]"
                >
                  {crumb.label}
                </Link>
              )
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
};
