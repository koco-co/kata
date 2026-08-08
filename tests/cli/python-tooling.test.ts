import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { parse } from "yaml";

interface Hook {
  id?: unknown;
  entry?: unknown;
  language?: unknown;
}

interface PreCommitConfig {
  minimum_pre_commit_version?: unknown;
  repos?: Array<{ repo?: unknown; hooks?: Hook[] }>;
}

describe("Python automation tooling", () => {
  it("keeps deterministic local quality gates in pre-commit without browser E2E", () => {
    const root = resolve(import.meta.dir, "../..");
    const path = join(root, ".pre-commit-config.yaml");
    const config = parse(readFileSync(path, "utf8")) as PreCommitConfig;
    const hooks = (config.repos ?? []).flatMap((repo) => repo.hooks ?? []);
    const byId = new Map(hooks.map((hook) => [hook.id, hook]));

    expect(config.minimum_pre_commit_version).toBe("4.3.0");
    expect([...byId.keys()].sort()).toEqual([
      "control-plane-contracts",
      "pyright",
      "python-contracts",
      "ruff-check",
      "ruff-format",
      "uv-lock",
    ]);
    expect(hooks.every((hook) => hook.language === "system")).toBe(true);

    const entries = hooks.map((hook) => String(hook.entry)).join("\n");
    expect(entries).toContain("uv run --locked --no-sync ruff");
    expect(entries).toContain("uv run --locked --no-sync pyright");
    expect(entries).toContain("uv lock --check");
    expect(entries).toContain("tests/contract");
    expect(entries).not.toContain("tests/e2e");
    expect(entries).not.toContain("playwright install");
    expect(entries).not.toContain("automation run");
  });
});
