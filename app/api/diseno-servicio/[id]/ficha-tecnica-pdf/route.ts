import React from "react";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { renderToBuffer } from "@react-pdf/renderer";
import FichaTecnicaPdfDocument from "@/app/(shell)/nuevo-servicio/[id]/components/FichaTecnicaPdfDocument";
import {
  createDefaultFichaTecnicaFromSolicitud,
  type FichaTecnicaData,
} from "@/types/diseno-servicio";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const solicitudId = parseInt(id, 10);

    if (isNaN(solicitudId)) {
      return new NextResponse("ID de solicitud inválido", { status: 400 });
    }

    const supabase = await createAdminClient();
    const { data: solicitud, error } = await supabase
      .from("solicitudes_diseno_servicio")
      .select("*")
      .eq("id", solicitudId)
      .single();

    if (error || !solicitud) {
      return new NextResponse("Solicitud de diseño no encontrada", { status: 404 });
    }

    const salidas = (solicitud.bloque_salidas_diseno || {}) as any;
    let ficha: FichaTecnicaData = salidas.ficha_tecnica;

    if (!ficha || !ficha.nombre) {
      ficha = createDefaultFichaTecnicaFromSolicitud(
        solicitud,
        solicitud.bloque_recursos_requisitos
      );
    }

    const pdfBuffer = await renderToBuffer(
      React.createElement(FichaTecnicaPdfDocument, {
        ficha,
      }) as any
    );

    const safeFilename = (ficha.nombre || solicitud.nombre_sugerido || "Ficha_Tecnica")
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .slice(0, 50);

    return new Response(pdfBuffer as any, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${safeFilename}.pdf"`,
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    console.error("Error generating Ficha Técnica PDF:", error);
    return new NextResponse(
      `Error al generar PDF: ${error instanceof Error ? error.message : "Error interno"}`,
      { status: 500 }
    );
  }
}
