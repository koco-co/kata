import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

function runCli(args: string[]): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise((resolve) => {
    const p = spawn("bun", ["run", "src/cli.ts", ...args]);
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

describe("sql ping direct-mode validation", () => {
  let dir: string;
  let configPath: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "dtcli-ping-"));
    configPath = join(dir, "dtstack-cli.yaml");
    writeFileSync(
      configPath,
      `
environments: {}
datasources:
  d1:
    type: doris
    host: 127.0.0.1
    port: 9030
    username: root
    password: ""
`,
    );
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  test("missing --source fails with a clear error before connecting", async () => {
    const { stderr, code } = await runCli([
      "sql",
      "ping",
      "--mode",
      "direct",
      "--config",
      configPath,
    ]);
    expect(code).toBe(1);
    expect(stderr).toContain("--source required in direct mode");
  });

  test("unknown --source fails with a clear error before connecting", async () => {
    const { stderr, code } = await runCli([
      "sql",
      "ping",
      "--mode",
      "direct",
      "--source",
      "nope",
      "--config",
      configPath,
    ]);
    expect(code).toBe(1);
    expect(stderr).toContain("datasource not in config: nope");
  });
});
