import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import type { OfertaTecnicaData } from "@/types/diseno-servicio";
import { SHA_LOGO_BASE64, SHA_FOOTER_BASE64 } from "./pdf-assets-base64";

const styles = StyleSheet.create({
  page: {
    paddingTop: 24,
    paddingBottom: 48,
    paddingHorizontal: 32,
    fontSize: 8.5,
    fontFamily: "Helvetica",
    color: "#1e293b",
    lineHeight: 1.35,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1.5,
    borderBottomColor: "#0f172a",
    paddingBottom: 6,
    marginBottom: 8,
  },
  logoBox: {
    width: 125,
    height: 38,
    justifyContent: "center",
  },
  logo: {
    width: 125,
    height: 38,
    objectFit: "contain",
  },
  headerCenter: {
    flex: 1,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
    color: "#0f172a",
    textTransform: "uppercase",
  },
  headerSubtitle: {
    fontSize: 6.5,
    color: "#475569",
    marginTop: 2,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 0.5,
    textAlign: "center",
  },
  headerMeta: {
    width: 110,
    fontSize: 7,
    textAlign: "right",
    color: "#475569",
    lineHeight: 1.3,
  },
  metaBold: {
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
  },
  footerWrapper: {
    position: "absolute",
    bottom: 8,
    left: 32,
    right: 32,
    alignItems: "center",
  },
  footerImage: {
    width: 548,
    height: 21,
    objectFit: "contain",
  },
  pageNumberText: {
    position: "absolute",
    top: -12,
    right: 0,
    fontSize: 7,
    color: "#64748b",
    fontFamily: "Helvetica",
  },
  // Sub-header band
  documentTitleBanner: {
    marginTop: 4,
    marginBottom: 10,
    paddingVertical: 5,
    paddingHorizontal: 8,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 3,
  },
  docLabel: {
    fontSize: 7.5,
    color: "#ea580c",
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  docMainTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
    marginTop: 1,
    textTransform: "uppercase",
  },
  metaContainer: {
    marginTop: 4,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  metaCol: {
    flex: 1,
    paddingRight: 8,
  },
  metaFullCol: {
    width: "100%",
    marginTop: 3,
  },
  metaItem: {
    fontSize: 7.5,
    color: "#475569",
    lineHeight: 1.35,
  },
  // Section headers
  sectionTitle: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
    textTransform: "uppercase",
    marginTop: 8,
    marginBottom: 4,
    paddingVertical: 2,
    paddingHorizontal: 5,
    backgroundColor: "#fef08a", // Amber/yellow highlight style as in sample
    borderLeftWidth: 3,
    borderLeftColor: "#ea580c",
  },
  sectionTitleAlt: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
    textTransform: "uppercase",
    marginTop: 8,
    marginBottom: 4,
    paddingVertical: 2,
    paddingHorizontal: 5,
    backgroundColor: "#e0f2fe", // Light cyan highlight for deliverables & terms
    borderLeftWidth: 3,
    borderLeftColor: "#0284c7",
  },
  paragraph: {
    fontSize: 8.5,
    color: "#334155",
    textAlign: "justify",
    marginBottom: 6,
    lineHeight: 1.4,
  },
  // Numbered list items
  numberedItem: {
    flexDirection: "row",
    marginBottom: 4,
    alignItems: "flex-start",
  },
  numberLabel: {
    width: 18,
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#ea580c",
  },
  numberText: {
    flex: 1,
    fontSize: 8,
    color: "#334155",
    textAlign: "justify",
    lineHeight: 1.35,
  },
  // Bullet lists
  bulletItem: {
    flexDirection: "row",
    marginBottom: 3,
    alignItems: "flex-start",
  },
  bulletDot: {
    width: 12,
    fontSize: 8,
    color: "#ea580c",
    fontFamily: "Helvetica-Bold",
  },
  bulletText: {
    flex: 1,
    fontSize: 8,
    color: "#334155",
    lineHeight: 1.35,
  },
  // Scope blocks (Inclusiones vs Exclusiones)
  scopeBox: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 3,
    marginBottom: 6,
    padding: 6,
    backgroundColor: "#ffffff",
  },
  scopeHeading: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    marginBottom: 4,
  },
  scopeHeadingInclude: {
    color: "#059669",
  },
  scopeHeadingExclude: {
    color: "#dc2626",
  },
  // Duration block
  durationBox: {
    flexDirection: "row",
    backgroundColor: "#fff7ed",
    borderWidth: 1,
    borderColor: "#fed7aa",
    borderRadius: 3,
    padding: 6,
    marginBottom: 6,
  },
  durationCol: {
    flex: 1,
    paddingRight: 8,
  },
  durationLabel: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: "#9a3412",
  },
  durationValue: {
    fontSize: 8,
    color: "#431407",
    marginTop: 2,
  },
  // Deliverable cards
  deliverableCard: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 3,
    padding: 5,
    marginBottom: 4,
    backgroundColor: "#f8fafc",
  },
  deliverableHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  deliverableTitle: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
    flex: 1,
  },
  deliverableFormatBadge: {
    fontSize: 6.5,
    fontFamily: "Helvetica-Bold",
    color: "#0284c7",
    backgroundColor: "#e0f2fe",
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 2,
  },
  deliverableDesc: {
    fontSize: 7.5,
    color: "#475569",
    lineHeight: 1.3,
  },
});

function formatDateDisplay(s?: string) {
  if (!s) return "—";
  try {
    const d = new Date(s);
    if (isNaN(d.getTime())) return s;
    return d.toLocaleDateString("es-VE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return s;
  }
}

export interface OfertaTecnicaPdfDocumentProps {
  oferta: OfertaTecnicaData;
  logoUrl?: string;
}

export default function OfertaTecnicaPdfDocument({
  oferta,
  logoUrl,
}: OfertaTecnicaPdfDocumentProps) {
  const shortTitle =
    oferta.titulo_servicio.length > 55
      ? `${oferta.titulo_servicio.slice(0, 52)}...`
      : oferta.titulo_servicio;

  return (
    <Document>
      <Page size="LETTER" style={styles.page} wrap>
        {/* ===== HEADER (fixed — repeats on every page in natural document flow) ===== */}
        <View style={styles.headerRow} fixed>
          <View style={styles.logoBox}>
            <Image style={styles.logo} src={logoUrl || SHA_LOGO_BASE64} />
          </View>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>{shortTitle}</Text>
            <Text style={styles.headerSubtitle}>
              SHA DE VENEZUELA, C.A. · SERVICIOS TÉCNICOS ESPECIALIZADOS
            </Text>
          </View>
          <View style={styles.headerMeta}>
            <Text>
              <Text style={styles.metaBold}>Fecha: </Text>
              {formatDateDisplay(oferta.fecha_oferta)}
            </Text>
            <Text>
              <Text style={styles.metaBold}>Revisión: </Text>
              {oferta.revision || "Rev. 00"}
            </Text>
            {oferta.codigo_presupuesto ? (
              <Text>
                <Text style={styles.metaBold}>Presupuesto: </Text>
                {oferta.codigo_presupuesto}
              </Text>
            ) : null}
            <Text
              style={{ marginTop: 2 }}
              render={({ pageNumber, totalPages }) =>
                `Página ${pageNumber} de ${totalPages}`
              }
            />
          </View>
        </View>

        {/* ===== BANNER PRINCIPAL (Página 1) ===== */}
        <View style={styles.documentTitleBanner}>
          <Text style={styles.docLabel}>OFERTA TÉCNICA DE SERVICIO</Text>
          <Text style={styles.docMainTitle}>{oferta.titulo_servicio}</Text>
          <View style={styles.metaContainer}>
            {(oferta.ciudad_lugar || oferta.cliente_receptor) && (
              <View style={styles.metaRow}>
                {oferta.ciudad_lugar ? (
                  <View style={styles.metaCol}>
                    <Text style={styles.metaItem}>
                      <Text style={styles.metaBold}>Lugar: </Text>
                      {oferta.ciudad_lugar}
                    </Text>
                  </View>
                ) : null}
                {oferta.cliente_receptor ? (
                  <View style={styles.metaCol}>
                    <Text style={styles.metaItem}>
                      <Text style={styles.metaBold}>Cliente: </Text>
                      {oferta.cliente_receptor}
                    </Text>
                  </View>
                ) : null}
              </View>
            )}
            {oferta.duracion?.total_estimado ? (
              <View style={styles.metaFullCol}>
                <Text style={styles.metaItem}>
                  <Text style={styles.metaBold}>Duración Estimada: </Text>
                  {oferta.duracion.total_estimado}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* ===== SECCIÓN 1: PROPÓSITO ===== */}
        <View minPresenceAhead={40}>
          <Text style={styles.sectionTitle}>PROPÓSITO DEL SERVICIO</Text>
          <Text style={styles.paragraph}>{oferta.proposito || "—"}</Text>
        </View>

        {/* ===== SECCIÓN 2: ALCANCE ===== */}
        {(oferta.alcance_ubicacion ||
          (oferta.alcance_incluye && oferta.alcance_incluye.length > 0) ||
          (oferta.alcance_no_incluye && oferta.alcance_no_incluye.length > 0)) && (
          <View minPresenceAhead={50}>
            <Text style={styles.sectionTitle}>ALCANCE DEL SERVICIO</Text>
            {oferta.alcance_ubicacion && (
              <Text style={styles.paragraph}>
                <Text style={styles.metaBold}>Ubicación y Centro de Trabajo: </Text>
                {oferta.alcance_ubicacion}
              </Text>
            )}

            {oferta.alcance_incluye && oferta.alcance_incluye.length > 0 && (
              <View style={styles.scopeBox}>
                <Text style={[styles.scopeHeading, styles.scopeHeadingInclude]}>
                  Lo que incluye el servicio:
                </Text>
                {oferta.alcance_incluye.map((item, i) => (
                  <View key={`inc-${i}`} style={styles.bulletItem}>
                    <Text style={[styles.bulletDot, { color: "#059669" }]}>•</Text>
                    <Text style={styles.bulletText}>{item}</Text>
                  </View>
                ))}
              </View>
            )}

            {oferta.alcance_no_incluye && oferta.alcance_no_incluye.length > 0 && (
              <View style={styles.scopeBox}>
                <Text style={[styles.scopeHeading, styles.scopeHeadingExclude]}>
                  Lo que NO incluye el servicio:
                </Text>
                {oferta.alcance_no_incluye.map((item, i) => (
                  <View key={`exc-${i}`} style={styles.bulletItem}>
                    <Text style={[styles.bulletDot, { color: "#dc2626" }]}>✕</Text>
                    <Text style={styles.bulletText}>{item}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* ===== SECCIÓN 3: OBJETIVOS ESPECÍFICOS ===== */}
        {oferta.objetivos_especificos && oferta.objetivos_especificos.length > 0 && (
          <View minPresenceAhead={50}>
            <Text style={styles.sectionTitle}>OBJETIVOS ESPECÍFICOS</Text>
            {oferta.objetivos_especificos.map((obj, i) => (
              <View key={`obj-${i}`} style={styles.numberedItem}>
                <Text style={styles.numberLabel}>{`${i + 1}.`}</Text>
                <Text style={styles.numberText}>{obj}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ===== SECCIÓN 4: NORMAS Y METODOLOGÍA ===== */}
        {oferta.normas_metodologia && oferta.normas_metodologia.length > 0 && (
          <View minPresenceAhead={40}>
            <Text style={styles.sectionTitle}>NORMAS Y METODOLOGÍA APLICABLES</Text>
            {oferta.normas_metodologia.map((norm, i) => (
              <View key={`norm-${i}`} style={styles.bulletItem}>
                <Text style={styles.bulletDot}>-</Text>
                <Text style={styles.bulletText}>{norm}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ===== SECCIÓN 5: INSTRUMENTOS / EQUIPOS ===== */}
        {oferta.instrumentos_equipos && oferta.instrumentos_equipos.length > 0 && (
          <View minPresenceAhead={30}>
            <Text style={styles.sectionTitle}>INSTRUMENTOS Y EQUIPOS</Text>
            {oferta.instrumentos_equipos.map((eq, i) => (
              <View key={`eq-${i}`} style={styles.bulletItem}>
                <Text style={styles.bulletDot}>-</Text>
                <Text style={styles.bulletText}>{eq}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ===== SECCIÓN 6: RECURSO HUMANO ASIGNADO ===== */}
        {oferta.recurso_humano && oferta.recurso_humano.length > 0 && (
          <View minPresenceAhead={30}>
            <Text style={styles.sectionTitle}>
              RECURSO HUMANO ASIGNADO PARA LA EVALUACIÓN
            </Text>
            {oferta.recurso_humano.map((rh, i) => (
              <View key={`rh-${i}`} style={styles.bulletItem}>
                <Text style={styles.bulletDot}>-</Text>
                <Text style={styles.bulletText}>{rh}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ===== SECCIÓN 7: DURACIÓN DEL SERVICIO ===== */}
        {(oferta.duracion?.dias_campo || oferta.duracion?.dias_informe) && (
          <View minPresenceAhead={40}>
            <Text style={styles.sectionTitle}>DURACIÓN DEL SERVICIO</Text>
            <View style={styles.durationBox}>
              {oferta.duracion.dias_campo && (
                <View style={styles.durationCol}>
                  <Text style={styles.durationLabel}>Recolección en Campo:</Text>
                  <Text style={styles.durationValue}>
                    {oferta.duracion.dias_campo}
                  </Text>
                </View>
              )}
              {oferta.duracion.dias_informe && (
                <View style={styles.durationCol}>
                  <Text style={styles.durationLabel}>
                    Preparación de Informes y Entregables:
                  </Text>
                  <Text style={styles.durationValue}>
                    {oferta.duracion.dias_informe}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* ===== SECCIÓN 8: ENTREGABLES ===== */}
        {oferta.entregables && oferta.entregables.length > 0 && (
          <View minPresenceAhead={60}>
            <Text style={styles.sectionTitleAlt}>
              DOCUMENTOS OBTENIDOS / ENTREGABLES
            </Text>
            {oferta.entregables.map((ent, i) => (
              <View key={ent.id || `ent-${i}`} style={styles.deliverableCard}>
                <View style={styles.deliverableHeader}>
                  <Text style={styles.deliverableTitle}>
                    {`${i + 1}. `}
                    {ent.titulo}
                  </Text>
                  {ent.formato && (
                    <Text style={styles.deliverableFormatBadge}>
                      {ent.formato}
                    </Text>
                  )}
                </View>
                {ent.descripcion && (
                  <Text style={styles.deliverableDesc}>{ent.descripcion}</Text>
                )}
              </View>
            ))}
          </View>
        )}

        {/* ===== SECCIÓN 9: CONSIDERACIONES Y TÉRMINOS ===== */}
        {oferta.terminos_condiciones && oferta.terminos_condiciones.length > 0 && (
          <View minPresenceAhead={60}>
            <Text style={styles.sectionTitleAlt}>CONSIDERACIONES Y TÉRMINOS</Text>
            {oferta.terminos_condiciones.map((term, i) => (
              <View key={`term-${i}`} style={styles.numberedItem}>
                <Text style={[styles.numberLabel, { color: "#0284c7" }]}>
                  {`${i + 1}.`}
                </Text>
                <Text style={styles.numberText}>{term}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ===== FOOTER OFICIAL (Repeats on every page) ===== */}
        <View style={styles.footerWrapper} fixed>
          <Image style={styles.footerImage} src={SHA_FOOTER_BASE64} />
        </View>
      </Page>
    </Document>
  );
}
