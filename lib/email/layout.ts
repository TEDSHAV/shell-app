function escape_html(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function email_escape(value: string): string {
  return escape_html(value);
}

export function build_ted_html_email(opts: {
  subject: string;
  chip: string;
  title: string;
  subtitle: string;
  intro: string;
  highlight?: string | null;
  header_variant?: "emitido" | "cambio" | "default";
  rows: Array<{ label: string; value: string }>;
  notes?: string | null;
  meta?: string | null;
  cta_label: string;
  cta_href: string;
  cta_hint?: string | null;
  footer: string;
}): string {
  const header_bg =
    opts.header_variant === "cambio"
      ? "linear-gradient(135deg, #c2410c 0%, #9a3412 100%)"
      : "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)";
  const highlight_border =
    opts.header_variant === "cambio" ? "#ea580c" : "#0284c7";
  const highlight_bg =
    opts.header_variant === "cambio" ? "#fff7ed" : "#f0f9ff";
  const highlight_fg =
    opts.header_variant === "cambio" ? "#9a3412" : "#0369a1";
  const rows_html = opts.rows
    .map(
      (row) => `
                      <tr>
                        <td width="38%" style="font-size: 13px; color: #64748b;">${escape_html(row.label)}</td>
                        <td width="62%" style="font-size: 13px; font-weight: 600; color: #0f172a;">${escape_html(row.value)}</td>
                      </tr>`,
    )
    .join("");
  const highlight = opts.highlight
    ? `<div style="background-color: ${highlight_bg}; border-left: 4px solid ${highlight_border}; padding: 14px 16px; border-radius: 6px; margin-bottom: 24px;">
                      <p style="margin: 0; font-size: 13px; font-weight: 600; color: ${highlight_fg};">${escape_html(opts.highlight)}</p>
                    </div>`
    : "";
  const cta_hint = opts.cta_hint
    ? `<p style="margin: 12px 0 0 0; font-size: 12px; color: #64748b; line-height: 1.5;">${escape_html(opts.cta_hint)}</p>
                    <p style="margin: 6px 0 0 0; font-size: 11px; color: #94a3b8; word-break: break-all;">${escape_html(opts.cta_href)}</p>`
    : "";
  const notes = opts.notes
    ? `<table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; margin-bottom: 24px;">
                      <tr>
                        <td style="padding: 16px 20px;">
                          <span style="display: block; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; margin-bottom: 6px;">Detalle</span>
                          <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #1e293b; white-space: pre-wrap;">${escape_html(opts.notes)}</p>
                        </td>
                      </tr>
                    </table>`
    : "";
  const meta = opts.meta
    ? `<table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 28px;">
                <tr>
                  <td style="font-size: 12px; color: #64748b; line-height: 1.5;">${escape_html(opts.meta)}</td>
                </tr>
              </table>`
    : "";

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escape_html(opts.subject)}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); border: 1px solid #e2e8f0;">
          <tr>
            <td style="background: ${header_bg}; padding: 28px 32px; text-align: left;">
              <span style="display: inline-block; background-color: rgba(255, 255, 255, 0.2); color: #ffffff; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; padding: 4px 10px; border-radius: 9999px; margin-bottom: 12px;">
                ${escape_html(opts.chip)}
              </span>
              <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 700; line-height: 1.3;">
                ${escape_html(opts.title)}
              </h1>
              <p style="margin: 6px 0 0 0; color: rgba(255, 255, 255, 0.9); font-size: 13px;">
                ${escape_html(opts.subtitle)}
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #334155;">
                ${opts.intro}
              </p>
              ${highlight}
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 16px 20px; border-bottom: 1px solid #e2e8f0;">
                    <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b;">Datos</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 16px 20px;">
                    <table width="100%" border="0" cellspacing="0" cellpadding="6">
                      ${rows_html}
                    </table>
                  </td>
                </tr>
              </table>
              ${notes}
              ${meta}
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center">
                    <a href="${escape_html(opts.cta_href)}" target="_blank" style="display: inline-block; background-color: #0284c7; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 600; padding: 12px 28px; border-radius: 8px; box-shadow: 0 2px 4px rgba(2, 132, 199, 0.2);">
                      ${escape_html(opts.cta_label)} &rarr;
                    </a>
                    ${cta_hint}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 32px; background-color: #f1f5f9; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #64748b; line-height: 1.4;">
                ${escape_html(opts.footer)}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
