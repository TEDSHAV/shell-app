import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";
import type { FichaTecnicaData } from "@/types/diseno-servicio";
import {
  SHA_LOGO_BASE64,
  SHA_FOOTER_BASE64,
} from "./pdf-assets-base64";

const styles = StyleSheet.create({
  page: {
    paddingTop: 30,
    paddingBottom: 65,
    paddingHorizontal: 35,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: "#1e293b",
    backgroundColor: "#ffffff",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 10,
    borderBottomWidth: 1.5,
    borderBottomColor: "#0284c7",
    marginBottom: 14,
  },
  logo: {
    width: 140,
    height: 38,
    objectFit: "contain",
  },
  headerMeta: {
    alignItems: "flex-end",
  },
  metaCode: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
  },
  metaRev: {
    fontSize: 8,
    color: "#64748b",
    marginTop: 2,
  },
  metaDate: {
    fontSize: 8,
    color: "#64748b",
    marginTop: 1,
  },
  pageNumber: {
    fontSize: 8,
    color: "#94a3b8",
    marginTop: 1,
  },
  titleContainer: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderLeftWidth: 4,
    borderLeftColor: "#0284c7",
    padding: 10,
    borderRadius: 3,
    marginBottom: 12,
  },
  courseTitle: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
    textTransform: "uppercase",
  },
  courseSubtitle: {
    fontSize: 9,
    fontFamily: "Helvetica-Oblique",
    color: "#475569",
    marginTop: 3,
  },
  statsRow: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 4,
    paddingVertical: 6,
    paddingHorizontal: 8,
    marginBottom: 12,
  },
  statCol: {
    flex: 1,
    paddingHorizontal: 4,
  },
  statLabel: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: "#64748b",
    textTransform: "uppercase",
  },
  statValue: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
    marginTop: 1,
  },
  section: {
    marginBottom: 10,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderLeftWidth: 3,
    borderLeftColor: "#0284c7",
    paddingVertical: 3,
    paddingHorizontal: 6,
    marginBottom: 5,
  },
  sectionTitle: {
    fontSize: 9.5,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
    textTransform: "uppercase",
  },
  sectionContent: {
    fontSize: 8.5,
    lineHeight: 1.45,
    color: "#334155",
    paddingHorizontal: 4,
  },
  bulletItem: {
    flexDirection: "row",
    marginBottom: 3,
    paddingHorizontal: 4,
  },
  bulletDot: {
    width: 10,
    fontSize: 8.5,
    color: "#0284c7",
  },
  bulletText: {
    flex: 1,
    fontSize: 8.5,
    lineHeight: 1.4,
    color: "#334155",
  },
  footerImageContainer: {
    position: "absolute",
    bottom: 10,
    left: 32,
    right: 32,
    alignItems: "center",
  },
  footerImage: {
    width: "100%",
    height: 22,
    objectFit: "contain",
  },
});

function formatDate(iso?: string | null): string {
  if (!iso) {
    const today = new Date();
    return `${String(today.getDate()).padStart(2, "0")}/${String(
      today.getMonth() + 1,
    ).padStart(2, "0")}/${today.getFullYear()}`;
  }
  const clean = iso.split("T")[0];
  const parts = clean.split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return clean;
}

export interface FichaTecnicaPdfDocumentProps {
  ficha: FichaTecnicaData;
}

export default function FichaTecnicaPdfDocument({
  ficha,
}: FichaTecnicaPdfDocumentProps) {
  const code = `FT-CO-${String(ficha.cursoId || "000").padStart(3, "0")}`;
  const formattedDate = formatDate(ficha.created_at);

  // Split multi-line objectives or content
  const specificObjectives = (ficha.objetivo_especifico || "")
    .split("\n")
    .map((s) => s.replace(/^[•\-\*]\s*/, "").trim())
    .filter(Boolean);

  const contentLines = (ficha.contenido_curso || "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  const isAprobacion =
    ficha.nota_aprobatoria !== null &&
    ficha.nota_aprobatoria !== undefined &&
    ficha.nota_aprobatoria > 0;

  return (
    <Document title={`Ficha Técnica - ${ficha.nombre}`}>
      <Page size="LETTER" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Image src={SHA_LOGO_BASE64} style={styles.logo} />
          <View style={styles.headerMeta}>
            <Text style={styles.metaCode}>{code}</Text>
            <Text style={styles.metaRev}>Rev. 1</Text>
            <Text style={styles.metaDate}>Fecha: {formattedDate}</Text>
            <Text
              style={styles.pageNumber}
              render={({ pageNumber, totalPages }) =>
                `Página ${pageNumber} de ${totalPages}`
              }
            />
          </View>
        </View>

        {/* Course Title Box */}
        <View style={styles.titleContainer}>
          <Text style={styles.courseTitle}>{ficha.nombre}</Text>
          {ficha.subtitulo && (
            <Text style={styles.courseSubtitle}>{ficha.subtitulo}</Text>
          )}
        </View>

        {/* Quick Stats Grid */}
        <View style={styles.statsRow}>
          <View style={styles.statCol}>
            <Text style={styles.statLabel}>Modalidad</Text>
            <Text style={styles.statValue}>{ficha.modalidad || "Presencial"}</Text>
          </View>
          <View style={styles.statCol}>
            <Text style={styles.statLabel}>Carga Horaria</Text>
            <Text style={styles.statValue}>
              {ficha.carga_horaria_std || 8} Horas Académicas
            </Text>
          </View>
          <View style={styles.statCol}>
            <Text style={styles.statLabel}>Categoría</Text>
            <Text style={styles.statValue}>
              {ficha.categoria || "Capacitación"}
            </Text>
          </View>
          <View style={styles.statCol}>
            <Text style={styles.statLabel}>Certificación</Text>
            <Text style={styles.statValue}>
              {isAprobacion
                ? `Aprobación (Mín: ${ficha.nota_aprobatoria})`
                : "Participación"}
            </Text>
          </View>
          <View style={styles.statCol}>
            <Text style={styles.statLabel}>Carnet PVC</Text>
            <Text style={styles.statValue}>
              {ficha.emite_carnet ? "Aplica (Sí)" : "No Aplica"}
            </Text>
          </View>
        </View>

        {/* Section 1: Perfil / Dirigido a */}
        {ficha.para_quien && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                1. Perfil del Participante / Dirigido a
              </Text>
            </View>
            <Text style={styles.sectionContent}>{ficha.para_quien}</Text>
          </View>
        )}

        {/* Section 2: Objetivo General */}
        {ficha.objetivo_general && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>2. Objetivo General</Text>
            </View>
            <Text style={styles.sectionContent}>{ficha.objetivo_general}</Text>
          </View>
        )}

        {/* Section 3: Objetivos Específicos */}
        {specificObjectives.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>3. Objetivos Específicos</Text>
            </View>
            {specificObjectives.map((obj, i) => (
              <View key={i} style={styles.bulletItem}>
                <Text style={styles.bulletDot}>•</Text>
                <Text style={styles.bulletText}>{obj}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Section 4: Contenido Programático */}
        {contentLines.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>4. Contenido Programático</Text>
            </View>
            {contentLines.map((line, i) => {
              const isModuleHeader =
                line.toUpperCase().startsWith("MÓDULO") ||
                line.toUpperCase().startsWith("MODULO") ||
                line.toUpperCase().startsWith("TEMA");
              return (
                <View
                  key={i}
                  style={[
                    styles.bulletItem,
                    isModuleHeader ? { marginTop: 3 } : {},
                  ]}
                >
                  <Text
                    style={[
                      styles.bulletDot,
                      isModuleHeader ? { fontFamily: "Helvetica-Bold" } : {},
                    ]}
                  >
                    {isModuleHeader ? "■" : "–"}
                  </Text>
                  <Text
                    style={[
                      styles.bulletText,
                      isModuleHeader
                        ? { fontFamily: "Helvetica-Bold", color: "#0f172a" }
                        : {},
                    ]}
                  >
                    {line}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Section 5: Certificación y Aprobación */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>5. Certificación y Requisitos</Text>
          </View>
          <Text style={styles.sectionContent}>
            {isAprobacion
              ? `El curso conduce a una certificación oficial de Aprobación, con una calificación mínima aprobatoria de ${ficha.nota_aprobatoria}/20 puntos y una asistencia obligatoria mínima del 75%.`
              : "El curso conduce a una certificación oficial de Participación con una asistencia obligatoria mínima del 75% de las horas académicas pautadas."}
            {ficha.emite_carnet
              ? " Asimismo, el participante acreditado recibirá un carnet oficial en PVC con código de validación digital QR."
              : ""}
          </Text>
        </View>

        {/* Regulatory Green Footer (same as Oferta Técnica) */}
        <View style={styles.footerImageContainer} fixed>
          <Image src={SHA_FOOTER_BASE64} style={styles.footerImage} />
        </View>
      </Page>
    </Document>
  );
}
