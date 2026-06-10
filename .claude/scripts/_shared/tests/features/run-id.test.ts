import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { generateRunId, RUN_ID_RE, runIdType } from "@shared/lib/features/run-id.ts";

let root: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "kata-runid-"));
});
afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe("generateRunId v2", () => {
  const now = new Date("2026-06-10T08:30:00Z");

  it("formats as YYYYMMDD-HHmm-<type>-<seq>", () => {
    expect(generateRunId({ type: "run", now })).toBe("20260610-0830-run-01");
    expect(generateRunId({ type: "preflight", now })).toBe("20260610-0830-preflight-01");
  });

  it("increments seq per same-day same-type runs in runsDir", () => {
    const runs = join(root, "runs");
    mkdirSync(join(runs, "20260610-0700-run-01"), { recursive: true });
    mkdirSync(join(runs, "20260610-0800-run-02"), { recursive: true });
    mkdirSync(join(runs, "20260610-0810-preflight-01"), { recursive: true });
    expect(generateRunId({ type: "run", runsDir: runs, now })).toBe("20260610-0830-run-03");
    expect(generateRunId({ type: "baseline", runsDir: runs, now })).toBe(
      "20260610-0830-baseline-01",
    );
  });

  it("parses type from run-id; legacy ids return null", () => {
    expect(runIdType("20260610-0830-baseline-01")).toBe("baseline");
    expect(runIdType("20260519-1443-faddbcf8")).toBeNull();
    expect(RUN_ID_RE.test("20260610-0830-selfrun-02")).toBe(true);
  });
});
