import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatCaracasTime12h,
  formatCutoffLabel,
  formatDdMmYyyy,
  getCaracasDateString,
  getCaracasTimeString,
  getCaracasWorkdaySessionStamp,
  isAfterMorningReset,
  isOnOrBeforeCutoff,
  isWeekdayCaracas,
  normalizeCutoffTime,
} from "../lib/asistencia/time";
import {
  buildAsistenciaReportEmail,
  type AsistenciaSnapshot,
} from "../lib/asistencia/email-template";
import {
  buildAsistenciaSnapshot,
  sendDailyAsistenciaReport,
} from "../lib/asistencia/report-service";

describe("lib/asistencia/time (America/Caracas UTC-4)", () => {
  it("computes Caracas YYYY-MM-DD and HH:MM:SS accurately across UTC day boundaries", () => {
    // 2026-10-23 02:30:00 UTC is still 2026-10-22 22:30:00 in America/Caracas (UTC-4)
    const lateNightCaracas = new Date("2026-10-23T02:30:00.000Z");
    assert.equal(getCaracasDateString(lateNightCaracas), "2026-10-22");
    assert.equal(getCaracasTimeString(lateNightCaracas), "22:30:00");

    // 2026-10-23 12:15:30 UTC is 2026-10-23 08:15:30 in America/Caracas
    const morningCaracas = new Date("2026-10-23T12:15:30.000Z");
    assert.equal(getCaracasDateString(morningCaracas), "2026-10-23");
    assert.equal(getCaracasTimeString(morningCaracas), "08:15:30");
    assert.equal(formatCaracasTime12h(morningCaracas), "08:15 AM");
  });

  it("evaluates cutoff time boundary (08:30:00 AM Caracas) accurately", () => {
    // 08:29:59 AM Caracas (12:29:59 UTC) -> on time
    assert.equal(
      isOnOrBeforeCutoff("2026-10-23T12:29:59.000Z", "08:30:00"),
      true,
    );
    // 08:30:00 AM Caracas (12:30:00 UTC) -> on time (inclusive)
    assert.equal(
      isOnOrBeforeCutoff("2026-10-23T12:30:00.000Z", "08:30:00"),
      true,
    );
    // 08:30:01 AM Caracas (12:30:01 UTC) -> late
    assert.equal(
      isOnOrBeforeCutoff("2026-10-23T12:30:01.000Z", "08:30:00"),
      false,
    );
  });

  it("normalizes cutoff time strings and formats 12h labels", () => {
    assert.equal(normalizeCutoffTime("8:30"), "08:30:00");
    assert.equal(normalizeCutoffTime("08:30:00"), "08:30:00");
    assert.equal(normalizeCutoffTime("invalid"), "08:30:00");
    assert.equal(formatCutoffLabel("08:30:00"), "08:30 AM");
    assert.equal(formatCutoffLabel("13:15:00"), "01:15 PM");
    assert.equal(formatDdMmYyyy("2026-10-23"), "23/10/2026");
  });

  it("detects weekdays vs weekends in America/Caracas", () => {
    // Friday 2026-10-23 -> weekday
    assert.equal(isWeekdayCaracas("2026-10-23"), true);
    // Saturday 2026-10-24 -> weekend
    assert.equal(isWeekdayCaracas("2026-10-24"), false);
    // Sunday 2026-10-25 -> weekend
    assert.equal(isWeekdayCaracas("2026-10-25"), false);
    // Monday 2026-10-26 -> weekday
    assert.equal(isWeekdayCaracas("2026-10-26"), true);
  });

  it("handles pre-8:00 AM logins with an 08:00 AM morning boundary so pre-8AM sessions expire at 8AM", () => {
    // 03:00:00 AM Caracas (07:00:00 UTC) -> gets ':madrugada' stamp and is NOT after morning reset
    const threeAmCaracas = new Date("2026-10-23T07:00:00.000Z");
    assert.equal(
      getCaracasWorkdaySessionStamp(threeAmCaracas),
      "2026-10-23:madrugada",
    );
    assert.equal(isAfterMorningReset(threeAmCaracas), false);

    // 07:59:59 AM Caracas (11:59:59 UTC) -> still ':madrugada'
    const sevenFiftyNineCaracas = new Date("2026-10-23T11:59:59.000Z");
    assert.equal(
      getCaracasWorkdaySessionStamp(sevenFiftyNineCaracas),
      "2026-10-23:madrugada",
    );
    assert.equal(isAfterMorningReset(sevenFiftyNineCaracas), false);

    // 08:00:00 AM Caracas (12:00:00 UTC) -> workday stamp switches to '2026-10-23', expiring pre-8:00 AM sessions
    const eightAmCaracas = new Date("2026-10-23T12:00:00.000Z");
    assert.equal(getCaracasWorkdaySessionStamp(eightAmCaracas), "2026-10-23");
    assert.equal(isAfterMorningReset(eightAmCaracas), true);
  });
});

describe("lib/asistencia/email-template", () => {
  it("renders department tables, green checkmark badges, and red x badges", () => {
    const mockSnapshot: AsistenciaSnapshot = {
      fecha: "2026-10-23",
      hora_corte: "08:30:00",
      es_feriado: false,
      nombre_feriado: null,
      total_esperados: 3,
      total_presentes: 2,
      total_tardios: 1,
      total_ausentes: 1,
      total_excluidos: 0,
      porcentaje_asistencia: 67,
      excluidos: [],
      departamentos: [
        {
          departamento_id: 1,
          departamento_nombre: "Calidad",
          total: 2,
          presentes: 1,
          ausentes: 1,
          tardios: 1,
          usuarios: [
            {
              usuario_id: 10,
              nombre_apellido: "María Pérez",
              email_corporativo: "mperez@shadevenezuela.com.ve",
              cargo: "Analista de Calidad",
              departamento_id: 1,
              departamento_nombre: "Calidad",
              hora_registro: "2026-10-23T11:52:00.000Z",
              hora_formateada: "07:52 AM",
              metodo: "login",
              estado: "presente",
              presente_en_corte: true,
            },
            {
              usuario_id: 11,
              nombre_apellido: "Carlos Gómez",
              email_corporativo: "cgomez@shadevenezuela.com.ve",
              cargo: "Coordinador",
              departamento_id: 1,
              departamento_nombre: "Calidad",
              hora_registro: "2026-10-23T12:48:00.000Z",
              hora_formateada: "08:48 AM",
              metodo: "login",
              estado: "tardio",
              presente_en_corte: false,
            },
          ],
        },
        {
          departamento_id: 6,
          departamento_nombre: "TED",
          total: 1,
          presentes: 1,
          ausentes: 0,
          tardios: 0,
          usuarios: [
            {
              usuario_id: 20,
              nombre_apellido: "Andrés Silva",
              email_corporativo: "asilva@shadevenezuela.com.ve",
              cargo: "Desarrollador",
              departamento_id: 6,
              departamento_nombre: "TED",
              hora_registro: "2026-10-23T12:05:00.000Z",
              hora_formateada: "08:05 AM",
              metodo: "login",
              estado: "presente",
              presente_en_corte: true,
            },
          ],
        },
      ],
    };

    const email = buildAsistenciaReportEmail(mockSnapshot);
    assert.ok(email.subject.includes("23/10/2026"));
    assert.ok(email.subject.includes("08:30 AM"));
    assert.ok(email.html.includes("Calidad"));
    assert.ok(email.html.includes("TED"));
    assert.ok(email.html.includes("María Pérez"));
    assert.ok(email.html.includes("&#10003; Presente"));
    assert.ok(email.html.includes("&#10005; Sin registro"));
    assert.ok(email.html.includes("08:48 AM (tardío)"));
    assert.ok(email.text.includes("[✓ PRESENTE] María Pérez"));
    assert.ok(email.text.includes("[✕ SIN REGISTRO] Carlos Gómez"));
  });
});

function createMockSupabase(opts: {
  config?: Record<string, unknown>;
  usuarios?: Array<Record<string, unknown>>;
  departamentos?: Array<Record<string, unknown>>;
  puestos?: Array<Record<string, unknown>>;
  asistencia?: Array<Record<string, unknown>>;
  feriado?: Record<string, unknown> | null;
  destinatarios?: Array<Record<string, unknown>>;
  existingScheduledLog?: Record<string, unknown> | null;
}) {
  return {
    from(table: string) {
      const builder: any = {
        select() {
          return builder;
        },
        eq() {
          return builder;
        },
        not() {
          return builder;
        },
        or() {
          return builder;
        },
        in() {
          return builder;
        },
        order() {
          return builder;
        },
        limit() {
          return builder;
        },
        insert() {
          return builder;
        },
        update() {
          return builder;
        },
        maybeSingle: async () => {
          if (table === "asistencia_config") {
            return { data: opts.config ?? null, error: null };
          }
          if (table === "cat_feriados_venezuela") {
            return { data: opts.feriado ?? null, error: null };
          }
          if (table === "asistencia_reportes_log") {
            return { data: opts.existingScheduledLog ?? null, error: null };
          }
          return { data: null, error: null };
        },
        then(resolve: (val: any) => void) {
          if (table === "usuarios") {
            return resolve({ data: opts.usuarios ?? [], error: null });
          }
          if (table === "departamentos") {
            return resolve({ data: opts.departamentos ?? [], error: null });
          }
          if (table === "puestos_empleados") {
            return resolve({ data: opts.puestos ?? [], error: null });
          }
          if (table === "asistencia_diaria") {
            return resolve({ data: opts.asistencia ?? [], error: null });
          }
          if (table === "asistencia_destinatarios") {
            return resolve({ data: opts.destinatarios ?? [], error: null });
          }
          return resolve({ data: [], error: null });
        },
      };
      return builder;
    },
  } as any;
}

describe("lib/asistencia/report-service", () => {
  it("groups users by department, excludes configured users/depts, and separates on-time vs late vs absent", async () => {
    const mockDb = createMockSupabase({
      config: {
        id: 1,
        activo: true,
        hora_corte: "08:30:00",
        timezone: "America/Caracas",
        omitir_feriados: true,
        usuarios_excluidos: [4],
        departamentos_excluidos: [99],
      },
      departamentos: [
        { id: 1, nombre: "Administración" },
        { id: 2, nombre: "Calidad" },
        { id: 99, nombre: "Externos" },
      ],
      usuarios: [
        {
          id: 1,
          nombre_apellido: "Ana López",
          email_corporativo: "alopez@shadevenezuela.com.ve",
          cargo: "Analista",
          departamento: 1,
          esta_activo: true,
          id_auth: "uuid-1",
        },
        {
          id: 2,
          nombre_apellido: "Pedro Martínez",
          email_corporativo: "pmartinez@shadevenezuela.com.ve",
          cargo: null,
          departamento: 1,
          esta_activo: true,
          id_auth: "uuid-2",
        },
        {
          id: 3,
          nombre_apellido: "Lucía Díaz",
          email_corporativo: "ldiaz@shadevenezuela.com.ve",
          cargo: "Coordinadora",
          departamento: 2,
          esta_activo: true,
          id_auth: "uuid-3",
        },
        {
          id: 4,
          nombre_apellido: "Usuario Vacaciones",
          email_corporativo: "vacaciones@shadevenezuela.com.ve",
          cargo: "Especialista",
          departamento: 2,
          esta_activo: true,
          id_auth: "uuid-4",
        },
        {
          id: 5,
          nombre_apellido: "Usuario Depto Excluido",
          email_corporativo: "ext@shadevenezuela.com.ve",
          cargo: "Consultor",
          departamento: 99,
          esta_activo: true,
          id_auth: "uuid-5",
        },
      ],
      puestos: [{ id_empleado: 2, cargo: "Contador" }],
      asistencia: [
        // Ana logged in at 07:50 AM Caracas (11:50 UTC) -> Presente
        {
          usuario_id: 1,
          hora_registro: "2026-10-23T11:50:00.000Z",
          metodo: "login",
        },
        // Pedro logged in at 08:45 AM Caracas (12:45 UTC) -> Tardío (counts as absent at 08:30 cutoff)
        {
          usuario_id: 2,
          hora_registro: "2026-10-23T12:45:00.000Z",
          metodo: "login",
        },
        // Lucía did not log in -> Ausente
      ],
      feriado: null,
    });

    const snapshot = await buildAsistenciaSnapshot("2026-10-23", mockDb);

    assert.equal(snapshot.total_esperados, 3);
    assert.equal(snapshot.total_presentes, 1);
    assert.equal(snapshot.total_tardios, 1);
    assert.equal(snapshot.total_ausentes, 2);
    assert.equal(snapshot.total_excluidos, 2);
    assert.equal(snapshot.porcentaje_asistencia, 33);
    assert.equal(snapshot.departamentos.length, 2);

    const adminDept = snapshot.departamentos.find(
      (d) => d.departamento_nombre === "Administración",
    )!;
    assert.ok(adminDept);
    assert.equal(adminDept.presentes, 1);
    assert.equal(adminDept.ausentes, 1);
    assert.equal(adminDept.tardios, 1);

    const pedro = adminDept.usuarios.find((u) => u.usuario_id === 2)!;
    assert.equal(pedro.cargo, "Contador");
    assert.equal(pedro.estado, "tardio");
    assert.equal(pedro.presente_en_corte, false);
    assert.equal(pedro.hora_formateada, "08:45 AM");
  });
});

