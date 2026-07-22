#!/usr/bin/env bun

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const violations: string[] = [];

for (const relativePath of [
  "config.example.json",
  ".github/workflows/migrate-script-removed.yml",
]) {
  if (existsSync(join(root, relativePath))) {
    violations.push(`${relativePath}: 已退出当前配置或 CI 流程，应删除`);
  }
}

const activeDocs = ["README.md", "README-EN.md", "INSTALL.md", "AGENTS.md"];
const stalePhrases = [
  "workspace/{project}/.kata/repos",
  "workspace/<project>/.kata/repos",
  "cp config.example.json config.json",
  "8 个业务 skill",
  "8 个业务 Skill",
  "8 business skills",
];
for (const relativePath of activeDocs) {
  const path = join(root, relativePath);
  if (!existsSync(path)) continue;
  const text = readFileSync(path, "utf8");
  for (const phrase of stalePhrases) {
    if (text.includes(phrase)) violations.push(`${relativePath}: 仍包含过期描述 “${phrase}”`);
  }
}

if (violations.length > 0) {
  process.stderr.write("发现已经退出主流程的路径或说明：\n");
  for (const violation of violations) process.stderr.write(`- ${violation}\n`);
  process.exitCode = 2;
} else {
  process.stdout.write("未发现已经退出主流程的路径或说明\n");
}
