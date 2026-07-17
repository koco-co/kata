import { describe, expect, it } from "bun:test";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Glob } from "bun";

const repoRoot = resolve(import.meta.dirname, "../../../../..");
const kata = resolve(repoRoot, ".claude/scripts/_shared/bin/kata");

const publicCommands = {
  archives: ["convert", "validate", "search"],
  "case-tasks": ["build"],
  project: ["scan", "create"],
  history: ["convert"],
  workspace: ["scan", "verify"],
  knowledge: [
    "read-core",
    "read-module",
    "read-pitfall",
    "index",
    "write",
    "update",
    "verify",
    "history",
    "rollback",
    "lint",
  ],
  repos: ["sync", "sync-env", "sync-profile", "show", "grep", "list"],
  rules: ["load"],
  scans: [
    "create",
    "add-bug",
    "remove-bug",
    "update-bug",
    "update-bug-steps",
    "set-meta",
    "show",
    "render",
  ],
  defects: ["render-bug", "render-conflict"],
  xmind: ["search", "show", "patch", "add", "delete", "generate"],
  agents: ["audit"],
  automation: ["scaffold", "normalize"],
  cases: ["validate", "lint", "compare", "convert", "e2e", "verify"],
  paths: ["audit"],
  skills: ["sync-check", "audit"],
  safety: ["audit-command"],
  features: ["create", "list", "show", "lint", "index", "resolve", "clean", "archive", "migrate"],
  results: ["path", "publish", "prune"],
  handoff: ["render"],
  env: [
    "list",
    "show",
    "add",
    "cookie",
    "discover",
    "doctor",
    "run",
    "migrate-dataassets",
    "migrate-zentao-session",
    "set",
  ],
} as const;

function run(args: string[]): { stdout: string; stderr: string; code: number } {
  try {
    const stdout = execFileSync("bun", [kata, ...args], {
      cwd: repoRoot,
      encoding: "utf8",
      env: process.env,
    });
    return { stdout, stderr: "", code: 0 };
  } catch (error) {
    const failure = error as { stdout?: string; stderr?: string; status?: number };
    return {
      stdout: failure.stdout ?? "",
      stderr: failure.stderr ?? "",
      code: failure.status ?? 1,
    };
  }
}

function commandNames(help: string): string[] {
  const commands = help.split("\nCommands:\n")[1] ?? "";
  return [...commands.matchAll(/^ {2}([a-z][a-z0-9-]*)/gm)]
    .map((match) => match[1])
    .filter((name) => name !== "help");
}

describe("kata 公共命令契约", () => {
  it("公共入口禁用 Bun 隐式 dotenv overlay", () => {
    expect(readFileSync(kata, "utf8").split("\n", 1)[0]).toBe(
      "#!/usr/bin/env -S bun --no-env-file",
    );
  });

  it("根帮助只展示固定的资源命令", () => {
    const result = run(["--help"]);
    expect(result.code).toBe(0);
    expect(commandNames(result.stdout)).toEqual(Object.keys(publicCommands));
    expect(result.stdout).not.toMatch(
      /\b(?:create-project|repo-sync|init-wizard|archive-gen|history-convert|knowledge-curate|defect-report|scan-report|rule-loader|xmind-gen|xmind-patch)\b/,
    );
  });

  it("每个资源只展示固定的完整动作名", () => {
    for (const [group, expected] of Object.entries(publicCommands)) {
      const result = run([group, "--help"]);
      expect(result.code, `${group} --help\n${result.stderr}`).toBe(0);
      expect(commandNames(result.stdout)).toEqual([...expected]);
    }
    expect(run(["features", "--help"]).stdout).not.toMatch(/^ {2}(?:new|ls)\b/m);
  }, 30_000);

  it("所有公共叶子命令都提供完整帮助并使用 kebab-case 位置参数", () => {
    for (const [group, actions] of Object.entries(publicCommands)) {
      for (const action of actions) {
        const result = run([group, action, "--help"]);
        expect(result.code, `${group} ${action} --help\n${result.stderr}`).toBe(0);
        expect(result.stdout).toContain("Usage:");
        expect(result.stdout).toContain("--help");
        expect(result.stdout).not.toMatch(/<[a-z]+[A-Z][^>]*>/);
      }
    }
  }, 30_000);

  it("旧命令继续转发，但不进入公共帮助页", () => {
    for (const args of [
      ["create-project", "scan", "--help"],
      ["repo-sync", "sync", "--help"],
      ["init-wizard", "verify", "--help"],
      ["features", "new", "--help"],
      ["features", "ls", "--help"],
      ["archive-gen", "validate", "--help"],
      ["history-convert", "--help"],
      ["knowledge-curate", "read-core", "--help"],
      ["defect-report", "render-bug", "--help"],
      ["scan-report", "create", "--help"],
      ["rule-loader", "load", "--help"],
      ["xmind-gen", "--help"],
      ["xmind-patch", "search", "--help"],
    ]) {
      const result = run(args);
      expect(result.code, `${args.join(" ")}\n${result.stderr}`).toBe(0);
    }
  });

  it("Skill 与共享提示词只引用公共命令和 kebab-case 位置参数", async () => {
    const forbiddenCommands =
      /kata (?:create-project|repo-sync|init-wizard|archive-gen|history-convert|knowledge-curate|defect-report|scan-report|rule-loader|xmind-gen|xmind-patch)\b/;
    const camelCasePlaceholder = /<feature(?:Id|Dir)>/;
    const publicGroups = new Set(Object.keys(publicCommands));
    const files: string[] = [];
    for (const pattern of [".claude/skills/**/*.md", ".claude/prompt/**/*.md"]) {
      for await (const file of new Glob(pattern).scan({ cwd: repoRoot, onlyFiles: true })) {
        files.push(file);
      }
    }
    const violations = files.flatMap((file) => {
      const content = readFileSync(resolve(repoRoot, file), "utf8");
      const commandReferences = [
        ...content.matchAll(/`kata ([a-z][a-z0-9-]*)(?: ([a-z][a-z0-9-]*))?\b/g),
        ...content.matchAll(/^\s*kata ([a-z][a-z0-9-]*)(?: ([a-z][a-z0-9-]*))?\b/gm),
      ];
      return [
        ...(forbiddenCommands.test(content) ? [`${file}: 引用了隐藏旧命令`] : []),
        ...(camelCasePlaceholder.test(content) ? [`${file}: 使用了 camelCase 位置参数`] : []),
        ...commandReferences.flatMap((match) => {
          const [, group, action] = match;
          if (!publicGroups.has(group)) return [`${file}: 引用了未公开命令 kata ${group}`];
          if (
            action &&
            !(publicCommands[group as keyof typeof publicCommands] as readonly string[]).includes(
              action,
            )
          ) {
            return [`${file}: 引用了未公开动作 kata ${group} ${action}`];
          }
          return [];
        }),
      ];
    });
    expect(violations).toEqual([]);
  });

  it("固定选项在执行前拒绝未声明的取值", () => {
    const featureFormat = run(["features", "list", "--format", "xml"]);
    expect(featureFormat.code).toBe(1);
    expect(featureFormat.stderr).toContain("Allowed choices are table, json, md");

    const lintSeverity = run(["cases", "lint", "--severity", "warning"]);
    expect(lintSeverity.code).toBe(1);
    expect(lintSeverity.stderr).toContain("Allowed choices are all, fail-only");
  });

  it("env discover 支持只读临时 Cookie 引导", () => {
    const help = run(["env", "discover", "--help"]);
    expect(help.code).toBe(0);
    expect(help.stdout).toContain("--cookie-stdin");
  });
});
