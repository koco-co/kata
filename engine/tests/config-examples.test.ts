import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const REPO_ROOT = resolve(import.meta.dirname, "../..");

const REQUIRED_ENV_KEYS = [
  "KATA_DATAASSETS_PROJECT_ID",
  "KATA_DATAASSETS_DATASOURCE_ID",
  "KATA_SERVER_WORKSPACE_PATH",
  "KATA_REPO_BRANCH_MAPPING_PATH",
  "KATA_DINGTALK_KEYWORD",
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
  test(".env.example documents P5-05 setup variables", () => {
    const keys = envExampleKeys();

    for (const key of REQUIRED_ENV_KEYS) {
      expect(keys.has(key), `${key} should be listed in .env.example`).toBe(true);
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

  test("config.example.json is valid JSON and documents project repo profiles", () => {
    const config = JSON.parse(readRepoFile("config.example.json")) as {
      projects?: Record<string, { repo_profiles?: Record<string, { repos?: unknown[] }> }>;
    };
    const project = config.projects?.dataAssets;

    expect(project).toBeDefined();
    expect(project?.repo_profiles).toBeDefined();
    expect(project?.repo_profiles?.["example-profile"]?.repos).toBeArray();
  });
});
