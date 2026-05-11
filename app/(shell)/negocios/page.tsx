import { getAppById } from "@/config/apps";
import { AppFrame } from "@/components/shell/AppFrame";
import { getFrameUrl } from "@/actions/apps";

const NegociosPage = async () => {
  const app = getAppById("negocios")!;
  const frameSrc = await getFrameUrl("negocios");

  return <AppFrame appId={app.id} src={frameSrc} title={app.name} />;
};

export default NegociosPage;
