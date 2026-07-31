#!/usr/bin/env bun

import { spawn } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const cli = join(root, "cli", "bin", "kata.ts");
const readme = join(root, "cli", "README.md");
const HELP_CONCURRENCY = 8;

export function normalizeHelp(output: string): string {
  return output.replaceAll(root, "<kata-root>");
}

function help(path: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn("bun", [cli, ...path, "--help"], {
      cwd: root,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;
    });
    child.once("error", reject);
    child.once("close", (status) => {
      if (status !== 0) {
        reject(new Error(stderr || `无法读取 kata ${path.join(" ")} help`));
        return;
      }
      resolve(normalizeHelp(stdout.trimEnd()));
    });
  });
}

async function mapConcurrently<T, R>(
  values: readonly T[],
  map: (value: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(values.length);
  let nextIndex = 0;
  const worker = async (): Promise<void> => {
    for (;;) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= values.length) return;
      results[index] = await map(values[index] as T);
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(HELP_CONCURRENCY, values.length) }, () => worker()),
  );
  return results;
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

export async function generateCliReadme(): Promise<string> {
  const sections: string[] = [
    "# Kata CLI 命令参考",
    "",
    "本文件由 `bun cli/scripts/generate-readme.ts --write` 根据 Commander 的递归 `--help` 输出生成。修改 CLI 命令、参数、默认值或作用后，必须重新生成并运行同步测试。",
    "",
    "根命令只展示一级入口；下面按命令路径列出全部嵌套命令、参数和作用。",
    "",
  ];
  let queue: string[][] = [[]];
  const visited = new Set<string>();
  while (queue.length > 0) {
    const paths = queue.filter((path) => {
      const key = path.join(" ");
      if (visited.has(key)) return false;
      visited.add(key);
      return true;
    });
    const outputs = await mapConcurrently(paths, async (path) => ({
      path,
      output: await help(path),
    }));
    queue = [];
    for (const { path, output } of outputs) {
      const key = path.join(" ");
      sections.push(`## kata${path.length > 0 ? ` ${key}` : ""}`, "", "```text", output, "```", "");
      for (const child of commandNames(output)) queue.push([...path, child]);
    }
  }
  return `${sections.join("\n").trimEnd()}\n`;
}

const generated = await generateCliReadme();
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
