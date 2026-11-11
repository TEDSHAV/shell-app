import { NextRequest, NextResponse } from "next/server";
import {
  createServiceRoleClient,
  getAsistenciaConfig,
} from "@/lib/asistencia/report-service";
import {
  recordDailyAttendanceForUsuario,
} from "@/lib/asistencia/record";
import {
  formatCaracasTime12h,
  getCaracasDateString,
  getCorteForCaracasTime,
  isWeekdayCaracas,
} from "@/lib/asistencia/time";

function verifySecret(req: NextRequest): boolean {
  const expected =
    process.env.ASISTENCIA_API_KEY?.trim() ||
    process.env.ASISTENCIA_CRON_SECRET?.trim() ||
    process.env.CRON_SECRET?.trim() ||
    process.env.REQUISICIONES_NOTIFY_SECRET?.trim();

  if (!expected) return false;

  const headerSecret =
    req.headers.get("x-asistencia-secret")?.trim() ||
    req.headers.get("x-cron-secret")?.trim() ||
    req.headers.get("x-internal-secret")?.trim();
  const authHeader = req.headers.get("authorization")?.trim();
  const bearerSecret = authHeader?.toLowerCase().startsWith("bearer ")
    ? authHeader.slice(7).trim()
    : null;
  const querySecret = req.nextUrl.searchParams.get("secret")?.trim();

  return (
    headerSecret === expected ||
    bearerSecret === expected ||
    querySecret === expected
  );
}

interface CheckInPayload {
  action?: "verify" | "check-in";
  email?: string;
  cedula?: string;
  identifier?: string;
  usuarioId?: number;
  corte?: 1 | 2;
  hostname?: string;
  windowsUser?: string;
}

export async function POST(req: NextRequest) {
  if (!verifySecret(req)) {
    return NextResponse.json(
      { ok: false, error: "unauthorized", message: "Credencial o secreto inválido." },
      { status: 401 },
    );
  }

  let body: CheckInPayload = {};
  try {
    body = await req.json();
  } catch {
    // Empty body is handled below
  }

  const action = body.action || "check-in";
  const identifier = (
    body.identifier ||
    body.email ||
    body.cedula ||
    req.nextUrl.searchParams.get("email") ||
    req.nextUrl.searchParams.get("identifier") ||
    ""
  ).trim();

  const usuarioId = body.usuarioId || Number(req.nextUrl.searchParams.get("usuarioId") || 0);

  const supabase = createServiceRoleClient();

  // 1. Resolve user in database
  let userQuery = supabase
    .from("usuarios")
    .select(
      "id, nombre_apellido, email_corporativo, cedula, cargo, departamento, esta_activo",
    )
    .or("esta_activo.is.null,esta_activo.eq.true");

  if (usuarioId > 0) {
    userQuery = userQuery.eq("id", usuarioId);
  } else if (identifier) {
    const isEmail = identifier.includes("@");
    if (isEmail) {
      userQuery = userQuery.ilike("email_corporativo", identifier.toLowerCase());
    } else {
      userQuery = userQuery.eq("cedula", identifier);
    }
  } else {
    return NextResponse.json(
      {
        ok: false,
        error: "missing_identifier",
        message: "Debe proporcionar el correo corporativo o la cédula del colaborador.",
      },
      { status: 400 },
    );
  }

  const { data: usuario, error: userError } = await userQuery.maybeSingle();

  if (userError || !usuario) {
    return NextResponse.json(
      {
        ok: false,
        error: "user_not_found",
        message: `No se encontró un usuario activo con el identificador: ${identifier || usuarioId}`,
      },
      { status: 404 },
    );
  }

  // Fetch department name if present
  let departamentoNombre = "Sin departamento";
  if (usuario.departamento) {
    const { data: dept } = await supabase
      .from("departamentos")
      .select("nombre")
      .eq("id", usuario.departamento)
      .maybeSingle();
    if (dept?.nombre) {
      departamentoNombre = String(dept.nombre).trim();
    }
  }

  // If action is verify only (used during initial workstation setup)
  if (action === "verify") {
    return NextResponse.json({
      ok: true,
      action: "verify",
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre_apellido,
        email: usuario.email_corporativo,
        cedula: usuario.cedula,
        cargo: usuario.cargo,
        departamento_id: usuario.departamento,
        departamento_nombre: departamentoNombre,
      },
    });
  }

  // 2. Load attendance configuration & rules
  const now = new Date();
  const todayDate = getCaracasDateString(now);
  const config = await getAsistenciaConfig(supabase);

  if (!config.activo) {
    return NextResponse.json({
      ok: true,
      recorded: false,
      status: "disabled",
      message: "El sistema de control de asistencia está actualmente desactivado.",
    });
  }

  // Check user or department exclusions
  const isExcluded =
    config.usuarios_excluidos.includes(usuario.id) ||
    (usuario.departamento && config.departamentos_excluidos.includes(usuario.departamento));

  if (isExcluded) {
    return NextResponse.json({
      ok: true,
      recorded: false,
      status: "excluded",
      message: "Este usuario o departamento se encuentra en la lista de exclusión de asistencia.",
    });
  }

  // Check weekends and holidays
  if (config.omitir_feriados) {
    if (!isWeekdayCaracas(now)) {
      return NextResponse.json({
        ok: true,
        recorded: false,
        status: "skipped_weekend",
        message: "Fin de semana: no se registra asistencia obligatoria de oficina.",
      });
    }

    const { data: feriado } = await supabase
      .from("cat_feriados_venezuela")
      .select("nombre")
      .eq("fecha", todayDate)
      .maybeSingle();

    if (feriado) {
      return NextResponse.json({
        ok: true,
        recorded: false,
        status: "skipped_holiday",
        message: `Feriado nacional: ${feriado.nombre}`,
      });
    }
  }

  // 3. Determine Corte (1 = Mañana, 2 = Tarde)
  const queryCorte = req.nextUrl.searchParams.get("corte");
  const targetCorte: 1 | 2 =
    body.corte === 2 || queryCorte === "2"
      ? 2
      : body.corte === 1 || queryCorte === "1"
        ? 1
        : getCorteForCaracasTime(now, config.hora_reset_mediodia);

  // 4. Record attendance with bypassMorningReset = true (physical PC check-in allows 07:00 AM onwards)
  const result = await recordDailyAttendanceForUsuario(
    usuario.id,
    "login",
    now,
    targetCorte,
    true, // allow early morning arrivals from 07:00 AM
  );

  return NextResponse.json({
    ok: true,
    recorded: result.recorded,
    already_registered: !result.recorded && Boolean(result.hora_registro),
    fecha: result.fecha,
    corte: result.corte,
    hora_registro: result.hora_registro,
    hora_formateada: result.hora_registro
      ? formatCaracasTime12h(result.hora_registro)
      : null,
    usuario: {
      id: usuario.id,
      nombre: usuario.nombre_apellido,
      departamento: departamentoNombre,
    },
  });
}

export async function GET(req: NextRequest) {
  // Support quick GET requests for verification or check-in testing
  return POST(req);
}
