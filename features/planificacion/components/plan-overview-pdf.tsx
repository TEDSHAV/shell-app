import { Document, Page, View, Text } from "@react-pdf/renderer";
import type { PlanApp, PlanTarea } from "../lib/types";
import {
  is_tarea_done,
  is_tarea_in_progress,
  is_tarea_no_solicitada,
  is_tarea_planned,
  tarea_avance,
} from "../lib/task-progress";
import { flatten_plan_tasks } from "../lib/flatten-plan-tasks";
import { prisma_kpis_from_tareas, type RatioKpi } from "../lib/prisma-kpis";
import { sort_tareas_adicional_last } from "../lib/sort-tareas";
import { COL, ORIGIN_HEX, pdf_styles as styles } from "./plan-overview-pdf-styles";
import { people_on_tarea } from "../lib/people";

function owner_label(nombre: string | undefined): string {
  if (!nombre) return "Sin asignar";
  const parts = nombre.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Sin asignar";
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[1][0]}.`;
}

function KpiCell({
  label,
  value,
  accent,
  last,
}: {
  label: string;
  value: RatioKpi | { pct: number };
  accent?: boolean;
  last?: boolean;
}) {
  const is_pct = "pct" in value;
  const pct = is_pct
    ? value.pct
    : value.total === 0
      ? 0
      : Math.round((value.done / value.total) * 100);
  return (
    <View
      style={[
        accent ? styles.kpiCardAccent : styles.kpiCard,
        last && !accent ? { marginRight: 0 } : {},
      ]}
      wrap={false}
    >
      <Text style={accent ? styles.kpiLabelOnAccent : styles.kpiLabel}>
        {label}
      </Text>
      {is_pct ? (
        <Text style={accent ? styles.kpiValueOnAccent : styles.kpiValue}>
          {value.pct}%
        </Text>
      ) : (
        <Text style={styles.kpiValue}>
          {value.done}
          <Text style={styles.kpiMuted}>/{value.total}</Text>
        </Text>
      )}
      <View style={accent ? styles.barTrackOnAccent : styles.barTrack}>
        <View
          style={[
            accent ? styles.barFillOnAccent : styles.barFill,
            { width: `${pct}%` },
          ]}
        />
      </View>
    </View>
  );
}

function ColHead() {
  const cells: Array<[string, string, "left" | "right" | "center"]> = [
    [COL.title, "Tarea", "left"],
    [COL.pct, "Avance", "right"],
    [COL.trim, "Trim.", "center"],
    [COL.owner, "Responsable", "left"],
    [COL.origin, "Origen", "left"],
  ];
  return (
    <View style={styles.colHead}>
      {cells.map(([width, label, align]) => (
        <Text
          key={label}
          style={[
            styles.colHeadText,
            {
              width,
              textAlign: align,
              paddingLeft: align === "left" && label !== "Tarea" ? 4 : 0,
            },
          ]}
        >
          {label}
        </Text>
      ))}
    </View>
  );
}

function TaskLines({
  title,
  tareas,
}: {
  title: string;
  tareas: PlanTarea[];
}) {
  if (tareas.length === 0) return null;
  const ordered = sort_tareas_adicional_last(tareas);
  const [first, ...rest] = ordered;
  return (
    <View>
      <View wrap={false} minPresenceAhead={56}>
        <Text style={styles.groupTitle}>
          {title} ({ordered.length})
        </Text>
        <ColHead />
        <TaskRow tarea={first} />
      </View>
      {rest.map((tarea) => (
        <View key={tarea.id} wrap={false}>
          <TaskRow tarea={tarea} />
        </View>
      ))}
    </View>
  );
}

function TaskRow({ tarea }: { tarea: PlanTarea }) {
  return (
    <View style={styles.taskRow}>
      <Text style={styles.taskTitle}>{tarea.titulo}</Text>
      <Text style={styles.cellPct}>
        {tarea.no_solicitada ? "—" : `${tarea_avance(tarea)}%`}
      </Text>
      <Text style={styles.cellTrim}>{tarea.trimestre ?? "—"}</Text>
      <Text style={styles.cellOwner}>
        {people_on_tarea(tarea).length
          ? people_on_tarea(tarea)
              .map((person) => owner_label(person.nombre))
              .join(", ")
          : "Sin asignar"}
      </Text>
      <View style={styles.cellOrigin}>
        <View
          style={[styles.badge, { backgroundColor: ORIGIN_HEX[tarea.origen] }]}
        >
          <Text style={styles.badgeText}>{tarea.origen}</Text>
        </View>
      </View>
    </View>
  );
}

function AppBlock({ app }: { app: PlanApp }) {
  return (
    <View>
      <View wrap={false} minPresenceAhead={72}>
        <View style={styles.appHead}>
          <Text style={styles.appName}>{app.nombre}</Text>
          <Text style={styles.appMeta}>
            {app.progress}% · {app.salud}
          </Text>
        </View>
        {app.modulos.length === 0 ? (
          <Text style={styles.empty}>Sin módulos en este filtro</Text>
        ) : null}
      </View>
      {app.modulos.map((modulo) => {
        const task_n = modulo.tareas.length;
        return (
          <View
            key={modulo.id}
            style={styles.moduleBlock}
            wrap={task_n > 8}
            minPresenceAhead={80}
          >
            <View wrap={false} minPresenceAhead={84}>
              <View style={styles.moduleHead}>
                <View>
                  <Text style={styles.modulePath}>{app.nombre}</Text>
                  <Text style={styles.moduleName}>{modulo.nombre}</Text>
                </View>
                <Text style={styles.modulePct}>{modulo.progress}%</Text>
              </View>
            </View>
            <TaskLines
              title="Completados"
              tareas={modulo.tareas.filter((t) => is_tarea_done(t))}
            />
            <TaskLines
              title="En proceso"
              tareas={modulo.tareas.filter((t) => is_tarea_in_progress(t))}
            />
            <TaskLines
              title="Planificado"
              tareas={modulo.tareas.filter((t) => is_tarea_planned(t))}
            />
            <TaskLines
              title="No solicitadas"
              tareas={modulo.tareas.filter((t) => is_tarea_no_solicitada(t))}
            />
          </View>
        );
      })}
    </View>
  );
}

export function PlanOverviewPdfDocument({
  apps,
  anio,
  captured_at = null,
}: {
  apps: PlanApp[];
  anio: number;
  captured_at?: string | null;
}) {
  const printed = captured_at
    ? `Foto ${new Date(captured_at).toLocaleString("es-VE")}`
    : new Date().toLocaleString("es-VE");
  const kpis = prisma_kpis_from_tareas(
    flatten_plan_tasks(apps).map((item) => item.tarea),
  );
  const live = apps.filter((app) => app.progress > 0);
  const idle = apps.filter((app) => app.progress <= 0);
  return (
    <Document title={`PRISMA ${anio}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.topbar} fixed>
          <View>
            <Text style={styles.brand}>PRISMA</Text>
            <Text style={styles.brandSub}>
              Planificación TED · módulos y tareas
            </Text>
          </View>
          <Text style={styles.year}>{anio}</Text>
        </View>

        <View style={styles.kpiRow} wrap={false}>
          <KpiCell label="Tareas" value={kpis.tareas} />
          <KpiCell label="Planificado" value={kpis.plan} />
          <KpiCell label="Requerimientos" value={kpis.requerimientos} />
          <KpiCell label="Adicional" value={kpis.adicional} />
          <KpiCell label="Avance Prisma" value={{ pct: kpis.avance }} accent last />
        </View>

        {live.map((app) => (
          <AppBlock key={app.id} app={app} />
        ))}
        {idle.length > 0 ? (
          <View>
            <Text style={styles.sectionIdle} minPresenceAhead={48}>
              Sin avance
            </Text>
            {idle.map((app) => (
              <AppBlock key={app.id} app={app} />
            ))}
          </View>
        ) : null}

        <Text
          style={styles.footer}
          render={({ pageNumber, totalPages }) =>
            `TED · ${printed}            ${pageNumber} / ${totalPages}`
          }
          fixed
        />
      </Page>
    </Document>
  );
}
