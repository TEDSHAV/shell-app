import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { estado_sesion, comparar_eventos } from "../features/osi-calendario/lib/estado-sesion";
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

  it("planificada, atrasada y ejecutada", () => {
    assert.equal(estado_sesion(base, hoy), "planificada");
    assert.equal(estado_sesion({ ...base, fecha_efectiva: "2026-11-01" }, hoy), "atrasada");
    assert.equal(estado_sesion({ ...base, fecha_ejecutada: "2026-11-02" }, hoy), "ejecutada");
    assert.equal(estado_sesion({ ...base, id_estatus_sesion: 39 }, hoy), "no_ejecutada");
  });

  it("reagenda con y sin fecha", () => {
    assert.equal(estado_sesion({ ...base, id_estatus_sesion: 46, reagenda_count: 1 }, hoy), "por_confirmar");
    assert.equal(estado_sesion({ ...base, id_estatus_sesion: 46, reagenda_count: 2, fecha_reagendada: "2026-11-20" }, hoy), "reagendada");
    assert.equal(estado_sesion({ ...base, id_estatus_sesion: 46, reagenda_count: 1, fecha_reagendada: "2026-11-03" }, hoy), "atrasada");
  });

  it("ordena por hora y deja sin hora al final", () => {
    const ev = (id_osi: number, hora_inicio: string | null) => ({
      id_osi, nro_sesion: 1, hora_inicio, hora_ejecutada: null, hora_reagendada: null, fecha_ejecutada: null, fecha_reagendada: null,
    });
    const lista = [ev(1, null), ev(2, "14:00"), ev(3, "08:00")].sort(comparar_eventos);
    assert.deepEqual(lista.map((e) => e.id_osi), [3, 2, 1]);
  });
});
