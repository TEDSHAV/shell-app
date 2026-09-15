/**
 * Module-level tracker for the currently active iframe's logical path.
 *
 * PersistentAppFrame tracks each iframe's current URL separately from its
 * initial `src` attribute so internal iframe navigation doesn't create a
 * new iframe. ShellURLSync records the active iframe's reported path here
 * so PersistentAppFrame can detect when the URL change came from inside
 * the iframe (no new iframe needed) vs. from the shell (new iframe needed).
 */
let activeFramePath: string | null = null;

export function getActiveFramePath(): string | null {
  return activeFramePath;
}

export function setActiveFramePath(path: string | null): void {
  activeFramePath = path;
}
