import { basename, isAbsolute, join, relative, resolve, sep } from "node:path";
import { RUN_ID_RE } from "./run-id.ts";

/** Resolve and validate the only allowed Playwright result root. */
export function resolvePlaywrightRunPath(
  env: NodeJS.ProcessEnv = process.env,
  root: string = process.cwd(),
): string {
  const project = env.KATA_ACTIVE_PROJECT;
  if (!project) throw new Error("[playwright.config] KATA_ACTIVE_PROJECT is required.");

  const rawRunPath = env.KATA_RUN_PATH;
  if (!rawRunPath) {
    throw new Error(
      "[playwright.config] KATA_RUN_PATH is required; allocate a run with `kata runs exec`.",
    );
  }

  const runPath = resolve(rawRunPath);
  const featuresRoot = resolve(root, "workspace", project, "features");
  const relativePath = relative(featuresRoot, runPath);
  const segments = relativePath.split(sep).filter(Boolean);
  const outside =
    relativePath === "" ||
    relativePath === ".." ||
    relativePath.startsWith(`..${sep}`) ||
    isAbsolute(relativePath);
  if (
    outside ||
    segments.length < 3 ||
    segments.at(-2) !== "runs" ||
    !RUN_ID_RE.test(basename(runPath))
  ) {
    throw new Error(
      "[playwright.config] KATA_RUN_PATH must point to workspace/<project>/features/<feature>/runs/<run-id>.",
    );
  }
  return runPath;
}

export function resolvePlaywrightOutputDir(
  env: NodeJS.ProcessEnv = process.env,
  root: string = process.cwd(),
): string {
  return join(resolvePlaywrightRunPath(env, root), "test-results");
}
