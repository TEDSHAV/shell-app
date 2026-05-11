import { getAppById } from "@/config/apps";
import { AppFrame } from "@/components/shell/AppFrame";
import { getFrameUrl } from "@/actions/apps";

const NegociosSubPage = async ({
  params,
}: {
  params: Promise<{ path: string[] }>;
}) => {
  const { path } = await params;
  const app = getAppById("negocios")!;
  const frameSrc = await getFrameUrl("negocios", path.join("/"));
  return <AppFrame appId={app.id} src={frameSrc} title={app.name} />;
};

export default NegociosSubPage;
