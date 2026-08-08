import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { CaseItem } from "../cases/types.ts";

export type CaseProgressStatus = "queued" | "running" | "passed" | "failed" | "skipped" | "broken";

export interface CaseProgress {
  caseId: string;
  title: string;
  status: CaseProgressStatus;
  step?: string;
  error?: string;
  durationMs?: number;
}

export interface ProgressEventRecord {
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

export function parseProgressLine(line: string): ProgressEventRecord | undefined {
  if (!line.trim()) return undefined;
  try {
    return JSON.parse(line) as ProgressEventRecord;
  } catch {
    return undefined;
  }
}

function endStatus(status: string | undefined): CaseProgressStatus {
  if (status === "passed") return "passed";
  if (status === "skipped") return "skipped";
  if (status === "broken") return "broken";
  return "failed";
}

export function applyProgressEvent(
  current: ReadonlyMap<string, CaseProgress>,
  event: ProgressEventRecord,
): Map<string, CaseProgress> {
  const next = new Map(current);
  const item = next.get(event.caseId);
  if (!item) return next;
  if (event.event === "begin") {
    next.set(event.caseId, { ...item, status: "running" });
  } else if (event.event === "step" && event.step) {
    next.set(event.caseId, { ...item, step: event.step });
  } else if (event.event === "end") {
    next.set(event.caseId, {
      ...item,
      status: endStatus(event.status),
      durationMs: event.durationMs,
      ...(event.error ? { error: event.error } : {}),
    });
  }
  return next;
}

export function readProgressFile(runPath: string, cases: readonly CaseItem[]): CaseProgress[] {
  let states = new Map<string, CaseProgress>(
    cases.map((item) => [item.id, { caseId: item.id, title: item.title, status: "queued" }]),
  );
  const path = join(runPath, "run-progress.jsonl");
  if (!existsSync(path)) return [...states.values()];
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const event = parseProgressLine(line);
    if (event) states = applyProgressEvent(states, event);
  }
  return [...states.values()];
}
