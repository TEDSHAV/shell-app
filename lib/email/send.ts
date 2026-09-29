/**
 * MXroute SMTP (mismo canal que nextjs-rh-module).
 * Sin MXROUTE_SMTP_* el envío es no-op y no rompe el flujo.
 */

type MailInfo = {
  messageId: string;
  accepted?: Array<string | { address?: string }>;
  rejected?: Array<string | { address?: string }>;
  response?: string;
};

type Transporter = {
  sendMail: (opts: {
    from: string;
    to: string;
    subject: string;
    text: string;
    html?: string;
  }) => Promise<MailInfo>;
};

export type SendMailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export type SendResult =
  | { status: "sent"; messageId: string }
  | { status: "not_configured" }
  | { status: "failed"; error: string };

let transporter: Transporter | null = null;

export function is_email_configured(): boolean {
  return Boolean(
    process.env.MXROUTE_SMTP_HOST &&
      process.env.MXROUTE_SMTP_USER &&
      process.env.MXROUTE_SMTP_PASS,
  );
}

async function get_transporter(): Promise<Transporter> {
  if (transporter) return transporter;
  const nodemailer = (await import("nodemailer")).default;
  const host = process.env.MXROUTE_SMTP_HOST!;
  const port = parseInt(process.env.MXROUTE_SMTP_PORT || "465", 10);
  const user = process.env.MXROUTE_SMTP_USER!;
  const pass = process.env.MXROUTE_SMTP_PASS!;
  const smtp = {
    host,
    port,
    secure: port === 465,
    requireTLS: port === 587,
    family: 4,
    connectionTimeout: 12_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
    auth: { user, pass },
  };
  const create = nodemailer.createTransport as (opts: typeof smtp) => Transporter;
  transporter = create(smtp);
  return transporter;
}

function from_address(): string {
  const from =
    process.env.EMAIL_FROM ||
    process.env.MXROUTE_SMTP_USER ||
    "prisma@admin.shadevenezuela.com.ve";
  const name = process.env.EMAIL_FROM_NAME || "Prisma | SHA de Venezuela, C.A";
  if (/[,;<>@!:"\[\]()]/.test(name)) {
    const escaped = name.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    return `"${escaped}" <${from}>`;
  }
  return `${name} <${from}>`;
}

function text_to_html(text: string): string {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family:Arial,sans-serif;font-size:14px;line-height:1.5;white-space:pre-wrap;">${escaped}</body></html>`;
}

export async function send_mail(input: SendMailInput): Promise<SendResult> {
  if (!is_email_configured()) {
    console.warn("[email] MXroute no configurado, se omite el correo.");
    return { status: "not_configured" };
  }
  try {
    const info = await (await get_transporter()).sendMail({
      from: from_address(),
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html || text_to_html(input.text),
    });
    const accepted = (info.accepted ?? [])
      .map((item) => (typeof item === "string" ? item : item.address ?? ""))
      .filter(Boolean)
      .join(", ");
    const rejected = (info.rejected ?? [])
      .map((item) => (typeof item === "string" ? item : item.address ?? ""))
      .filter(Boolean)
      .join(", ");
    console.log(
      `[email] enviado a=${input.to} id=${info.messageId} accepted=${accepted || "—"} rejected=${rejected || "—"} response=${info.response ?? "—"}`,
    );
    if (rejected) {
      return { status: "failed", error: `SMTP rechazó: ${rejected}` };
    }
    return { status: "sent", messageId: info.messageId };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[email] send_mail failed:", message);
    return { status: "failed", error: message };
  }
}

export function ted_request_to(): string | null {
  const value = process.env.TED_REQUEST_TO?.trim();
  return value || null;
}

export function shell_public_url(): string {
  return (
    process.env.NEXT_PUBLIC_SHELL_URL?.replace(/\/$/, "") ||
    "https://prisma.shadevenezuela.com.ve"
  );
}
