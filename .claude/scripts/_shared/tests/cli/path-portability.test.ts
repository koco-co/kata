import { describe, expect, it } from "bun:test";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { Glob } from "bun";

const repoRoot = resolve(import.meta.dirname, "../../../../..");
const kata = resolve(repoRoot, ".claude/scripts/_shared/bin/kata");
const sourcePatterns = [
  ".claude/scripts/_shared/cli/**/*.ts",
  ".claude/skills/*/scripts/**/*.ts",
  ".claude/plugins/**/*.ts",
  ".claude/packages/*/scripts/**/*.ts",
];

const forbidden = [
  {
    name: "固定用户目录",
    regex: /["']\/(?:Users|home|private\/tmp)\/[^"']+["']/,
  },
  {
    name: "固定 workspace 项目路径",
    regex: /["'`]workspace\/[A-Za-z0-9][A-Za-z0-9_-]*\//,
  },
  {
    name: "依赖启动目录的持久化路径",
    regex: /(?:join|resolve)\(process\.cwd\(\),\s*["'](?:workspace|\.kata)["']\)/,
  },
  {
    name: "固定默认项目",
    regex:
      /(?:--project[^\n]*["']dataAssets["']|KATA_ACTIVE_PROJECT[^\n]*(?:\?\?|\|\|)[^\n]*["']dataAssets["'])/,
  },
];

describe("CLI 路径便携性", () => {
  it("命令源码不固定用户目录、项目目录或启动目录", async () => {
    const violations: string[] = [];
    for (const pattern of sourcePatterns) {
      for await (const file of new Glob(pattern).scan({ cwd: repoRoot, onlyFiles: true })) {
        if (
          file.includes("/tests/") ||
          file.includes("/__tests__/") ||
          file.includes("/fixtures/")
        ) {
          continue;
        }
        const content = readFileSync(resolve(repoRoot, file), "utf8");
        for (const rule of forbidden) {
          if (rule.regex.test(content)) violations.push(`${file}: ${rule.name}`);
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it("从仓库外启动时仍使用仓库 workspace", () => {
    const output = execFileSync(
      "bun",
      [kata, "cases", "verify", "--project", "dataAssets", "--feature", "__path_probe__"],
      {
        cwd: tmpdir(),
        encoding: "utf8",
        env: { ...process.env, KATA_WORKSPACE_ROOT: "workspace" },
      },
    );
    expect(output).toContain(resolve(repoRoot, "workspace", "dataAssets"));
    expect(output).not.toContain(resolve(tmpdir(), "workspace", "dataAssets"));
  });
});
