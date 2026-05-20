import { isAbsolute, relative, resolve, sep } from "node:path";
import { listProjects, workspaceDir } from "kata-engine";
import { ForbiddenError, InvalidInputError } from "../errors.ts";

// Mirrors engine FEATURE_ID_RE (engine/lib/paths.ts) - guards path traversal.
export const FEATURE_ID_RE = /^\d{4}-?(?:\d{2}|XX)(?:-[a-z][a-z0-9-]*)+$/;

// Text artifacts safe to expose verbatim. Additive only; never globs.
export const TEXT_ARTIFACTS: ReadonlySet<string> = new Set([
  "archive.md",
  "archive.draft.md",
  "metadata.yaml",
  "manifest.json",
  "prd.md",
  "enhanced.md",
  "resolved.md",
  "confirmation-package.md",
  "unresolved-summary.md",
  "source-facts.json",
]);

export function assertProject(project: string): void {
  if (!listProjects().includes(project)) {
    throw new InvalidInputError(`Unknown project: ${project}`);
  }
}

export function assertFeatureId(featureId: string): void {
  if (!FEATURE_ID_RE.test(featureId)) {
    throw new InvalidInputError(`Invalid feature id: ${featureId}`);
  }
}

function assertInsideResolved(root: string, target: string, original: string): void {
  const pathFromRoot = relative(root, target);
  if (pathFromRoot === ".." || pathFromRoot.startsWith(`..${sep}`) || isAbsolute(pathFromRoot)) {
    throw new ForbiddenError(`Path escape: ${original}`);
  }
}

export function featurePath(project: string, featureId: string, ...segments: string[]): string {
  assertProject(project);
  assertFeatureId(featureId);
  const root = resolve(workspaceDir(), project, "features", featureId);
  const target = resolve(root, ...segments);
  assertInsideResolved(root, target, target);
  return target;
}

export function assertInsideFeature(project: string, featureId: string, full: string): void {
  const root = resolve(featurePath(project, featureId));
  const target = resolve(full);
  assertInsideResolved(root, target, full);
}
