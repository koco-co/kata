import { locateFeaturesByRequirementId } from "../cases/requirement-locate.ts";
import { startTui } from "./index.ts";

export async function tryLaunchTui(args: readonly string[]): Promise<boolean> {
  if (!process.stdin.isTTY) return false;
  const cleaned = args.filter((arg) => arg !== "--interactive");
  if (
    cleaned.includes("--no-interactive") ||
    cleaned.includes("--help") ||
    cleaned.includes("--format")
  ) {
    return false;
  }
  if (cleaned.length === 0 || cleaned[0] === "tui") {
    await startTui();
    return true;
  }
  const build = parseCasesBuildArgs(cleaned);
  if (build?.requirementId) {
    const matches = locateFeaturesByRequirementId(build.requirementId, {
      ...(build.project ? { project: build.project } : {}),
    });
    if (matches.length > 0) {
      const match = matches[0];
      await startTui({ project: match.project, relativePath: match.relativePath });
      return true;
    }
  }
  return false;
}

export function parseCasesBuildArgs(
  args: readonly string[],
): { requirementId?: string; project?: string } | undefined {
  const casesIndex = args.indexOf("cases");
  if (casesIndex < 0 || args[casesIndex + 1] !== "build") return undefined;
  let requirementId: string | undefined;
  let project: string | undefined;
  for (let index = casesIndex + 2; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--project") {
      project = args[index + 1];
      index += 1;
      continue;
    }
    if (arg.startsWith("--project=")) {
      project = arg.slice("--project=".length);
      continue;
    }
    if (arg.startsWith("-")) continue;
    if (!requirementId && /^\d+$/.test(arg)) requirementId = arg;
  }
  return requirementId ? { requirementId, project } : undefined;
}
