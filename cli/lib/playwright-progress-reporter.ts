import { appendFileSync } from "node:fs";
import { basename, join } from "node:path";
import type {
  FullConfig,
  FullResult,
  Reporter,
  Suite,
  TestCase,
  TestResult,
  TestStep,
} from "playwright/types/testReporter";

const PROGRESS_FILE = "run-progress.jsonl";

interface ProgressEvent {
  event: "start" | "begin" | "step" | "end" | "done";
  caseId: string;
  title: string;
  at: number;
  status?: string;
  step?: string;
  durationMs?: number;
  error?: string;
  result?: string;
}

function caseIdForTest(test: TestCase): string {
  const file = basename(test.location.file, ".ts");
  const fileMatch = /^(c\d{4,})/i.exec(file);
  if (fileMatch) return fileMatch[1].toUpperCase();
  const titleMatch = test.title.match(/【(C\d+)】/i);
  if (titleMatch) return titleMatch[1].toUpperCase();
  return file;
}

function progressPath(): string | undefined {
  const runPath = process.env.KATA_RUN_PATH;
  return runPath ? join(runPath, PROGRESS_FILE) : undefined;
}

function append(event: ProgressEvent): void {
  const path = progressPath();
  if (!path) return;
  try {
    appendFileSync(path, `${JSON.stringify(event)}\n`);
  } catch {
    // Reporter telemetry must never break the Playwright run.
  }
}

export default class KataProgressReporter implements Reporter {
  public onBegin(_config: FullConfig, _suite: Suite): void {
    append({ event: "start", caseId: "RUN", title: "started", at: Date.now(), result: "running" });
  }

  public onTestBegin(test: TestCase): void {
    append({
      event: "begin",
      caseId: caseIdForTest(test),
      title: test.title,
      at: Date.now(),
    });
  }

  public onStepBegin(test: TestCase, _result: TestResult, step: TestStep): void {
    append({
      event: "step",
      caseId: caseIdForTest(test),
      title: test.title,
      step: step.title,
      at: Date.now(),
    });
  }

  public onTestEnd(test: TestCase, result: TestResult): void {
    append({
      event: "end",
      caseId: caseIdForTest(test),
      title: test.title,
      status: result.status,
      durationMs: result.duration,
      error: result.error?.message?.split("\n")[0],
      at: Date.now(),
    });
  }

  public onEnd(result: FullResult): void {
    append({
      event: "done",
      caseId: "RUN",
      title: "finished",
      result: result.status,
      at: Date.now(),
    });
  }

  public printsToStdio(): false {
    return false;
  }
}
