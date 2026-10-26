import assert from "node:assert/strict";
import { describe, it } from "node:test";
import QRCode from "qrcode";
import {
  buildExitUpdatePayload,
  canEditVisitantesConfig,
  computeVisitantesKpis,
  getCaracasDateString,
  mergeVisitantesConfig,
  validateVisitorRegistration,
} from "../lib/visitantes/service";
import { DEFAULT_VISITANTES_CONFIG } from "../features/visitantes/lib/visitantes-defaults";
import { can_access_shell_app } from "../lib/shell-app-access";
import { build_app_config } from "../lib/app-theme";
import type { VisitanteRegistro } from "../actions/visitantes";

describe("Control de Visitantes - Navigation & Access Control", () => {
  it("allows every department and role to access 'visitantes' in Utilidades", () => {
    const visitantesApp = build_app_config({
      id: "visitantes",
      name: "Control de Visitantes",
      description:
        "Registro de visitantes por código QR, asignación de responsables y control de acceso",
      basePath: "/visitantes",
      icon: (() => null) as any,
      brandColor: "#0D9488",
      embedMode: "native",
      hiddenFromDashboard: true,
      groupId: "utilidades",
      dashboardOrder: 9.5,
      navLinks: [],
    });

    assert.equal(visitantesApp.id, "visitantes");
    assert.equal(visitantesApp.groupId, "utilidades");
    assert.equal(visitantesApp.embedMode, "native");

    const departments = [
      "Administración",
      "Calidad",
      "Capacitación",
      "Marketing",
      "Negocios",
      "Recursos Humanos",
      "Servicios Técnicos",
      "TED",
      null,
    ];

    for (const dept of departments) {
      assert.equal(
        can_access_shell_app(visitantesApp, {}, "user", dept),
        true,
        `Department ${dept} with role 'user' must be able to access visitantes`,
      );
    }
  });

  it("restricts disclaimer and settings editing to Admin, Superadmin, and TED users only", () => {
    assert.equal(canEditVisitantesConfig({ globalRole: "admin" }), true);
    assert.equal(canEditVisitantesConfig({ globalRole: "superadmin" }), true);
    assert.equal(
      canEditVisitantesConfig({ globalRole: "user", departamento: "TED" }),
      true,
    );
    assert.equal(
      canEditVisitantesConfig({
        globalRole: "user",
        departamento: "Negocios",
        userRolesByApp: { ted: "miembro" },
      }),
      true,
    );
    assert.equal(
      canEditVisitantesConfig({
        globalRole: "user",
        departamento: "Calidad",
        userRolesByApp: { scalidad: "analista" },
      }),
      false,
    );
    assert.equal(
      canEditVisitantesConfig({
        globalRole: "user",
        departamento: "Capacitación",
        userRolesByApp: { scapacitacion: "coordinador" },
      }),
      false,
    );
  });
});

describe("Control de Visitantes - QR Registration Validation & Disclaimer", () => {
  it("rejects registration when disclaimer is not accepted", () => {
    const noDisclaimer = validateVisitorRegistration({
      nombre_apellido: "Juan Pérez",
      nacionalidad: "V",
      cedula: "18.456.789",
      acepto_descargo: false,
    });
    assert.equal(noDisclaimer.ok, false);
    assert.ok(noDisclaimer.error?.includes("descargo"));
  });

  it("allows QR and manual registration without phone, empresa, persona a visitar, or digital signature", () => {
    const validQrMinimal = validateVisitorRegistration({
      nombre_apellido: "  María Rodríguez  ",
      nacionalidad: "E",
      cedula: "E-82.345.678",
      telefono: null,
      empresa_procedencia: null,
      persona_a_visitar: null,
      acepto_descargo: true,
    });
    assert.equal(validQrMinimal.ok, true);
    assert.deepEqual(validQrMinimal.sanitized, {
      nombre_apellido: "María Rodríguez",
      nacionalidad: "E",
      cedula: "82345678",
      telefono: "",
      empresa_procedencia: "Particular",
      motivo_visita: null,
      departamento_destino: null,
      persona_a_visitar: null,
      nro_pase: null,
    });
  });

  it("merges custom disclaimer configuration with SHA defaults", () => {
    const merged = mergeVisitantesConfig({
      titulo_descargo: "Normas Personalizadas SHA",
    });
    assert.equal(merged.titulo_descargo, "Normas Personalizadas SHA");
    assert.equal(
      merged.texto_descargo,
      DEFAULT_VISITANTES_CONFIG.texto_descargo,
    );
  });

  it("generates a valid QR code data URL for the public visitor registration URL", async () => {
    const qrDataUrl = await QRCode.toDataURL(
      "https://prisma.shadevenezuela.com.ve/registro-visitante",
      { width: 320, margin: 2 },
    );
    assert.ok(qrDataUrl.startsWith("data:image/png;base64,"));
    assert.ok(qrDataUrl.length > 500);
  });
});

describe("Control de Visitantes - KPIs, Responsible Assignment & Exit Flow", () => {
  it("computes active, unassigned, today's entries, and completed visits accurately", () => {
    const today = "2026-10-26";
    const mockRows: VisitanteRegistro[] = [
      {
        id: 1,
        nombre_apellido: "Visitante Activo Sin Responsable",
        nacionalidad: "V",
        cedula: "12345678",
        telefono: "04141112233",
        empresa_procedencia: "Cliente A",
        motivo_visita: "Reunión",
        departamento_destino: "Negocios",
        persona_a_visitar: null,
        nro_pase: null,
        fecha: today,
        hora_entrada: "2026-10-26T13:00:00.000Z",
        acepto_descargo: true,
        texto_descargo_aceptado: "OK",
        firma_entrada: "data:image/png;base64,xxx",
        responsable_usuario_id: null,
        responsable_nombre: null,
        responsable_departamento: null,
        asignado_por_nombre: null,
        asignado_at: null,
        estado: "en_visita",
        hora_salida: null,
        firma_salida: null,
        salida_registrada_por_id: null,
        salida_registrada_por_nombre: null,
        observaciones: null,
        metodo_registro: "qr",
        ip_address: null,
        user_agent: null,
        created_at: "2026-10-26T13:00:00.000Z",
        updated_at: "2026-10-26T13:00:00.000Z",
      },
      {
        id: 2,
        nombre_apellido: "Visitante Activo Con Responsable",
        nacionalidad: "V",
        cedula: "23456789",
        telefono: "04142223344",
        empresa_procedencia: "Proveedor B",
        motivo_visita: "Entrega",
        departamento_destino: "Administración",
        persona_a_visitar: "Ana",
        nro_pase: "V-02",
        fecha: today,
        hora_entrada: "2026-10-26T14:00:00.000Z",
        acepto_descargo: true,
        texto_descargo_aceptado: "OK",
        firma_entrada: "data:image/png;base64,yyy",
        responsable_usuario_id: 5,
        responsable_nombre: "Ana Gómez",
        responsable_departamento: "Administración",
        asignado_por_nombre: "Ana Gómez",
        asignado_at: "2026-10-26T14:05:00.000Z",
        estado: "en_visita",
        hora_salida: null,
        firma_salida: null,
        salida_registrada_por_id: null,
        salida_registrada_por_nombre: null,
        observaciones: null,
        metodo_registro: "qr",
        ip_address: null,
        user_agent: null,
        created_at: "2026-10-26T14:00:00.000Z",
        updated_at: "2026-10-26T14:05:00.000Z",
      },
      {
        id: 3,
        nombre_apellido: "Visitante Salida Registrada Hoy",
        nacionalidad: "V",
        cedula: "19876543",
        telefono: "04123334455",
        empresa_procedencia: "Particular",
        motivo_visita: "Certificados",
        departamento_destino: "Capacitación",
        persona_a_visitar: null,
        nro_pase: null,
        fecha: today,
        hora_entrada: "2026-10-26T12:00:00.000Z",
        acepto_descargo: true,
        texto_descargo_aceptado: "OK",
        firma_entrada: "data:image/png;base64,zzz",
        responsable_usuario_id: 8,
        responsable_nombre: "Luis Pérez",
        responsable_departamento: "Capacitación",
        asignado_por_nombre: "Luis Pérez",
        asignado_at: "2026-10-26T12:02:00.000Z",
        estado: "finalizada",
        hora_salida: "2026-10-26T13:30:00.000Z",
        firma_salida: "Salida confirmada por Luis Pérez",
        salida_registrada_por_id: 8,
        salida_registrada_por_nombre: "Luis Pérez",
        observaciones: "Retiró certificados",
        metodo_registro: "qr",
        ip_address: null,
        user_agent: null,
        created_at: "2026-10-26T12:00:00.000Z",
        updated_at: "2026-10-26T13:30:00.000Z",
      },
    ];

    const kpis = computeVisitantesKpis(mockRows, today);
    assert.equal(kpis.en_planta_ahora, 2);
    assert.equal(kpis.sin_responsable_activo, 1);
    assert.equal(kpis.visitas_hoy, 3);
    assert.equal(kpis.finalizadas_hoy, 1);
    assert.equal(kpis.total_registros, 3);
  });

  it("auto-assigns the staff member marking exit if visitor had no responsible assigned yet", () => {
    const nowIso = "2026-10-26T18:00:00.000Z";
    const updatePayload = buildExitUpdatePayload({
      existing: {
        responsable_usuario_id: null,
        responsable_nombre: null,
        responsable_departamento: null,
      },
      staff: {
        usuarioId: 12,
        nombre: "Carlos Rivas",
        departamento: "Servicios Técnicos",
      },
      payload: {
        observaciones: "Entregó equipo calibrado",
      },
      nowIso,
    });

    assert.equal(updatePayload.estado, "finalizada");
    assert.equal(updatePayload.hora_salida, nowIso);
    assert.equal(updatePayload.responsable_usuario_id, 12);
    assert.equal(updatePayload.responsable_nombre, "Carlos Rivas");
    assert.equal(updatePayload.responsable_departamento, "Servicios Técnicos");
    assert.equal(updatePayload.salida_registrada_por_nombre, "Carlos Rivas");
    assert.equal(
      updatePayload.firma_salida,
      "Salida confirmada por Carlos Rivas",
    );
    assert.equal(updatePayload.observaciones, "Entregó equipo calibrado");
  });

  it("computes Caracas date string accurately across UTC midnight", () => {
    // 2026-10-27 01:00 UTC is still 2026-10-26 21:00 in Caracas (UTC-4)
    assert.equal(
      getCaracasDateString(new Date("2026-10-27T01:00:00.000Z")),
      "2026-10-26",
    );
  });
});
