import { getAppById } from "@/config/apps";
import { AppFrame } from "@/components/shell/AppFrame";
import { getFrameUrl } from "@/actions/apps";

const InventarioSubPage = async ({
  params,
}: {
  params: Promise<{ path: string[] }>;
}) => {
  const { path } = await params;
  const app = getAppById("inventario")!;
  const frameSrc = await getFrameUrl("inventario", path.join("/"));
  return <AppFrame appId={app.id} src={frameSrc} title={app.name} />;
};

export default InventarioSubPage;
