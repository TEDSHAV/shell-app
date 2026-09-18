"use client";

import { ManualArticle } from "@/components/manual/ManualArticle";

export function TicketsManual() {
  return (
    <ManualArticle
      kicker="TED"
      title="Manual de tickets"
      lead="El usuario pide por el formulario. TED trabaja la cola y, si aplica, promueve el ticket a una tarea del plan."
      chips={[
        { id: "manual-inbox", label: "Inbox" },
        { id: "manual-promover", label: "Promover" },
        { id: "manual-origen-ticket", label: "Origen TICKET" },
      ]}
      sections={[
        {
          id: "manual-inbox",
          title: "Inbox TED vs formulario",
          body: (
            <>
              <p>
                Quien no es TED abre un ticket desde Tickets en el header:
                describe el problema y espera respuesta. No ve la cola
                interna ni el plan.
              </p>
              <p>
                TED usa el inbox (también en Planificación → Tickets) para
                clasificar, comentar y cerrar. Es la misma tabla; cambia la
                superficie según el rol.
              </p>
            </>
          ),
        },
        {
          id: "manual-promover",
          title: "Promover a tarea",
          body: (
            <>
              <p>
                Cuando el pedido requiere trabajo en Prisma, TED lo promueve:
                se crea (o reutiliza) una tarea en un módulo, con vínculo al
                ticket. Desde ahí el avance se sigue en planificación, no
                solo en el hilo del ticket.
              </p>
            </>
          ),
        },
        {
          id: "manual-origen-ticket",
          title: "Origen TICKET",
          body: (
            <>
              <p>
                Esa tarea nace con origen TICKET. Si más adelante cubre un
                objetivo del mes, se liga con el chip Objetivo; el origen
                sigue siendo TICKET. No use GERENCIA: el compromiso de
                gerencia es el objetivo, no la etiqueta de origen.
              </p>
            </>
          ),
        },
      ]}
    />
  );
}
