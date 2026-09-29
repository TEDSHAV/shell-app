import { LayoutGrid } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { apps, getAppByDbSlug, getAppById } from "@/config/apps";

export function plan_app_visual(slug: string | null | undefined): {
  Icon: LucideIcon;
  brandColor: string;
} {
  if (!slug) {
    return { Icon: LayoutGrid, brandColor: "#64748b" };
  }
  const app =
    getAppById(slug) ??
    getAppByDbSlug(slug) ??
    apps.find((item) => item.name.toLowerCase() === slug.toLowerCase());
  if (!app) {
    return { Icon: LayoutGrid, brandColor: "#7c3aed" };
  }
  return { Icon: app.icon, brandColor: app.brandColor };
}
