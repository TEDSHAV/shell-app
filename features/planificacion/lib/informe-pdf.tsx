import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { InformeMonth } from "../actions/informe-actions";
import { format_month_label } from "../lib/plan-month";
import { ORIGIN_LABELS } from "../lib/display";

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, fontFamily: "Helvetica", color: "#1e293b" },
  title: { fontSize: 18, fontWeight: 700, marginBottom: 4 },
  muted: { fontSize: 9, color: "#64748b", marginBottom: 16 },
  kpis: { flexDirection: "row", gap: 8, marginBottom: 16 },
  kpi: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    padding: 10,
  },
  kpiLabel: { fontSize: 8, color: "#64748b", textTransform: "uppercase" },
  kpiValue: { fontSize: 16, fontWeight: 700, marginTop: 4 },
  heading: { fontSize: 12, fontWeight: 700, marginTop: 12, marginBottom: 6 },
  row: { marginBottom: 8, paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: "#f1f5f9" },
  objTitle: { fontSize: 11, fontWeight: 700 },
  task: { fontSize: 9, color: "#475569", marginTop: 2 },
});

export function InformePdfDocument({
  data,
  captured_at,
}: {
  data: InformeMonth;
  captured_at?: string | null;
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Informe del periodo</Text>
        <Text style={styles.muted}>
          {format_month_label(data.mes)}
          {captured_at ? ` · Foto ${captured_at.slice(0, 10)}` : ""}
        </Text>
        <View style={styles.kpis}>
          <View style={styles.kpi}>
            <Text style={styles.kpiLabel}>Compromiso</Text>
            <Text style={styles.kpiValue}>{data.compromiso_pct}%</Text>
          </View>
          <View style={styles.kpi}>
            <Text style={styles.kpiLabel}>Plus adicional</Text>
            <Text style={styles.kpiValue}>{data.plus_count}</Text>
          </View>
        </View>
        <Text style={styles.heading}>Compromiso</Text>
        {data.objetivos.length === 0 ? (
          <Text style={styles.muted}>Sin objetivos en este mes.</Text>
        ) : (
          data.objetivos.map((objetivo) => (
            <View key={objetivo.id} style={styles.row} wrap={false}>
              <Text style={styles.objTitle}>
                {objetivo.titulo} · {objetivo.avance}%
              </Text>
              {objetivo.tareas.map((tarea) => (
                <Text key={tarea.id} style={styles.task}>
                  {tarea.titulo} · {ORIGIN_LABELS[tarea.origen]} · {tarea.avance}%
                </Text>
              ))}
            </View>
          ))
        )}
        <Text style={styles.heading}>Plus adicional</Text>
        {data.plus.length === 0 ? (
          <Text style={styles.muted}>Nada extra completado fuera de objetivos.</Text>
        ) : (
          data.plus.map((item) => (
            <Text key={item.id} style={styles.task}>
              {item.titulo} · {item.app_nombre} · {ORIGIN_LABELS[item.origen]}
            </Text>
          ))
        )}
      </Page>
    </Document>
  );
}

export async function download_informe_pdf(data: InformeMonth): Promise<void> {
  const { pdf } = await import("@react-pdf/renderer");
  const blob = await pdf(<InformePdfDocument data={data} />).toBlob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `informe-${data.mes}.pdf`;
  link.click();
  URL.revokeObjectURL(url);
}
