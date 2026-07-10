import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import {
  OsiDocumentView,
  build_osi_preview_data,
} from "@sha/osi-formato";
import { canAccessConsultaOSI, getOSIPreviewBundle, getUserOSIAccessFilter } from "@/actions/osi";
import { OsiPreviewCommentsHost } from "../../components/OsiPreviewCommentsHost";
import { OsiPreviewToolbar } from "./OsiPreviewToolbar";

export const metadata = {
  title: "Formato OSI | Consulta OSI | PRISMA",
};

export default async function ConsultaOSIPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const canAccess = await canAccessConsultaOSI();
  if (!canAccess) {
    redirect("/dashboard");
  }

  const { id } = await params;
  const osiId = Number(id);
  if (!Number.isFinite(osiId) || osiId <= 0) {
    notFound();
  }

  const bundle = await getOSIPreviewBundle(osiId);
  if (!bundle) {
    notFound();
  }

  const accessFilter = await getUserOSIAccessFilter();
  if (accessFilter !== "all" && accessFilter !== "other") {
    const tipoServicio = String(bundle.view_row?.tipo_servicio ?? "").toUpperCase();
    if (accessFilter === "capacitacion" && !tipoServicio.includes("CAPACITACION")) {
      redirect("/dashboard");
    }
    if (
      accessFilter === "servicios_tecnicos" &&
      !tipoServicio.includes("SERVICIOS TECNICOS") &&
      !tipoServicio.includes("SERVICIO TECNICO")
    ) {
      redirect("/dashboard");
    }
  }

  const previewData = build_osi_preview_data(bundle);

  return (
    <div className="relative min-h-screen overflow-x-auto bg-white">
      <Suspense fallback={null}>
        <OsiPreviewToolbar osiLabel={previewData.nroOsi || String(osiId)} />
      </Suspense>
      <div className="flex justify-center px-2 pb-8 print:px-0 print:pb-0">
        <OsiDocumentView
          data={previewData}
          assets={{
            logoSrc: "/osi/a3.png",
            footerSrc: "/osi/pie-horizontal.png",
          }}
        />
      </div>
      <OsiPreviewCommentsHost
        osi_id={osiId}
        osi_label={previewData.nroOsi || String(osiId)}
        servicio={previewData.servicio ?? null}
      />
    </div>
  );
}
