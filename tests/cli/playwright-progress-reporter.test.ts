import { describe, expect, it } from "bun:test";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { FullResult, TestCase, TestResult, TestStep } from "playwright/types/testReporter";
import KataProgressReporter from "../../cli/lib/playwright-progress-reporter.ts";

function fakeTest(file: string): TestCase {
  return {
    location: { file },
    title: "【C0001】验证页面",
  } as unknown as TestCase;
}

describe("KataProgressReporter", () => {
  it("writes progress events under KATA_RUN_PATH", () => {
    const runPath = mkdtempSync(join(tmpdir(), "kata-progress-"));
    process.env.KATA_RUN_PATH = runPath;
    const reporter = new KataProgressReporter();
    const test = fakeTest("/tmp/c0001-demo.spec.ts");
    const result = { status: "passed", duration: 123, error: undefined } as unknown as TestResult;
    reporter.onBegin({} as never, {} as never);
    reporter.onTestBegin(test);
    reporter.onStepBegin(test, result, { title: "步骤1" } as unknown as TestStep);
    reporter.onTestEnd(test, result);
    reporter.onEnd({ status: "passed" } as FullResult);

    const lines = readFileSync(join(runPath, "run-progress.jsonl"), "utf8")
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line) as { event: string; caseId: string; status?: string });
    expect(lines[0]).toMatchObject({ event: "start" });
    expect(lines[1]).toMatchObject({ event: "begin", caseId: "C0001" });
    expect(lines[2]).toMatchObject({ event: "step", caseId: "C0001", step: "步骤1" });
    expect(lines[3]).toMatchObject({ event: "end", caseId: "C0001", status: "passed" });
    expect(lines[4]).toMatchObject({ event: "done", result: "passed" });

    delete process.env.KATA_RUN_PATH;
  });
});
