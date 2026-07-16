import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { getEnv } from "./env.ts";

export function repoRoot(): string {
  return resolve(fileURLToPath(import.meta.url), "../../../../..");
}

export function workspaceDir(): string {
  const dir = getEnv("KATA_WORKSPACE_ROOT") ?? "workspace";
  return resolve(repoRoot(), dir);
}

export function projectDir(project: string): string {
  return join(workspaceDir(), project);
}

export function projectPath(project: string, ...segments: string[]): string {
  return join(projectDir(project), ...segments);
}

// ── v3 path functions ────────────────────────────────────────────────────────

// CLAUDE.md §Feature Directory Naming: YYYY[-]MM[-{customer}]-{module}-{slug}
// with each post-date segment in lowercase ASCII (a-z, 0-9, hyphen). YYYY-MM may
// be `2099-XX` as a placeholder. This guards against Chinese / 【】 leaking from
// archive CSV titles (see history-convert.ts) into mkdir paths.
const FEATURE_ID_RE = /^\d{4}-?(?:\d{2}|XX)(?:-[a-z][a-z0-9-]*)+$/;

export function assertFeatureId(featureId: string): void {
  if (!FEATURE_ID_RE.test(featureId)) {
    throw new Error(
      `[paths] invalid feature id '${featureId}': must match YYYY[-]MM-{slug-segments} with lowercase ASCII slugs (CLAUDE.md §Feature Directory Naming).`,
    );
  }
}

/**
 * Feature directory: workspace/{project}/features/{group}/{featureId}/.
 * group: version dir (e.g. "v6.4.10"), "_standing", or "_archived/v6.4.6".
 * featureId: slug-based id such as "2026-04-my-prd" (validated by assertFeatureId).
 */
export function featureDir(project: string, group: string, featureId: string): string {
  assertFeatureId(featureId);
  return join(projectDir(project), "features", group, featureId);
}

/**
 * File or subdir inside a feature directory.
 */
export function featureFile(
  project: string,
  group: string,
  featureId: string,
  ...segments: string[]
): string {
  return join(featureDir(project, group, featureId), ...segments);
}

/**
 * Static scan audit bucket. Diff-based scan reports for a given branch pair.
 * workspace/{project}/_shared/archive/audits/{yyyymm}-{slug}/.
 */
export function auditDir(project: string, yyyymm: string, slug: string): string {
  return join(projectDir(project), "_shared", "archive", "audits", `${yyyymm}-${slug}`);
}

export function auditFile(
  project: string,
  yyyymm: string,
  slug: string,
  ...segments: string[]
): string {
  return join(auditDir(project, yyyymm, slug), ...segments);
}

/**
 * Bug/conflict defect report bucket. HTML reports for bug & conflict modes.
 * workspace/{project}/_shared/archive/reports/bugs/{yyyymm}-{slug}/.
 */
export function defectDir(project: string, yyyymm: string, slug: string): string {
  return join(projectDir(project), "_shared", "archive", "reports", "bugs", `${yyyymm}-${slug}`);
}

export function prdsDir(project: string): string {
  return join(projectDir(project), "_shared", "archive", "history", "prds");
}

export function enhancedMd(project: string, yyyymm: string, slug: string): string {
  return featureFile(project, "_standing", `${yyyymm}-${slug}`, "enhanced.md");
}

export function sourceFactsJson(project: string, yyyymm: string, slug: string): string {
  return featureFile(project, "_standing", `${yyyymm}-${slug}`, "source-facts.json");
}

export function resolvedMd(project: string, yyyymm: string, slug: string): string {
  return featureFile(project, "_standing", `${yyyymm}-${slug}`, "resolved.md");
}

export function tempDir(project: string): string {
  return join(kataRoot(), project);
}

export function probeCacheDir(project: string): string {
  return join(tempDir(project), "probe-cache");
}

export function probeCachePath(project: string, prdSlug: string): string {
  return join(probeCacheDir(project), `${prdSlug}.json`);
}

export function projectRulesDir(project: string): string {
  return join(projectDir(project), "_shared", "rules");
}

export function knowledgeDir(project: string): string {
  return join(projectDir(project), "_shared", "knowledge");
}

export function knowledgePath(project: string, ...segments: string[]): string {
  return join(knowledgeDir(project), ...segments);
}

export function pluginsDir(): string {
  return resolve(repoRoot(), ".claude/plugins");
}

/** Absolute path to the shared chassis root (.claude/scripts/_shared). */
export function sharedRoot(): string {
  return resolve(repoRoot(), ".claude/scripts/_shared");
}

/** Absolute path under .claude/scripts/_shared/schemas/. */
export function sharedSchemasPath(...segments: string[]): string {
  return resolve(sharedRoot(), "schemas", ...segments);
}

export function contractPluginsDir(): string {
  return pluginsDir();
}

export function skillsDir(root: string = repoRoot()): string {
  return join(root, ".claude", "skills");
}

export function agentsDir(root: string = repoRoot()): string {
  return join(root, ".claude", "agents");
}

export function currentYYYYMM(): string {
  const now = new Date();
  return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function validateFilePath(filePath: string, allowedRoots: string[]): string {
  const resolved = resolve(filePath);
  const isAbsolute = filePath.startsWith("/");
  if (!isAbsolute) {
    const isAllowed = allowedRoots.some((root) => resolved.startsWith(resolve(root)));
    if (!isAllowed) {
      throw new Error(`Relative path "${filePath}" resolves outside allowed directories`);
    }
  }
  return resolved;
}

export function parseGitUrl(url: string): { group: string; repo: string } {
  const cleaned = url.replace(/\.git$/, "").replace(/\/$/, "");
  const parts = cleaned.split("/");
  const repo = parts.pop() ?? "";
  const group = parts.pop() ?? "";
  return { group, repo };
}

// ── kata 进度引擎路径 ───────────────────────────────────

/**
 * Resolve the ignored `.kata/` root used by transient probe caches.
 *
 * KATA_ROOT_OVERRIDE (if set) must be a PARENT directory — the `.kata` segment
 * is appended internally. Pass a temp root like `/tmp/kata-test-123`, not
 * `/tmp/kata-test-123/.kata`. Used by tests to isolate progress state.
 */
function kataRoot(): string {
  const override = getEnv("KATA_ROOT_OVERRIDE");
  return override ? join(override, ".kata") : join(repoRoot(), ".kata");
}
