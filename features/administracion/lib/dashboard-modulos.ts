import {
  BookOpen,
  Calculator,
  Calendar,
  ClipboardList,
  FilePlus2,
  Landmark,
  ListOrdered,
  Package,
  Receipt,
  Settings,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { RequisicionAccess } from "@/actions/requisiciones-access-context";
import type {
  ContenidoBandeja,
  DatosFacturacion,
  DatosRequisiciones,
} from "./dashboard-data";

/** Una bandeja: lo que toca hacer en un módulo, con las cosas concretas más recientes primero. */
export type BandejaDashboard = {
  id: string;
  titulo: string;
  /** Qué hay que hacer con esto, en una línea. */
  ayuda: string;
  contenido: ContenidoBandeja;
  href_todos: string;
  cta_todos: string;
  /** Texto cuando no hay nada. */
  al_dia: string;
  /** Se muestra aun sin nada pendiente (la tarea es del rol); si no, se oculta vacía. */
  fija: boolean;
  /** «accion»: te toca a ti. «seguimiento»: solo para estar al tanto, no cuenta como por hacer. */
  tipo: "accion" | "seguimiento";
  /** Frase del resumen: «requisición espera que la proceses» / «requisiciones esperan que las proceses». */
  frase: { uno: string; otros: string };
  /** Verbo de lo que hay que hacer, para el botón del resumen. */
  hacer: string;
};

export type AccesoDashboard = {
  label: string;
  descripcion: string;
  href: string;
  icon: LucideIcon;
};

export type ModuloDashboard = {
  id: "requisiciones" | "facturacion" | "presupuesto-mensual";
  titulo: string;
  subtitulo: string;
  descripcion: string;
  icon: LucideIcon;
  href: string;
  bandejas: BandejaDashboard[];
  accesos: AccesoDashboard[];
};

/** Permisos de Presupuesto mensual (authprisma `spresupuesto`). */
export type PermisosPresupuesto = {
  presupuesto_ver: boolean;
  presupuesto_editar: boolean;
  nomina_ver: boolean;
  nomina_configurar: boolean;
  apu_ver: boolean;
  algo: boolean;
};

export function permisos_presupuesto(slugs: string[]): PermisosPresupuesto {
  const t = (slug: string) => slugs.includes(slug);
  return {
    presupuesto_ver: t("presupuesto:ver") || t("presupuesto:editar"),
    presupuesto_editar: t("presupuesto:editar"),
    nomina_ver: t("nomina:ver"),
    nomina_configurar: t("nomina:configurar"),
    apu_ver: t("apu:ver") || t("nomina:ver"),
    algo: slugs.length > 0,
  };
}

export type PermisosFacturacion = { admin: boolean; finanzas: boolean };

export function permisos_facturacion(slugs: string[]): PermisosFacturacion {
  return {
    admin: slugs.includes("admin:facturacion:access"),
    finanzas: slugs.includes("finance:facturacion:access"),
  };
}

const PM = "/presupuesto-mensual";

function bandeja(
  b: Omit<BandejaDashboard, "contenido"> & { contenido: ContenidoBandeja | null },
): BandejaDashboard[] {
  if (!b.contenido) return [];
  if (!b.fija && b.contenido.total === 0) return [];
  return [{ ...b, contenido: b.contenido }];
}

export function modulo_requisiciones(
  access: RequisicionAccess,
  datos: DatosRequisiciones,
  puede_catalogo: boolean,
): ModuloDashboard | null {
  const ve_lista =
    access.can_access_own || access.can_access_depto || access.can_create;
  const ve_algo =
    ve_lista ||
    access.can_process ||
    access.can_approve_coord ||
    access.can_approve_lider ||
    access.can_approve_aumento;
  if (!ve_algo) return null;

  const bandejas: BandejaDashboard[] = [
    ...bandeja({
      id: "req-procesar",
      tipo: "accion",
      frase: { uno: "requisición espera que la proceses", otros: "requisiciones esperan que las proceses" },
      hacer: "Procesarlas",
      titulo: "Por procesar",
      ayuda: "Requisiciones ya aprobadas que esperan tu trámite en Administración.",
      contenido: datos.por_procesar,
      href_todos: "/requisiciones/gestion",
      cta_todos: "Ir a gestión",
      al_dia: "No hay requisiciones esperando trámite.",
      fija: access.can_process,
    }),
    ...bandeja({
      id: "req-aumento",
      tipo: "accion",
      frase: { uno: "aumento de costos espera tu aprobación", otros: "aumentos de costos esperan tu aprobación" },
      hacer: "Aprobar o rechazar",
      titulo: "Aumentos de costos por aprobar",
      ayuda: "Piden más de lo que la OSI deja de margen: hay que aprobar o rechazar.",
      contenido: datos.aumento_por_aprobar,
      href_todos: access.can_process ? "/requisiciones/gestion" : "/requisiciones",
      cta_todos: "Revisar",
      al_dia: "No hay aumentos pendientes.",
      fija: access.can_approve_aumento,
    }),
    ...bandeja({
      id: "req-lider",
      tipo: "accion",
      frase: { uno: "requisición espera tu sello como líder", otros: "requisiciones esperan tu sello como líder" },
      hacer: "Sellarlas",
      titulo: "Por sellar como líder",
      ayuda: "Requisiciones de tu gerencia que esperan tu sello.",
      contenido: datos.por_sellar_lider,
      href_todos: "/requisiciones",
      cta_todos: "Ver mis pendientes",
      al_dia: "No hay nada por sellar.",
      fija: false,
    }),
    ...bandeja({
      id: "req-coord",
      tipo: "accion",
      frase: { uno: "requisición espera tu sello como coordinador", otros: "requisiciones esperan tu sello como coordinador" },
      hacer: "Sellarlas",
      titulo: "Por sellar como coordinador",
      ayuda: "Requisiciones de tu departamento que esperan tu sello.",
      contenido: datos.por_sellar_coordinador,
      href_todos: "/requisiciones",
      cta_todos: "Ver mis pendientes",
      al_dia: "No hay nada por sellar.",
      fija: false,
    }),
    ...bandeja({
      id: "req-mias",
      tipo: "seguimiento",
      frase: { uno: "requisición tuya aún no se procesa", otros: "requisiciones tuyas aún no se procesan" },
      hacer: "Ver su estado",
      titulo: "Tus requisiciones en trámite",
      ayuda: "Las que emitiste y todavía no se procesan.",
      contenido: datos.mias_en_tramite,
      href_todos: "/requisiciones",
      cta_todos: "Ver mis requisiciones",
      al_dia: "",
      fija: false,
    }),
  ];

  const accesos: AccesoDashboard[] = [];
  if (access.can_create) {
    accesos.push({
      label: "Nueva requisición",
      descripcion: "Pide materiales, servicios o inventario.",
      href: "/requisiciones/create?from=administracion",
      icon: FilePlus2,
    });
  }
  if (ve_lista) {
    accesos.push({
      label: "Mis requisiciones",
      descripcion: "Las que emitiste y las que te toca sellar.",
      href: "/requisiciones",
      icon: ListOrdered,
    });
  }
  if (access.can_process) {
    accesos.push({
      label: "Gestión de requisiciones",
      descripcion: "Bandeja de Administración: tramitar y dar seguimiento.",
      href: "/requisiciones/gestion",
      icon: ClipboardList,
    });
  }
  if (access.can_view_inventario) {
    accesos.push({
      label: "Inventario de insumos",
      descripcion: "Existencias, consumo y reposición.",
      href: "/requisiciones/depositos",
      icon: Package,
    });
  }
  if (puede_catalogo) {
    accesos.push({
      label: "Catálogo",
      descripcion: "Ítems base y costos de las requisiciones.",
      href: "/requisiciones/catalogo-base",
      icon: BookOpen,
    });
  }

  return {
    id: "requisiciones",
    titulo: "Requisiciones",
    subtitulo: "Compras y solicitudes",
    descripcion:
      "Emisión, aprobación y seguimiento de las solicitudes de compra, materiales y servicios.",
    icon: ClipboardList,
    href: "/requisiciones",
    bandejas,
    accesos,
  };
}

export function modulo_facturacion(
  permisos: PermisosFacturacion,
  datos: DatosFacturacion,
): ModuloDashboard | null {
  if (!permisos.admin && !permisos.finanzas) return null;
  const href = "/requisiciones/facturacion";
  // La revisión de Finanzas y la cobranza son de Negocios: aquí solo lo que Administración emite.
  const bandejas = permisos.admin
    ? bandeja({
        id: "fac-emitir",
      tipo: "accion",
      frase: { uno: "factura espera que la emitas", otros: "facturas esperan que las emitas" },
      hacer: "Emitirlas",
        titulo: "Facturas por emitir",
        ayuda: "Finanzas ya las revisó: falta que Administración las emita.",
        contenido: datos.por_emitir,
        href_todos: href,
        cta_todos: "Ir a facturación",
        al_dia: "No hay facturas esperando emisión.",
        fija: true,
      })
    : [];
  return {
    id: "facturacion",
    titulo: "Facturación",
    subtitulo: "Emisión fiscal",
    descripcion:
      "Solicitudes de factura que llegan de Negocios para que Administración las emita.",
    icon: Landmark,
    href,
    bandejas,
    accesos: [
      {
        label: "Facturación",
        descripcion: "Bandeja de solicitudes y emisión de facturas.",
        href,
        icon: Landmark,
      },
    ],
  };
}

/** Sin bandejas: Nómina, APU y presupuesto se muestran con las tarjetas de la propia app (ver PresupuestoWidgetsFrame). */
export function modulo_presupuesto_mensual(
  permisos: PermisosPresupuesto,
): ModuloDashboard | null {
  if (!permisos.algo) return null;
  const bandejas: BandejaDashboard[] = [];

  const accesos: AccesoDashboard[] = [
    {
      label: "Inicio de Presupuesto mensual",
      descripcion: "Qué toca ahora, nómina, APU, presupuesto y cierre.",
      href: PM,
      icon: Wallet,
    },
  ];
  if (permisos.nomina_ver) {
    accesos.push(
      {
        label: "Nómina mes a mes",
        descripcion: "Períodos de pago, revisión y recibos.",
        href: `${PM}/apu`,
        icon: Receipt,
      },
      {
        label: "Empleados y sueldos",
        descripcion: "Quién está en nómina y su sueldo base.",
        href: `${PM}/apu/empleados`,
        icon: Users,
      },
    );
  }
  if (permisos.apu_ver) {
    accesos.push({
      label: "Consolidado APU",
      descripcion: "Costo laboral por trabajador y por mes.",
      href: `${PM}/apu/consolidado`,
      icon: Calculator,
    });
  }
  if (permisos.presupuesto_ver) {
    accesos.push(
      {
        label: "Presupuesto del año",
        descripcion: "Presupuesto de la empresa, mes a mes.",
        href: `${PM}/presupuesto`,
        icon: Wallet,
      },
      {
        label: "Cierre del mes",
        descripcion: "Cerrar el mes y enviar metas a Negocios.",
        href: `${PM}/cierre`,
        icon: Calendar,
      },
    );
  }
  if (permisos.nomina_configurar || permisos.presupuesto_editar) {
    accesos.push({
      label: "Configuración",
      descripcion: "Reglas de nómina, APU y presupuesto.",
      href: permisos.nomina_configurar
        ? `${PM}/apu/configuracion`
        : `${PM}/presupuesto/configuracion`,
      icon: Settings,
    });
  }

  return {
    id: "presupuesto-mensual",
    titulo: "Presupuesto mensual",
    subtitulo: "Presupuesto, nómina y APU",
    descripcion:
      "Presupuesto de la empresa, nómina y costo laboral de cada trabajador, con el cierre de cada mes.",
    icon: Wallet,
    href: PM,
    bandejas,
    accesos,
  };
}
