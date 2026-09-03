import { getAppById } from "@/config/apps";
import { AppFrame } from "@/components/shell/AppFrame";
import { getFrameUrl } from "@/actions/apps";

const RecursosHumanosPage = async () => {
  const app = getAppById("recursos-humanos")!;
  const frameSrc = await getFrameUrl("recursos-humanos");

  return <AppFrame appId={app.id} src={frameSrc} title={app.name} />;
};

export default RecursosHumanosPage;
