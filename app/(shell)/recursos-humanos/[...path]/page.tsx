import { getAppById } from "@/config/apps";
import { AppFrame } from "@/components/shell/AppFrame";
import { getFrameUrl } from "@/actions/apps";

const RecursosHumanosSubPage = async ({
  params,
}: {
  params: Promise<{ path: string[] }>;
}) => {
  const { path } = await params;
  const app = getAppById("recursos-humanos")!;
  const frameSrc = await getFrameUrl("recursos-humanos", path.join("/"));
  return <AppFrame appId={app.id} src={frameSrc} title={app.name} />;
};

export default RecursosHumanosSubPage;
