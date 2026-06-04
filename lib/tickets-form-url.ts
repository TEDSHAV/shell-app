const DEFAULT_TICKETS_FORM_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLSe4oYLf6EQBLkG-5DXHQEhX_DHkZhMAPTnoszurdJnhAcC1Ew/viewform";

export function get_tickets_form_base_url(): string {
  return (
    process.env.NEXT_PUBLIC_TICKETS_FORM_URL?.trim() ||
    DEFAULT_TICKETS_FORM_URL
  );
}

/**
 * Google Forms must use viewform?embedded=true (official embed URL).
 * Do not use usp=send_form or forms.gle for iframe — they block embedding.
 */
export function build_tickets_frame_url(prefill_email?: string | null): string {
  const raw = get_tickets_form_base_url();

  if (raw.includes("forms.gle")) {
    return build_tickets_frame_url_from_docs(prefill_email);
  }

  return build_tickets_frame_url_from_docs(prefill_email, raw);
}

function build_tickets_frame_url_from_docs(
  prefill_email?: string | null,
  base_url: string = DEFAULT_TICKETS_FORM_URL,
): string {
  const parsed = new URL(base_url);

  if (!parsed.pathname.includes("/viewform")) {
    parsed.pathname = parsed.pathname.replace(/\/?$/, "/viewform");
  }

  parsed.searchParams.delete("usp");
  parsed.searchParams.set("embedded", "true");

  const entry_id = process.env.NEXT_PUBLIC_TICKETS_FORM_EMAIL_ENTRY_ID?.trim();
  if (prefill_email && entry_id) {
    parsed.searchParams.set(`entry.${entry_id}`, prefill_email);
  }

  return parsed.toString();
}
