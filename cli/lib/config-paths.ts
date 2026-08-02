/**
 * Centralized config/ path resolution — the single source of truth for where
 * every config family lives. Loaders, the config registry and doctor checks all
 * construct paths through this module, so a layout change is one edit here.
 *
 * Root discovery (git common-dir fallback for private config shared via a main
 * worktree) also lives here, replacing the per-loader copies.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { repoRoot as locateRoot } from "./workspace-locator.ts";

/** Canonical repo root for config resolution; defaults to the located project root. */
export function configRoot(root?: string): string {
  return root ? resolve(root) : locateRoot();
}

// ─── private (config/private, gitignored as a whole) ──────────────────────

export function privateRoot(root?: string): string {
  return join(configRoot(root), "config", "private");
}

export function environmentsDir(root?: string): string {
  return join(privateRoot(root), "environments");
}

export function integrationsDir(root?: string): string {
  return join(privateRoot(root), "integrations");
}

export function infrastructureDir(root?: string): string {
  return join(privateRoot(root), "infrastructure");
}

export function repositoriesPath(root?: string): string {
  return join(privateRoot(root), "repositories.yaml");
}

// ─── policies (config/policies, tracked contracts) ────────────────────────

export function policiesDir(root?: string): string {
  return join(configRoot(root), "config", "policies");
}

export function repoPolicyPath(root?: string): string {
  return join(policiesDir(root), "repo-policy.yaml");
}

export function casesLintPath(root?: string): string {
  return join(policiesDir(root), "cases-lint.yaml");
}

export function sqlProfilesPath(root?: string): string {
  return join(policiesDir(root), "sql-profiles.yaml");
}

export function xmindMappingPath(root?: string): string {
  return join(policiesDir(root), "xmind-mapping.yaml");
}

// ─── examples (config/examples, tracked redacted templates) ───────────────

export function examplesDir(root?: string): string {
  return join(configRoot(root), "config", "examples");
}

export function environmentsExamplePath(root?: string): string {
  return join(examplesDir(root), "environments", "env.example.yaml");
}

export function infrastructureExamplePath(kind: string, root?: string): string {
  return join(examplesDir(root), "infrastructure", `${kind}.example.yaml`);
}

export function integrationsExamplePath(name: string, root?: string): string {
  return join(examplesDir(root), "integrations", `${name}.example.yaml`);
}

export function repositoriesExamplePath(root?: string): string {
  return join(examplesDir(root), "repositories.example.yaml");
}

// ─── automation runtime behavior ──────────────────────────────────────────

export function automationConfigPath(root?: string): string {
  return join(configRoot(root), "config", "automation", "playwright.yaml");
}

// ─── shared worktree discovery ────────────────────────────────────────────

/**
 * Main worktree root resolved through the git common dir. `.repos/` and shared
 * private config live in the main worktree even when running from a linked one.
 */
export function mainWorktreeRoot(root?: string): string {
  const common = execFileSync(
    "git",
    ["-C", configRoot(root), "rev-parse", "--path-format=absolute", "--git-common-dir"],
    { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
  ).trim();
  return dirname(common);
}

/**
 * `config/private` of the main worktree when running from a linked worktree,
 * otherwise undefined (local private config is authoritative).
 */
export function sharedPrivateRoot(root?: string): string | undefined {
  const resolved = configRoot(root);
  try {
    const main = mainWorktreeRoot(root);
    if (resolve(main) === resolve(resolved)) return undefined;
    return join(main, "config", "private");
  } catch {
    return undefined;
  }
}

function privateRelativePath(value: string): string {
  const slashNormalized = value.replace(/\\/g, "/");
  const normalized =
    slashNormalized === "config/private"
      ? ""
      : slashNormalized.startsWith("config/private/")
        ? slashNormalized.slice("config/private/".length)
        : slashNormalized;
  if (isAbsolute(normalized)) throw new Error(`私密配置相对路径不得是绝对路径: ${value}`);
  const parts = normalized.split(/[\\/]+/).filter(Boolean);
  if (parts.some((part) => part === "." || part === "..")) {
    throw new Error(`私密配置相对路径不得逃逸 config/private: ${value}`);
  }
  return parts.join(sep);
}

/** linked worktree 的私密配置读取根：本地优先，主工作树作为逐文件回退。 */
export function privateConfigRoots(root?: string): string[] {
  const local = privateRoot(root);
  const shared = sharedPrivateRoot(root);
  return shared && resolve(shared) !== resolve(local) ? [local, shared] : [local];
}

/** 读取私密目录时优先使用本地已存在目录，否则回退主工作树。 */
export function effectivePrivateDir(relDir: string, root?: string): string {
  const rel = privateRelativePath(relDir);
  for (const base of privateConfigRoots(root)) {
    const candidate = join(base, rel);
    if (existsSync(candidate)) return candidate;
  }
  return join(privateRoot(root), rel);
}

/**
 * 私密族的实例文件：合并本地与共享主工作树（按文件名去重）。
 * relDir 相对 config/private（如 "environments"、"integrations"）。
 * linked worktree 中，本地没有的实例从主工作树补齐。
 */
export function privateInstanceFiles(
  relDir: string,
  root?: string,
  matcher: (name: string) => boolean = (name) => name.endsWith(".yaml"),
): string[] {
  const bases = privateConfigRoots(root);
  const rel = privateRelativePath(relDir);
  const seen = new Set<string>();
  const files: string[] = [];
  for (const base of bases) {
    const dir = join(base, rel);
    if (!existsSync(dir)) continue;
    for (const name of readdirSync(dir).filter(matcher).sort()) {
      if (seen.has(name)) continue;
      seen.add(name);
      files.push(join(dir, name));
    }
  }
  return files;
}

/** 私密固定文件的有效路径：本地缺失时回退主工作树共享副本。 */
export function effectivePrivatePath(relFile: string, root?: string): string {
  const rel = privateRelativePath(relFile);
  for (const base of privateConfigRoots(root)) {
    const candidate = join(base, rel);
    if (existsSync(candidate)) return candidate;
  }
  return join(privateRoot(root), rel);
}

/** 返回实际私密文件所属的仓库根，用于权限、Git 跟踪与 symlink 校验。 */
export function privateFileRepoRoot(path: string, root?: string): string {
  const target = resolve(path);
  const localRoot = configRoot(root);
  const candidates = [localRoot];
  try {
    const main = mainWorktreeRoot(root);
    if (resolve(main) !== resolve(localRoot)) candidates.push(main);
  } catch {
    // 非 Git fixture 只有调用方传入的本地根。
  }
  for (const candidate of candidates) {
    const base = privateRoot(candidate);
    const rel = relative(base, target);
    if (rel !== ".." && !rel.startsWith(`..${sep}`) && !isAbsolute(rel)) return candidate;
  }
  throw new Error(`私密配置不属于本地或主工作树 config/private: ${target}`);
}
