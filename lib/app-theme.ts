import type { CSSProperties } from "react";
import type { AppBadge, AppConfig } from "@/types";

export type AppEmbedMode = "shell" | "raw" | "external";

function parse_hex(hex: string): [number, number, number] {
  const normalized = hex.replace("#", "").trim();
  const full =
    normalized.length === 3
      ? normalized
          .split("")
          .map((c) => c + c)
          .join("")
      : normalized;
  const value = Number.parseInt(full, 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

export function hex_to_rgba(hex: string, alpha: number): string {
  const [r, g, b] = parse_hex(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function relative_luminance(hex: string): number {
  const [r, g, b] = parse_hex(hex).map((channel) => {
    const srgb = channel / 255;
    return srgb <= 0.03928
      ? srgb / 12.92
      : ((srgb + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast_text_color(hex: string): string {
  return relative_luminance(hex) > 0.55 ? "#1e293b" : "#f8fafc";
}

export function darken_color(hex: string, amount: number): string {
  const [r, g, b] = parse_hex(hex);
  const factor = 1 - amount;
  const dr = Math.floor(r * factor);
  const dg = Math.floor(g * factor);
  const db = Math.floor(b * factor);
  return `#${((1 << 24) + (dr << 16) + (dg << 8) + db).toString(16).slice(1)}`;
}

export function get_pill_text_color(brand_color: string): string {
  const luminance = relative_luminance(brand_color);
  // If the color is very light, darken it significantly
  if (luminance > 0.4) {
    return darken_color(brand_color, 0.6);
  }
  // If it's already dark enough, just darken it slightly for extra pop on the light bg
  return darken_color(brand_color, 0.2);
}

export function badge_from_brand(brand_color: string): AppBadge {
  return {
    bg: hex_to_rgba(brand_color, 0.14),
    text: contrast_text_color(brand_color),
    border: hex_to_rgba(brand_color, 0.35),
    dot: brand_color,
  };
}

export function opens_in_new_tab(app: AppConfig): boolean {
  return app.embedMode === "external";
}

export function uses_iframe_in_shell(app: AppConfig): boolean {
  return app.embedMode === "shell" || app.embedMode === "raw";
}

export function get_sidebar_nav_style(brand_color: string): CSSProperties {
  return {
    ["--app-color" as string]: brand_color,
    ["--app-hover-bg" as string]: hex_to_rgba(brand_color, 0.14),
    ["--app-active-bg" as string]: hex_to_rgba(brand_color, 0.22),
  };
}

export function get_header_nav_active_style(brand_color: string): CSSProperties {
  return {
    backgroundColor: hex_to_rgba(brand_color, 0.14),
    color: brand_color,
    borderColor: hex_to_rgba(brand_color, 0.4),
  };
}

export function get_header_nav_link_vars(brand_color: string): CSSProperties {
  return {
    ["--header-brand-color" as string]: brand_color,
    ["--header-hover-bg" as string]: hex_to_rgba(brand_color, 0.1),
    ["--header-active-bg" as string]: hex_to_rgba(brand_color, 0.14),
    ["--header-active-border" as string]: hex_to_rgba(brand_color, 0.4),
  };
}

export function get_app_icon_style(brand_color: string): CSSProperties {
  return { color: brand_color };
}

export function get_app_pill_style(brand_color: string): CSSProperties {
  return {
    backgroundColor: hex_to_rgba(brand_color, 0.14),
    color: get_pill_text_color(brand_color),
    borderColor: hex_to_rgba(brand_color, 0.35),
  };
}

export function get_app_dot_style(brand_color: string): CSSProperties {
  return { backgroundColor: brand_color };
}

export function get_app_strip_style(brand_color: string): CSSProperties {
  return { backgroundColor: brand_color };
}

type AppConfigInput = Omit<AppConfig, "color" | "badge" | "embedMode"> & {
  brandColor: string;
  embedMode?: AppEmbedMode;
};

export function build_app_config(input: AppConfigInput): AppConfig {
  const { brandColor, embedMode = "shell", ...rest } = input;
  return {
    ...rest,
    brandColor,
    embedMode,
    color: "",
    badge: badge_from_brand(brandColor),
  };
}
