import { redirect } from "next/navigation";
import { getMarketingHomePath } from "@/actions/apps";

export default async function MarketingPage() {
  const homePath = await getMarketingHomePath();
  if (homePath) {
    redirect(homePath);
  }

  return null;
}
