import { getAppById } from "@/config/apps";
import { AppFrame } from "@/components/shell/AppFrame";
import { getFrameUrl } from "@/actions/apps";

const CapacitacionSubPage = async ({
  params,
}: {
  params: Promise<{ path: string[] }>;
}) => {
  const { path } = await params;
  const app = getAppById("capacitacion")!;
  const frameSrc = await getFrameUrl("capacitacion", path.join("/"));
  return <AppFrame appId={app.id} src={frameSrc} title={app.name} />;
};

export default CapacitacionSubPage;
