import { AppFrame } from "@/components/shell/AppFrame";
import { getFrameUrl } from "@/actions/apps";

type PageProps = {
  params: Promise<{ path?: string[] }>;
};

/**
 * Facturación en Administración: embebe la UI de Negocios (/facturacion)
 * sin cambiar de app en el Shell (sidebar de Administración).
 */
export default async function AdministracionFacturacionPage({
  params,
}: PageProps) {
  const { path } = await params;
  const rest = path?.length ? path.join("/") : "";
  const frame_sub_path = rest ? `facturacion/${rest}` : "facturacion";
  const src = await getFrameUrl("negocios", frame_sub_path);

  return (
    <AppFrame appId="administracion" src={src} title="Facturación" />
  );
}
