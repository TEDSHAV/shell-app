/**
 * Module-level tracker for the currently active iframe's contentWindow.
 *
 * PersistentAppFrame sets this via a ref callback whenever the active
 * iframe changes. ShellURLSync reads it to filter IFRAME_NAVIGATION
 * messages so only the active iframe can drive the browser URL —
 * background/cached iframes that finish loading after the user
 * navigated away are ignored, preventing sidebar URL jumps.
 */
let activeFrameWindow: Window | null = null;

export function getActiveFrameWindow(): Window | null {
  return activeFrameWindow;
}

export function setActiveFrameWindow(w: Window | null): void {
  activeFrameWindow = w;
}
