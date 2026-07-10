export function build_osi_comments_frame_url(osi_id: number): string {
  if (osi_id <= 0) return "about:blank";

  const base =
    process.env.NEXT_PUBLIC_NEGOCIOS_URL ||
    "https://gestion.shadevenezuela.com.ve";

  return `${base.replace(/\/$/, "")}/embed/osi-comentarios/${osi_id}?shell=1`;
}
