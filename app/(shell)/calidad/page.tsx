import { getAppById } from "@/config/apps";
import { AppFrame } from "@/components/shell/AppFrame";
import { getFrameUrl } from "@/actions/apps";

const CalidadPage = async () => {
  const app = getAppById("calidad")!;
  const frameSrc = await getFrameUrl("calidad");

  return <AppFrame appId={app.id} src={frameSrc} title={app.name} />;
};

export default CalidadPage;
