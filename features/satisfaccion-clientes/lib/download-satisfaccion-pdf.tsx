import type { EncuestaConRespuesta, SatisfaccionKpis, SatisfaccionFiltros } from "@/actions/satisfaccion-clientes";

export async function downloadSatisfaccionPdf({
  encuestas,
  kpis,
  filtros,
  generadoPor,
}: {
  encuestas: EncuestaConRespuesta[];
  kpis: SatisfaccionKpis;
  filtros?: SatisfaccionFiltros;
  generadoPor?: string;
}): Promise<void> {
  const { pdf } = await import("@react-pdf/renderer");
  const { SatisfaccionReportePdfDocument } = await import(
    "../components/SatisfaccionReportePdf"
  );

  const blob = await pdf(
    <SatisfaccionReportePdfDocument
      encuestas={encuestas}
      kpis={kpis}
      filtros={filtros}
      generadoPor={generadoPor}
    />,
  ).toBlob();

  const stamp = new Date().toISOString().slice(0, 10);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `reporte-satisfaccion-clientes-${stamp}.pdf`;
  link.click();
  URL.revokeObjectURL(url);
}
