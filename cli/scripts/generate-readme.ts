#!/usr/bin/env bun

import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const cli = join(root, "cli", "bin", "kata.ts");
const readme = join(root, "cli", "README.md");

export function normalizeHelp(output: string): string {
  return output.replaceAll(root, "<kata-root>");
}

function help(path: string[]): string {
  const result = spawnSync("bun", [cli, ...path, "--help"], { cwd: root, encoding: "utf8" });
  if (result.status !== 0) throw new Error(result.stderr || `无法读取 kata ${path.join(" ")} help`);
  return normalizeHelp(result.stdout.trimEnd());
}

function commandNames(output: string): string[] {
  const commands = output.split("\n").findIndex((line) => line.trim() === "Commands:");
  if (commands < 0) return [];
  return output
    .split("\n")
    .slice(commands + 1)
    .map((line) => line.match(/^\s{2}([a-z][\w-]*)\b/)?.[1])
    .filter((name): name is string => Boolean(name) && name !== "help");
}

export function generateCliReadme(): string {
  const sections: string[] = [
    "# Kata CLI 命令参考",
    "",
    "本文件由 `bun cli/scripts/generate-readme.ts --write` 根据 Commander 的递归 `--help` 输出生成。修改 CLI 命令、参数、默认值或作用后，必须重新生成并运行同步测试。",
    "",
    "根命令只展示一级入口；下面按命令路径列出全部嵌套命令、参数和作用。",
    "",
  ];
  const queue: string[][] = [[]];
  const visited = new Set<string>();
  while (queue.length > 0) {
    const path = queue.shift();
    if (!path) continue;
    const key = path.join(" ");
    if (visited.has(key)) continue;
    visited.add(key);
    const output = help(path);
    sections.push(`## kata${path.length > 0 ? ` ${key}` : ""}`, "", "```text", output, "```", "");
    for (const child of commandNames(output)) queue.push([...path, child]);
  }
  return `${sections.join("\n").trimEnd()}\n`;
}

const generated = generateCliReadme();
if (process.argv.includes("--check")) {
  const current = readFileSync(readme, "utf8");
  if (current !== generated) {
    console.error(
      "cli/README.md 与递归 CLI help 不同步，请运行 bun cli/scripts/generate-readme.ts --write",
    );
    process.exit(1);
  }
} else if (process.argv.includes("--write")) {
  writeFileSync(readme, generated);
} else {
  process.stdout.write(generated);
}
