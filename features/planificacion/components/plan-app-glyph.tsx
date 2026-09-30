import { cn } from "@/lib/utils";
import { hex_to_rgba } from "@/lib/app-theme";
import { plan_app_visual } from "../lib/plan-app-visual";

export function AppGlyph({
  slug,
  size = "md",
}: {
  slug: string | null;
  size?: "sm" | "md";
}) {
  const { Icon, brandColor } = plan_app_visual(slug);
  const box = size === "sm" ? "h-6 w-6 rounded-md" : "h-8 w-8 rounded-lg";
  const icon = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  return (
    <span
      className={cn("inline-flex shrink-0 items-center justify-center", box)}
      style={{ backgroundColor: hex_to_rgba(brandColor, 0.16) }}
    >
      <Icon className={icon} style={{ color: brandColor }} />
    </span>
  );
}
