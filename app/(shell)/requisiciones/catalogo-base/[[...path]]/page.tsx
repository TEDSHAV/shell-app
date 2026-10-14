import { AppFrame } from "@/components/shell/AppFrame";
import { getFrameUrl } from "@/actions/apps";

type PageProps = {
  params: Promise<{ path?: string[] }>;
};

/**
 * Catálogo base en Administración: embebe Negocios (/ingenieria/catalogo-costos).
 */
export default async function AdministracionCatalogoBasePage({
  params,
}: PageProps) {
  await params;
  const src = await getFrameUrl(
    "negocios",
    "ingenieria/catalogo-costos?oficina=administracion",
  );

  return (
    <AppFrame appId="administracion" src={src} title="Catálogo base" />
  );
}
