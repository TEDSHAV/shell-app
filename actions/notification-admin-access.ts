"use server";

import { cache } from "react";

import { isTedMember } from "@/actions/ted";
import { isSgestionAdmin } from "@/actions/apps";

export const canManageNotificationAdmin = cache(async (): Promise<boolean> => {
  const [ted, admin] = await Promise.all([isTedMember(), isSgestionAdmin()]);
  return ted || admin;
});

export async function assertCanManageNotificationAdmin(): Promise<void> {
  const allowed = await canManageNotificationAdmin();
  if (!allowed) {
    throw new Error(
      "Solo miembros TED o Admin/SuperAdmin pueden administrar notificaciones.",
    );
  }
}
