import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { basename, posix, relative, resolve } from "node:path";
import { parse } from "yaml";
import { repoPolicyPath } from "./config-paths.ts";

export interface RepositoryPolicy {
  root: { allowed_files: string[]; allowed_directories: string[] };
  forbidden_globs: string[];
  artifacts: {
    cases_yaml: ArtifactRule;
    case_import: ArtifactRule;
    case_export: ArtifactRule;
    automation_case: ArtifactRule;
    automation_sql_template: ArtifactRule;
    automation_run_temporary: ArtifactRule;
  };
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

interface ArtifactRule {
  route: string;
  extensions?: string[];
  filename_pattern?: string;
  tracked?: boolean;
}

export interface PolicyViolation {
  path: string;
  reason: string;
}

const ARTIFACT_NAMES = [
  "cases_yaml",
  "case_import",
  "case_export",
  "automation_case",
  "automation_sql_template",
  "automation_run_temporary",
] as const;

function normalize(path: string): string {
  return path.split("\\").join("/");
}

export function readPolicy(repoRoot: string): RepositoryPolicy {
  const path = repoPolicyPath(repoRoot);
  const parsed = parse(readFileSync(path, "utf8")) as RepositoryPolicy;
  if (
    !parsed?.root ||
    !Array.isArray(parsed.root.allowed_files) ||
    !Array.isArray(parsed.root.allowed_directories) ||
    !Array.isArray(parsed.forbidden_globs) ||
    !parsed.artifacts
  ) {
    throw new Error(`仓库策略无效: ${path}`);
  }
  for (const name of ARTIFACT_NAMES) {
    const rule = parsed.artifacts[name] as ArtifactRule | undefined;
    if (!rule || typeof rule.route !== "string" || rule.route.trim() === "") {
      throw new Error(`仓库产物策略无效: artifacts.${name}.route (${path})`);
    }
    if (rule.extensions !== undefined && !Array.isArray(rule.extensions)) {
      throw new Error(`仓库产物策略无效: artifacts.${name}.extensions (${path})`);
    }
    if (rule.filename_pattern !== undefined && typeof rule.filename_pattern !== "string") {
      throw new Error(`仓库产物策略无效: artifacts.${name}.filename_pattern (${path})`);
    }
    if (typeof rule.filename_pattern === "string") {
      try {
        new RegExp(rule.filename_pattern);
      } catch {
        throw new Error(`仓库产物策略无效: artifacts.${name}.filename_pattern (${path})`);
      }
    }
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

function routePattern(route: string): RegExp {
  let source = "^";
  for (let index = 0; index < route.length; index += 1) {
    const char = route[index] ?? "";
    if (char === "<") {
      const end = route.indexOf(">", index + 1);
      if (end < 0) throw new Error(`仓库产物路由缺少占位符结束符: ${route}`);
      source += "[^/]+";
      index = end;
      continue;
    }
    source += /[\\^$.*+?()[\]{}|]/.test(char) ? `\\${char}` : char;
  }
  return new RegExp(`${source}${route.endsWith("/") ? "[^/]+" : ""}$`);
}

function routePrefixPattern(route: string): RegExp {
  const prefix = route.endsWith("/") ? route.slice(0, -1) : route.slice(0, route.lastIndexOf("/"));
  let source = "^";
  for (let index = 0; index < prefix.length; index += 1) {
    const char = prefix[index] ?? "";
    if (char === "<") {
      const end = prefix.indexOf(">", index + 1);
      if (end < 0) throw new Error(`仓库产物路由缺少占位符结束符: ${route}`);
      source += "[^/]+";
      index = end;
      continue;
    }
    source += /[\\^$.*+?()[\]{}|]/.test(char) ? `\\${char}` : char;
  }
  return new RegExp(`${source}(?:/|$)`);
}

function artifactMatches(path: string, rule: ArtifactRule): boolean {
  return routePattern(rule.route).test(path);
}

function artifactFilenameMatches(path: string, rule: ArtifactRule): boolean {
  const pattern = rule.filename_pattern;
  return pattern === undefined || new RegExp(`^(?:${pattern})$`).test(basename(path));
}

function artifactExtensionMatches(path: string, rule: ArtifactRule): boolean {
  return rule.extensions === undefined || rule.extensions.includes(extension(path));
}

function isFeatureCasesPath(path: string): boolean {
  return /^workspace\/[^/]+\/features\/[^/]+\/[^/]+\/cases\//.test(path);
}

function casePathViolation(path: string, policy: RepositoryPolicy): string | undefined {
  if (!isFeatureCasesPath(path)) return undefined;
  const suffix = path.replace(/^.*?\/cases\//, "");
  if (suffix === "imports/.gitkeep" || suffix === "exports/.gitkeep") return undefined;
  if (suffix === "test-points.md") return undefined;
  if (artifactMatches(path, policy.artifacts.cases_yaml)) return undefined;
  if (artifactMatches(path, policy.artifacts.case_import)) {
    if (
      artifactFilenameMatches(path, policy.artifacts.case_import) &&
      artifactExtensionMatches(path, policy.artifacts.case_import)
    ) {
      return undefined;
    }
  }
  if (artifactMatches(path, policy.artifacts.case_export)) {
    if (
      artifactFilenameMatches(path, policy.artifacts.case_export) &&
      artifactExtensionMatches(path, policy.artifacts.case_export)
    ) {
      return undefined;
    }
  }
  return "cases 仅允许根目录 YAML、test-points.md、imports/ 历史输入或 exports/ YAML 派生产物";
}

function redundantGitkeepViolations(paths: readonly string[]): PolicyViolation[] {
  return paths
    .filter((path) => basename(path) === ".gitkeep")
    .filter((path) => {
      const prefix = `${posix.dirname(path)}/`;
      return paths.some((candidate) => candidate !== path && candidate.startsWith(prefix));
    })
    .map((path) => ({
      path,
      reason: ".gitkeep 仅用于保留空目录；目录已有内容时必须删除",
    }));
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
    const caseReason = casePathViolation(path, policy);
    if (caseReason) violations.push({ path, reason: caseReason });
    const automationCase = policy.artifacts.automation_case;
    if (
      routePrefixPattern(automationCase.route).test(path) &&
      !["README.md", ".gitkeep"].includes(basename(path)) &&
      (!artifactMatches(path, automationCase) || !artifactFilenameMatches(path, automationCase))
    ) {
      violations.push({ path, reason: "正式自动化用例必须使用 policy 声明的文件名规则" });
    }
    const automationSql = policy.artifacts.automation_sql_template;
    if (
      routePrefixPattern(automationSql.route).test(path) &&
      (!artifactMatches(path, automationSql) || !artifactFilenameMatches(path, automationSql))
    ) {
      violations.push({ path, reason: "SQL 模板必须使用 policy 声明的文件名规则" });
    }
  }
  return [
    ...violations,
    ...redundantGitkeepViolations(paths),
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
