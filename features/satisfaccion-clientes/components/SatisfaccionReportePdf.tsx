import React from "react";
import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import type { EncuestaConRespuesta, SatisfaccionKpis, SatisfaccionFiltros } from "@/actions/satisfaccion-clientes";

const styles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 36,
    paddingHorizontal: 28,
    fontFamily: "Helvetica",
    fontSize: 8,
    color: "#1e293b",
    backgroundColor: "#ffffff",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingBottom: 10,
    borderBottomWidth: 1.5,
    borderBottomColor: "#0c3f69",
    marginBottom: 12,
  },
  brandTitle: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: "#0c3f69",
    letterSpacing: 0.5,
  },
  brandSubtitle: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#0284c7",
    marginTop: 2,
  },
  reportMeta: {
    alignItems: "flex-end",
  },
  metaText: {
    fontSize: 7.5,
    color: "#64748b",
    marginTop: 1,
  },
  filterBadgeContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    backgroundColor: "#f8fafc",
    padding: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 12,
  },
  filterItem: {
    fontSize: 7,
    color: "#475569",
    marginRight: 8,
  },
  kpiRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 14,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 6,
    padding: 8,
    textAlign: "center",
  },
  kpiCardAccent: {
    flex: 1,
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#bbf7d0",
    borderRadius: 6,
    padding: 8,
    textAlign: "center",
  },
  kpiCardNps: {
    flex: 1,
    backgroundColor: "#f0f9ff",
    borderWidth: 1,
    borderColor: "#bae6fd",
    borderRadius: 6,
    padding: 8,
    textAlign: "center",
  },
  kpiLabel: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: "#64748b",
    textTransform: "uppercase",
    marginBottom: 2,
  },
  kpiValue: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
  },
  kpiSub: {
    fontSize: 6.5,
    color: "#64748b",
    marginTop: 1,
  },
  sectionTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#0c3f69",
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    paddingBottom: 3,
  },
  table: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 12,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#0c3f69",
    color: "#ffffff",
    fontFamily: "Helvetica-Bold",
    fontSize: 7,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#e2e8f0",
    paddingVertical: 3.5,
    paddingHorizontal: 4,
    alignItems: "center",
  },
  tableRowAlt: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#e2e8f0",
    paddingVertical: 3.5,
    paddingHorizontal: 4,
    backgroundColor: "#f8fafc",
    alignItems: "center",
  },
  colOsi: { width: "12%" },
  colEmpresa: { width: "24%" },
  colServicio: { width: "26%" },
  colEjecutivo: { width: "14%" },
  colCalidad: { width: "8%", textAlign: "center" },
  colAtencion: { width: "8%", textAlign: "center" },
  colNps: { width: "8%", textAlign: "center" },
  footer: {
    position: "absolute",
    bottom: 16,
    left: 28,
    right: 28,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 0.5,
    borderTopColor: "#cbd5e1",
    paddingTop: 6,
    fontSize: 7,
    color: "#94a3b8",
  },
  commentsBlock: {
    marginTop: 8,
    padding: 6,
    backgroundColor: "#f8fafc",
    borderLeftWidth: 2,
    borderLeftColor: "#0284c7",
    marginBottom: 6,
  },
  commentTitle: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
  },
  commentText: {
    fontSize: 7,
    color: "#334155",
    marginTop: 1,
    fontStyle: "italic",
  },
});

interface Props {
  encuestas: EncuestaConRespuesta[];
  kpis: SatisfaccionKpis;
  filtros?: SatisfaccionFiltros;
  generadoPor?: string;
}

export function SatisfaccionReportePdfDocument({
  encuestas,
  kpis,
  filtros,
  generadoPor,
}: Props) {
  const fechaHoy = new Date().toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const respondidas = encuestas.filter((e) => e.estado === "respondida" && e.respuesta);

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        {/* Top Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.brandTitle}>SHA DE VENEZUELA, C.A.</Text>
            <Text style={styles.brandSubtitle}>
              Informe de Satisfacción del Cliente (Calidad, Atención y Fidelidad / NPS)
            </Text>
            <Text style={{ fontSize: 7, color: "#64748b", marginTop: 2 }}>
              Sistema Integrado de Gestión • Control de Calidad y Relación con Clientes
            </Text>
          </View>
          <View style={styles.reportMeta}>
            <Text style={styles.metaText}>Fecha de emisión: {fechaHoy}</Text>
            {generadoPor && <Text style={styles.metaText}>Generado por: {generadoPor}</Text>}
            <Text style={styles.metaText}>
              Total registros: {encuestas.length} | Evaluaciones recibidas: {kpis.total_respondidas}
            </Text>
          </View>
        </View>

        {/* Filter Summary */}
        <View style={styles.filterBadgeContainer}>
          <Text style={{ fontSize: 7, fontFamily: "Helvetica-Bold", color: "#0c3f69", marginRight: 8 }}>
            Filtros aplicados:
          </Text>
          <Text style={styles.filterItem}>
            Tipo: {filtros?.tipo_servicio && filtros.tipo_servicio !== "todos" ? filtros.tipo_servicio : "Todos"}
          </Text>
          {filtros?.empresa && <Text style={styles.filterItem}>Empresa: {filtros.empresa}</Text>}
          {filtros?.servicio && <Text style={styles.filterItem}>Servicio: {filtros.servicio}</Text>}
          {filtros?.ejecutivo && <Text style={styles.filterItem}>Ejecutivo: {filtros.ejecutivo}</Text>}
          {filtros?.fecha_desde && (
            <Text style={styles.filterItem}>Desde: {filtros.fecha_desde}</Text>
          )}
          {filtros?.fecha_hasta && (
            <Text style={styles.filterItem}>Hasta: {filtros.fecha_hasta}</Text>
          )}
        </View>

        {/* Executive KPI Cards */}
        <View style={styles.kpiRow}>
          <View style={styles.kpiCardAccent}>
            <Text style={styles.kpiLabel}>Satisfacción General</Text>
            <Text style={[styles.kpiValue, { color: "#15803d" }]}>{kpis.csat_pct}%</Text>
            <Text style={styles.kpiSub}>Promedio: {kpis.csat_promedio} / 5.0</Text>
          </View>

          <View style={styles.kpiCardNps}>
            <Text style={styles.kpiLabel}>Fidelidad (NPS)</Text>
            <Text style={[styles.kpiValue, { color: "#0369a1" }]}>
              {kpis.nps_score > 0 ? `+${kpis.nps_score}` : kpis.nps_score}
            </Text>
            <Text style={styles.kpiSub}>
              Promotores: {kpis.nps_promoters} | Detractores: {kpis.nps_detractors}
            </Text>
          </View>

          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Tasa de Respuesta</Text>
            <Text style={styles.kpiValue}>{kpis.tasa_respuesta_pct}%</Text>
            <Text style={styles.kpiSub}>
              {kpis.total_respondidas} de {kpis.total_encuestas} enviadas
            </Text>
          </View>

          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>1. Calidad y Requisitos</Text>
            <Text style={styles.kpiValue}>{kpis.avg_calidad} ★</Text>
            <Text style={styles.kpiSub}>Escala 1 a 5</Text>
          </View>

          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>2. Atención y Soporte</Text>
            <Text style={styles.kpiValue}>{kpis.avg_atencion} ★</Text>
            <Text style={styles.kpiSub}>Escala 1 a 5</Text>
          </View>
        </View>

        {/* Detailed Results Table */}
        <Text style={styles.sectionTitle}>Detalle de Evaluaciones por Cliente</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.colOsi}>Nro OSI / Fecha</Text>
            <Text style={styles.colEmpresa}>Cliente / Empresa</Text>
            <Text style={styles.colServicio}>Servicio Prestado</Text>
            <Text style={styles.colEjecutivo}>Ejecutivo</Text>
            <Text style={styles.colCalidad}>1. Calidad (1-5)</Text>
            <Text style={styles.colAtencion}>2. Atención (1-5)</Text>
            <Text style={styles.colNps}>3. Fidelidad (0-10)</Text>
          </View>

          {respondidas.slice(0, 18).map((encuesta, idx) => {
            const isAlt = idx % 2 === 1;
            const r = encuesta.respuesta!;
            return (
              <View key={encuesta.id} style={isAlt ? styles.tableRowAlt : styles.tableRow}>
                <View style={styles.colOsi}>
                  <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 7.5 }}>
                    {encuesta.nro_osi}
                  </Text>
                  <Text style={{ fontSize: 6, color: "#64748b" }}>
                    {encuesta.fecha_servicio || encuesta.created_at.slice(0, 10)}
                  </Text>
                </View>

                <View style={styles.colEmpresa}>
                  <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 7 }}>
                    {encuesta.nombre_empresa}
                  </Text>
                  {encuesta.cliente_contacto_nombre && (
                    <Text style={{ fontSize: 6, color: "#64748b" }}>
                      {encuesta.cliente_contacto_nombre}
                    </Text>
                  )}
                </View>

                <View style={styles.colServicio}>
                  <Text style={{ fontSize: 7 }}>{encuesta.servicio}</Text>
                  <Text style={{ fontSize: 6, color: "#64748b" }}>
                    {encuesta.tipo_servicio || "Servicio"}
                  </Text>
                </View>

                <View style={styles.colEjecutivo}>
                  <Text style={{ fontSize: 6.5 }}>
                    {encuesta.ejecutivo_negocios || "No asignado"}
                  </Text>
                </View>

                <Text style={[styles.colCalidad, { fontFamily: "Helvetica-Bold" }]}>
                  {r.calidad_servicio} ★
                </Text>
                <Text style={[styles.colAtencion, { fontFamily: "Helvetica-Bold" }]}>
                  {r.atencion_soporte} ★
                </Text>

                <Text
                  style={[
                    styles.colNps,
                    {
                      fontFamily: "Helvetica-Bold",
                      color: r.fidelidad_nps >= 9 ? "#16a34a" : r.fidelidad_nps >= 7 ? "#d97706" : "#dc2626",
                    },
                  ]}
                >
                  {r.fidelidad_nps}/10
                </Text>
              </View>
            );
          })}

          {respondidas.length === 0 && (
            <View style={{ padding: 12, textAlign: "center" }}>
              <Text style={{ color: "#64748b", fontSize: 8 }}>
                No se encontraron evaluaciones respondidas para los filtros seleccionados.
              </Text>
            </View>
          )}
        </View>

        {/* Selected Client Comments Box (ISO 9001 audit feedback) */}
        {respondidas.some((e) => e.respuesta?.comentarios) && (
          <View wrap={false} style={{ marginTop: 4 }}>
            <Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold", color: "#0c3f69", marginBottom: 3 }}>
              Comentarios y Sugerencias de Clientes
            </Text>
            {respondidas
              .filter((e) => e.respuesta?.comentarios)
              .slice(0, 4)
              .map((e) => (
                <View key={e.id} style={styles.commentsBlock}>
                  <Text style={styles.commentTitle}>
                    {e.nombre_empresa} ({e.nro_osi} - {e.servicio}):
                  </Text>
                  <Text style={styles.commentText}>
                    &quot;{e.respuesta?.comentarios}&quot;
                  </Text>
                </View>
              ))}
          </View>
        )}

        {/* Page Footer */}
        <View style={styles.footer} fixed>
          <Text>SHA de Venezuela, C.A. • Gestión de la Calidad (ISO 9001:2015 - Cláusula 9.1.2)</Text>
          <Text render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
