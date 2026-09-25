import { NextRequest, NextResponse } from "next/server";
import { lookupCitizen } from "@/actions/cedula";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const nacionalidad = searchParams.get("nacionalidad") || "V";
    const cedula = searchParams.get("cedula") || "";

    if (!cedula) {
      return NextResponse.json(
        { success: false, error: "El parámetro 'cedula' es requerido." },
        { status: 400 },
      );
    }

    const result = await lookupCitizen(nacionalidad, cedula);
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error) {
    console.error("[API Cedula Lookup] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Error interno al verificar la cédula.",
      },
      { status: 500 },
    );
  }
}
