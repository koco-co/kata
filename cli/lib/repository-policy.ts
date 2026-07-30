import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { basename, posix, relative, resolve } from "node:path";
import { parse } from "yaml";

export interface RepositoryPolicy {
  root: { allowed_files: string[]; allowed_directories: string[] };
  forbidden_globs: string[];
  shared_modules?: {
    roots: string[];
    minimum_feature_consumers: number;
    page_domain_pattern: string;
  };
  dependencies: {
    runtime_must_not_import: string;
    forbidden_import_fragments?: string[];
  };
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
  if (
    !parsed?.root ||
    !Array.isArray(parsed.root.allowed_files) ||
    !Array.isArray(parsed.forbidden_globs)
  ) {
    throw new Error(`仓库策略无效: ${path}`);
  }
  if (
    parsed.shared_modules &&
    (!Array.isArray(parsed.shared_modules.roots) ||
      !Number.isInteger(parsed.shared_modules.minimum_feature_consumers) ||
      parsed.shared_modules.minimum_feature_consumers < 1)
  ) {
    throw new Error(`仓库共享模块策略无效: ${path}`);
  }
  return parsed;
}

export function trackedAndUntrackedPaths(repoRoot: string): string[] {
  const output = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  return output
    .split("\n")
    .filter(Boolean)
    .map(normalize)
    .filter((path) => existsSync(resolve(repoRoot, path)))
    .sort();
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

function globPattern(glob: string): RegExp {
  let pattern = "^";
  for (let index = 0; index < glob.length; index += 1) {
    const char = glob[index] ?? "";
    if (char === "*" && glob[index + 1] === "*") {
      index += 1;
      if (glob[index + 1] === "/") {
        index += 1;
        pattern += "(?:.*/)?";
      } else {
        pattern += ".*";
      }
      continue;
    }
    if (char === "*") {
      pattern += "[^/]*";
      continue;
    }
    if (char === "?") {
      pattern += "[^/]";
      continue;
    }
    pattern += /[\\^$.*+?()[\]{}|]/.test(char) ? `\\${char}` : char;
  }
  return new RegExp(`${pattern}$`);
}

function policyGlobMatches(path: string, glob: string): boolean {
  return globPattern(glob).test(path);
}

const CODE_PATH_RE = /\.(?:cts|mts|ts|tsx)$/;
const STATIC_IMPORT_RE =
  /\b(?:import|export)\s+(?:type\s+)?(?:[^"'`;]*?\s+from\s*)?["']([^"']+)["']/g;
const DYNAMIC_IMPORT_RE = /\b(?:import|require)\(\s*["']([^"']+)["']\s*\)/g;

function importSpecifiers(source: string): string[] {
  const specifiers: string[] = [];
  for (const pattern of [STATIC_IMPORT_RE, DYNAMIC_IMPORT_RE]) {
    pattern.lastIndex = 0;
    while (true) {
      const match = pattern.exec(source);
      if (!match) break;
      if (match[1]) specifiers.push(normalize(match[1]));
    }
  }
  return specifiers;
}

function resolveImportPath(
  importer: string,
  specifier: string,
  knownPaths: ReadonlySet<string>,
): string | undefined {
  if (!specifier.startsWith(".")) return undefined;
  const base = posix.normalize(posix.join(posix.dirname(importer), specifier));
  for (const candidate of [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.mts`,
    `${base}.cts`,
    posix.join(base, "index.ts"),
    posix.join(base, "index.tsx"),
  ]) {
    if (knownPaths.has(candidate)) return candidate;
  }
  return undefined;
}

function featureOwner(path: string): string | undefined {
  const match = path.match(/^workspace\/([^/]+)\/features\/([^/]+)\/([^/]+)\//);
  return match ? `${match[1]}/${match[2]}/${match[3]}` : undefined;
}

function dependencyViolations(
  repoRoot: string,
  paths: string[],
  policy: RepositoryPolicy,
): PolicyViolation[] {
  const violations: PolicyViolation[] = [];
  for (const path of paths) {
    if (!CODE_PATH_RE.test(path)) continue;
    const absolute = resolve(repoRoot, path);
    if (!existsSync(absolute) || statSync(absolute).isDirectory()) continue;
    const specifiers = importSpecifiers(readFileSync(absolute, "utf8"));
    if (
      path.startsWith("runtime/") &&
      specifiers.some((specifier) =>
        specifier.includes(policy.dependencies.runtime_must_not_import),
      )
    ) {
      violations.push({
        path,
        reason: `runtime 不得依赖 ${policy.dependencies.runtime_must_not_import}`,
      });
    }
    for (const fragment of policy.dependencies.forbidden_import_fragments ?? []) {
      if (specifiers.some((specifier) => specifier.includes(fragment))) {
        violations.push({ path, reason: `禁止导入旧路径: ${fragment}` });
      }
    }
  }
  return violations;
}

function sharedModuleViolations(
  repoRoot: string,
  paths: string[],
  policy: RepositoryPolicy,
): PolicyViolation[] {
  const config = policy.shared_modules;
  if (!config) return [];

  const knownPaths = new Set(paths);
  const codePaths = paths.filter((path) => CODE_PATH_RE.test(path));
  const reverseImports = new Map<string, Set<string>>();
  for (const importer of codePaths) {
    const absolute = resolve(repoRoot, importer);
    if (!existsSync(absolute) || statSync(absolute).isDirectory()) continue;
    for (const specifier of importSpecifiers(readFileSync(absolute, "utf8"))) {
      const target = resolveImportPath(importer, specifier, knownPaths);
      if (!target) continue;
      const importers = reverseImports.get(target) ?? new Set<string>();
      importers.add(importer);
      reverseImports.set(target, importers);
    }
  }

  const violations: PolicyViolation[] = [];
  const domainPattern = new RegExp(config.page_domain_pattern);
  const sharedPaths = codePaths.filter(
    (path) =>
      !/(?:^|\/)[^/]+\.(?:test|spec)\.(?:ts|tsx)$/.test(path) &&
      !path.endsWith(".d.ts") &&
      config.roots.some((root) => policyGlobMatches(path, `${root}/**`)),
  );

  for (const path of sharedPaths) {
    const pageMarker = "/pages/";
    const pageIndex = path.indexOf(pageMarker);
    if (pageIndex >= 0) {
      const domain = path.slice(pageIndex + pageMarker.length).split("/")[0] ?? "";
      if (!domain || !domainPattern.test(domain)) {
        violations.push({
          path,
          reason: `共享页面必须归入稳定产品领域 (${config.page_domain_pattern})`,
        });
      }
    }

    const owners = new Set<string>();
    const visited = new Set([path]);
    const queue = [path];
    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) continue;
      for (const importer of reverseImports.get(current) ?? []) {
        if (visited.has(importer)) continue;
        visited.add(importer);
        const owner = featureOwner(importer);
        if (owner) owners.add(owner);
        else queue.push(importer);
      }
    }
    if (owners.size < config.minimum_feature_consumers) {
      violations.push({
        path,
        reason: `共享模块必须被至少 ${config.minimum_feature_consumers} 个独立 feature 直接或传递使用，当前 ${owners.size} 个`,
      });
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
  return [
    ...violations,
    ...dependencyViolations(root, paths, policy),
    ...sharedModuleViolations(root, paths, policy),
  ].sort((a, b) => `${a.path}:${a.reason}`.localeCompare(`${b.path}:${b.reason}`));
}

export function formatPolicyViolations(violations: readonly PolicyViolation[]): string {
  return violations.map((violation) => `${violation.path}: ${violation.reason}`).join("\n");
}

export function repositoryRelativePath(repoRoot: string, path: string): string {
  return normalize(relative(repoRoot, path));
}
