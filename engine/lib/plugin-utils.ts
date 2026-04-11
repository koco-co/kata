import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { getEnv } from "./env.ts";

export interface PluginJson {
  name?: string;
  description?: string;
  commands?: Record<string, string>;
  env_required?: string[];
  env_required_any?: string[];
  url_patterns?: string[];
  [key: string]: unknown;
}

export interface PluginLoadIssue {
  code: string;
  message: string;
  path: string;
}

export interface LoadedPlugin {
  name: string;
  active: boolean;
  data: PluginJson;
  issues: PluginLoadIssue[];
}

export interface PluginLoadOptions {
  env?: Record<string, string | undefined>;
  legacyRoot?: string;
}

export function isPluginActive(
  plugin: PluginJson,
  env?: Record<string, string | undefined>,
): boolean {
  if (plugin.env_required && plugin.env_required.length > 0) {
    return plugin.env_required.every((key) => {
      const val = readEnv(key, env);
      return val !== undefined && val.trim() !== "";
    });
  }
  if (plugin.env_required_any && plugin.env_required_any.length > 0) {
    return plugin.env_required_any.some((key) => {
      const val = readEnv(key, env);
      return val !== undefined && val.trim() !== "";
    });
  }
  return true;
}

export function loadAllPlugins(dir: string, options: PluginLoadOptions = {}): LoadedPlugin[] {
  const plugins: LoadedPlugin[] = [];
  if (!existsSync(dir)) return plugins;

  let entries: string[];
  try {
    entries = readdirSync(dir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);
  } catch {
    return plugins;
  }

  for (const name of entries) {
    const pluginDir = join(dir, name);
    const runtimeJsonPath = join(pluginDir, "runtime.json");
    const pluginJsonPath = join(pluginDir, "plugin.json");
    const metadataPath = existsSync(runtimeJsonPath) ? runtimeJsonPath : pluginJsonPath;
    if (!existsSync(metadataPath)) continue;

    const loaded = readPluginJson(metadataPath);
    if (!loaded) continue;
    const issues = [
      ...runtimeLikeLegacyIssues({
        data: loaded,
        pluginName: name,
        pluginJsonPath,
        runtimeJsonPath,
      }),
      ...externalLegacyIssues({
        data: loaded,
        legacyRoot: options.legacyRoot,
        pluginName: name,
      }),
    ];
    const pluginName = loaded.name ?? name;

    plugins.push({
      name: pluginName,
      active: isPluginActive(loaded, options.env),
      data: loaded,
      issues,
    });
  }

  return plugins;
}

function readEnv(key: string, env?: Record<string, string | undefined>): string | undefined {
  return env ? env[key] : getEnv(key);
}

function readPluginJson(path: string): PluginJson | undefined {
  try {
    return JSON.parse(readFileSync(path, "utf8")) as PluginJson;
  } catch (err) {
    process.stderr.write(`[plugin] failed to parse ${path}: ${err}\n`);
    return undefined;
  }
}

function runtimeLikeLegacyIssues(input: {
  data: PluginJson;
  pluginName: string;
  pluginJsonPath: string;
  runtimeJsonPath: string;
}): PluginLoadIssue[] {
  if (!existsSync(input.runtimeJsonPath) || !existsSync(input.pluginJsonPath)) return [];
  const legacy = readPluginJson(input.pluginJsonPath);
  if (!legacy || !isRuntimeLikePluginJson(legacy)) return [];
  return comparePluginRuntimeMetadata(input.data, legacy, input.pluginJsonPath, input.pluginName);
}

function externalLegacyIssues(input: {
  data: PluginJson;
  legacyRoot?: string;
  pluginName: string;
}): PluginLoadIssue[] {
  if (!input.legacyRoot) return [];
  const legacyPath = join(input.legacyRoot, input.pluginName, "plugin.json");
  if (!existsSync(legacyPath)) return [];
  const legacy = readPluginJson(legacyPath);
  if (!legacy) return [];
  return comparePluginRuntimeMetadata(input.data, legacy, legacyPath, input.pluginName);
}

function comparePluginRuntimeMetadata(
  source: PluginJson,
  legacy: PluginJson,
  path: string,
  pluginName: string,
): PluginLoadIssue[] {
  const sourceRuntime = runtimeComparableFields(source);
  const legacyRuntime = runtimeComparableFields(legacy);
  if (stableJson(sourceRuntime) === stableJson(legacyRuntime)) return [];
  return [
    {
      code: "plugin_runtime.legacy_drift",
      message: `Legacy plugin runtime metadata for ${pluginName} differs from AI Core runtime metadata.`,
      path,
    },
  ];
}

function isRuntimeLikePluginJson(value: PluginJson): boolean {
  return Boolean(
    value.commands || value.url_patterns || value.env_required || value.env_required_any,
  );
}

function runtimeComparableFields(plugin: PluginJson): Record<string, unknown> {
  return {
    commands: plugin.commands ?? {},
    description: plugin.description ?? "",
    env_required: plugin.env_required ?? [],
    env_required_any: plugin.env_required_any ?? [],
    name: plugin.name ?? "",
    url_patterns: plugin.url_patterns ?? [],
  };
}

function stableJson(value: unknown): string {
  return JSON.stringify(value);
}
