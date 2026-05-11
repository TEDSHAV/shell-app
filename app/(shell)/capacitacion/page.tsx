import { getAppById } from "@/config/apps";
import { AppFrame } from "@/components/shell/AppFrame";
import { getFrameUrl } from "@/actions/apps";

const CapacitacionPage = async () => {
  const app = getAppById("capacitacion")!;
  const frameSrc = await getFrameUrl("capacitacion");

  return <AppFrame appId={app.id} src={frameSrc} title={app.name} />;
};

export default CapacitacionPage;
