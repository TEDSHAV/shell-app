import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import {
  OsiDocumentView,
  build_osi_preview_data,
} from "@sha/osi-formato";
import { canAccessConsultaOSI, getOSIPreviewBundle } from "@/actions/osi";
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

  const previewData = build_osi_preview_data(bundle);

  return (
    <div className="min-h-screen bg-white overflow-x-auto">
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
    </div>
  );
}
