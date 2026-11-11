import { NextRequest, NextResponse } from "next/server";
import { sendDailyAsistenciaReport } from "@/lib/asistencia/report-service";
import { getCaracasDateString } from "@/lib/asistencia/time";

function verifyCronSecret(req: NextRequest): boolean {
  const expected =
    process.env.ASISTENCIA_CRON_SECRET?.trim() ||
    process.env.CRON_SECRET?.trim() ||
    process.env.REQUISICIONES_NOTIFY_SECRET?.trim();

  if (!expected) return false;

  const headerSecret = req.headers.get("x-cron-secret")?.trim() ||
    req.headers.get("x-internal-secret")?.trim();
  const authHeader = req.headers.get("authorization")?.trim();
  const bearerSecret = authHeader?.toLowerCase().startsWith("bearer ")
    ? authHeader.slice(7).trim()
    : null;

  return headerSecret === expected || bearerSecret === expected;
}

export async function POST(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401 },
    );
  }

  let body: { fecha?: string; forceManual?: boolean; corte?: 1 | 2 } = {};
  try {
    body = await req.json();
  } catch {
    // Empty body is valid
  }

  const queryCorte = req.nextUrl.searchParams.get("corte");
  const corte: 1 | 2 =
    body.corte === 2 || queryCorte === "2"
      ? 2
      : 1;

  const fecha =
    body.fecha?.trim() ||
    req.nextUrl.searchParams.get("fecha")?.trim() ||
    getCaracasDateString();
  const tipo =
    body.forceManual || req.nextUrl.searchParams.get("forceManual") === "true"
      ? "manual"
      : "scheduled";

  try {
    const result = await sendDailyAsistenciaReport({
      fecha,
      tipo,
      corte,
    });
    return NextResponse.json({
      ok: result.ok,
      status: result.status,
      message: result.message,
      fecha,
      corte,
      summary: result.snapshot
        ? {
            total_esperados: result.snapshot.total_esperados,
            total_presentes: result.snapshot.total_presentes,
            total_tardios: result.snapshot.total_tardios,
            total_ausentes: result.snapshot.total_ausentes,
          }
        : undefined,
    });
  } catch (err) {
    console.error("[/api/asistencia/cron-report] Error:", err);
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "internal-error",
      },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest) {
  return POST(req);
}
