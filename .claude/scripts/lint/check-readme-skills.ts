#!/usr/bin/env bun

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const skillsRoot = join(root, ".claude", "skills");
const readmes = ["README.md", "README-EN.md"];
const violations: string[] = [];

function businessSkills(): string[] {
  if (!existsSync(skillsRoot)) return [];
  return readdirSync(skillsRoot)
    .filter(
      (name) =>
        !name.startsWith("_") && statSync(join(skillsRoot, name)).isDirectory(),
    )
    .sort();
}

function listedSkills(text: string): string[] {
  const found = new Set<string>();
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(
      /^\|\s*`\/[^`]+`\s*\|[^|]*\|\s*`([a-z0-9-]+)@\d+`\s*\|/,
    );
    if (match) found.add(match[1]);
  }
  return [...found].sort();
}

const expected = businessSkills();
for (const readme of readmes) {
  const path = join(root, readme);
  if (!existsSync(path)) {
    violations.push(`${readme}: 文件不存在`);
    continue;
  }
  const text = readFileSync(path, "utf8");
  const actual = listedSkills(text);
  const missing = expected.filter((name) => !actual.includes(name));
  const extra = actual.filter((name) => !expected.includes(name));
  if (missing.length > 0) {
    violations.push(`${readme}: 能力表缺少 ${missing.join(", ")}`);
  }
  if (extra.length > 0) {
    violations.push(`${readme}: 能力表包含未知 Skill ${extra.join(", ")}`);
  }
  if (actual.length !== expected.length) {
    violations.push(
      `${readme}: 能力表共 ${actual.length} 项，目录中共有 ${expected.length} 个业务 Skill`,
    );
  }

  for (const stale of [
    "8 个业务 skill",
    "8 个业务 Skill",
    "8 business skills",
    "workspace/{project}/.kata/repos",
    "workspace/<project>/.kata/repos",
  ]) {
    if (text.includes(stale)) violations.push(`${readme}: 仍包含过期描述 “${stale}”`);
  }
}

if (violations.length > 0) {
  process.stderr.write("README 与 Skill 目录不一致：\n");
  for (const violation of violations) process.stderr.write(`- ${violation}\n`);
  process.exitCode = 2;
} else {
  process.stdout.write(`README Skill 清单一致：${expected.length} 项\n`);
}
