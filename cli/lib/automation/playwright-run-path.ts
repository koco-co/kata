import { lstatSync } from "node:fs";
import { basename, isAbsolute, join, relative, resolve, sep } from "node:path";
import { RUN_ID_RE } from "../run-id.ts";

function assertRealDirectoryPath(target: string, label: string, anchor?: string): void {
  const resolved = resolve(target);
  const base = anchor ? resolve(anchor) : resolved;
  let current = base;
  const segments = anchor ? relative(base, resolved).split(sep).filter(Boolean) : [];
  let baseStat: ReturnType<typeof lstatSync>;
  try {
    baseStat = lstatSync(current);
  } catch {
    throw new Error(`[playwright.config] ${label} must be an existing directory: ${resolved}`);
  }
  if (baseStat.isSymbolicLink()) {
    throw new Error(`[playwright.config] ${label} must not contain symbolic links: ${current}`);
  }
  if (!baseStat.isDirectory()) {
    throw new Error(`[playwright.config] ${label} must be a directory: ${current}`);
  }
  for (const segment of segments) {
    current = join(current, segment);
    let stat: ReturnType<typeof lstatSync>;
    try {
      stat = lstatSync(current);
    } catch {
      throw new Error(`[playwright.config] ${label} must be an existing directory: ${resolved}`);
    }
    if (stat.isSymbolicLink()) {
      throw new Error(`[playwright.config] ${label} must not contain symbolic links: ${current}`);
    }
    if (!stat.isDirectory()) {
      throw new Error(`[playwright.config] ${label} must be a directory: ${current}`);
    }
  }
}

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
  const workspaceRoot = env.KATA_WORKSPACE_ROOT ?? join(root, "workspace");
  const featuresRoot = resolve(workspaceRoot, project, "features");
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
  assertRealDirectoryPath(featuresRoot, "features root");
  assertRealDirectoryPath(runPath, "KATA_RUN_PATH", featuresRoot);
  return runPath;
}

export function resolvePlaywrightOutputDir(
  env: NodeJS.ProcessEnv = process.env,
  root: string = process.cwd(),
): string {
  return join(resolvePlaywrightRunPath(env, root), "test-results");
}
