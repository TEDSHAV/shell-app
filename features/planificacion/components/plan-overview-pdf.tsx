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
import {
  PRISMA_ALCANCE_LEVANTADO_PCT,
  PRISMA_ALCANCE_NOTA,
  PRISMA_APP_ALCANCE_NOTA,
  is_plan_app_alcance_parcial,
  prisma_kpis_from_tareas,
  prisma_plan_rango,
  type RatioKpi,
} from "../lib/prisma-kpis";
import { sort_tareas_adicional_last } from "../lib/sort-tareas";
import { COL, ORIGIN_HEX, pdf_styles as styles } from "./plan-overview-pdf-styles";
import { people_on_tarea, top_contributor_on_modulos } from "../lib/people";

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
  side_lines,
}: {
  label: string;
  value: RatioKpi | { pct: number };
  accent?: boolean;
  last?: boolean;
  side_lines?: [string, string];
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
        last ? { marginRight: 0 } : { marginRight: 6 },
      ]}
      wrap={false}
    >
      <Text style={accent ? styles.kpiLabelOnAccent : styles.kpiLabel}>
        {label}
      </Text>
      {is_pct ? (
        <View style={styles.kpiValueRow}>
          <Text style={accent ? styles.kpiValueOnAccent : styles.kpiValue}>
            {value.pct}%{side_lines ? " /" : ""}
          </Text>
          {side_lines ? (
            <View style={styles.kpiSideLines}>
              <Text style={accent ? styles.kpiHintOnAccent : styles.kpiHint}>
                {side_lines[0]}
              </Text>
              <Text style={accent ? styles.kpiHintOnAccent : styles.kpiHint}>
                {side_lines[1]}
              </Text>
            </View>
          ) : null}
        </View>
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
      <View wrap={false}>
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

function AppBlock({
  app,
  alcance_publico = false,
}: {
  app: PlanApp;
  alcance_publico?: boolean;
}) {
  const admin_note =
    alcance_publico && is_plan_app_alcance_parcial(app.nombre);
  const lead = top_contributor_on_modulos(app.modulos);
  return (
    <View>
      <View wrap={false}>
        <View style={styles.appHead}>
          <Text style={styles.appName}>{app.nombre}</Text>
          <Text style={styles.appMeta}>
            {app.progress}% · {app.salud}
            {alcance_publico
              ? ` · ${lead ? owner_label(lead.nombre) : "Sin asignar"}`
              : ""}
          </Text>
        </View>
        {app.modulos.length === 0 ? (
          <Text style={styles.empty}>Sin módulos en este filtro</Text>
        ) : null}
      </View>
      {app.modulos.map((modulo) => {
        const above_general =
          admin_note && modulo.nombre.trim().toLowerCase() === "general";
        return (
          <View key={modulo.id} style={styles.moduleBlock} wrap>
            {above_general ? (
              <Text style={styles.kpiNote}>{PRISMA_APP_ALCANCE_NOTA}</Text>
            ) : null}
            <View wrap={false}>
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
              {captured_at
                ? prisma_plan_rango(anio, captured_at)
                : "Planificación TED · módulos y tareas"}
            </Text>
          </View>
          <Text style={styles.year}>{anio}</Text>
        </View>

        {captured_at ? (
          <View>
            <View style={styles.kpiRow} wrap={false}>
              <KpiCell label="Tareas" value={kpis.tareas} />
              <KpiCell label="Plan inicial" value={kpis.plan} />
              <KpiCell label="Requerimientos" value={kpis.requerimientos} />
              <KpiCell label="Adicional" value={kpis.adicional} last />
            </View>
            <View style={styles.kpiRow} wrap={false}>
              <KpiCell
                label="Avance Prisma"
                value={{ pct: kpis.avance }}
                accent
                side_lines={["alcance del plan", "hasta hoy"]}
              />
              <KpiCell
                label="Alcance del plan hasta hoy"
                value={{ pct: PRISMA_ALCANCE_LEVANTADO_PCT }}
                last
              />
            </View>
            <View style={styles.alcanceBox} wrap={false}>
              <Text style={styles.kpiNote}>{PRISMA_ALCANCE_NOTA}</Text>
            </View>
          </View>
        ) : (
          <View style={styles.kpiRow} wrap={false}>
            <KpiCell label="Tareas" value={kpis.tareas} />
            <KpiCell label="Plan inicial" value={kpis.plan} />
            <KpiCell label="Requerimientos" value={kpis.requerimientos} />
            <KpiCell label="Adicional" value={kpis.adicional} />
            <KpiCell
              label="Avance Prisma"
              value={{ pct: kpis.avance }}
              accent
              last
            />
          </View>
        )}

        {live.map((app) => (
          <AppBlock
            key={app.id}
            app={app}
            alcance_publico={Boolean(captured_at)}
          />
        ))}
        {idle.length > 0 ? (
          <View>
            <Text style={styles.sectionIdle}>
              Sin avance
            </Text>
            {idle.map((app) => (
              <AppBlock
                key={app.id}
                app={app}
                alcance_publico={Boolean(captured_at)}
              />
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
