import { getAppById } from "@/config/apps";
import { AppFrame } from "@/components/shell/AppFrame";
import { getFrameUrl } from "@/actions/apps";

const CalidadSubPage = async ({
  params,
}: {
  params: Promise<{ path: string[] }>;
}) => {
  const { path } = await params;
  const app = getAppById("calidad")!;
  const frameSrc = await getFrameUrl("calidad", path.join("/"));
  return <AppFrame appId={app.id} src={frameSrc} title={app.name} />;
};

export default CalidadSubPage;
