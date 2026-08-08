import { describe, expect, it } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { CaseItem } from "../../cli/lib/cases/types.ts";
import { parseProgressLine, readProgressFile } from "../../cli/lib/tui/progress-state.ts";

const CASES: CaseItem[] = [
  { id: "C0001", title: "验证一", priority: "P0", steps: [] },
  { id: "C0002", title: "验证二", priority: "P1", steps: [] },
];

describe("progress state", () => {
  it("parses individual JSONL events", () => {
    const event = parseProgressLine('{"event":"begin","caseId":"C0001","title":"t","at":1}');
    expect(event?.event).toBe("begin");
    expect(event?.caseId).toBe("C0001");
    expect(parseProgressLine("not json")).toBeUndefined();
  });

  it("builds per-case progress from reporter events", () => {
    const runPath = mkdtempSync(join(tmpdir(), "kata-progress-state-"));
    writeFileSync(
      join(runPath, "run-progress.jsonl"),
      [
        '{"event":"start","caseId":"RUN","title":"start","at":1}',
        '{"event":"begin","caseId":"C0001","title":"验证一","at":2}',
        '{"event":"step","caseId":"C0001","title":"验证一","step":"打开页面","at":3}',
        '{"event":"end","caseId":"C0001","title":"验证一","status":"passed","at":4}',
        '{"event":"end","caseId":"C0002","title":"验证二","status":"failed","error":"boom","at":5}',
      ].join("\n"),
    );
    const progress = readProgressFile(runPath, CASES);
    expect(progress.find((item) => item.caseId === "C0001")).toMatchObject({
      status: "passed",
      step: "打开页面",
    });
    expect(progress.find((item) => item.caseId === "C0002")).toMatchObject({
      status: "failed",
      error: "boom",
    });
  });
});
