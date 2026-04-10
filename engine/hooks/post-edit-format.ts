#!/usr/bin/env bun
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";

const stdin = await Bun.stdin.text();
let payload: { tool_name?: string; tool_input?: { file_path?: string } };
try {
  payload = JSON.parse(stdin);
} catch {
  process.exit(0);
}

const filePath = payload.tool_input?.file_path;
if (!filePath || !existsSync(filePath)) process.exit(0);

const ext = filePath.split(".").pop()?.toLowerCase() ?? "";

const BIOME_EXTS = new Set(["ts", "tsx", "js", "jsx", "mjs", "cjs", "json", "jsonc"]);
const PRETTIER_EXTS = new Set(["md", "mdx", "yml", "yaml", "css", "scss", "html"]);

function run(cmd: string, args: string[]): Promise<number> {
  return new Promise((resolve) => {
    const p = spawn(cmd, args, { stdio: "inherit" });
    p.on("exit", (code) => resolve(code ?? 0));
    p.on("error", () => resolve(0));
  });
}

if (BIOME_EXTS.has(ext)) {
  await run("bunx", ["--bun", "biome", "format", "--write", filePath]);
} else if (PRETTIER_EXTS.has(ext)) {
  await run("bunx", ["prettier", "--write", "--log-level", "warn", filePath]);
}

process.exit(0);
