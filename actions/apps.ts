"use server";

import { createClient } from "@/lib/supabase/server";
import { getAppById } from "@/config/apps";
import { hasEnvVars } from "@/lib/utils";

export async function getAuthenticatedFrameUrl(appId: string) {
  const app = getAppById(appId)!;

  if (!hasEnvVars) {
    return app.upstreamUrl;
  }

  const supabase = await createClient();
  const { data } = await supabase.auth.getSession();

  if (!data.session) {
    return app.upstreamUrl;
  }

  const { access_token, refresh_token } = data.session;
  return `${app.upstreamUrl}#access_token=${access_token}&refresh_token=${refresh_token}&type=recovery`;
}
