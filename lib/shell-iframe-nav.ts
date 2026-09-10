"use client";

import { useEffect, useState, type MouseEvent } from "react";
import { usePathname } from "next/navigation";

/** Pathname that also follows `history.pushState` + `shell-url-change`. */
export function use_shell_pathname(): string {
  const next_path = usePathname();
  const [path, set_path] = useState(next_path);

  useEffect(() => {
    set_path(next_path);
  }, [next_path]);

  useEffect(() => {
    const sync = () => set_path(window.location.pathname);
    window.addEventListener("shell-url-change", sync);
    window.addEventListener("popstate", sync);
    return () => {
      window.removeEventListener("shell-url-change", sync);
      window.removeEventListener("popstate", sync);
    };
  }, []);

  return path;
}

export function is_modified_click(event: MouseEvent): boolean {
  return (
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey ||
    event.button !== 0
  );
}

/** In-app iframe navigation without Next.js RSC (avoids aborted payloads). */
export function navigate_shell_iframe_href(href: string): void {
  if (typeof window === "undefined") return;
  if (window.location.pathname === href) return;
  window.history.pushState(null, "", href);
  window.dispatchEvent(new CustomEvent("shell-url-change"));
}
