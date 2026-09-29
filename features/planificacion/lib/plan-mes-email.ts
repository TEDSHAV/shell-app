import { build_ted_html_email, prisma_link, send_ted_mailbox } from "@/lib/email/ted-mail";
import { email_escape } from "@/lib/email/layout";
import { format_month_label } from "./plan-month";
import type { PlanMes, PlanMesCambioKind, PlanObjetivoResumen } from "./plan-mes";

function list_text(items: PlanObjetivoResumen[]): string {
  if (items.length === 0) return "No hay objetivos vigentes en este mes.";
  return items
    .map((item) => {
      const apps = item.apps.length > 0 ? item.apps.join(" · ") : "Sin app";
      const autor = item.autor ? ` — ${item.autor}` : "";
      return `• ${item.titulo} (${apps}${autor})`;
    })
    .join("\n");
}

function cambio_label(
  kind: PlanMesCambioKind,
  titulo: string,
): string {
  switch (kind) {
    case "anadido":
      return `Se añadió el objetivo «${titulo}».`;
    case "quitado":
      return `Se quitó el objetivo «${titulo}».`;
    case "editado":
      return `Se modificó el objetivo «${titulo}».`;
    default: {
      const _never: never = kind;
      return _never;
    }
  }
}

function objetivos_path(mes: string): string {
  return `/ted/planificacion/objetivos?mes=${mes}`;
}

export async function email_plan_mes(input: {
  plan: PlanMes;
  kind: "emitido" | PlanMesCambioKind;
  cambio_titulo?: string;
  items: PlanObjetivoResumen[];
}): Promise<void> {
  const label = format_month_label(input.plan.mes);
  const path = objetivos_path(input.plan.mes);
  const cta_href = prisma_link(path);
  const list = list_text(input.items);
  const cta_hint =
    "Destino: Planificación TED → Objetivos de ese mes. Si ya tienes sesión en PRISMA, entra directo. Si no, inicia sesión y te lleva a esa misma vista.";

  const copy =
    input.kind === "emitido"
      ? {
          highlight: `Primera publicación: gerencia acaba de EMITIR el plan de ${label} (versión ${input.plan.version}). No es una edición posterior.`,
          subject: `[Plan TED] EMISIÓN · ${label} (v${input.plan.version}) — plan publicado`,
          tipo_aviso: "Emisión inicial del plan",
          cta_label: `Abrir objetivos de ${label} (plan emitido)`,
          title: `Se emitió el plan de ${label}`,
          subtitle: "Publicación inicial del compromiso de gerencia",
          intro:
            "Estimado equipo de <strong>Tecnología y Desarrollo (TED)</strong>,<br>Este correo es la <strong>emisión del plan del mes</strong>: gerencia acaba de publicarlo. No es un aviso de edición.",
          header_variant: "emitido" as const,
          text_aviso: `AVISO DE EMISIÓN (no es un cambio posterior). Gerencia publicó el plan de ${label} (v${input.plan.version}).`,
        }
      : (() => {
          const cambio_txt = cambio_label(
            input.kind,
            input.cambio_titulo ?? "",
          );
          const tipo_aviso = ((): string => {
            switch (input.kind) {
              case "anadido":
                return "Cambio: alta de objetivo";
              case "quitado":
                return "Cambio: baja de objetivo";
              case "editado":
                return "Cambio: edición de objetivo";
              default: {
                const _never: never = input.kind;
                return _never;
              }
            }
          })();
          return {
            highlight: `El plan de ${label} YA ESTABA EMITIDO. Este correo es un CAMBIO sobre esa versión (ahora v${input.plan.version}). ${cambio_txt}`,
            subject: `[Plan TED] CAMBIO · ${label} (v${input.plan.version}) — ${cambio_txt}`,
            tipo_aviso,
            cta_label: `Abrir objetivos de ${label} (ver el cambio)`,
            title: `Hay un cambio en el plan de ${label}`,
            subtitle: "Actualización de un plan que ya estaba emitido",
            intro: `Estimado equipo de <strong>Tecnología y Desarrollo (TED)</strong>,<br>Este correo es un <strong>cambio sobre el plan ya emitido</strong> de ${email_escape(label)}. ${email_escape(cambio_txt)}`,
            header_variant: "cambio" as const,
            text_aviso: `AVISO DE CAMBIO (el plan ya estaba emitido). ${cambio_txt} Versión actual: v${input.plan.version}.`,
          };
        })();

  const text = [
    "Estimado equipo de Tecnología y Desarrollo (TED),",
    "",
    copy.text_aviso,
    "",
    "Objetivos vigentes:",
    list,
    "",
    `Enlace a la vista de objetivos: ${cta_href}`,
    "Si no hay sesión, PRISMA pedirá iniciar sesión y luego mostrará esa vista.",
  ].join("\n");

  const html = build_ted_html_email({
    subject: copy.subject,
    chip:
      input.kind === "emitido"
        ? `EMISIÓN · ${label} · v${input.plan.version}`
        : `CAMBIO · ${label} · v${input.plan.version}`,
    title: copy.title,
    subtitle: copy.subtitle,
    intro: copy.intro,
    highlight: copy.highlight,
    header_variant: copy.header_variant,
    rows: [
      { label: "Tipo de aviso", value: copy.tipo_aviso },
      { label: "Mes", value: label },
      { label: "Estado del plan", value: "Emitido" },
      { label: "Versión", value: String(input.plan.version) },
      { label: "Objetivos vigentes", value: String(input.items.length) },
      { label: "Vista en PRISMA", value: "Planificación TED → Objetivos" },
    ],
    notes: list,
    cta_label: copy.cta_label,
    cta_href,
    cta_hint,
    footer:
      "Este es un mensaje automático del Sistema PRISMA (Planificación TED). SHA de Venezuela, C.A.",
  });

  await send_ted_mailbox({ subject: copy.subject, text, html });
}
