import { send_mail, shell_public_url } from "@/lib/email/send";
import { build_ted_html_email } from "@/lib/email/ted-mail";
import { email_escape } from "@/lib/email/layout";
import { format_month_label } from "./plan-month";
import type { PlanMailRol } from "./plan-mail-recipients";
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

function cambio_label(kind: PlanMesCambioKind, titulo: string): string {
  switch (kind) {
    case "anadido":
      return `Se añadió el objetivo «${titulo}».`;
    case "quitado":
      return `Se quitó el objetivo «${titulo}».`;
    case "editado":
      return `Se modificó el objetivo «${titulo}».`;
    case "lote":
      return titulo.trim() || "Se actualizó el plan con varios cambios.";
    default: {
      const _never: never = kind;
      return _never;
    }
  }
}

function objetivos_path(mes: string): string {
  return `/ted/planificacion/objetivos?mes=${mes}`;
}

function prisma_link(path: string): string {
  const base = shell_public_url();
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${base}${suffix}`;
}

function audience_copy(audience: PlanMailRol): {
  greeting_text: string;
  greeting_html: string;
  who: string;
  rol_label: string;
} {
  if (audience === "solicitante") {
    return {
      greeting_text: "Estimada gerencia (solicitantes del plan),",
      greeting_html:
        "Estimada <strong>gerencia</strong> (solicitantes del plan),",
      who: "solicitantes · gerencia",
      rol_label: "Solicitantes (gerencia)",
    };
  }
  return {
    greeting_text: "Estimado equipo de Tecnología y Desarrollo (TED),",
    greeting_html:
      "Estimado equipo de <strong>Tecnología y Desarrollo (TED)</strong> (ejecutantes),",
    who: "ejecutantes · equipo TED",
    rol_label: "Ejecutantes (equipo TED)",
  };
}

export async function email_plan_mes(input: {
  plan: PlanMes;
  kind: "emitido" | PlanMesCambioKind;
  cambio_titulo?: string;
  items: PlanObjetivoResumen[];
  ejecutantes: string[];
  solicitantes: string[];
}): Promise<void> {
  await send_plan_audience_mail({ ...input, audience: "ejecutante", to: input.ejecutantes });
  await send_plan_audience_mail({ ...input, audience: "solicitante", to: input.solicitantes });
}

async function send_plan_audience_mail(input: {
  plan: PlanMes;
  kind: "emitido" | PlanMesCambioKind;
  cambio_titulo?: string;
  items: PlanObjetivoResumen[];
  audience: PlanMailRol;
  to: string[];
}): Promise<void> {
  const dest = [...new Set(input.to.map((item) => item.trim()).filter(Boolean))];
  if (dest.length === 0) return;

  const label = format_month_label(input.plan.mes);
  const path = objetivos_path(input.plan.mes);
  const cta_href = prisma_link(path);
  const list = list_text(input.items);
  const people = audience_copy(input.audience);
  const for_gerencia = input.audience === "solicitante";
  const cta_hint = for_gerencia
    ? "Destino: Objetivos del mes en PRISMA (compromiso solicitado por gerencia). Si no hay sesión, inicia sesión y te lleva a esa vista."
    : "Destino: Planificación TED → Objetivos de ese mes. Si ya tienes sesión en PRISMA, entra directo. Si no, inicia sesión y te lleva a esa misma vista.";

  const copy =
    input.kind === "emitido"
      ? {
          highlight: for_gerencia
            ? `Gerencia: se EMITIÓ el plan de ${label} (versión ${input.plan.version}). Este correo es para los solicitantes. TED cubrirá estos objetivos.`
            : `Equipo TED: gerencia acaba de EMITIR el plan de ${label} (versión ${input.plan.version}). Ustedes son los ejecutantes que cubren el plan.`,
          subject: `[Plan TED] EMISIÓN · ${people.who} · ${label} (v${input.plan.version})`,
          tipo_aviso: "Emisión inicial del plan",
          cta_label: `Abrir objetivos de ${label}`,
          title: `Se emitió el plan de ${label}`,
          subtitle: for_gerencia
            ? "Confirmación del compromiso solicitado por gerencia"
            : "Publicación inicial: TED cubre el plan emitido",
          intro: `${people.greeting_html}<br>${
            for_gerencia
              ? "Este correo es la <strong>emisión del plan del mes</strong> para <strong>solicitantes (gerencia)</strong>. El equipo TED lo ejecutará."
              : "Este correo es la <strong>emisión del plan del mes</strong> para <strong>ejecutantes (equipo TED)</strong>. Gerencia acaba de publicarlo."
          }`,
          header_variant: "emitido" as const,
          text_aviso: for_gerencia
            ? `AVISO DE EMISIÓN para solicitantes (gerencia). Se publicó el plan de ${label} (v${input.plan.version}).`
            : `AVISO DE EMISIÓN para ejecutantes (TED). Gerencia publicó el plan de ${label} (v${input.plan.version}).`,
        }
      : (() => {
          const cambio_txt = cambio_label(input.kind, input.cambio_titulo ?? "");
          const tipo_aviso = ((): string => {
            switch (input.kind) {
              case "anadido":
                return "Cambio: alta de objetivo";
              case "quitado":
                return "Cambio: baja de objetivo";
              case "editado":
                return "Cambio: edición de objetivo";
              case "lote":
                return "Cambio: actualización del plan";
              default: {
                const _never: never = input.kind;
                return _never;
              }
            }
          })();
          return {
            highlight: for_gerencia
              ? `Solicitantes: el plan de ${label} ya estaba emitido. CAMBIO (v${input.plan.version}). ${cambio_txt}`
              : `Ejecutantes TED: el plan de ${label} ya estaba emitido. CAMBIO (v${input.plan.version}). ${cambio_txt}`,
            subject: `[Plan TED] CAMBIO · ${people.who} · ${label} (v${input.plan.version})`,
            tipo_aviso,
            cta_label: `Abrir objetivos de ${label}`,
            title: `Hay un cambio en el plan de ${label}`,
            subtitle: for_gerencia
              ? "Actualización del plan solicitado por gerencia"
              : "Actualización del plan que TED debe cubrir",
            intro: `${people.greeting_html}<br>Este correo es un <strong>cambio sobre el plan ya emitido</strong> de ${email_escape(label)}, dirigido a <strong>${email_escape(people.rol_label)}</strong>. ${email_escape(cambio_txt)}`,
            header_variant: "cambio" as const,
            text_aviso: `AVISO DE CAMBIO para ${people.rol_label}. ${cambio_txt} Versión actual: v${input.plan.version}.`,
          };
        })();

  const text = [
    people.greeting_text,
    "",
    copy.text_aviso,
    "",
    `Destinatarios de esta copia: ${people.rol_label}`,
    "",
    "Objetivos vigentes:",
    list,
    "",
    `Enlace a la vista de objetivos: ${cta_href}`,
  ].join("\n");

  const html = build_ted_html_email({
    subject: copy.subject,
    chip:
      input.kind === "emitido"
        ? `EMISIÓN · ${people.who} · ${label} · v${input.plan.version}`
        : `CAMBIO · ${people.who} · ${label} · v${input.plan.version}`,
    title: copy.title,
    subtitle: copy.subtitle,
    intro: copy.intro,
    highlight: copy.highlight,
    header_variant: copy.header_variant,
    rows: [
      { label: "Copia para", value: people.rol_label },
      { label: "Tipo de aviso", value: copy.tipo_aviso },
      { label: "Mes", value: label },
      { label: "Estado del plan", value: "Emitido" },
      { label: "Versión", value: String(input.plan.version) },
      { label: "Objetivos vigentes", value: String(input.items.length) },
    ],
    notes: list,
    cta_label: copy.cta_label,
    cta_href,
    cta_hint,
    footer:
      "Este es un mensaje automático del Sistema PRISMA (Planificación TED). SHA de Venezuela, C.A.",
  });

  const result = await send_mail({
    to: dest.join(", "),
    subject: copy.subject,
    text,
    html,
  });
  if (result.status !== "sent") {
    console.warn(
      `[email] plan ${input.audience} no enviado (${result.status}) to=${dest.join(",")}`,
      result,
    );
  }
}
