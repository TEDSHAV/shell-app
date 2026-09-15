"use client";

import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
import { useState, useEffect, type MouseEvent } from "react";
import { usePathname } from "next/navigation";
import { getAppByPath } from "@/config/apps";
import { NavLink, NavGroup } from "@/types";
import {
  is_modified_click,
  navigate_shell_iframe_href,
} from "@/lib/shell-iframe-nav";
import { uses_iframe_in_shell } from "@/lib/app-theme";

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
  facturacion: "Facturación",
  prefactura: "Prefacturas",
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
  osi: "OSI",
  preview: "Vista previa",
  "planificacion-servicios": "Planificación de Servicios",
  inventario: "Inventario",
  drive: "Drive",
  tareas: "Tareas",
  comentarios: "Comentarios",
  requisiciones: "Requisiciones",
  ted: "TED",
  notificaciones: "Notificaciones",
  usuarios: "Por usuario",
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
  "nuevo-servicio": "Nuevos Servicios",
  "recursos-humanos": "Recursos Humanos",
  solicitudes: "Solicitudes",
  nueva: "Nueva solicitud",
  directorio: "Directorio",
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

  const rawSegments = currentPathname.split("/").filter(Boolean);

  // If inside an embedded app with a defaultSubPath (e.g. "dashboard/rh" or "dashboard/capacitacion"),
  // collapse the internal prefix segments so they don't produce dummy "Inicio" or 404 breadcrumbs.
  const segmentsToProcess: { segment: string; href: string }[] = [];

  if (currentApp && currentPathname.startsWith(currentApp.basePath)) {
    const appBaseSegments = currentApp.basePath.split("/").filter(Boolean);
    const subSegments = rawSegments.slice(appBaseSegments.length);
    const defaultSubSegments = (currentApp.defaultSubPath ?? "")
      .split("/")
      .filter(Boolean);

    // App's base breadcrumb (e.g. Recursos Humanos)
    segmentsToProcess.push({
      segment: appBaseSegments[appBaseSegments.length - 1],
      href: currentApp.basePath,
    });

    const startsWithDefaultSub =
      defaultSubSegments.length > 0 &&
      defaultSubSegments.every((seg, i) => subSegments[i] === seg);

    const remainingSubSegments = startsWithDefaultSub
      ? subSegments.slice(defaultSubSegments.length)
      : subSegments;

    let cumulativePath = startsWithDefaultSub
      ? `${currentApp.basePath}/${defaultSubSegments.join("/")}`
      : currentApp.basePath;

    for (const sub of remainingSubSegments) {
      cumulativePath += `/${sub}`;
      segmentsToProcess.push({
        segment: sub,
        href: cumulativePath,
      });
    }
  } else {
    let currentHref = "";
    for (const seg of rawSegments) {
      currentHref += `/${seg}`;
      segmentsToProcess.push({
        segment: seg,
        href: currentHref,
      });
    }
  }

  // Build crumbs
  const crumbs = segmentsToProcess.map(({ segment, href }, index) => {
    const isLast = index === segmentsToProcess.length - 1;

    // Try to find label
    let label = SEGMENT_LABELS[segment];

    if (
      currentApp?.id === "reportes" &&
      segment === "marketing"
    ) {
      label = "Leads";
    }

    // When referencing the app root, use the application's proper display name
    if (currentApp && href === currentApp.basePath) {
      label = currentApp.headerLabel ?? currentApp.name;
    } else if (currentApp) {
      const allLinks: NavLink[] = [];
      currentApp.navLinks.forEach((item) => {
        if (isNavGroup(item)) {
          allLinks.push(...item.links);
        } else {
          allLinks.push(item);
        }
      });

      const foundLink = allLinks.find((link) => {
        const fullLinkPath =
          link.href ??
          `${currentApp.basePath}${link.path === "/" ? "" : link.path}`;
        return fullLinkPath === href;
      });

      if (foundLink) {
        label = foundLink.label;
      }
    }

    if (!label && /^\d+$/.test(segment)) {
      // Numeric ID segment — show generic label instead of raw number
      label = "Solicitud";
    }

    if (!label) {
      // Fallback: format string
      label = segment
        .replace(/-/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
    }

    return { label, href, isLast };
  });

  const handleCrumbClick = (event: MouseEvent<HTMLAnchorElement>, href: string) => {
    if (is_modified_click(event)) return;
    if (currentApp && uses_iframe_in_shell(currentApp)) {
      event.preventDefault();
      navigate_shell_iframe_href(href);
    }
  };

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

        {crumbs.map((crumb) => (
          <li key={crumb.href} className="flex items-center gap-2">
            <ChevronRight className="h-3.5 w-3.5 text-slate-300 shrink-0" />
            {crumb.isLast ? (
              <span className="text-slate-500 font-medium truncate max-w-[150px] sm:max-w-[250px]">
                {crumb.label}
              </span>
            ) : (
              <Link
                href={crumb.href}
                onClick={(event) => handleCrumbClick(event, crumb.href)}
                className="text-slate-400 hover:text-blue-600 transition-colors truncate max-w-[100px] sm:max-w-[200px]"
              >
                {crumb.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
};
