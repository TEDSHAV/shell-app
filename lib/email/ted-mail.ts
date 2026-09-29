import { send_mail, shell_public_url, ted_request_to } from "./send";
import { build_ted_html_email } from "./layout";

export async function send_ted_mailbox(input: {
  subject: string;
  text: string;
  html: string;
}): Promise<void> {
  const to = ted_request_to();
  if (!to) {
    console.warn("[email] TED_REQUEST_TO no está definido, se omite el correo.");
    return;
  }
  const result = await send_mail({ to, ...input });
  if (result.status !== "sent") {
    console.warn(`[email] no se envió (${result.status}) to=${to}`, result);
  }
}

export function prisma_link(path: string): string {
  const base = shell_public_url();
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${base}${suffix}`;
}

export { build_ted_html_email };
