import { afterEach, describe, expect, it } from "bun:test";

const originalStdoutWrite = process.stdout.write;
const originalStderrWrite = process.stderr.write;
const originalExit = process.exit;

afterEach(() => {
  process.stdout.write = originalStdoutWrite;
  process.stderr.write = originalStderrWrite;
  process.exit = originalExit;
});

describe("cli output helpers", () => {
  it("writes pretty JSON plus a trailing newline to stdout", async () => {
    const { outputJson } = await import("../../lib/cli.ts");
    let stdout = "";
    process.stdout.write = ((chunk: string | Uint8Array) => {
      stdout += String(chunk);
      return true;
    }) as typeof process.stdout.write;

    outputJson({ ok: true, count: 2 });

    expect(stdout).toBe('{\n  "ok": true,\n  "count": 2\n}\n');
  });

  it("writes errors to stderr and exits with the requested code", async () => {
    const { errorExit } = await import("../../lib/cli.ts");
    let stderr = "";
    let exitCode: string | number | null | undefined;
    process.stderr.write = ((chunk: string | Uint8Array) => {
      stderr += String(chunk);
      return true;
    }) as typeof process.stderr.write;
    process.exit = ((code?: string | number | null | undefined) => {
      exitCode = code;
      throw new Error("process.exit intercepted");
    }) as typeof process.exit;

    expect(() => errorExit("bad input", 7)).toThrow("process.exit intercepted");
    expect(stderr).toBe("bad input\n");
    expect(exitCode).toBe(7);
  });
});
