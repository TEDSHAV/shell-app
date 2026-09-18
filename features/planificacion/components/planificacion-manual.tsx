"use client";

import { ManualArticle } from "@/components/manual/ManualArticle";

export function PlanificacionManual() {
  return (
    <ManualArticle
      kicker="TED"
      title="Manual de planificación"
      lead="Cómo se organiza el trabajo Prisma: árbol de apps, plan inicial congelado, Excel y orígenes que sí se pueden crear."
      chips={[
        { id: "manual-mapa-kanban", label: "Mapa y kanban" },
        { id: "manual-avance", label: "Avance" },
        { id: "manual-plan-inicial", label: "Plan inicial" },
        { id: "manual-excel", label: "Excel" },
        { id: "manual-origenes", label: "Orígenes" },
      ]}
      sections={[
        {
          id: "manual-mapa-kanban",
          title: "Árbol, mapa y kanban",
          body: (
            <>
              <p>
                El plan vive en un árbol: aplicación → módulo → tarea. La
                pantalla principal de Planificación muestra ese mapa. Tareas
                ofrece la misma lista en kanban (por estado).
              </p>
              <p>
                No hay dos fuentes de verdad: si mueve una tarjeta en el
                tablero, el mapa refleja el mismo avance y el mismo origen.
              </p>
            </>
          ),
        },
        {
          id: "manual-avance",
          title: "Avance de la tarea",
          body: (
            <>
              <p>
                El porcentaje se guarda en cada tarea. Un objetivo del periodo
                muestra el promedio de las tareas ligadas. Completar una tarea
                pone el avance en 100 % y deja fecha de cierre.
              </p>
            </>
          ),
        },
        {
          id: "manual-plan-inicial",
          title: "Plan inicial vs trabajo extra",
          body: (
            <>
              <p>
                Las filas con origen PLAN son el plan inicial. Quedan
                congeladas: no se crean más PLAN desde la UI. Lo que entra
                después del congelado usa REQUERIMIENTO, USUARIO, TICKET,
                ADICIONAL u otros orígenes abiertos.
              </p>
              <p>
                ADICIONAL sin objetivo cuenta como Plus en el informe. Si la
                liga a un objetivo, entra en Compromiso.
              </p>
            </>
          ),
        },
        {
          id: "manual-excel",
          title: "Excel (Más → importar)",
          body: (
            <>
              <p>
                El archivo de importación está en Más, no como modo de la
                pantalla principal. Puede exportar la plantilla, completar
                módulos y tareas, y volver a subirla.
              </p>
              <p>
                Si el Excel trae la palabra «gerencia» como origen, el sistema
                la mapea a REQUERIMIENTO. Ya no se crean filas GERENCIA.
              </p>
            </>
          ),
        },
        {
          id: "manual-origenes",
          title: "Orígenes al crear",
          body: (
            <>
              <p>
                Alta nueva: REQUERIMIENTO, USUARIO, TICKET, ADICIONAL (y los
                que sigan abiertos en la política). PLAN y GERENCIA no se
                ofrecen. GERENCIA dejó de ser un origen de alta: el pedido de
                gerencia es un objetivo, no una etiqueta de tarea.
              </p>
            </>
          ),
        },
      ]}
    />
  );
}
