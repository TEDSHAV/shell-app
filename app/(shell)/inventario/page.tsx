import { getAppById } from "@/config/apps";
import { AppFrame } from "@/components/shell/AppFrame";
import { getFrameUrl } from "@/actions/apps";

const InventarioPage = async () => {
  const app = getAppById("inventario")!;
  const frameSrc = await getFrameUrl("inventario");

  return <AppFrame appId={app.id} src={frameSrc} title={app.name} />;
};

export default InventarioPage;
