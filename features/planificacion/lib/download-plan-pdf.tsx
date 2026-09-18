import type { PlanApp } from "./types";

export async function download_plan_overview_pdf({
  apps,
  anio,
  captured_at,
}: {
  apps: PlanApp[];
  anio: number;
  captured_at?: string | null;
}): Promise<void> {
  if (apps.length === 0) return;
  const { pdf } = await import("@react-pdf/renderer");
  const { PlanOverviewPdfDocument } = await import(
    "../components/plan-overview-pdf"
  );
  const blob = await pdf(
    <PlanOverviewPdfDocument
      apps={apps}
      anio={anio}
      captured_at={captured_at ?? null}
    />,
  ).toBlob();
  const stamp = captured_at
    ? new Date(captured_at).toISOString().slice(0, 10)
    : String(anio);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = captured_at
    ? `prisma-foto-${stamp}.pdf`
    : `prisma-vista-general-${anio}.pdf`;
  link.click();
  URL.revokeObjectURL(url);
}
