import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/server";
import type { RequisicionAccess } from "@/actions/requisiciones-access-context";

/** Una cosa concreta por hacer (una requisición, una factura, un período). */
export type ItemPendiente = {
  id: string;
  titulo: string;
  detalle: string;
  href: string;
  /** Días que lleva esperando; `null` si no se sabe. */
  dias: number | null;
};

/** Lo que llegó a una bandeja: el total real y los más antiguos para mostrar. `null` = no se pudo leer. */
export type ContenidoBandeja = { total: number; items: ItemPendiente[] };

export type DatosRequisiciones = {
  por_procesar: ContenidoBandeja | null;
  por_sellar_lider: ContenidoBandeja | null;
  por_sellar_coordinador: ContenidoBandeja | null;
  aumento_por_aprobar: ContenidoBandeja | null;
  mias_en_tramite: ContenidoBandeja | null;
};

export type DatosFacturacion = { por_emitir: ContenidoBandeja | null };

const LIMITE = 5;

function dias_desde(fecha: string | null | undefined): number | null {
  if (!fecha) return null;
  const ms = Date.now() - new Date(fecha).getTime();
  return Number.isFinite(ms) ? Math.max(0, Math.floor(ms / 86_400_000)) : null;
}

async function seguro<T>(fn: () => PromiseLike<T>): Promise<T | null> {
  try {
    return await fn();
  } catch (error) {
    console.error("[administracion-dashboard]", error);
    return null;
  }
}

/** Los ids de conf_estatus cambian entre entornos: se resuelven por tabla y nombre. */
const estatus_ids = cache(
  async (tabla: string): Promise<Record<string, number>> => {
    const admin = await createAdminClient();
    const { data } = await admin
      .from("conf_estatus")
      .select("id, nombre_estado")
      .eq("tabla_referencia", tabla);
    const ids: Record<string, number> = {};
    for (const row of (data ?? []) as Array<{ id: number; nombre_estado: string }>) {
      ids[row.nombre_estado] = row.id;
    }
    return ids;
  },
);

type Admin = Awaited<ReturnType<typeof createAdminClient>>;
type Fila = Record<string, unknown>;

async function leer(
  armar: (admin: Admin) => PromiseLike<{
    data: unknown[] | null;
    count: number | null;
    error: unknown;
  }>,
  a_item: (fila: Fila) => ItemPendiente,
): Promise<ContenidoBandeja | null> {
  const admin = await createAdminClient();
  const { data, count, error } = await armar(admin);
  if (error) {
    console.error("[administracion-dashboard] lectura", error);
    return null;
  }
  const items = ((data ?? []) as Fila[]).map(a_item);
  return { total: count ?? items.length, items };
}

const texto = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

function item_requisicion(fila: Fila): ItemPendiente {
  const id = Number(fila.id);
  const que = texto(fila.item_solicitado) || texto(fila.tipo_solicitud) || "Requisición";
  const quien = [texto(fila.departamento), texto(fila.solicitante)].filter(Boolean).join(" · ");
  return {
    id: `req-${id}`,
    titulo: `#${id} · ${que}`,
    detalle: quien,
    href: `/requisiciones/view/${id}`,
    dias: dias_desde(texto(fila.created_at) || null),
  };
}

const CAMPOS_REQ = "id, item_solicitado, tipo_solicitud, departamento, solicitante, created_at";

export async function cargar_requisiciones(
  access: RequisicionAccess,
  auth_user_id: string,
): Promise<DatosRequisiciones> {
  const base = (admin: Admin) =>
    admin
      .from("requisiciones")
      .select(CAMPOS_REQ, { count: "exact" })
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(LIMITE);

  const depts_aprobador = [
    ...new Set([...access.coord_depts, ...access.lider_depts]),
  ];
  const ve_aumento =
    access.can_approve_aumento || access.can_approve_coord || access.can_approve_lider;

  const [procesar, lider, coord, aumento, mias] = await Promise.all([
    access.can_process
      ? seguro(() =>
          leer(
            (admin) =>
              base(admin)
                .eq("estatus_admin", "pendiente")
                .or("lider_estatus.is.null,lider_estatus.eq.aprobada")
                .or("coordinador_estatus.is.null,coordinador_estatus.eq.aprobada"),
            item_requisicion,
          ),
        )
      : null,
    access.can_approve_lider && access.lider_depts.length > 0
      ? seguro(() =>
          leer(
            (admin) =>
              base(admin)
                .eq("lider_estatus", "pendiente")
                .neq("created_by", auth_user_id)
                .in("departamento", access.lider_depts),
            item_requisicion,
          ),
        )
      : null,
    access.can_approve_coord && access.coord_depts.length > 0
      ? seguro(() =>
          leer(
            (admin) =>
              base(admin)
                .eq("coordinador_estatus", "pendiente")
                .neq("created_by", auth_user_id)
                .in("departamento", access.coord_depts),
            item_requisicion,
          ),
        )
      : null,
    ve_aumento && (access.can_approve_aumento || depts_aprobador.length > 0)
      ? seguro(() =>
          leer((admin) => {
            let query = base(admin)
              .eq("aumento_costos_estatus", "pendiente")
              .neq("created_by", auth_user_id);
            if (!access.can_approve_aumento) {
              query = query.in("departamento", depts_aprobador);
            }
            return query;
          }, item_requisicion),
        )
      : null,
    access.can_access_own || access.can_create
      ? seguro(() =>
          leer(
            (admin) =>
              base(admin)
                .eq("created_by", auth_user_id)
                .eq("estatus_admin", "pendiente"),
            item_requisicion,
          ),
        )
      : null,
  ]);

  return {
    por_procesar: procesar,
    por_sellar_lider: lider,
    por_sellar_coordinador: coord,
    aumento_por_aprobar: aumento,
    mias_en_tramite: mias,
  };
}

/** Solo lo que Administración emite. La revisión de Finanzas es de Negocios y no sale aquí. */
export async function cargar_facturacion(): Promise<DatosFacturacion> {
  const ids = await seguro(() => estatus_ids("factura_solicitudes"));
  const id = ids?.["Pendiente Administración"];
  if (!id) return { por_emitir: null };
  const por_emitir = await seguro(() =>
    leer(
      (admin) =>
        admin
          .from("factura_solicitudes")
          .select("id, nro_factura, created_at, empresas(razon_social)", {
            count: "exact",
          })
          .eq("id_estatus", id)
          .order("created_at", { ascending: false })
          .limit(LIMITE),
      (fila) => {
        const empresa = fila.empresas as { razon_social?: string } | null;
        const nro = texto(fila.nro_factura);
        return {
          id: `fac-${fila.id}`,
          titulo: nro ? `Factura ${nro}` : `Solicitud #${fila.id}`,
          detalle: texto(empresa?.razon_social),
          href: "/requisiciones/facturacion",
          dias: dias_desde(texto(fila.created_at) || null),
        };
      },
    ),
  );
  return { por_emitir };
}
