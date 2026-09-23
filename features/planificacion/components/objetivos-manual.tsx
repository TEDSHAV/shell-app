"use client";

import { ManualArticle } from "@/components/manual/ManualArticle";

export function ObjetivosManual() {
  return (
    <ManualArticle
      kicker="Periodo TED"
      title="Manual de objetivos"
      lead="Gerencia plantea el periodo; TED cubre con tareas. El informe del mes separa Compromiso y Plus."
      chips={[
        { id: "manual-dos-pisos", label: "Dos pisos" },
        { id: "manual-cubrir", label: "Cubrir" },
        { id: "manual-compromiso-plus", label: "Compromiso y Plus" },
        { id: "manual-gerencia-origen", label: "Sin origen GERENCIA" },
      ]}
      sections={[
        {
          id: "manual-dos-pisos",
          title: "Dos pisos: objetivo y tarea",
          body: (
            <>
              <p>
                Un objetivo es el compromiso del mes (qué hay que lograr). Una
                tarea es cómo TED lo cubre. El chip Objetivo en la tarea
                muestra esa ligazón; el origen (TICKET, REQUERIMIENTO, etc.)
                dice de dónde nació el trabajo, no reemplaza al objetivo.
              </p>
              <p>
                Quien tenga el rol <strong>gerencia</strong> en la app TED (o el
                permiso <code>objetivos-ted:access-all</code>) puede crear y
                editar objetivos, ver Cubrir e Informe. No cubren: no crean,
                vinculan ni descolgan tareas (eso es rol <strong>ted</strong>).
              </p>
            </>
          ),
        },
        {
          id: "manual-cubrir",
          title: "Cubrir el periodo",
          body: (
            <>
              <p>
                En Cubrir, cada objetivo del mes lista las tareas ligadas.
                TED puede crear una tarea nueva ya vinculada o buscar una
                existente y colgarla. Descolgar deja la tarea suelta (sigue
                en el plan, deja de contar en ese objetivo).
              </p>
              <p>
                Gerencia entra en solo lectura: ve el cubrimiento, sin
                botones de escritura.
              </p>
            </>
          ),
        },
        {
          id: "manual-compromiso-plus",
          title: "Informe: Compromiso y Plus",
          body: (
            <>
              <p>
                Compromiso: objetivos que solapan el mes calendario y las
                tareas con objetivo_id. El % de cada objetivo es el promedio
                de avance de esas tareas. El KPI del informe es el promedio
                de esos porcentajes.
              </p>
              <p>
                Plus: tareas hechas en el mes, sin objetivo, que no sean
                «no solicitada». Ahí cae el extra (por ejemplo ADICIONAL
                suelta). El recuento Plus es cantidad de esa lista, no un
                segundo porcentaje mezclado con planificación.
              </p>
              <p>
                Puede bajar PDF o una foto pública (/informe-publico) con el
                mismo recorte del mes.
              </p>
            </>
          ),
        },
        {
          id: "manual-gerencia-origen",
          title: "GERENCIA ya no es origen",
          body: (
            <>
              <p>
                El pedido de gerencia se carga como objetivo. Las tareas
                antiguas con origen GERENCIA se migraron a REQUERIMIENTO y
                quedaron ligadas a un objetivo. No vuelva a etiquetar una
                tarea como GERENCIA.
              </p>
            </>
          ),
        },
      ]}
    />
  );
}
