#!/usr/bin/env bun
/**
 * config.ts — Outputs merged workspace config JSON to stdout.
 *
 * Usage:
 *   kata config show
 *   kata config --help
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createCli } from "../lib/cli-runner.ts";
import { getEnv } from "../lib/env.ts";
import { contractPluginsDir, pluginsDir, repoRoot } from "../lib/paths.ts";
import { loadAllPlugins } from "../lib/plugin-utils.ts";

interface PluginEntry {
  active: boolean;
  description: string;
  commands: Record<string, string>;
}

interface RepoRef {
  path: string;
  branch: string;
}

interface RepoProfile {
  repos: RepoRef[];
}

type RepoProfiles = Record<string, RepoProfile>;

interface ProjectConfig {
  repo_profiles: RepoProfiles;
}

interface ConfigOutput {
  workspace_dir: string;
  source_repos: string[];
  plugins: Record<string, PluginEntry>;
  projects: Record<string, ProjectConfig>;
}

function scanPlugins(dir: string, legacyRoot: string): Record<string, PluginEntry> {
  const loaded = loadAllPlugins(dir, { legacyRoot });
  const plugins: Record<string, PluginEntry> = {};
  for (const p of loaded) {
    plugins[p.name] = {
      active: p.active,
      description: p.data.description ?? "",
      commands: p.data.commands ?? {},
    };
  }
  return plugins;
}

function readProjectConfigs(): Record<string, ProjectConfig> {
  const configPath = configJsonPath();
  if (!existsSync(configPath)) return {};
  try {
    const raw = JSON.parse(readFileSync(configPath, "utf8")) as Record<string, unknown>;
    return (raw.projects ?? {}) as Record<string, ProjectConfig>;
  } catch (err) {
    process.stderr.write(`[config] failed to parse config.json: ${err}\n`);
    return {};
  }
}

function configJsonPath(): string {
  return getEnv("CONFIG_JSON_PATH") ?? join(repoRoot(), "config.json");
}

function buildConfig(): ConfigOutput {
  const workspaceDir = getEnv("KATA_WORKSPACE_ROOT") ?? "workspace";
  const sourceReposRaw = getEnv("KATA_SOURCE_REPOS") ?? "";
  const sourceRepos = sourceReposRaw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const plugins = scanPlugins(contractPluginsDir(), pluginsDir());
  const projects = readProjectConfigs();

  return {
    workspace_dir: workspaceDir,
    source_repos: sourceRepos,
    plugins,
    projects,
  };
}

function runShow(): void {
  try {
    const config = buildConfig();
    process.stdout.write(`${JSON.stringify(config, null, 2)}\n`);
  } catch (err) {
    process.stderr.write(`[config] error: ${err}\n`);
    process.exit(1);
  }
}

export const program = createCli({
  name: "config",
  description: "输出合并后的工作区配置 JSON（读取 .env + 扫描插件 runtime manifest）",
  rootAction: {
    action: () => runShow(),
  },
});
