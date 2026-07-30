import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { basename, relative, resolve } from "node:path";
import { parse } from "yaml";

export interface RepositoryPolicy {
  root: { allowed_files: string[]; allowed_directories: string[] };
  forbidden_globs: string[];
  dependencies: { runtime_must_not_import: string };
}

export interface PolicyViolation {
  path: string;
  reason: string;
}

const AUTOMATION_CASE_RE = /^c\d{4}-[a-z0-9]+(?:-[a-z0-9]+)*\.spec\.ts$/;
const SQL_TEMPLATE_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*\.sql$/;
const CASE_INPUT_EXTENSIONS = new Set(["csv", "xlsx", "md", "xmind"]);

function normalize(path: string): string {
  return path.split("\\").join("/");
}

function readPolicy(repoRoot: string): RepositoryPolicy {
  const path = resolve(repoRoot, "config/repos/policy.yaml");
  const parsed = parse(readFileSync(path, "utf8")) as RepositoryPolicy;
  if (!parsed?.root || !Array.isArray(parsed.root.allowed_files)) {
    throw new Error(`仓库策略无效: ${path}`);
  }
  return parsed;
}

export function trackedAndUntrackedPaths(repoRoot: string): string[] {
  const output = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  return output.split("\n").filter(Boolean).map(normalize).sort();
}

function extension(path: string): string {
  const dot = basename(path).lastIndexOf(".");
  return dot === -1 ? "" : basename(path).slice(dot + 1);
}

function isFeatureCasesPath(path: string): boolean {
  return /^workspace\/[^/]+\/features\/[^/]+\/[^/]+\/cases\//.test(path);
}

function casePathViolation(path: string): string | undefined {
  if (!isFeatureCasesPath(path)) return undefined;
  const suffix = path.replace(/^.*?\/cases\//, "");
  if (suffix === "imports/.gitkeep" || suffix === "exports/.gitkeep") return undefined;
  if (suffix === "test-points.md") return undefined;
  if (suffix.endsWith(".yaml") && !suffix.includes("/")) return undefined;
  if (/^imports\/[^/]+$/.test(suffix) && CASE_INPUT_EXTENSIONS.has(extension(suffix)))
    return undefined;
  if (/^exports\/[^/]+$/.test(suffix) && CASE_INPUT_EXTENSIONS.has(extension(suffix)))
    return undefined;
  return "cases 仅允许根目录 YAML、test-points.md、imports/ 历史输入或 exports/ YAML 派生产物";
}

function policyGlobMatches(path: string, glob: string): boolean {
  if (glob === "lib/**") return path === "lib" || path.startsWith("lib/");
  if (glob === "workspace/**/automation/scripts/**") return /\/automation\/scripts\//.test(path);
  if (glob === "kata-automation-*.config.ts") {
    return /^kata-automation-[^/]+\.config\.ts$/.test(path);
  }
  return false;
}

function runtimeDependencyViolations(repoRoot: string, paths: string[]): PolicyViolation[] {
  const violations: PolicyViolation[] = [];
  for (const path of paths) {
    if (!path.startsWith("runtime/") || !/\.(?:ts|tsx|mts)$/.test(path)) continue;
    const absolute = resolve(repoRoot, path);
    if (!existsSync(absolute) || statSync(absolute).isDirectory()) continue;
    if (/from\s+["'][^"']*(?:^|\/)cli\//.test(readFileSync(absolute, "utf8"))) {
      violations.push({ path, reason: "runtime 不得依赖 cli/" });
    }
  }
  return violations;
}

export function checkRepositoryPolicy(
  repoRoot: string,
  inputPaths = trackedAndUntrackedPaths(repoRoot),
): PolicyViolation[] {
  const root = resolve(repoRoot);
  const policy = readPolicy(root);
  const paths = inputPaths.map(normalize);
  const violations: PolicyViolation[] = [];
  for (const path of paths) {
    const forbidden = policy.forbidden_globs.find((glob) => policyGlobMatches(path, glob));
    if (!path.includes("/") && !forbidden) {
      if (!policy.root.allowed_files.includes(path)) {
        violations.push({ path, reason: "根目录文件不在允许清单中" });
      }
    } else if (!forbidden) {
      const top = path.split("/", 1)[0] ?? "";
      if (!policy.root.allowed_directories.includes(top)) {
        violations.push({ path, reason: `顶层目录 "${top}" 不在允许清单中` });
      }
    }
    if (forbidden) violations.push({ path, reason: `禁止路径: ${forbidden}` });
    const caseReason = casePathViolation(path);
    if (caseReason) violations.push({ path, reason: caseReason });
    if (
      /\/automation\/tests\/cases\/[^/]+$/.test(path) &&
      !["README.md", ".gitkeep"].includes(basename(path)) &&
      !AUTOMATION_CASE_RE.test(basename(path))
    ) {
      violations.push({ path, reason: "正式自动化用例必须使用 c0001-english-slug.spec.ts" });
    }
    if (/\/automation\/tests\/sql\/[^/]+$/.test(path) && !SQL_TEMPLATE_RE.test(basename(path))) {
      violations.push({ path, reason: "SQL 模板必须使用 lowercase-english-kebab.sql" });
    }
  }
  return [...violations, ...runtimeDependencyViolations(root, paths)].sort((a, b) =>
    `${a.path}:${a.reason}`.localeCompare(`${b.path}:${b.reason}`),
  );
}

export function formatPolicyViolations(violations: readonly PolicyViolation[]): string {
  return violations.map((violation) => `${violation.path}: ${violation.reason}`).join("\n");
}

export function repositoryRelativePath(repoRoot: string, path: string): string {
  return normalize(relative(repoRoot, path));
}
