import { email_escape } from "../email/layout";
import { shell_public_url } from "../email/send";
import {
  formatCutoffLabel,
  formatDdMmYyyy,
  formatSpanishLongDate,
} from "./time";

export type AsistenciaStatus = "presente" | "tardio" | "ausente" | "excluido";

export type AsistenciaUserRow = {
  usuario_id: number;
  nombre_apellido: string;
  email_corporativo: string | null;
  cargo: string | null;
  departamento_id: number | null;
  departamento_nombre: string;
  hora_registro: string | null;
  hora_formateada: string | null;
  metodo: string | null;
  estado: AsistenciaStatus;
  presente_en_corte: boolean;
};

export type AsistenciaDepartmentGroup = {
  departamento_id: number | null;
  departamento_nombre: string;
  usuarios: AsistenciaUserRow[];
  total: number;
  presentes: number;
  ausentes: number;
  tardios: number;
};

export type AsistenciaSnapshot = {
  fecha: string;
  hora_corte: string;
  es_feriado: boolean;
  nombre_feriado: string | null;
  total_esperados: number;
  total_presentes: number;
  total_tardios: number;
  total_ausentes: number;
  total_excluidos: number;
  porcentaje_asistencia: number;
  departamentos: AsistenciaDepartmentGroup[];
  excluidos: AsistenciaUserRow[];
};

/**
 * Generates both the plain-text and enterprise HTML email for the daily 8:30 AM attendance report.
 */
export function buildAsistenciaReportEmail(snapshot: AsistenciaSnapshot): {
  subject: string;
  text: string;
  html: string;
} {
  const fechaCorta = formatDdMmYyyy(snapshot.fecha);
  const fechaLarga = formatSpanishLongDate(snapshot.fecha);
  const corteLabel = formatCutoffLabel(snapshot.hora_corte);
  const subject = `Control de Asistencia PRISMA — ${fechaCorta} (Corte ${corteLabel})`;

  const textLines: string[] = [
    `CONTROL DE ASISTENCIA DIARIA — PRISMA`,
    `Fecha: ${fechaLarga}`,
    `Hora de corte: ${corteLabel} (Hora de Venezuela)`,
    ``,
    `RESUMEN GENERAL`,
    `- Total esperado: ${snapshot.total_esperados}`,
    `- Presentes antes de las ${corteLabel}: ${snapshot.total_presentes} (${snapshot.porcentaje_asistencia}%)`,
    `- Sin registro al corte: ${snapshot.total_ausentes}`,
    ``,
  ];

  for (const dept of snapshot.departamentos) {
    textLines.push(
      `=== ${dept.departamento_nombre.toUpperCase()} (${dept.presentes}/${dept.total} presentes) ===`,
    );
    for (const u of dept.usuarios) {
      const icon = u.presente_en_corte ? "[✓ PRESENTE]" : "[✕ SIN REGISTRO]";
      const timeInfo = u.presente_en_corte && u.hora_formateada
        ? ` (${u.hora_formateada})`
        : u.estado === "tardio" && u.hora_formateada
          ? ` (Ingreso posterior: ${u.hora_formateada})`
          : "";
      const cargoInfo = u.cargo ? ` — ${u.cargo}` : "";
      textLines.push(`  ${icon} ${u.nombre_apellido}${cargoInfo}${timeInfo}`);
    }
    textLines.push(``);
  }

  const ctaHref = `${shell_public_url()}/ted/asistencia`;
  textLines.push(`Ver panel en PRISMA: ${ctaHref}`);

  const departmentBlocksHtml = snapshot.departamentos
    .map((dept) => {
      const rowsHtml = dept.usuarios
        .map((u, idx) => {
          const isEven = idx % 2 === 1;
          const rowBg = isEven ? "#f8fafc" : "#ffffff";

          const statusBadge = u.presente_en_corte
            ? `<span style="display: inline-block; background-color: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; font-size: 12px; font-weight: 700; padding: 3px 10px; border-radius: 9999px; white-space: nowrap;">&#10003; Presente</span>`
            : `<span style="display: inline-block; background-color: #fee2e2; color: #b91c1c; border: 1px solid #fecaca; font-size: 12px; font-weight: 700; padding: 3px 10px; border-radius: 9999px; white-space: nowrap;">&#10005; Sin registro</span>`;

          const timeCell = u.presente_en_corte && u.hora_formateada
            ? `<span style="font-size: 12px; font-weight: 600; color: #0f172a;">${email_escape(u.hora_formateada)}</span>`
            : u.estado === "tardio" && u.hora_formateada
              ? `<span style="font-size: 11px; font-weight: 600; color: #b45309;">${email_escape(u.hora_formateada)} (tardío)</span>`
              : `<span style="font-size: 12px; color: #94a3b8;">&mdash;</span>`;

          return `
            <tr style="background-color: ${rowBg};">
              <td style="padding: 10px 14px; border-bottom: 1px solid #f1f5f9; font-size: 13px; font-weight: 600; color: #0f172a;">
                ${email_escape(u.nombre_apellido)}
                ${
                  u.cargo
                    ? `<div style="font-size: 11px; font-weight: 400; color: #64748b; margin-top: 2px;">${email_escape(u.cargo)}</div>`
                    : ""
                }
              </td>
              <td align="center" style="padding: 10px 12px; border-bottom: 1px solid #f1f5f9; width: 130px;">
                ${statusBadge}
              </td>
              <td align="right" style="padding: 10px 14px; border-bottom: 1px solid #f1f5f9; width: 100px; white-space: nowrap;">
                ${timeCell}
              </td>
            </tr>`;
        })
        .join("");

      return `
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; margin-bottom: 20px; overflow: hidden;">
          <tr>
            <td colspan="3" style="background-color: #f1f5f9; padding: 12px 16px; border-bottom: 1px solid #e2e8f0;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.4px; color: #0c3f69;">
                    ${email_escape(dept.departamento_nombre)}
                  </td>
                  <td align="right" style="font-size: 12px; font-weight: 600; color: #475569;">
                    <span style="color: #15803d;">${dept.presentes} presentes</span>
                    &nbsp;&middot;&nbsp;
                    <span style="color: ${dept.ausentes > 0 ? "#b91c1c" : "#64748b"};">${dept.ausentes} sin registro</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr style="background-color: #f8fafc;">
            <th align="left" style="padding: 8px 14px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.4px; color: #64748b; border-bottom: 1px solid #e2e8f0;">Colaborador</th>
            <th align="center" style="padding: 8px 12px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.4px; color: #64748b; border-bottom: 1px solid #e2e8f0;">Asistencia</th>
            <th align="right" style="padding: 8px 14px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.4px; color: #64748b; border-bottom: 1px solid #e2e8f0;">Hora ingreso</th>
          </tr>
          ${rowsHtml}
        </table>`;
    })
    .join("");

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${email_escape(subject)}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 28px 12px;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 680px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); border: 1px solid #e2e8f0;">
          <tr>
            <td style="background: linear-gradient(135deg, #0c3f69 0%, #0284c7 100%); padding: 28px 32px; text-align: left;">
              <span style="display: inline-block; background-color: rgba(255, 255, 255, 0.18); color: #ffffff; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; padding: 4px 10px; border-radius: 9999px; margin-bottom: 10px;">
                PRISMA &middot; Control de Asistencia
              </span>
              <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 700; line-height: 1.3;">
                Reporte Diario de Asistencia por Departamento
              </h1>
              <p style="margin: 6px 0 0 0; color: rgba(255, 255, 255, 0.9); font-size: 13px;">
                ${email_escape(fechaLarga)} &middot; Corte ${email_escape(corteLabel)}
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 28px 32px;">
              <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #334155;">
                Resumen de usuarios activos con sesión iniciada en <strong>PRISMA</strong> hasta las <strong>${email_escape(corteLabel)}</strong> (hora de Venezuela).
              </p>

              <!-- KPI Summary Cards -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                <tr>
                  <td width="32%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px 16px; text-align: center;">
                    <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 0.4px;">Personal activo</div>
                    <div style="font-size: 24px; font-weight: 800; color: #0f172a; margin-top: 4px;">${snapshot.total_esperados}</div>
                  </td>
                  <td width="2%"></td>
                  <td width="32%" style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 14px 16px; text-align: center;">
                    <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #15803d; letter-spacing: 0.4px;">&#10003; Presentes</div>
                    <div style="font-size: 24px; font-weight: 800; color: #15803d; margin-top: 4px;">${snapshot.total_presentes} <span style="font-size: 13px; font-weight: 600;">(${snapshot.porcentaje_asistencia}%)</span></div>
                  </td>
                  <td width="2%"></td>
                  <td width="32%" style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 14px 16px; text-align: center;">
                    <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #b91c1c; letter-spacing: 0.4px;">&#10005; Sin registro</div>
                    <div style="font-size: 24px; font-weight: 800; color: #b91c1c; margin-top: 4px;">${snapshot.total_ausentes}</div>
                  </td>
                </tr>
              </table>

              ${departmentBlocksHtml || `<p style="font-size: 13px; color: #64748b; text-align: center;">No hay usuarios activos configurados para el reporte.</p>`}

              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-top: 24px;">
                <tr>
                  <td align="center">
                    <a href="${email_escape(ctaHref)}" target="_blank" style="display: inline-block; background-color: #0c3f69; color: #ffffff; text-decoration: none; font-size: 13px; font-weight: 600; padding: 12px 24px; border-radius: 8px;">
                      Ver panel de asistencia en PRISMA &rarr;
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 18px 32px; background-color: #f1f5f9; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #64748b; line-height: 1.4;">
                Reporte generado automáticamente por PRISMA &middot; SHA de Venezuela, C.A.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, text: textLines.join("\n"), html };
}
