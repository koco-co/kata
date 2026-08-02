/**
 * Centralized config/ path resolution — the single source of truth for where
 * every config family lives. Loaders, the config registry and doctor checks all
 * construct paths through this module, so a layout change is one edit here.
 *
 * Root discovery (git common-dir fallback for private config shared via a main
 * worktree) also lives here, replacing the per-loader copies.
 */
import { execFileSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
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
