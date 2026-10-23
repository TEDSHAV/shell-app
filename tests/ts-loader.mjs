import { resolve as pathResolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { existsSync } from "node:fs";

const projectRoot = process.cwd();

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const relPath = specifier.slice(2);
    const tsCandidate = pathResolve(projectRoot, `${relPath}.ts`);
    if (existsSync(tsCandidate)) {
      return nextResolve(pathToFileURL(tsCandidate).href, context);
    }
  }
  if (
    (specifier.startsWith("./") || specifier.startsWith("../")) &&
    !specifier.endsWith(".ts") &&
    !specifier.endsWith(".js") &&
    context.parentURL
  ) {
    const parentDir = dirname(fileURLToPath(context.parentURL));
    const tsCandidate = pathResolve(parentDir, `${specifier}.ts`);
    if (existsSync(tsCandidate)) {
      return nextResolve(pathToFileURL(tsCandidate).href, context);
    }
  }
  return nextResolve(specifier, context);
}
