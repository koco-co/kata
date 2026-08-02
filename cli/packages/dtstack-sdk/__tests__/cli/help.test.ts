import { describe, expect, test } from "bun:test";
import { spawn } from "node:child_process";

const CLI = "src/cli.ts";

function runCli(args: string[]): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise((resolve) => {
    const p = spawn("bun", ["run", CLI, ...args]);
    let stdout = "";
    let stderr = "";
    p.stdout.on("data", (d) => {
      stdout += d.toString();
    });
    p.stderr.on("data", (d) => {
      stderr += d.toString();
    });
    p.on("close", (code) => resolve({ stdout, stderr, code: code ?? 0 }));
  });
}

describe("dtstack-sdk help", () => {
  test("--help prints root usage", async () => {
    const { stdout, code } = await runCli(["--help"]);
    expect(code).toBe(0);
    expect(stdout).toContain("dtstack-cli — DTStack 平台前置条件 CLI");
    expect(stdout).toContain("sql exec");
  });

  test("sql exec --help prints exec usage with examples", async () => {
    const { stdout, code } = await runCli(["sql", "exec", "--help"]);
    expect(code).toBe(0);
    expect(stdout).toContain("EXAMPLES");
    expect(stdout).toContain("--mode platform|direct");
  });

  test("--version prints version", async () => {
    const { stdout, code } = await runCli(["--version"]);
    expect(code).toBe(0);
    expect(stdout.trim()).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
