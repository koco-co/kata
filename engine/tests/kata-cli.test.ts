import { describe, expect, it } from "bun:test";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { KATA_CLI } from "./cli-runner.ts";
import { testEnv } from "./cli-runner.ts";

const REPO_ROOT = resolve(import.meta.dirname, "../..");

function run(args: string[]): { stdout: string; stderr: string; code: number } {
  try {
    const stdout = execFileSync(KATA_CLI, args, {
      cwd: REPO_ROOT,
      encoding: "utf8",
      env: testEnv(),
    });
    return { stdout, stderr: "", code: 0 };
  } catch (err: unknown) {
    const e = err as { stdout?: string; stderr?: string; status?: number };
    return {
      stdout: e.stdout ?? "",
      stderr: e.stderr ?? "",
      code: e.status ?? 1,
    };
  }
}

describe("kata CLI", () => {
  it("top-level --help exits 0", () => {
    const { code } = run(["--help"]);
    expect(code).toBe(0);
  });

  it("top-level --help shows kata name", () => {
    const { stdout } = run(["--help"]);
    expect(stdout).toMatch(/kata/);
  });

  it("top-level --help shows description", () => {
    const { stdout } = run(["--help"]);
    expect(stdout).toMatch(/kata unified CLI/);
  });

  it("unknown subcommand exits non-zero", () => {
    const { code } = run(["nonexistent-module"]);
    expect(code).not.toBe(0);
  });
});
