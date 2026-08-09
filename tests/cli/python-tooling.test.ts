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
      "python-tests",
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
    expect(entries).toContain("tests/unit");
    expect(entries).not.toContain("tests/e2e");
    expect(entries).not.toContain("playwright install");
    expect(entries).not.toContain("automation run");
  });

  it("pins the uv workspace contract and runs every offline Python gate in CI", () => {
    const root = resolve(import.meta.dir, "../..");
    const project = readFileSync(join(root, "pyproject.toml"), "utf8");
    const workflow = readFileSync(join(root, ".github/workflows/ci.yml"), "utf8");

    expect(project).toContain('required-version = ">=0.11.28,<0.12.0"');
    expect(project).toContain('typeCheckingMode = "strict"');
    expect(project).toContain('target-version = "py314"');
    expect(workflow).toContain("python-automation-quality:");
    expect(workflow).toContain("astral-sh/setup-uv@");
    expect(workflow).toContain('version: "0.11.28"');
    expect(workflow).toContain("uv sync --locked --all-packages --all-groups");
    expect(workflow).toContain("uv run --locked --no-sync ruff format --check");
    expect(workflow).toContain("uv run --locked --no-sync ruff check");
    expect(workflow).toContain("uv run --locked --no-sync pyright");
    expect(workflow).toContain("automation/playwright-web-ui/tests");
    expect(workflow).toContain("tests/unit");
    expect(workflow).not.toContain(
      "uv run --locked --no-sync pytest automation/playwright-web-ui/suites/data-assets/tests/e2e",
    );
  });

  it("documents the trace-safe Playwright failure evidence contract", () => {
    const root = resolve(import.meta.dir, "../..");
    const guide = readFileSync(join(root, "automation/playwright-web-ui/agent/guide.md"), "utf8");

    expect(guide).toContain("tracing permanently off");
    expect(guide).toContain("failure.json");
    expect(guide).toContain("failure screenshot");
    expect(guide).toContain("failure video");
    expect(guide).not.toContain("and trace;");
  });
});
