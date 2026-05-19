#!/usr/bin/env bun
/**
 * plugin-loader.ts — Plugin discovery and dispatch CLI.
 *
 * Usage:
 *   kata plugin-loader list
 *   kata plugin-loader check --input "https://lanhuapp.com/..."
 *   kata plugin-loader resolve --url "https://lanhuapp.com/..." [--project dataAssets]
 *   kata plugin-loader notify --event case-generated --data '{"count":42}'
 *   kata plugin-loader notify --event ui-test-completed --data '{"reportFile":"workspace/.../allure-report/index.html"}'
 *   kata plugin-loader --help
 */

import { createCli } from "../lib/cli-runner.ts";
import { getEnv } from "../lib/env.ts";
import { aiCorePluginsDir, pluginsDir } from "../lib/paths.ts";
import { loadAllPlugins } from "../lib/plugin-utils.ts";

function shellEscape(value: string): string {
  return `'${value.replace(/'/g, "'\\''")}'`;
}

function matchesUrlPattern(url: string, patterns: string[]): boolean {
  return patterns.some((pattern) => url.includes(pattern));
}

// ── list ──────────────────────────────────────────────────────────────────────

function runList(): void {
  const plugins = loadAllPlugins(aiCorePluginsDir(), { legacyRoot: pluginsDir() });
  const output = plugins.map(({ name, active, data }) => ({
    name,
    active,
    description: data.description ?? "",
  }));

  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
}

// ── check ─────────────────────────────────────────────────────────────────────

function runCheck(opts: { input: string }): void {
  const plugins = loadAllPlugins(aiCorePluginsDir(), { legacyRoot: pluginsDir() });

  for (const plugin of plugins) {
    if (!plugin.active) continue;
    const patterns = plugin.data.url_patterns ?? [];
    if (matchesUrlPattern(opts.input, patterns)) {
      process.stdout.write(`${JSON.stringify({ matched: true, plugin: plugin.name }, null, 2)}\n`);
      return;
    }
  }

  process.stdout.write(`${JSON.stringify({ matched: false }, null, 2)}\n`);
}

// ── resolve ───────────────────────────────────────────────────────────────────

function defaultPluginOutputDir(opts: { project?: string; outputDir?: string }): string {
  if (opts.outputDir) return opts.outputDir;
  const workspaceDir = getEnv("KATA_WORKSPACE_ROOT") ?? "workspace";
  if (opts.project) return `${workspaceDir}/${opts.project}/features`;
  return `${workspaceDir}/../.kata/plugin-output`;
}

function renderPluginCommand(
  template: string,
  opts: { url: string; project?: string; outputDir?: string },
): string {
  const outputDir = defaultPluginOutputDir(opts);
  const project = opts.project ?? "auto";
  return template
    .replace(/\{\{url\}\}/g, shellEscape(opts.url))
    .replace(/\{\{output\}\}/g, shellEscape(outputDir))
    .replace(/\{\{output_dir\}\}/g, shellEscape(outputDir))
    .replace(/\{\{project\}\}/g, shellEscape(project));
}

function runResolve(opts: { url: string; project?: string; outputDir?: string }): void {
  const plugins = loadAllPlugins(aiCorePluginsDir(), { legacyRoot: pluginsDir() });

  for (const plugin of plugins) {
    if (!plugin.active) continue;
    const patterns = plugin.data.url_patterns ?? [];
    if (matchesUrlPattern(opts.url, patterns)) {
      const fetchCmd = plugin.data.commands?.fetch ?? "";
      if (!fetchCmd) {
        process.stderr.write(
          `[plugin-loader] plugin "${plugin.name}" matched but has no fetch command\n`,
        );
        process.stdout.write(
          `${JSON.stringify({ error: `Plugin "${plugin.name}" has no fetch command` }, null, 2)}\n`,
        );
        process.exit(1);
      }

      const command = renderPluginCommand(fetchCmd, opts);
      if (/\{\{[A-Za-z0-9_-]+\}\}/.test(command)) {
        process.stderr.write(
          `[plugin-loader] plugin "${plugin.name}" fetch command has unresolved placeholders\n`,
        );
        process.stdout.write(
          `${JSON.stringify({ error: `Plugin "${plugin.name}" has unresolved fetch placeholders` }, null, 2)}\n`,
        );
        process.exit(1);
      }

      process.stdout.write(`${JSON.stringify({ plugin: plugin.name, command }, null, 2)}\n`);
      return;
    }
  }

  process.stdout.write(`${JSON.stringify({ error: "No matching plugin" }, null, 2)}\n`);
  process.exit(1);
}

// ── notify ────────────────────────────────────────────────────────────────────

function runNotify(opts: { event: string; data: string }): void {
  const plugins = loadAllPlugins(aiCorePluginsDir(), { legacyRoot: pluginsDir() });
  const notifyPlugin = plugins.find((p) => p.name === "notify");

  if (!notifyPlugin?.active) {
    process.stdout.write(
      `${JSON.stringify({ skipped: true, reason: "notify plugin not active" }, null, 2)}\n`,
    );
    return;
  }

  const sendCmd = notifyPlugin.data.commands?.send ?? "";
  if (!sendCmd) {
    process.stdout.write(
      JSON.stringify({ skipped: true, reason: "notify plugin has no send command" }, null, 2) +
        "\n",
    );
    return;
  }

  const command = sendCmd
    .replace(/\{\{event\}\}/g, shellEscape(opts.event))
    .replace(/\{\{json\}\}/g, shellEscape(opts.data));

  process.stdout.write(`${JSON.stringify({ plugin: "notify", command }, null, 2)}\n`);
}

export const program = createCli({
  name: "plugin-loader",
  description: "kata 插件发现与调度",
  commands: [
    {
      name: "list",
      description: "List all discovered plugins with their active status",
      action: () => runList(),
    },
    {
      name: "check",
      description: "Check if an input URL matches any active plugin's url_patterns",
      options: [
        {
          flag: "--input <url>",
          description: "URL to check against active plugins",
          required: true,
        },
      ],
      action: runCheck,
    },
    {
      name: "resolve",
      description: "Resolve fetch command for a URL by matching active plugin url_patterns",
      options: [
        { flag: "--url <url>", description: "URL to resolve", required: true },
        {
          flag: "--project <name>",
          description: "Optional kata project id; resolves output to workspace/<project>/features",
        },
        {
          flag: "--output-dir <dir>",
          description: "Optional explicit plugin output directory",
        },
      ],
      action: runResolve,
    },
    {
      name: "notify",
      description: "Dispatch a notification event via the notify plugin",
      options: [
        {
          flag: "--event <event>",
          description: "Event type (e.g. case-generated)",
          required: true,
        },
        {
          flag: "--data <json>",
          description: "JSON payload for the event",
          required: true,
        },
      ],
      action: runNotify,
    },
  ],
});
