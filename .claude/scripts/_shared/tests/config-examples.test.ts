import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const REPO_ROOT = resolve(import.meta.dirname, "../../../..");

const REQUIRED_ENV_KEYS = ["KATA_DINGTALK_KEYWORD"] as const;

const REMOVED_ENV_KEYS = [
  "KATA_PROJECT",
  "KATA_TELEMETRY",
  "KATA_CONSOLE_PORT",
  "KATA_GIT_REMOTE_URL",
  "KATA_SERVER_WORKSPACE_PATH",
  "KATA_REPO_BRANCH_MAPPING_PATH",
  "KATA_DATAASSETS_PROJECT_ID",
  "KATA_DATAASSETS_DATASOURCE_ID",
  "KATA_DATAASSETS_ENV",
  "KATA_SMTP_SECURE",
  // 源码仓库配置迁至 config/source-repos.yaml,不再经 .env
  "KATA_SOURCE_REPOS",
  "KATA_SOURCE_REPO_ROOT",
] as const;

function readRepoFile(path: string): string {
  return readFileSync(resolve(REPO_ROOT, path), "utf8");
}

function envExampleKeys(): Set<string> {
  const keys = new Set<string>();
  for (const line of readRepoFile(".env.example").split("\n")) {
    const match = /^([A-Z0-9_]+)=/.exec(line.trim());
    if (match) keys.add(match[1]);
  }
  return keys;
}

describe("configuration examples", () => {
  test(".env.example documents the supported persistent variables only", () => {
    const keys = envExampleKeys();

    for (const key of REQUIRED_ENV_KEYS) {
      expect(keys.has(key), `${key} should be listed in .env.example`).toBe(true);
    }
    for (const key of REMOVED_ENV_KEYS) {
      expect(keys.has(key), `${key} should not be listed in .env.example`).toBe(false);
    }
  });

  test("INSTALL.md copy commands reference existing example files", () => {
    const install = readRepoFile("INSTALL.md");
    const referencedExamples = [
      ...install.matchAll(/\bcp\s+([./A-Za-z0-9_-]+\.example(?:\.[A-Za-z0-9_-]+)?)\s+/g),
    ].map((match) => match[1]);

    expect(referencedExamples).toContain(".env.example");
    for (const examplePath of referencedExamples) {
      expect(
        existsSync(resolve(REPO_ROOT, examplePath)),
        `${examplePath} referenced by INSTALL.md should exist`,
      ).toBe(true);
    }
  });

  test("retired config.example.json route is removed", () => {
    expect(existsSync(resolve(REPO_ROOT, "config.example.json"))).toBe(false);
    expect(readRepoFile("INSTALL.md")).not.toContain("cp config.example.json");
  });
});
