import { build_ted_html_email, prisma_link, send_ted_mailbox } from "@/lib/email/ted-mail";

export async function email_ticket_created(input: {
  ticket_id: number;
  titulo: string;
  solicitante: string;
  registrador: string;
  a_nombre: boolean;
  app_nombre: string;
  modulo_nombre: string;
  prioridad: string;
  descripcion: string;
}): Promise<void> {
  const subject = `[Ticket TED #${input.ticket_id}] ${input.titulo}`;
  const cta_href = prisma_link("/ted/planificacion/tickets");
  const rows = [
    { label: "Solicitado por", value: input.solicitante },
    ...(input.a_nombre
      ? [{ label: "Registrado por", value: input.registrador }]
      : []),
    { label: "App", value: input.app_nombre },
    { label: "Módulo", value: input.modulo_nombre },
    { label: "Prioridad", value: input.prioridad },
    { label: "Título", value: input.titulo },
  ];
  const text = [
    `Estimado equipo de Tecnología y Desarrollo (TED),`,
    "",
    `Se registró un ticket que requiere gestión.`,
    "",
    `• Ticket: #${input.ticket_id}`,
    `• Solicitado por: ${input.solicitante}`,
    input.a_nombre ? `• Registrado por: ${input.registrador}` : null,
    `• App: ${input.app_nombre}`,
    `• Módulo: ${input.modulo_nombre}`,
    `• Prioridad: ${input.prioridad}`,
    `• Título: ${input.titulo}`,
    "",
    input.descripcion,
    "",
    cta_href,
  ]
    .filter((line): line is string => line !== null)
    .join("\n");

  const html = build_ted_html_email({
    subject,
    chip: `Ticket #${input.ticket_id} · Solicitud`,
    title: "Nueva solicitud TED · ticket",
    subtitle: "Requerimiento generado desde Prisma para el equipo de TED",
    intro:
      "Estimado equipo de <strong>Tecnología y Desarrollo (TED)</strong>,<br>Se ha registrado un ticket que requiere su gestión en PRISMA.",
    highlight: input.titulo,
    rows,
    notes: input.descripcion,
    meta: `Solicitado por: ${input.solicitante}`,
    cta_label: "Gestionar ticket en PRISMA",
    cta_href,
    footer:
      "Este es un mensaje automático generado por el Sistema PRISMA (Tickets TED). SHA de Venezuela, C.A.",
  });

  await send_ted_mailbox({ subject, text, html });
}
