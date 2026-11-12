import { Document, Font, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import { empresa_y_sede, ESTADO_UI, ESTADOS_LEYENDA, hora_efectiva } from "../../lib/estado-sesion";
import { COLOR_ESTADO, filas_export, type DatosExportacion, type FilaExport } from "../../lib/exportar";
import { DIAS_SEMANA, fecha_larga, hora_corta } from "../../lib/mes-grid";
import type { EventoCalendario } from "../../lib/types";

const AZUL = "#0c3f69";

// Sin partir palabras con guion ("MATERI-ALES"): los nombres de servicios y empresas se leen completos.
Font.registerHyphenationCallback((palabra) => [palabra]);

const s = StyleSheet.create({
  page: { paddingTop: 28, paddingBottom: 30, paddingHorizontal: 24, fontFamily: "Helvetica", fontSize: 7, color: "#1e293b" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", borderBottomWidth: 1.5, borderBottomColor: AZUL, paddingBottom: 6, marginBottom: 6 },
  marca: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: AZUL, letterSpacing: 0.4 },
  titulo: { fontSize: 15, fontFamily: "Helvetica-Bold", marginTop: 2 },
  meta: { fontSize: 6.5, color: "#64748b", textAlign: "right" },
  filtros: { fontSize: 6.5, color: "#475569", marginTop: 2 },
  leyenda: { flexDirection: "row", flexWrap: "wrap", marginBottom: 6 },
  leyendaItem: { flexDirection: "row", alignItems: "center", marginRight: 10, fontSize: 6.5, color: "#475569" },
  punto: { width: 5, height: 5, borderRadius: 3, marginRight: 3 },
  grilla: { borderWidth: 0.75, borderColor: "#cbd5e1" },
  fila: { flexDirection: "row", borderBottomWidth: 0.75, borderBottomColor: "#cbd5e1" },
  cabecera: { backgroundColor: "#f8fafc" },
  celdaDia: { flex: 1, padding: 2.5, borderRightWidth: 0.5, borderRightColor: "#e2e8f0", minHeight: 46 },
  nroDia: { fontSize: 7, fontFamily: "Helvetica-Bold", color: "#334155", marginBottom: 2 },
  tarjeta: { borderLeftWidth: 2, borderRadius: 1.5, paddingVertical: 1.5, paddingHorizontal: 2.5, marginBottom: 1.5 },
  tServicio: { fontSize: 5.8, fontFamily: "Helvetica-Bold" },
  tLinea: { fontSize: 5.3, color: "#475569", marginTop: 0.5 },
  seccion: { fontSize: 10, fontFamily: "Helvetica-Bold", marginBottom: 5, marginTop: 2 },
  th: { fontSize: 6.3, fontFamily: "Helvetica-Bold", color: "#475569", paddingVertical: 3, paddingHorizontal: 2.5 },
  td: { fontSize: 6.3, paddingVertical: 2.5, paddingHorizontal: 2.5 },
  pie: { position: "absolute", bottom: 12, left: 24, right: 24, flexDirection: "row", justifyContent: "space-between", fontSize: 6, color: "#94a3b8" },
});

/** Columnas de la tabla: [título, ancho relativo, campo]. */
const COLUMNAS: Array<[string, number, keyof FilaExport]> = [
  ["Fecha", 6, "fecha"],
  ["Hora", 5.5, "hora"],
  ["OSI", 4, "osi"],
  ["Servicio", 15, "servicio"],
  ["Empresa", 13, "empresa"],
  ["Sede", 8, "sede"],
  ["Ubicación", 7, "ubicacion"],
  ["Sesión", 4, "sesion"],
  ["Estado", 7, "estado"],
  ["Certificado", 5.5, "certificado"],
  ["Factura", 9, "factura"],
  ["OC", 7, "oc"],
  ["Ejecutivo", 9, "ejecutivo"],
];

function Encabezado({ datos, subtitulo }: { datos: DatosExportacion; subtitulo?: string }) {
  return (
    <View style={s.header} fixed>
      <View>
        <Text style={s.marca}>SHA DE VENEZUELA · CALENDARIO DE SERVICIOS</Text>
        <Text style={s.titulo}>
          {datos.titulo.charAt(0).toUpperCase() + datos.titulo.slice(1)}
          {subtitulo ? ` · ${subtitulo}` : ""}
        </Text>
        {datos.filtros.length ? <Text style={s.filtros}>Filtros: {datos.filtros.join(" · ")}</Text> : null}
      </View>
      <View>
        <Text style={s.meta}>{datos.eventos.length + datos.sin_fecha.length} sesiones</Text>
        <Text style={s.meta}>Generado el {datos.generado}</Text>
      </View>
    </View>
  );
}

function Tarjeta({ e }: { e: EventoCalendario }) {
  const c = COLOR_ESTADO[e.estado];
  const { empresa, sede } = empresa_y_sede(e.nombre_empresa);
  const hora = e.estado === "sin_fecha" ? null : hora_corta(hora_efectiva(e));
  const extras = [
    `OSI ${e.nro_osi ?? e.id_osi}`,
    hora,
    e.total_sesiones > 1 ? `S${e.nro_sesion}/${e.total_sesiones}` : null,
    e.en_sha ? "En SHA" : e.ciudad,
    e.certificados > 0 ? "Cert." : null,
    e.factura ? "Facturada" : null,
  ].filter(Boolean);
  return (
    <View style={[s.tarjeta, { backgroundColor: c.fondo, borderLeftColor: c.barra }]} wrap={false}>
      <Text style={[s.tServicio, { color: c.texto, textDecoration: e.estado === "cancelada" ? "line-through" : "none" }]}>{e.servicio ?? "Servicio"}</Text>
      <Text style={s.tLinea}>
        {empresa}
        {sede ? ` · ${sede}` : ""}
      </Text>
      <Text style={s.tLinea}>{extras.join(" · ")}</Text>
    </View>
  );
}

/** PDF horizontal: el calendario del periodo (todas las sesiones) y después la tabla de servicios. */
export function CalendarioPdfDocument({ datos }: { datos: DatosExportacion }) {
  const por_fecha = new Map<string, EventoCalendario[]>();
  for (const e of datos.eventos) por_fecha.set(e.fecha_efectiva, [...(por_fecha.get(e.fecha_efectiva) ?? []), e]);
  const conteo = new Map<string, number>();
  for (const e of [...datos.eventos, ...datos.sin_fecha]) {
    const k = e.estado === "sin_fecha" ? "reagendada" : e.estado;
    conteo.set(k, (conteo.get(k) ?? 0) + 1);
  }
  const dia = datos.vista === "dia";
  const filas = filas_export([...datos.eventos, ...datos.sin_fecha]);
  const total_ancho = COLUMNAS.reduce((a, [, w]) => a + w, 0);

  const pie = (
    <View style={s.pie} fixed>
      <Text>Prisma · SHA de Venezuela</Text>
      <Text render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
    </View>
  );

  return (
    <Document title={`Calendario de servicios · ${datos.titulo}`} author="Prisma · SHA de Venezuela">
      <Page size="LETTER" orientation="landscape" style={s.page}>
        <Encabezado datos={datos} />
        <View style={s.leyenda}>
          {ESTADOS_LEYENDA.map((estado) => (
            <View key={estado} style={s.leyendaItem}>
              <View style={[s.punto, { backgroundColor: COLOR_ESTADO[estado].barra }]} />
              <Text>
                {ESTADO_UI[estado].etiqueta} · {conteo.get(estado) ?? 0}
              </Text>
            </View>
          ))}
        </View>

        <View style={s.grilla}>
          {!dia ? (
            <View style={[s.fila, s.cabecera]} fixed>
              {DIAS_SEMANA.map((d) => (
                <Text key={d} style={[s.celdaDia, { minHeight: 0, fontFamily: "Helvetica-Bold", color: "#475569" }]}>{d}</Text>
              ))}
            </View>
          ) : null}
          {datos.semanas.map((semana, i) => (
            <View key={i} style={s.fila} wrap={dia}>
              {semana.map((d) => {
                const eventos = d.en_periodo ? por_fecha.get(d.fecha) ?? [] : [];
                return (
                  <View key={d.fecha} style={[s.celdaDia, d.en_periodo ? {} : { backgroundColor: "#f8fafc" }]}>
                    <Text style={[s.nroDia, d.en_periodo ? {} : { color: "#cbd5e1" }]}>{dia ? fecha_larga(d.fecha) : Number(d.fecha.slice(8))}</Text>
                    {eventos.map((e) => (
                      <Tarjeta key={e.id_sesion} e={e} />
                    ))}
                  </View>
                );
              })}
            </View>
          ))}
        </View>

        {datos.sin_fecha.length ? (
          <View style={{ marginTop: 8 }} wrap={false}>
            <Text style={s.seccion}>Reagendadas sin fecha</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
              {datos.sin_fecha.map((e) => (
                <View key={e.id_sesion} style={{ width: "16.66%", paddingRight: 3 }}>
                  <Tarjeta e={e} />
                </View>
              ))}
            </View>
          </View>
        ) : null}
        {pie}
      </Page>

      <Page size="LETTER" orientation="landscape" style={s.page}>
        <Encabezado datos={datos} subtitulo="Servicios" />
        {filas.length === 0 ? (
          <Text style={{ fontSize: 8, color: "#64748b" }}>No hay sesiones con los filtros elegidos.</Text>
        ) : (
          <View style={s.grilla}>
            <View style={[s.fila, s.cabecera]} fixed>
              {COLUMNAS.map(([t, w]) => (
                <Text key={t} style={[s.th, { width: `${(w / total_ancho) * 100}%` }]}>{t}</Text>
              ))}
            </View>
            {filas.map((f, i) => (
              <View key={i} style={[s.fila, i % 2 ? { backgroundColor: "#f8fafc" } : {}]} wrap={false}>
                {COLUMNAS.map(([t, w, campo]) => (
                  <Text
                    key={t}
                    style={[
                      s.td,
                      { width: `${(w / total_ancho) * 100}%` },
                      campo === "estado" ? { color: COLOR_ESTADO[f.estado_clave].texto, fontFamily: "Helvetica-Bold" } : {},
                      campo === "servicio" ? { fontFamily: "Helvetica-Bold" } : {},
                    ]}
                  >
                    {String(f[campo])}
                  </Text>
                ))}
              </View>
            ))}
          </View>
        )}
        {pie}
      </Page>
    </Document>
  );
}
