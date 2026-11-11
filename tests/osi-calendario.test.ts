import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { estado_sesion, comparar_eventos, empresa_y_sede } from "../features/osi-calendario/lib/estado-sesion";
import { es_en_sha } from "../features/osi-calendario/lib/en-sha";
import { acciones_disponibles, acciones_por_permiso, motivo_no_aplica } from "../features/osi-calendario/lib/acciones";
import { hora_corta, inicio_semana, mover_mes, normalizar_mes, rango_grilla, semanas_del_mes } from "../features/osi-calendario/lib/mes-grid";

describe("mes-grid", () => {
  it("noviembre 2026 empieza el domingo 1 y la grilla va de lunes a domingo", () => {
    const semanas = semanas_del_mes("2026-11");
    assert.equal(semanas[0][0].fecha, "2026-10-26");
    assert.equal(semanas[0][6].fecha, "2026-11-01");
    assert.equal(semanas[0][6].en_mes, true);
    assert.equal(semanas.at(-1)?.[0].fecha, "2026-11-30");
    assert.deepEqual(rango_grilla("2026-11"), { desde: "2026-10-26", hasta: "2026-12-06" });
    assert.ok(semanas.every((s) => s.length === 7));
  });

  it("mueve meses cruzando el año y normaliza el parámetro", () => {
    assert.equal(mover_mes("2026-12", 1), "2027-01");
    assert.equal(mover_mes("2026-01", -1), "2025-12");
    assert.equal(normalizar_mes("2026-13", "2026-11-04"), "2026-11");
    assert.equal(normalizar_mes("2027-02", "2026-11-04"), "2027-02");
  });

  it("inicio de semana es lunes y la hora corta es 12h", () => {
    assert.equal(inicio_semana("2026-11-04"), "2026-11-02");
    assert.equal(inicio_semana("2026-11-08"), "2026-11-02");
    assert.equal(hora_corta("06:30:00"), "6:30 a. m.");
    assert.equal(hora_corta("13:00"), "1:00 p. m.");
    assert.equal(hora_corta(null), null);
  });
});

describe("estado-sesion", () => {
  const base = { fecha_ejecutada: null, id_estatus_sesion: null, fecha_reagendada: null, reagenda_count: 0, fecha_efectiva: "2026-11-10" };
  const hoy = "2026-11-04";

  it("programada, por registrar y ejecutada", () => {
    assert.equal(estado_sesion(base, hoy), "programada");
    assert.equal(estado_sesion({ ...base, fecha_efectiva: "2026-11-01" }, hoy), "por_registrar");
    assert.equal(estado_sesion({ ...base, fecha_ejecutada: "2026-11-02" }, hoy), "ejecutada");
    assert.equal(estado_sesion({ ...base, id_estatus_sesion: 39 }, hoy), "cancelada");
  });

  it("reagenda con y sin fecha", () => {
    assert.equal(estado_sesion({ ...base, id_estatus_sesion: 46, reagenda_count: 1 }, hoy), "sin_fecha");
    assert.equal(estado_sesion({ ...base, id_estatus_sesion: 46, reagenda_count: 2, fecha_reagendada: "2026-11-20" }, hoy), "reagendada");
    assert.equal(estado_sesion({ ...base, id_estatus_sesion: 46, reagenda_count: 1, fecha_reagendada: "2026-11-03" }, hoy), "por_registrar");
  });

  it("ordena por hora y deja sin hora al final", () => {
    const ev = (id_osi: number, hora_inicio: string | null) => ({
      id_osi, nro_sesion: 1, hora_inicio, hora_ejecutada: null, hora_reagendada: null, fecha_ejecutada: null, fecha_reagendada: null,
    });
    const lista = [ev(1, null), ev(2, "14:00"), ev(3, "08:00")].sort(comparar_eventos);
    assert.deepEqual(lista.map((e) => e.id_osi), [3, 2, 1]);
  });

  it("separa empresa y sede", () => {
    assert.deepEqual(empresa_y_sede("COCA COLA FEMSA  DISTRIBUIDORA BOLIVAR"), { empresa: "COCA COLA FEMSA", sede: "DISTRIBUIDORA BOLIVAR" });
    assert.deepEqual(empresa_y_sede("NEW PROYECT CA"), { empresa: "NEW PROYECT CA", sede: null });
  });
});

describe("en-sha", () => {
  it("reconoce las variantes de la sede SHA", () => {
    for (const d of ["SHA", "SHA DE VENEZUELA.C,A,", "Instalaciones de SHA", "SHA DE VENEZUELA -  HOTEL RASIL, PUERTO LA CRUZ", "Av. Paseo Colón con Calle Monagas CC Hotel Rasil Nivel 2 Local 8"]) {
      assert.equal(es_en_sha(d), true, d);
    }
  });
  it("no confunde Brasil, Caracas ni direcciones de clientes", () => {
    for (const d of ["CALLE BRASIL CASA NRO S/N", "CARACAS INSTALACIONES DE SIEMENS Y SHA DE VENEZUELA", "CARRETERA LOS MONTONES, BARCELONA", null, ""]) {
      assert.equal(es_en_sha(d), false, String(d));
    }
  });
});

describe("no se dio y permisos por acción", () => {
  const hoy = "2026-11-04";
  const base = { fecha_ejecutada: null, id_estatus_sesion: null, fecha_reagendada: null, reagenda_count: 0, fecha_efectiva: "2026-11-03" };

  it("«no se dio» queda pendiente de decisión, pero no tapa ejecutada ni cancelada", () => {
    assert.equal(estado_sesion({ ...base, no_se_dio: true }, hoy), "no_se_dio");
    assert.equal(estado_sesion({ ...base, no_se_dio: true, id_estatus_sesion: 39 }, hoy), "cancelada");
    assert.equal(estado_sesion({ ...base, no_se_dio: true, fecha_ejecutada: "2026-11-03" }, hoy), "ejecutada");
  });

  const todo = { ejecutar: true, reagendar: true, cancelar: true };
  const solo_ejecutar = { ejecutar: true, reagendar: false, cancelar: false };

  it("con los tres permisos: ejecutar, reagendar y cancelar (sin «no se dio»)", () => {
    assert.deepEqual(acciones_disponibles(todo, "por_registrar", "2026-11-03", hoy), ["ejecutar", "reagendar", "no_ejecutar"]);
  });

  it("solo ejecutar: ejecutada / no se dio, y «no se dio» solo si la fecha ya llegó", () => {
    assert.deepEqual(acciones_disponibles(solo_ejecutar, "por_registrar", "2026-11-03", hoy), ["ejecutar", "no_se_dio"]);
    assert.deepEqual(acciones_disponibles(solo_ejecutar, "programada", "2026-11-10", hoy), ["ejecutar"]);
    assert.deepEqual(acciones_disponibles(solo_ejecutar, "no_se_dio", "2026-11-03", hoy), ["ejecutar"]);
  });

  it("ejecutar y reagendar sin cancelar: también puede marcar «no se dio»", () => {
    assert.deepEqual(
      acciones_disponibles({ ejecutar: true, reagendar: true, cancelar: false }, "por_registrar", "2026-11-03", hoy),
      ["ejecutar", "no_se_dio", "reagendar"],
    );
  });

  it("sin permisos no hay acciones; una cancelada no se vuelve a cancelar", () => {
    assert.deepEqual(acciones_disponibles({ ejecutar: false, reagendar: false, cancelar: false }, "por_registrar", "2026-11-03", hoy), []);
    assert.deepEqual(acciones_disponibles(todo, "cancelada", "2026-11-03", hoy), ["ejecutar", "reagendar"]);
  });
});

describe("lote", () => {
  const hoy = "2026-11-04";
  it("acciones del lote según permisos", () => {
    assert.deepEqual(acciones_por_permiso({ ejecutar: true, reagendar: true, cancelar: true }), ["ejecutar", "reagendar", "no_ejecutar"]);
    assert.deepEqual(acciones_por_permiso({ ejecutar: true, reagendar: false, cancelar: false }), ["ejecutar", "no_se_dio"]);
    assert.deepEqual(acciones_por_permiso({ ejecutar: false, reagendar: false, cancelar: true }), ["no_ejecutar"]);
  });
  it("omite lo que no aplica y dice por qué", () => {
    assert.equal(motivo_no_aplica("ejecutar", "programada", "2026-11-10", hoy), "Su fecha todavía no llega");
    assert.equal(motivo_no_aplica("ejecutar", "por_registrar", "2026-11-03", hoy), null);
    assert.equal(motivo_no_aplica("ejecutar", "ejecutada", "2026-11-03", hoy), "Ya está ejecutada");
    assert.equal(motivo_no_aplica("no_se_dio", "no_se_dio", "2026-11-03", hoy), "Ya está como no ejecutada");
    assert.equal(motivo_no_aplica("reagendar", "no_se_dio", "2026-11-03", hoy), null);
    assert.equal(motivo_no_aplica("reagendar", "cancelada", "2026-11-03", hoy), "Ya está cancelada");
    assert.equal(motivo_no_aplica("no_ejecutar", "ejecutada", "2026-11-03", hoy), "Ya está ejecutada");
  });
});

describe("impacto en la OSI y avisos de fecha", () => {
  const hoy = "2026-11-04";
  const s = (id: number, nro: number, estado: import("../features/osi-calendario/lib/types").EstadoSesion, fecha = "2026-11-01") => ({ id_sesion: id, nro_sesion: nro, estado, fecha_efectiva: fecha });

  it("ejecutar la última abierta cierra la OSI; con PEN- no se cierra", async () => {
    const { efecto_en_osi } = await import("../features/osi-calendario/lib/impacto");
    const sesiones = [s(1, 1, "ejecutada"), s(2, 2, "por_registrar")];
    assert.equal(efecto_en_osi({ accion: "ejecutar", sesiones, ids_afectadas: new Set([2]), id_estatus_osi: 11, nro_osi: "3402" }), "cierra_ejecutada");
    assert.equal(efecto_en_osi({ accion: "ejecutar", sesiones, ids_afectadas: new Set([2]), id_estatus_osi: 11, nro_osi: "PEN-12" }), "pendiente_pen");
    assert.equal(efecto_en_osi({ accion: "ejecutar", sesiones: [...sesiones, s(3, 3, "programada")], ids_afectadas: new Set([2]), id_estatus_osi: 11, nro_osi: "3402" }), null);
  });

  it("cancelar todas cierra como no ejecutada; reagendar una ejecutada reabre", async () => {
    const { efecto_en_osi } = await import("../features/osi-calendario/lib/impacto");
    assert.equal(efecto_en_osi({ accion: "no_ejecutar", sesiones: [s(1, 1, "por_registrar")], ids_afectadas: new Set([1]), id_estatus_osi: 10, nro_osi: "1" }), "cierra_no_ejecutada");
    assert.equal(efecto_en_osi({ accion: "reagendar", sesiones: [s(1, 1, "ejecutada"), s(2, 2, "ejecutada")], ids_afectadas: new Set([2]), id_estatus_osi: 12, nro_osi: "1" }), "reabre");
    assert.equal(efecto_en_osi({ accion: "no_se_dio", sesiones: [s(1, 1, "por_registrar")], ids_afectadas: new Set([1]), id_estatus_osi: 11, nro_osi: "1" }), null);
  });

  it("avisa fecha pasada y fuera de orden", async () => {
    const { avisos_fecha } = await import("../features/osi-calendario/lib/fechas-sesion");
    const hermanas = [s(1, 1, "ejecutada", "2026-11-02"), s(2, 2, "programada", "2026-11-05"), s(3, 3, "programada", "2026-11-06")];
    assert.equal(avisos_fecha({ id_sesion: 2, nro_sesion: 2 }, "2026-11-05", hermanas, hoy).length, 0);
    const pasada = avisos_fecha({ id_sesion: 2, nro_sesion: 2 }, "2026-11-01", hermanas, hoy);
    assert.equal(pasada.length, 2);
    assert.match(pasada[0], /ya pasó/);
    assert.match(pasada[1], /antes de la sesión 1/);
    assert.match(avisos_fecha({ id_sesion: 2, nro_sesion: 2 }, "2026-11-09", hermanas, hoy)[0], /después de la sesión 3/);
  });
});
