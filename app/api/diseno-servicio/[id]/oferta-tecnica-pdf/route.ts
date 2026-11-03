import React from "react";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { renderToBuffer } from "@react-pdf/renderer";
import OfertaTecnicaPdfDocument from "@/app/(shell)/nuevo-servicio/[id]/components/OfertaTecnicaPdfDocument";
import { SHA_LOGO_BASE64 } from "@/app/(shell)/nuevo-servicio/[id]/components/pdf-assets-base64";
import {
  createDefaultOfertaTecnicaFromSolicitud,
  type OfertaTecnicaData,
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
    let oferta: OfertaTecnicaData = salidas.oferta_tecnica;

    if (!oferta || !oferta.titulo_servicio) {
      oferta = createDefaultOfertaTecnicaFromSolicitud(
        solicitud,
        solicitud.bloque_recursos_requisitos,
        solicitud.bloque_planificacion_factibilidad
      );
    }

    const pdfBuffer = await renderToBuffer(
      React.createElement(OfertaTecnicaPdfDocument, {
        oferta,
        logoUrl: SHA_LOGO_BASE64,
      }) as any
    );

    const safeFilename = (oferta.titulo_servicio || solicitud.nombre_sugerido || "Oferta_Tecnica")
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
    console.error("Error generating Oferta Técnica PDF:", error);
    return new NextResponse(
      `Error al generar PDF: ${error instanceof Error ? error.message : "Error interno"}`,
      { status: 500 }
    );
  }
}
