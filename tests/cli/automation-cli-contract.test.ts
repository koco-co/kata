import { describe, expect, it } from "bun:test";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { formatAutomationVerifyOutput } from "../../cli/commands/runs.ts";
import type { AutomationVerifyResult } from "../../cli/lib/automation/automation-verifier.ts";

const ROOT = resolve(import.meta.dir, "../..");
const KATA = resolve(ROOT, "cli/bin/kata.ts");

function help(...args: string[]): string {
  const result = spawnSync(process.execPath, [KATA, ...args, "--help"], {
    cwd: ROOT,
    encoding: "utf8",
  });
  expect(result.status).toBe(0);
  return result.stdout;
}

describe("automation CLI contract", () => {
  it("publishes only descriptor-driven lifecycle commands and executor-neutral SQL", () => {
    const output = help("automation");
    for (const command of ["setup", "doctor", "collect", "run", "sql"]) {
      expect(output).toContain(command);
    }
    for (const retired of [
      "coverage",
      "generate-cases",
      "generate",
      "migrate-placeholders",
      "scaffold",
      "normalize",
      "lint",
    ]) {
      expect(output).not.toMatch(new RegExp(`\\n\\s+${retired}(?:\\s|$)`));
    }
  });

  it("keeps collect credential-free and run explicitly parameterized", () => {
    const collect = help("automation", "collect");
    expect(collect).toContain("--project <name>");
    expect(collect).toContain("--executor <id>");
    expect(collect).not.toContain("--env <name>");

    const run = help("automation", "run");
    expect(run).toContain("--project <name>");
    expect(run).toContain("--executor <id>");
    expect(run).toContain("--env <name>");
    expect(run).toContain("--workers <number>");
    expect(run).not.toContain("--set");
    expect(run).not.toContain("--headed");
  });

  it("keeps runs verify JSON output machine-readable while publishing handoff options", () => {
    const verifyHelp = help("runs", "verify");
    for (const option of [
      "--project <id>",
      "--run <logical-run-id>",
      "--executor <id>",
      "--execution <id>",
      "--attempt <number>",
      "--json",
    ]) {
      expect(verifyHelp).toContain(option);
    }

    const result: AutomationVerifyResult = {
      projectId: "data-assets",
      logicalRunId: "20260809-0100-run-01",
      logicalRunPath: "/repo/artifacts/runs/data-assets/20260809-0100-run-01",
      executorId: "playwright-web-ui",
      executionId: "execution-01",
      executionPath:
        "/repo/artifacts/runs/data-assets/20260809-0100-run-01/executions/playwright-web-ui/execution-01",
      attempt: 1,
      attemptPath:
        "/repo/artifacts/runs/data-assets/20260809-0100-run-01/executions/playwright-web-ui/execution-01/attempts/001",
      manifestCaseCount: 2,
      handoffPath: "/repo/artifacts/runs/data-assets/20260809-0100-run-01/handoff.md",
      ok: true,
      checks: [{ name: "manifest", passed: true, message: "2 个 canonical cases" }],
    };
    const output = formatAutomationVerifyOutput(result, true);
    expect(output.startsWith("{")).toBe(true);
    expect(JSON.parse(output)).toEqual(result);
    expect(output).not.toContain("[runs verify]");
  });
});
